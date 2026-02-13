/**
 * persist-booking-extras
 * 
 * Persists booking_add_ons and booking_additional_drivers rows
 * using service_role (required by fail-closed price triggers).
 * 
 * Supports two modes:
 *   1. Checkout flow (default): authenticated user persists all extras at once.
 *   2. Staff upsell: action="upsell-add" or "upsell-remove" for counter upsell.
 * 
 * Prices are computed server-side from DB — client prices ignored.
 */
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
} from "../_shared/cors.ts";
import { validateAuth, getAdminClient, isAdminOrStaff } from "../_shared/auth.ts";
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
    const { bookingId, action } = body;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch booking
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, vehicle_id, start_at, end_at, protection_plan, driver_age_band, delivery_fee, different_dropoff_fee, subtotal, tax_amount, total_amount")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Staff upsell actions ──────────────────────────────────────
    if (action === "upsell-add" || action === "upsell-remove") {
      // Require admin/staff role
      const staffOk = await isAdminOrStaff(auth.userId);
      if (!staffOk) {
        return new Response(
          JSON.stringify({ error: "Forbidden: staff role required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "upsell-add") {
        return await handleUpsellAdd(supabaseAdmin, booking, body, corsHeaders);
      } else {
        return await handleUpsellRemove(supabaseAdmin, booking, body, corsHeaders);
      }
    }

    // ── Default: checkout flow (user must own booking) ────────────
    if (booking.user_id !== auth.userId) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { addOns, additionalDrivers } = body;

    const addOnInputs = (addOns || []).map((a: any) => ({
      addOnId: a.addOnId,
      quantity: Math.min(10, Math.max(1, Number(a.quantity) || 1)),
    }));

    const driverInputs = (additionalDrivers || []).map((d: any) => ({
      driverName: d.driverName || null,
      driverAgeBand: d.driverAgeBand || "25_70",
      youngDriverFee: 0,
    }));

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
      JSON.stringify({ ok: true }),
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


// ── Staff upsell: add a single add-on ────────────────────────────
async function handleUpsellAdd(
  supabaseAdmin: any,
  booking: any,
  body: any,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const { bookingId, addOnId, quantity } = body;
  if (!addOnId) {
    return new Response(
      JSON.stringify({ error: "addOnId required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const qty = Math.min(10, Math.max(1, Number(quantity) || 1));

  // Compute server-side price for this single add-on
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.max(1, Math.ceil(
    (new Date(booking.end_at).getTime() - new Date(booking.start_at).getTime()) / msPerDay
  ));

  const { data: addOnRow, error: aoErr } = await supabaseAdmin
    .from("add_ons")
    .select("id, daily_rate, one_time_fee, name")
    .eq("id", addOnId)
    .single();

  if (aoErr || !addOnRow) {
    return new Response(
      JSON.stringify({ error: "Invalid add-on" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const roundCents = (n: number) => Math.round(n * 100) / 100;

  // Fuel add-ons are one-time only
  const isFuel = addOnRow.name?.toLowerCase().includes("fuel");
  const dailyCost = isFuel ? 0 : roundCents(Number(addOnRow.daily_rate) * days * qty);
  const oneTimeCost = roundCents(Number(addOnRow.one_time_fee ?? 0) * qty);
  const price = isFuel
    ? roundCents(Number(addOnRow.one_time_fee ?? addOnRow.daily_rate) * qty)
    : roundCents(dailyCost + oneTimeCost);

  // Idempotent: delete existing row for same booking+addOn, then insert
  await supabaseAdmin
    .from("booking_add_ons")
    .delete()
    .eq("booking_id", bookingId)
    .eq("add_on_id", addOnId);

  const { error: insertErr } = await supabaseAdmin
    .from("booking_add_ons")
    .insert({
      booking_id: bookingId,
      add_on_id: addOnId,
      price,
      quantity: qty,
    });

  if (insertErr) {
    console.error("[persist-booking-extras] upsell-add insert failed:", insertErr);
    return new Response(
      JSON.stringify({ error: "EXTRAS_PERSIST_FAILED" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Reprice booking totals
  await repriceBookingTotals(supabaseAdmin, booking);

  return new Response(
    JSON.stringify({ ok: true, price }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}


// ── Staff upsell: remove a single add-on ─────────────────────────
async function handleUpsellRemove(
  supabaseAdmin: any,
  booking: any,
  body: any,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const { bookingId, bookingAddOnId } = body;
  if (!bookingAddOnId) {
    return new Response(
      JSON.stringify({ error: "bookingAddOnId required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify the row belongs to this booking
  const { data: existing } = await supabaseAdmin
    .from("booking_add_ons")
    .select("id")
    .eq("id", bookingAddOnId)
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (!existing) {
    return new Response(
      JSON.stringify({ error: "Add-on not found on this booking" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { error: delErr } = await supabaseAdmin
    .from("booking_add_ons")
    .delete()
    .eq("id", bookingAddOnId);

  if (delErr) {
    console.error("[persist-booking-extras] upsell-remove delete failed:", delErr);
    return new Response(
      JSON.stringify({ error: "EXTRAS_PERSIST_FAILED" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Reprice booking totals
  await repriceBookingTotals(supabaseAdmin, booking);

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}


// ── Reprice booking totals after upsell change ───────────────────
async function repriceBookingTotals(supabaseAdmin: any, booking: any): Promise<void> {
  const roundCents = (n: number) => Math.round(n * 100) / 100;

  // Fetch current add-ons total from DB
  const { data: addOns } = await supabaseAdmin
    .from("booking_add_ons")
    .select("price")
    .eq("booking_id", booking.id);

  // Fetch current additional drivers total from DB
  const { data: drivers } = await supabaseAdmin
    .from("booking_additional_drivers")
    .select("young_driver_fee")
    .eq("booking_id", booking.id);

  // Recompute using canonical logic (includes all line items)
  const addOnInputs = (addOns || []).length > 0
    ? (addOns || []).map(() => ({ addOnId: "skip", quantity: 1 }))
    : undefined;

  // We need the actual add-on IDs for proper computation, but since the rows
  // already exist in DB with correct prices, we can sum them directly.
  const addOnsDbTotal = (addOns || []).reduce((s: number, a: any) => s + roundCents(Number(a.price)), 0);
  const driversDbTotal = (drivers || []).reduce((s: number, d: any) => s + roundCents(Number(d.young_driver_fee)), 0);

  // Recompute base totals (without add-ons/drivers — we'll add DB totals)
  const serverTotals = await computeBookingTotals({
    vehicleId: booking.vehicle_id,
    startAt: booking.start_at,
    endAt: booking.end_at,
    protectionPlan: booking.protection_plan || undefined,
    driverAgeBand: booking.driver_age_band || undefined,
    deliveryFee: Number(booking.delivery_fee) || 0,
    differentDropoffFee: Number(booking.different_dropoff_fee) || 0,
    // Omit addOns and additionalDrivers — we use DB totals directly
  });

  // Rebuild subtotal with DB-sourced add-on/driver totals
  const newSubtotal = roundCents(
    serverTotals.subtotal + addOnsDbTotal + driversDbTotal
  );

  const PST_RATE = 0.07;
  const GST_RATE = 0.05;
  const newTax = roundCents(roundCents(newSubtotal * PST_RATE) + roundCents(newSubtotal * GST_RATE));
  const newTotal = roundCents(newSubtotal + newTax);

  await supabaseAdmin
    .from("bookings")
    .update({
      subtotal: newSubtotal,
      tax_amount: newTax,
      total_amount: newTotal,
    })
    .eq("id", booking.id);
}
