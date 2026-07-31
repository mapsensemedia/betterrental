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
 * Drop-off fees are always recomputed from location IDs (never static).
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

    // Fetch booking — include location IDs for canonical drop-off fee computation
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, vehicle_id, start_at, end_at, status, protection_plan, driver_age_band, delivery_fee, different_dropoff_fee, subtotal, tax_amount, total_amount, location_id, return_location_id")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Staff upsell actions ──────────────────────────────────────
    if (action === "upsell-add" || action === "upsell-remove" || action === "upsell-driver-add" || action === "upsell-driver-remove") {
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
      } else if (action === "upsell-remove") {
        return await handleUpsellRemove(supabaseAdmin, booking, body, corsHeaders, auth.userId, req);
      } else if (action === "upsell-driver-add") {
        return await handleUpsellDriverAdd(supabaseAdmin, booking, body, corsHeaders, auth.userId, req);
      } else {
        return await handleUpsellDriverRemove(supabaseAdmin, booking, body, corsHeaders, auth.userId, req);
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

    // P0 FIX: Pass locationId + returnLocationId for canonical drop-off fee computation
    const serverTotals = await computeBookingTotals({
      vehicleId: booking.vehicle_id,
      startAt: booking.start_at,
      endAt: booking.end_at,
      protectionPlan: booking.protection_plan || undefined,
      addOns: addOnInputs.length > 0 ? addOnInputs : undefined,
      additionalDrivers: driverInputs.length > 0 ? driverInputs : undefined,
      driverAgeBand: booking.driver_age_band || undefined,
      deliveryFee: Number(booking.delivery_fee) || 0,
      locationId: booking.location_id,
      returnLocationId: booking.return_location_id,
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

  // P0 FIX: Pass locationId + returnLocationId for canonical drop-off fee computation
  const serverTotals = await computeBookingTotals({
    vehicleId: booking.vehicle_id,
    startAt: booking.start_at,
    endAt: booking.end_at,
    protectionPlan: booking.protection_plan || undefined,
    addOns: mergedAddOns,
    additionalDrivers: driverInputs.length > 0 ? driverInputs : undefined,
    driverAgeBand: booking.driver_age_band || undefined,
    deliveryFee: Number(booking.delivery_fee) || 0,
    locationId: booking.location_id,
    returnLocationId: booking.return_location_id,
  });

  // Find the computed price for this specific add-on
  const computedEntry = serverTotals.addOnPrices.find(p => p.addOnId === addOnId);
  if (!computedEntry) {
    return new Response(
      JSON.stringify({ error: "Add-on excluded by pricing engine (e.g. Premium Roadside with All Inclusive)", errorCode: "ADDON_EXCLUDED" }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Mid-rental pro-rata: if booking is already active and pickup time has passed,
  // charge the new add-on only for remaining days (ceil from now → end_at).
  let proRataInfo: { mode: string; remainingDays: number; fullDays: number; originalPrice: number } | null = null;
  if (booking.status === "active" && new Date(booking.start_at).getTime() < Date.now()) {
    const fullDays = serverTotals.days;
    const remainingDays = computeRemainingDays(booking.end_at);
    if (remainingDays > 0 && remainingDays < fullDays) {
      const { data: addOnPricing } = await supabaseAdmin
        .from("add_ons")
        .select("name, daily_rate, one_time_fee")
        .eq("id", addOnId)
        .single();
      if (addOnPricing) {
        const isFuel = String(addOnPricing.name || "").toLowerCase().includes("fuel");
        let newPrice: number;
        if (isFuel) {
          newPrice = round2(Number(addOnPricing.one_time_fee ?? addOnPricing.daily_rate ?? 0));
        } else {
          const daily = round2(Number(addOnPricing.daily_rate ?? 0) * remainingDays * computedEntry.quantity);
          const oneTime = round2(Number(addOnPricing.one_time_fee ?? 0) * computedEntry.quantity);
          newPrice = round2(daily + oneTime);
        }
        proRataInfo = { mode: "mid-rental", remainingDays, fullDays, originalPrice: computedEntry.price };
        computedEntry.price = newPrice;
      }
    }
  }


  // Persist: upsert using delete-then-insert (no unique constraint on booking_id+add_on_id)
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
    new_data: { addOnId, addOnName: addOnRow.name, quantity: computedEntry.quantity, computedPrice: computedEntry.price, proRata: proRataInfo },
  });

  // Reprice booking totals via canonical reprice-booking edge function.
  // When mid-rental pro-rata was applied, ask reprice to preserve the row prices
  // (sum them) rather than recomputing add-ons/drivers from full duration.
  const reprice = await invokeRepriceBooking(bookingId, booking.end_at, req, corsHeaders, !!proRataInfo);
  if (reprice.errorResponse) return reprice.errorResponse;

  return await buildUpsellResponse(supabaseAdmin, bookingId, reprice.data, corsHeaders);

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
  const lookupById = !!bookingAddOnId;

  if (!bookingAddOnId && !addOnId) {
    return new Response(
      JSON.stringify({ error: "bookingAddOnId or addOnId required", errorCode: "MISSING_IDENTIFIER" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

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

  const oldData = {
    addOnId: existing.add_on_id,
    quantity: existing.quantity,
    price: Number(existing.price),
  };

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

  await supabaseAdmin.from("audit_logs").insert({
    action: "booking_addon_upsell_remove",
    entity_type: "booking",
    entity_id: bookingId,
    user_id: userId,
    old_data: oldData,
    new_data: null,
  });

  // Reprice booking totals via canonical reprice-booking edge function
  const reprice = await invokeRepriceBooking(bookingId, booking.end_at, req, corsHeaders);
  if (reprice.errorResponse) return reprice.errorResponse;

  return await buildUpsellResponse(supabaseAdmin, bookingId, reprice.data, corsHeaders);

}


// ── Staff upsell: add an additional driver ──────────────────────────
async function handleUpsellDriverAdd(
  supabaseAdmin: any,
  booking: any,
  body: any,
  corsHeaders: Record<string, string>,
  userId: string,
  req: Request,
): Promise<Response> {
  const { bookingId, driverName, driverAgeBand } = body;
  const ageBand = driverAgeBand || "25_70";

  if (!["20_24", "25_70"].includes(ageBand)) {
    return new Response(
      JSON.stringify({ error: "Invalid driver age band", errorCode: "INVALID_AGE_BAND" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Read existing drivers
  const { data: existingDrivers } = await supabaseAdmin
    .from("booking_additional_drivers")
    .select("driver_name, driver_age_band, young_driver_fee")
    .eq("booking_id", bookingId);

  if ((existingDrivers || []).length >= 5) {
    return new Response(
      JSON.stringify({ error: "Maximum 5 additional drivers allowed", errorCode: "MAX_DRIVERS" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const mergedDrivers = [
    ...(existingDrivers || []).map((d: any) => ({
      driverName: d.driver_name || null,
      driverAgeBand: d.driver_age_band || "25_70",
      youngDriverFee: 0,
    })),
    { driverName: driverName?.slice(0, 100) || null, driverAgeBand: ageBand, youngDriverFee: 0 },
  ];

  // Read existing add-ons for full context
  const { data: existingAddOns } = await supabaseAdmin
    .from("booking_add_ons")
    .select("add_on_id, quantity")
    .eq("booking_id", bookingId);

  const addOnInputs = (existingAddOns || []).map((a: any) => ({
    addOnId: a.add_on_id,
    quantity: Number(a.quantity) || 1,
  }));

  const serverTotals = await computeBookingTotals({
    vehicleId: booking.vehicle_id,
    startAt: booking.start_at,
    endAt: booking.end_at,
    protectionPlan: booking.protection_plan || undefined,
    addOns: addOnInputs.length > 0 ? addOnInputs : undefined,
    additionalDrivers: mergedDrivers,
    driverAgeBand: booking.driver_age_band || undefined,
    deliveryFee: Number(booking.delivery_fee) || 0,
    locationId: booking.location_id,
    returnLocationId: booking.return_location_id,
  });

  // Find the computed fee for the NEW driver (last record)
  const newDriverRecord = serverTotals.additionalDriverRecords[serverTotals.additionalDriverRecords.length - 1];
  if (!newDriverRecord) {
    return new Response(
      JSON.stringify({ error: "Driver fee computation failed", errorCode: "DRIVER_FEE_FAILED" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Mid-rental pro-rata for the additional driver fee
  let driverProRata: { mode: string; remainingDays: number; fullDays: number; originalFee: number } | null = null;
  if (booking.status === "active" && new Date(booking.start_at).getTime() < Date.now()) {
    const fullDays = serverTotals.days;
    const remainingDays = computeRemainingDays(booking.end_at);
    if (remainingDays > 0 && remainingDays < fullDays && fullDays > 0) {
      const perDay = round2(newDriverRecord.youngDriverFee / fullDays);
      const proRatedFee = round2(perDay * remainingDays);
      driverProRata = { mode: "mid-rental", remainingDays, fullDays, originalFee: newDriverRecord.youngDriverFee };
      newDriverRecord.youngDriverFee = proRatedFee;
    }
  }

  const { error: insertErr } = await supabaseAdmin
    .from("booking_additional_drivers")
    .insert({
      booking_id: bookingId,
      driver_name: newDriverRecord.driverName,
      driver_age_band: newDriverRecord.driverAgeBand,
      young_driver_fee: newDriverRecord.youngDriverFee,
    });

  if (insertErr) {
    console.error("[persist-booking-extras] upsell-driver-add insert failed:", insertErr);
    return new Response(
      JSON.stringify({ error: "Failed to add driver", errorCode: "EXTRAS_PERSIST_FAILED" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  await supabaseAdmin.from("audit_logs").insert({
    action: "booking_driver_upsell_add",
    entity_type: "booking",
    entity_id: bookingId,
    user_id: userId,
    old_data: null,
    new_data: { driverName: newDriverRecord.driverName, driverAgeBand: newDriverRecord.driverAgeBand, computedFee: newDriverRecord.youngDriverFee, proRata: driverProRata },
  });

  const reprice = await invokeRepriceBooking(bookingId, booking.end_at, req, corsHeaders, !!driverProRata);
  if (reprice.errorResponse) return reprice.errorResponse;

  return await buildUpsellResponse(supabaseAdmin, bookingId, reprice.data, corsHeaders);

}


// ── Staff upsell: remove an additional driver ───────────────────────
async function handleUpsellDriverRemove(
  supabaseAdmin: any,
  booking: any,
  body: any,
  corsHeaders: Record<string, string>,
  userId: string,
  req: Request,
): Promise<Response> {
  const { bookingId, driverRowId } = body;

  if (!driverRowId) {
    return new Response(
      JSON.stringify({ error: "driverRowId required", errorCode: "MISSING_DRIVER_ID" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("booking_additional_drivers")
    .select("id, driver_name, driver_age_band, young_driver_fee")
    .eq("id", driverRowId)
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (!existing) {
    return new Response(
      JSON.stringify({ error: "Driver not found on this booking", errorCode: "DRIVER_NOT_FOUND" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { error: delErr } = await supabaseAdmin
    .from("booking_additional_drivers")
    .delete()
    .eq("id", existing.id);

  if (delErr) {
    console.error("[persist-booking-extras] upsell-driver-remove delete failed:", delErr);
    return new Response(
      JSON.stringify({ error: "Failed to remove driver", errorCode: "EXTRAS_PERSIST_FAILED" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  await supabaseAdmin.from("audit_logs").insert({
    action: "booking_driver_upsell_remove",
    entity_type: "booking",
    entity_id: bookingId,
    user_id: userId,
    old_data: { driverName: existing.driver_name, driverAgeBand: existing.driver_age_band, fee: Number(existing.young_driver_fee) },
    new_data: null,
  });

  const reprice = await invokeRepriceBooking(bookingId, booking.end_at, req, corsHeaders);
  if (reprice.errorResponse) return reprice.errorResponse;

  return await buildUpsellResponse(supabaseAdmin, bookingId, reprice.data, corsHeaders);

}


// ── Helpers ─────────────────────────────────────────────────────────
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function computeRemainingDays(endAt: string): number {
  const eMs = new Date(endAt).getTime();
  const nMs = Date.now();
  return Math.max(1, Math.ceil((eMs - nMs) / (1000 * 60 * 60 * 24)));
}

// ── Invoke reprice-booking edge function (canonical totals writer) ──
interface RepriceOutcome {
  errorResponse: Response | null;
  data: any;
}

async function invokeRepriceBooking(
  bookingId: string,
  currentEndAt: string,
  originalReq: Request,
  corsHeaders: Record<string, string>,
  preserveExtrasPrices = false,
): Promise<RepriceOutcome> {
  const authHeader = originalReq.headers.get("Authorization");
  if (!authHeader) {
    console.error("[persist-booking-extras] invokeRepriceBooking: missing Authorization header");
    return {
      data: null,
      errorResponse: new Response(
        JSON.stringify({ error: "REPRICE_FAILED", errorCode: "MISSING_AUTH", details: "No Authorization header available for reprice call" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const resp = await fetch(
    `${supabaseUrl}/functions/v1/reprice-booking`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: anonKey,
      },
      body: JSON.stringify({
        bookingId,
        operation: "modify",
        newEndAt: currentEndAt,
        reason: "upsell_reprice",
        preserveExtrasPrices,
      }),
    },
  );

  const bodyText = await resp.text();

  if (!resp.ok) {
    console.error("[persist-booking-extras] reprice-booking failed:", resp.status, bodyText);
    return {
      data: null,
      errorResponse: new Response(
        JSON.stringify({ error: "REPRICE_FAILED", errorCode: "REPRICE_ERROR", details: bodyText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }

  let data: any = null;
  try { data = JSON.parse(bodyText); } catch (_) { /* non-JSON body */ }

  return { errorResponse: null, data };
}

// ── Build the upsell response: price delta + outstanding balance ─────
// Every counter upsell changes the booking total. Returning the delta and the
// amount already authorized prevents a silent uncollected balance (7HNPMA5E).
async function buildUpsellResponse(
  supabaseAdmin: any,
  bookingId: string,
  repriceData: any,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  let previousTotal = 0;
  let newTotal = 0;
  let authorizedTotal = 0;

  try {
    previousTotal = round2(Number(repriceData?.oldTotal) || 0);

    const { data: bookingRow } = await supabaseAdmin
      .from("bookings")
      .select("total_amount")
      .eq("id", bookingId)
      .maybeSingle();

    newTotal = round2(Number(bookingRow?.total_amount ?? repriceData?.total) || 0);

    // Rental money already secured (authorizations + captures), deposits excluded.
    const { data: paymentRows } = await supabaseAdmin
      .from("payments")
      .select("amount, status, payment_type")
      .eq("booking_id", bookingId);

    authorizedTotal = round2(
      (paymentRows || [])
        .filter((p: any) =>
          (p.payment_type || "rental") !== "deposit" &&
          ["authorized", "completed", "captured", "paid"].includes(String(p.status || "").toLowerCase())
        )
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
    );
  } catch (e) {
    console.error("[persist-booking-extras] buildUpsellResponse failed:", e);
  }

  const deltaTotal = round2(newTotal - previousTotal);
  const balanceDue = round2(Math.max(newTotal - authorizedTotal, 0));

  return new Response(
    JSON.stringify({
      ok: true,
      previousTotal,
      newTotal,
      deltaTotal,
      authorizedTotal,
      balanceDue,
      agreementRegenerated: repriceData?.agreementRegenerated ?? null,
      agreementError: repriceData?.agreementError ?? null,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

