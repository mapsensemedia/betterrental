/**
 * reprice-booking — Server-side booking financial field updates
 *
 * Handles three operations:
 *   1. "modify" — Extend/shorten rental duration, recalculate totals
 *   2. "upgrade" — Apply upgrade daily fee, recalculate total
 *   3. "remove_upgrade" — Remove upgrade fee and restore total
 *
 * All pricing is computed server-side via canonical computeBookingTotals().
 * Only admin/staff can call this function.
 */
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
} from "../_shared/cors.ts";
import {
  getUserOrThrow,
  requireRoleOrThrow,
  getAdminClient,
  AuthError,
  authErrorResponse,
} from "../_shared/auth.ts";
import { computeBookingTotals } from "../_shared/booking-core.ts";

function roundCents(v: number): number {
  return Math.round(v * 100) / 100;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const authResult = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(authResult.userId, ["admin", "staff"], corsHeaders);

    const supabase = getAdminClient();
    const body = await req.json();
    const { bookingId, operation } = body;

    if (!bookingId || !operation) {
      return jsonResp({ error: "Missing bookingId or operation" }, 400, corsHeaders);
    }

    // Fetch booking with all pricing-relevant fields
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select(`
        id, start_at, end_at, daily_rate, total_days, subtotal,
        tax_amount, total_amount, vehicle_id, user_id, status,
        driver_age_band, protection_plan, young_driver_fee,
        delivery_fee, different_dropoff_fee, upgrade_daily_fee, location_id,
        return_location_id, assigned_unit_id
      `)
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) {
      return jsonResp({ error: "Booking not found" }, 404, corsHeaders);
    }

    // Read existing add-ons for full context
    const { data: addOnRows } = await supabase
      .from("booking_add_ons")
      .select("add_on_id, quantity")
      .eq("booking_id", bookingId);

    const addOnInputs = (addOnRows || []).map((a: any) => ({
      addOnId: a.add_on_id,
      quantity: Number(a.quantity) || 1,
    }));

    // Read existing additional drivers for full context
    const { data: driverRows } = await supabase
      .from("booking_additional_drivers")
      .select("driver_name, driver_age_band")
      .eq("booking_id", bookingId);

    const driverInputs = (driverRows || []).map((d: any) => ({
      driverName: d.driver_name || null,
      driverAgeBand: d.driver_age_band || "25_70",
      youngDriverFee: 0, // computed by engine
    }));

    const deliveryFee = Number(booking.delivery_fee) || 0;

    let updateData: Record<string, unknown> = {};
    let oldData: Record<string, unknown> = {};
    let auditAction = "";

    if (operation === "modify") {
      // Extend/shorten rental
      const { newEndAt, reason } = body;
      if (!newEndAt) return jsonResp({ error: "Missing newEndAt" }, 400, corsHeaders);

      if (!["pending", "confirmed", "active"].includes(booking.status)) {
        return jsonResp({ error: "Only pending/confirmed/active bookings can be modified" }, 400, corsHeaders);
      }

      const upgradeFee = Number(booking.upgrade_daily_fee) || 0;

      // Use canonical pricing engine for ALL totals
      const serverTotals = await computeBookingTotals({
        vehicleId: booking.vehicle_id,
        startAt: booking.start_at,
        endAt: newEndAt,
        protectionPlan: booking.protection_plan || undefined,
        addOns: addOnInputs.length > 0 ? addOnInputs : undefined,
        additionalDrivers: driverInputs.length > 0 ? driverInputs : undefined,
        driverAgeBand: booking.driver_age_band || undefined,
        deliveryFee,
        locationId: booking.location_id,
        returnLocationId: booking.return_location_id,
      });

      // If upgrade fee exists, add it to the canonical totals
      let finalSubtotal = serverTotals.subtotal;
      let finalTaxAmount = serverTotals.taxAmount;
      let finalTotal = serverTotals.total;
      if (upgradeFee > 0) {
        const upgradeTotal = roundCents(upgradeFee * serverTotals.days);
        finalSubtotal = roundCents(finalSubtotal + upgradeTotal);
        const pst = roundCents(finalSubtotal * 0.07);
        const gst = roundCents(finalSubtotal * 0.05);
        finalTaxAmount = roundCents(pst + gst);
        finalTotal = roundCents(finalSubtotal + finalTaxAmount);
      }

      oldData = {
        end_at: booking.end_at, total_days: booking.total_days,
        subtotal: booking.subtotal, tax_amount: booking.tax_amount, total_amount: booking.total_amount,
      };

      updateData = {
        end_at: newEndAt,
        total_days: serverTotals.days,
        subtotal: finalSubtotal,
        tax_amount: finalTaxAmount,
        total_amount: finalTotal,
        young_driver_fee: serverTotals.youngDriverFee,
        different_dropoff_fee: serverTotals.differentDropoffFee,
      };
      auditAction = "booking_modified";

    } else if (operation === "upgrade") {
      // Apply upgrade fee
      const { upgradeDailyFee, showToCustomer, categoryLabel, upgradeReason, assignUnitId, assignUnitCategoryId } = body;
      const fee = Number(upgradeDailyFee) || 0;

      const currentUpgradeFee = Number(booking.upgrade_daily_fee) || 0;

      // Compute canonical totals (without upgrade fee) then add upgrade
      const serverTotals = await computeBookingTotals({
        vehicleId: booking.vehicle_id,
        startAt: booking.start_at,
        endAt: booking.end_at,
        protectionPlan: booking.protection_plan || undefined,
        addOns: addOnInputs.length > 0 ? addOnInputs : undefined,
        additionalDrivers: driverInputs.length > 0 ? driverInputs : undefined,
        driverAgeBand: booking.driver_age_band || undefined,
        deliveryFee,
        locationId: booking.location_id,
        returnLocationId: booking.return_location_id,
      });

      // Add upgrade fee on top of canonical totals
      const upgradeTotal = roundCents(fee * serverTotals.days);
      const finalSubtotal = roundCents(serverTotals.subtotal + upgradeTotal);
      const pst = roundCents(finalSubtotal * 0.07);
      const gst = roundCents(finalSubtotal * 0.05);
      const finalTaxAmount = roundCents(pst + gst);
      const finalTotal = roundCents(finalSubtotal + finalTaxAmount);

      oldData = {
        total_amount: booking.total_amount,
        upgrade_daily_fee: currentUpgradeFee,
        vehicle_id: booking.vehicle_id,
      };

      updateData = {
        upgrade_daily_fee: fee,
        upgrade_category_label: showToCustomer ? (categoryLabel || null) : null,
        upgrade_visible_to_customer: !!showToCustomer,
        upgrade_reason: upgradeReason || null,
        upgraded_at: new Date().toISOString(),
        upgraded_by: authResult.userId,
        subtotal: finalSubtotal,
        tax_amount: finalTaxAmount,
        total_amount: finalTotal,
        different_dropoff_fee: serverTotals.differentDropoffFee,
      };

      // Handle unit assignment if provided
      if (assignUnitId) {
        if (booking.assigned_unit_id) {
          await supabase.rpc("release_vin_from_booking", { p_booking_id: booking.id });
        }
        await supabase.from("vehicle_units").update({ status: "on_rent" }).eq("id", assignUnitId);
        updateData.assigned_unit_id = assignUnitId;
        updateData.internal_unit_category_id = assignUnitCategoryId || null;
        if (assignUnitCategoryId) {
          updateData.original_vehicle_id = booking.vehicle_id;
          updateData.vehicle_id = assignUnitCategoryId;
        }
      }

      auditAction = assignUnitId ? "vehicle_upgrade_with_unit" : "upgrade_fee_applied";

    } else if (operation === "remove_upgrade") {
      const currentUpgradeFee = Number(booking.upgrade_daily_fee) || 0;

      // Compute canonical totals (no upgrade fee)
      const serverTotals = await computeBookingTotals({
        vehicleId: booking.vehicle_id,
        startAt: booking.start_at,
        endAt: booking.end_at,
        protectionPlan: booking.protection_plan || undefined,
        addOns: addOnInputs.length > 0 ? addOnInputs : undefined,
        additionalDrivers: driverInputs.length > 0 ? driverInputs : undefined,
        driverAgeBand: booking.driver_age_band || undefined,
        deliveryFee,
        locationId: booking.location_id,
        returnLocationId: booking.return_location_id,
      });

      oldData = {
        upgrade_daily_fee: currentUpgradeFee,
        total_amount: booking.total_amount,
      };

      updateData = {
        upgrade_daily_fee: 0,
        upgrade_category_label: null,
        upgrade_visible_to_customer: false,
        subtotal: serverTotals.subtotal,
        tax_amount: serverTotals.taxAmount,
        total_amount: serverTotals.total,
        different_dropoff_fee: serverTotals.differentDropoffFee,
      };
      auditAction = "upgrade_fee_removed";

    } else {
      return jsonResp({ error: `Unknown operation: ${operation}` }, 400, corsHeaders);
    }

    // Apply update
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (updateErr) {
      console.error("[reprice-booking] Update failed:", updateErr);
      return jsonResp({ error: "Failed to update booking" }, 500, corsHeaders);
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      action: auditAction,
      entity_type: "booking",
      entity_id: bookingId,
      user_id: authResult.userId,
      old_data: oldData,
      new_data: { ...updateData, operation },
    });

    console.log(`[reprice-booking] ${operation} on ${bookingId}: total ${updateData.total_amount}`);

    return jsonResp({
      bookingId,
      operation,
      subtotal: updateData.subtotal,
      taxAmount: updateData.tax_amount,
      total: updateData.total_amount,
      oldTotal: booking.total_amount,
    }, 200, corsHeaders);

  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, corsHeaders);
    console.error("[reprice-booking] Error:", err);
    return jsonResp({ error: "Internal server error" }, 500, corsHeaders);
  }
});

function jsonResp(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
