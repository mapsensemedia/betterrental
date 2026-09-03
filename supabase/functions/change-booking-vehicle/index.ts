import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getUserOrThrow, requireRoleOrThrow } from "../_shared/auth.ts";
import { requireBookingLocationOrThrow } from "../_shared/location-guard.ts";

/**
 * Change the assigned vehicle on an active booking.
 *
 * - Validates new unit availability + location + no booking conflict.
 * - Releases old unit, attaches new unit atomically (best-effort rollback).
 * - Optionally updates the new unit's plate/VIN/mileage from staff edits.
 * - Writes a vehicle_swap_history row.
 * - Voids the current pending/signed agreement and regenerates a new one.
 */

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(user.userId!, ["super_admin", "manager", "admin", "staff"], corsHeaders);

    const body = await req.json().catch(() => ({}));
    const {
      bookingId,
      newUnitId,
      newStartMileage,
      oldEndMileage,
      newLicensePlate,
      newVin,
      reason,
      notes,
      swapEffectiveAt,
      releaseOldUnitTo, // 'available' | 'maintenance'
    } = body ?? {};

    if (!bookingId || !newUnitId || newStartMileage === undefined || newStartMileage === null) {
      return json({ error: "bookingId, newUnitId, and newStartMileage are required" }, 400, corsHeaders);
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
      .select("id, status, vehicle_id, location_id, assigned_unit_id")
      .eq("id", bookingId)
      .maybeSingle();
    if (bErr || !booking) return json({ error: "Booking not found" }, 404, corsHeaders);
    if (booking.status !== "active") {
      return json({ error: `Booking is ${booking.status} — only active bookings can have their vehicle changed` }, 400, corsHeaders);
    }
    if (!booking.assigned_unit_id) {
      return json({ error: "Booking has no vehicle assigned yet — use the initial assign flow" }, 400, corsHeaders);
    }
    if (booking.assigned_unit_id === newUnitId) {
      return json({ error: "New unit is the same as the current unit" }, 400, corsHeaders);
    }

    // Load new unit
    const { data: newUnit, error: nuErr } = await supabase
      .from("vehicle_units")
      .select("id, vin, license_plate, status, category_id, location_id, current_mileage")
      .eq("id", newUnitId)
      .maybeSingle();
    if (nuErr || !newUnit) return json({ error: "New vehicle unit not found" }, 404, corsHeaders);

    if (newUnit.location_id !== booking.location_id) {
      return json({ error: "New unit is not at the booking's location" }, 400, corsHeaders);
    }
    if (!["available", "maintenance", "on_rent"].includes(newUnit.status)) {
      return json({ error: `New unit status is ${newUnit.status} — must be available or maintenance` }, 400, corsHeaders);
    }
    const { data: conflict } = await supabase
      .from("bookings")
      .select("id, booking_code")
      .eq("assigned_unit_id", newUnitId)
      .in("status", ["confirmed", "active"])
      .neq("id", bookingId)
      .limit(1);
    if (conflict && conflict.length > 0) {
      return json({ error: `Unit is already assigned to booking ${conflict[0].booking_code}` }, 409, corsHeaders);
    }

    // Load old unit snapshot
    const { data: oldUnit } = await supabase
      .from("vehicle_units")
      .select("id, vin, license_plate, current_mileage, status, category_id")
      .eq("id", booking.assigned_unit_id)
      .maybeSingle();

    // Capture current signed/pending agreement to link into history
    const { data: currentAgreement } = await supabase
      .from("rental_agreements")
      .select("id, status")
      .eq("booking_id", bookingId)
      .in("status", ["pending", "signed", "confirmed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const effectiveAt = swapEffectiveAt ? new Date(swapEffectiveAt).toISOString() : new Date().toISOString();

    // 1) Release old unit
    const oldReleaseStatus = releaseOldUnitTo === "maintenance" ? "maintenance" : "available";
    const oldUnitUpdate: Record<string, unknown> = {
      status: oldReleaseStatus,
      updated_at: new Date().toISOString(),
    };
    if (oldEndMileage !== undefined && oldEndMileage !== null && Number.isFinite(Number(oldEndMileage))) {
      oldUnitUpdate.current_mileage = Number(oldEndMileage);
    }
    const { error: relErr } = await supabase
      .from("vehicle_units")
      .update(oldUnitUpdate)
      .eq("id", booking.assigned_unit_id);
    if (relErr) return json({ error: `Failed to release old unit: ${relErr.message}` }, 500, corsHeaders);

    // 2) Update new unit: plate/vin edits + mileage + mark on_rent
    const newUnitUpdate: Record<string, unknown> = {
      status: "on_rent",
      current_mileage: Number(newStartMileage),
      updated_at: new Date().toISOString(),
    };
    if (typeof newLicensePlate === "string" && newLicensePlate.trim()) newUnitUpdate.license_plate = newLicensePlate.trim();
    if (typeof newVin === "string" && newVin.trim()) newUnitUpdate.vin = newVin.trim();

    const { error: newUpdErr } = await supabase
      .from("vehicle_units")
      .update(newUnitUpdate)
      .eq("id", newUnitId);
    if (newUpdErr) {
      // rollback old
      await supabase.from("vehicle_units").update({ status: oldUnit?.status ?? "on_rent" }).eq("id", booking.assigned_unit_id);
      return json({ error: `Failed to update new unit: ${newUpdErr.message}` }, 500, corsHeaders);
    }

    // 3) Update booking
    const bookingUpd: Record<string, unknown> = { assigned_unit_id: newUnitId, updated_at: new Date().toISOString() };
    if (newUnit.category_id && newUnit.category_id !== booking.vehicle_id) {
      // Category change — reflect on booking.vehicle_id (category id)
      bookingUpd.vehicle_id = newUnit.category_id;
    }
    const { error: bUpdErr } = await supabase.from("bookings").update(bookingUpd).eq("id", bookingId);
    if (bUpdErr) {
      await supabase.from("vehicle_units").update({ status: oldUnit?.status ?? "on_rent" }).eq("id", booking.assigned_unit_id);
      await supabase.from("vehicle_units").update({ status: "available" }).eq("id", newUnitId);
      return json({ error: `Failed to update booking: ${bUpdErr.message}` }, 500, corsHeaders);
    }

    // 4) Void current agreement (preserve for history)
    if (currentAgreement?.id) {
      await supabase
        .from("rental_agreements")
        .update({ status: "voided", updated_at: new Date().toISOString() })
        .eq("id", currentAgreement.id);
    }

    // 5) Insert history row
    const finalNewPlate = (typeof newLicensePlate === "string" && newLicensePlate.trim()) || newUnit.license_plate;
    const finalNewVin = (typeof newVin === "string" && newVin.trim()) || newUnit.vin;
    const { data: historyRow } = await supabase
      .from("vehicle_swap_history")
      .insert({
        booking_id: bookingId,
        old_unit_id: booking.assigned_unit_id,
        new_unit_id: newUnitId,
        old_agreement_id: currentAgreement?.id ?? null,
        swap_effective_at: effectiveAt,
        old_end_mileage: oldEndMileage !== undefined && oldEndMileage !== null ? Number(oldEndMileage) : null,
        new_start_mileage: Number(newStartMileage),
        reason: reason ?? null,
        notes: notes ?? null,
        old_vin: oldUnit?.vin ?? null,
        old_license_plate: oldUnit?.license_plate ?? null,
        new_vin: finalNewVin ?? null,
        new_license_plate: finalNewPlate ?? null,
        changed_by: user.userId,
      })
      .select("id")
      .single();

    // 6) Audit log
    await supabase.from("audit_logs").insert({
      action: "booking_vehicle_changed",
      entity_type: "bookings",
      entity_id: bookingId,
      user_id: user.userId,
      old_data: { assigned_unit_id: booking.assigned_unit_id, vin: oldUnit?.vin, license_plate: oldUnit?.license_plate },
      new_data: { assigned_unit_id: newUnitId, vin: finalNewVin, license_plate: finalNewPlate, reason, notes, swap_effective_at: effectiveAt },
    });

    // 7) Regenerate agreement
    let agreementRegenerated = false;
    let newAgreementId: string | null = null;
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
      if (regen.ok) {
        // Look up latest pending agreement to link into history
        const { data: newAgr } = await supabase
          .from("rental_agreements")
          .select("id")
          .eq("booking_id", bookingId)
          .neq("status", "voided")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        newAgreementId = newAgr?.id ?? null;
        if (newAgreementId && historyRow?.id) {
          await supabase
            .from("vehicle_swap_history")
            .update({ new_agreement_id: newAgreementId })
            .eq("id", historyRow.id);
        }
      } else {
        console.warn("generate-agreement failed:", regen.status, await regen.text());
      }
    } catch (e) {
      console.warn("generate-agreement error:", (e as Error).message);
    }

    return json({
      success: true,
      bookingId,
      oldUnitId: booking.assigned_unit_id,
      newUnitId,
      newVin: finalNewVin,
      newLicensePlate: finalNewPlate,
      agreementRegenerated,
      newAgreementId,
      historyId: historyRow?.id ?? null,
    }, 200, corsHeaders);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number })?.status ?? (/auth|role/i.test(msg) ? 403 : 500);
    return json({ error: msg }, status, getCorsHeaders(req));
  }
});

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
