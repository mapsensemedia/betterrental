/**
 * persist-booking-extras
 * 
 * Persists booking_add_ons and booking_additional_drivers rows
 * using service_role (required by fail-closed price triggers).
 * 
 * Called by authenticated checkout after booking row is created.
 * Prices are computed server-side from DB — client prices ignored.
 */
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
} from "../_shared/cors.ts";
import { validateAuth, getAdminClient } from "../_shared/auth.ts";
import {
  createBookingAddOns,
  createAdditionalDrivers,
  computeBookingTotals,
} from "../_shared/booking-core.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const auth = await validateAuth(req);
    if (!auth.authenticated || !auth.userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = getAdminClient();
    const body = await req.json();
    const { bookingId, addOns, additionalDrivers } = body;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify booking exists and belongs to user
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, vehicle_id, start_at, end_at, protection_plan, driver_age_band, delivery_fee, different_dropoff_fee")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (booking.user_id !== auth.userId) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build server-side pricing inputs
    const addOnInputs = (addOns || []).map((a: any) => ({
      addOnId: a.addOnId,
      quantity: Math.min(10, Math.max(1, Number(a.quantity) || 1)),
    }));

    const driverInputs = (additionalDrivers || []).map((d: any) => ({
      driverName: d.driverName || null,
      driverAgeBand: d.driverAgeBand || "25_70",
      youngDriverFee: 0, // computed server-side
    }));

    // Compute server-side prices
    const serverTotals = await computeBookingTotals({
      vehicleId: booking.vehicle_id,
      startAt: booking.start_at,
      endAt: booking.end_at,
      protectionPlan: booking.protection_plan || undefined,
      addOns: addOnInputs.length > 0 ? addOnInputs : undefined,
      additionalDrivers: driverInputs.length > 0 ? driverInputs : undefined,
      driverAgeBand: booking.driver_age_band || undefined,
      deliveryFee: Number(booking.delivery_fee) || 0,
      differentDropoffFee: Number(booking.different_dropoff_fee) || 0,
    });

    // Persist add-ons with server-computed prices
    const errors: string[] = [];

    if (serverTotals.addOnPrices.length > 0) {
      try {
        await createBookingAddOns(bookingId, serverTotals.addOnPrices);
      } catch (e) {
        const msg = `Add-on insert failed: ${e}`;
        console.error(`[persist-booking-extras] ${msg}`);
        errors.push(msg);
      }
    }

    // Persist additional drivers with server-computed fees
    if (serverTotals.additionalDriverRecords.length > 0) {
      try {
        await createAdditionalDrivers(bookingId, serverTotals.additionalDriverRecords);
      } catch (e) {
        const msg = `Driver insert failed: ${e}`;
        console.error(`[persist-booking-extras] ${msg}`);
        errors.push(msg);
      }
    }

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: "EXTRAS_PERSIST_FAILED", details: errors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[persist-booking-extras] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "server_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
