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
        return await handleUpsellAdd(supabaseAdmin, booking, body, corsHeaders, auth.userId, req);
      } else {
        return await handleUpsellRemove(supabaseAdmin, booking, body, corsHeaders, auth.userId, req);
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


// ── Staff upsell: add a single add-on (canonical pricing) ───────
async function handleUpsellAdd(
  supabaseAdmin: any,
  booking: any,
  body: any,
  corsHeaders: Record<string, string>,
  userId: string,
  req: Request,
): Promise<Response> {
  const { bookingId, addOnId, quantity } = body;
  if (!addOnId) {
    return new Response(
      JSON.stringify({ error: "addOnId required", errorCode: "MISSING_ADDON_ID" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const qty = Math.min(10, Math.max(1, Number(quantity) || 1));

  // Validate add-on exists
  const { data: addOnRow, error: aoErr } = await supabaseAdmin
    .from("add_ons")
    .select("id, name")
    .eq("id", addOnId)
    .eq("is_active", true)
    .single();

  if (aoErr || !addOnRow) {
    return new Response(
      JSON.stringify({ error: "Invalid or inactive add-on", errorCode: "INVALID_ADDON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Read existing booking_add_ons to build full context for computeBookingTotals
  const { data: existingAddOns } = await supabaseAdmin
    .from("booking_add_ons")
    .select("add_on_id, quantity")
    .eq("booking_id", bookingId);

  // Merge: replace quantity if addOnId exists, else append
  const addOnMap = new Map<string, number>();
  for (const row of (existingAddOns || [])) {
    addOnMap.set(row.add_on_id, Number(row.quantity) || 1);
  }
  addOnMap.set(addOnId, qty);

  const mergedAddOns = Array.from(addOnMap.entries()).map(([id, q]) => ({
    addOnId: id,
    quantity: q,
  }));

  // Read existing additional drivers for full context
  const { data: existingDrivers } = await supabaseAdmin
    .from("booking_additional_drivers")
    .select("driver_name, driver_age_band, young_driver_fee")
    .eq("booking_id", bookingId);

  const driverInputs = (existingDrivers || []).map((d: any) => ({
    driverName: d.driver_name || null,
    driverAgeBand: d.driver_age_band || "25_70",
    youngDriverFee: 0, // computed by engine
  }));

  // Compute canonical totals with full add-on + driver context
  const serverTotals = await computeBookingTotals({
    vehicleId: booking.vehicle_id,
    startAt: booking.start_at,
    endAt: booking.end_at,
    protectionPlan: booking.protection_plan || undefined,
    addOns: mergedAddOns,
    additionalDrivers: driverInputs.length > 0 ? driverInputs : undefined,
    driverAgeBand: booking.driver_age_band || undefined,
    deliveryFee: Number(booking.delivery_fee) || 0,
    differentDropoffFee: Number(booking.different_dropoff_fee) || 0,
  });

  // Find the computed price for this specific add-on
  const computedEntry = serverTotals.addOnPrices.find(p => p.addOnId === addOnId);
  if (!computedEntry) {
    return new Response(
      JSON.stringify({ error: "Add-on excluded by pricing engine (e.g. Premium Roadside with All Inclusive)", errorCode: "ADDON_EXCLUDED" }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Persist: upsert using delete-then-insert (no unique constraint on booking_id+add_on_id)
  // Check if row already exists
  const { data: existingRow } = await supabaseAdmin
    .from("booking_add_ons")
    .select("id, price, quantity")
    .eq("booking_id", bookingId)
    .eq("add_on_id", addOnId)
    .maybeSingle();

  const oldData = existingRow
    ? { addOnId, quantity: existingRow.quantity, price: Number(existingRow.price) }
    : null;

  if (existingRow) {
    // Update existing row
    const { error: updateErr } = await supabaseAdmin
      .from("booking_add_ons")
      .update({ price: computedEntry.price, quantity: computedEntry.quantity })
      .eq("id", existingRow.id);

    if (updateErr) {
      console.error("[persist-booking-extras] upsell-add update failed:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update add-on", errorCode: "EXTRAS_PERSIST_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } else {
    // Insert new row
    const { error: insertErr } = await supabaseAdmin
      .from("booking_add_ons")
      .insert({
        booking_id: bookingId,
        add_on_id: addOnId,
        price: computedEntry.price,
        quantity: computedEntry.quantity,
      });

    if (insertErr) {
      console.error("[persist-booking-extras] upsell-add insert failed:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to add add-on", errorCode: "EXTRAS_PERSIST_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Audit log
  await supabaseAdmin.from("audit_logs").insert({
    action: "booking_addon_upsell_add",
    entity_type: "booking",
    entity_id: bookingId,
    user_id: userId,
    old_data: oldData,
    new_data: { addOnId, addOnName: addOnRow.name, quantity: computedEntry.quantity, computedPrice: computedEntry.price },
  });

  // Reprice booking totals via canonical reprice-booking edge function
  await invokeRepriceBooking(bookingId, booking.end_at, req);

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}


// ── Staff upsell: remove a single add-on (with audit) ───────────
async function handleUpsellRemove(
  supabaseAdmin: any,
  booking: any,
  body: any,
  corsHeaders: Record<string, string>,
  userId: string,
  req: Request,
): Promise<Response> {
  const { bookingId, bookingAddOnId, addOnId } = body;
  // Support both bookingAddOnId (row id) and addOnId (add_on_id)
  const lookupById = !!bookingAddOnId;

  if (!bookingAddOnId && !addOnId) {
    return new Response(
      JSON.stringify({ error: "bookingAddOnId or addOnId required", errorCode: "MISSING_IDENTIFIER" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Find the row to remove
  let query = supabaseAdmin
    .from("booking_add_ons")
    .select("id, add_on_id, price, quantity")
    .eq("booking_id", bookingId);

  if (lookupById) {
    query = query.eq("id", bookingAddOnId);
  } else {
    query = query.eq("add_on_id", addOnId);
  }

  const { data: existing } = await query.maybeSingle();

  if (!existing) {
    return new Response(
      JSON.stringify({ error: "Add-on not found on this booking", errorCode: "ADDON_NOT_FOUND" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Capture old data for audit before deletion
  const oldData = {
    addOnId: existing.add_on_id,
    quantity: existing.quantity,
    price: Number(existing.price),
  };

  // Delete the row
  const { error: delErr } = await supabaseAdmin
    .from("booking_add_ons")
    .delete()
    .eq("id", existing.id);

  if (delErr) {
    console.error("[persist-booking-extras] upsell-remove delete failed:", delErr);
    return new Response(
      JSON.stringify({ error: "Failed to remove add-on", errorCode: "EXTRAS_PERSIST_FAILED" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Audit log (captures what was deleted)
  await supabaseAdmin.from("audit_logs").insert({
    action: "booking_addon_upsell_remove",
    entity_type: "booking",
    entity_id: bookingId,
    user_id: userId,
    old_data: oldData,
    new_data: null,
  });

  // Reprice booking totals via canonical reprice-booking edge function
  await invokeRepriceBooking(bookingId, booking.end_at, req);

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}


// ── Invoke reprice-booking edge function (canonical totals writer) ──
async function invokeRepriceBooking(
  bookingId: string,
  currentEndAt: string,
  originalReq: Request,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const resp = await fetch(
    `${supabaseUrl}/functions/v1/reprice-booking`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: originalReq.headers.get("Authorization") || `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({
        bookingId,
        operation: "modify",
        newEndAt: currentEndAt,
        reason: "upsell_reprice",
      }),
    },
  );

  if (!resp.ok) {
    const errBody = await resp.text();
    console.error("[persist-booking-extras] reprice-booking failed:", resp.status, errBody);
  }
}

