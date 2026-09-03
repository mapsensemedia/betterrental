import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getUserOrThrow, requireRoleOrThrow } from "../_shared/auth.ts";
import { requireBookingLocationOrThrow } from "../_shared/location-guard.ts";

/**
 * Assign a vehicle unit to an already-active booking.
 *
 * Used when a booking was activated without an assigned_unit_id (e.g. ops skipped
 * the unit-pick step). Validates category + location + availability, then
 * atomically writes bookings.assigned_unit_id and flips vehicle_units.status.
 *
 * After a successful attach, voids any existing pending agreement and invokes
 * generate-agreement so the new PDF includes the VIN/plate.
 */

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(user.userId!, ["super_admin", "manager", "admin", "staff"], corsHeaders);

    const body = await req.json().catch(() => ({}));
    const bookingId: string | undefined = body?.bookingId;
    const unitId: string | undefined = body?.unitId;

    if (!bookingId || !unitId) {
      return new Response(
        JSON.stringify({ error: "bookingId and unitId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Branch scope: managers may only act on bookings from their own location.
    await requireBookingLocationOrThrow(user.userId!, bookingId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load booking
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, status, vehicle_id, location_id, assigned_unit_id, start_at, end_at")
      .eq("id", bookingId)
      .maybeSingle();

    if (bErr || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (booking.status !== "active") {
      return new Response(
        JSON.stringify({ error: `Booking is ${booking.status} — only active bookings can be attached this way` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (booking.assigned_unit_id) {
      return new Response(
        JSON.stringify({ error: "Booking already has a unit assigned" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load unit
    const { data: unit, error: uErr } = await supabase
      .from("vehicle_units")
      .select("id, vin, license_plate, status, category_id, location_id")
      .eq("id", unitId)
      .maybeSingle();

    if (uErr || !unit) {
      return new Response(
        JSON.stringify({ error: "Vehicle unit not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate category match (booking.vehicle_id holds the category id)
    if (unit.category_id !== booking.vehicle_id) {
      return new Response(
        JSON.stringify({ error: "Unit does not belong to the booking's category" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate location match
    if (unit.location_id !== booking.location_id) {
      return new Response(
        JSON.stringify({ error: "Unit is not at the booking's pickup location" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate availability — allow `available` or already `on_rent` with no other active booking pointing to it
    if (unit.status !== "available" && unit.status !== "on_rent") {
      return new Response(
        JSON.stringify({ error: `Unit status is ${unit.status} — not available for assignment` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check no other active booking holds this unit
    const { data: conflict } = await supabase
      .from("bookings")
      .select("id, booking_code")
      .eq("assigned_unit_id", unitId)
      .in("status", ["confirmed", "active"])
      .neq("id", bookingId)
      .limit(1);

    if (conflict && conflict.length > 0) {
      return new Response(
        JSON.stringify({ error: `Unit is already assigned to booking ${conflict[0].booking_code}` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Atomic-ish: update unit then booking
    const { error: unitUpdErr } = await supabase
      .from("vehicle_units")
      .update({ status: "on_rent", updated_at: new Date().toISOString() })
      .eq("id", unitId);

    if (unitUpdErr) {
      return new Response(
        JSON.stringify({ error: `Failed to update unit: ${unitUpdErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: bookUpdErr } = await supabase
      .from("bookings")
      .update({ assigned_unit_id: unitId, updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (bookUpdErr) {
      // Best-effort rollback
      await supabase
        .from("vehicle_units")
        .update({ status: unit.status })
        .eq("id", unitId);
      return new Response(
        JSON.stringify({ error: `Failed to update booking: ${bookUpdErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Audit
    await supabase.from("audit_logs").insert({
      action: "unit_assigned_post_activation",
      entity_type: "bookings",
      entity_id: bookingId,
      user_id: user.userId,
      new_data: {
        unit_id: unitId,
        vin: unit.vin,
        plate: unit.license_plate,
      },
    });

    // Void any existing pending agreement so it regenerates with the VIN/plate
    await supabase
      .from("rental_agreements")
      .update({ status: "voided", updated_at: new Date().toISOString() })
      .eq("booking_id", bookingId)
      .eq("status", "pending");

    // Regenerate agreement (best-effort — UI can also re-trigger)
    let agreementRegenerated = false;
    try {
      const authHeader = req.headers.get("Authorization") ?? "";
      const regen = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-agreement`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          },
          body: JSON.stringify({ bookingId, forceRegenerate: true }),
        },
      );
      agreementRegenerated = regen.ok;
      if (!regen.ok) {
        console.warn("generate-agreement returned non-OK:", regen.status, await regen.text());
      }
    } catch (e) {
      console.warn("generate-agreement invocation failed:", (e as Error).message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        bookingId,
        unitId,
        vin: unit.vin,
        licensePlate: unit.license_plate,
        agreementRegenerated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.toLowerCase().includes("auth") || msg.toLowerCase().includes("role") ? 403 : 500;
    return new Response(
      JSON.stringify({ error: msg }),
      { status, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
