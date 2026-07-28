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

    // Set when a modify operation pushes the return date later (a rental extension)
    let extensionInfo: {
      previousEndAt: string;
      newEndAt: string;
      reason: string | null;
    } | null = null;

    if (operation === "modify") {
      // Extend/shorten rental, change dates, location, optionally override daily rate
      const { newEndAt, newStartAt, newDailyRate, newLocationId, reason, preserveExtrasPrices } = body;
      if (!newEndAt && !newDailyRate && !newStartAt && !newLocationId) {
        return jsonResp({ error: "Missing modification parameters" }, 400, corsHeaders);
      }

      const isExtension = !!newEndAt && new Date(newEndAt) > new Date(booking.end_at);
      if (isExtension) {
        extensionInfo = {
          previousEndAt: booking.end_at,
          newEndAt,
          reason: typeof reason === "string" ? reason.slice(0, 500) : null,
        };
      }



      if (!["draft", "pending", "confirmed", "active", "overdue"].includes(booking.status)) {
        return jsonResp({ error: "Only pending/confirmed/active/overdue bookings can be modified" }, 400, corsHeaders);
      }

      const upgradeFee = Number(booking.upgrade_daily_fee) || 0;
      const effectiveStartAt = newStartAt || booking.start_at;
      const effectiveEndAt = newEndAt || booking.end_at;
      const effectiveLocationId = newLocationId || booking.location_id;

      // Validate dates
      if (new Date(effectiveEndAt) <= new Date(effectiveStartAt)) {
        return jsonResp({ error: "Return date must be after pickup date" }, 400, corsHeaders);
      }

      // If daily rate override provided, use it; otherwise preserve booking's stored rate
      const overrideRate = newDailyRate ? Number(newDailyRate) : null;
      const effectiveDailyRate = overrideRate ?? Number(booking.daily_rate);

      // When preserveExtrasPrices is set (mid-rental upsell), compute the engine
      // WITHOUT add-ons/drivers and then add the actual persisted row sums.
      const serverTotals = await computeBookingTotals({
        vehicleId: booking.vehicle_id,
        startAt: effectiveStartAt,
        endAt: effectiveEndAt,
        protectionPlan: booking.protection_plan || undefined,
        addOns: preserveExtrasPrices ? undefined : (addOnInputs.length > 0 ? addOnInputs : undefined),
        additionalDrivers: preserveExtrasPrices ? undefined : (driverInputs.length > 0 ? driverInputs : undefined),
        driverAgeBand: booking.driver_age_band || undefined,
        deliveryFee,
        locationId: effectiveLocationId,
        returnLocationId: booking.return_location_id,
        overrideDailyRate: effectiveDailyRate,
      });

      let extrasRowsTotal = 0;
      if (preserveExtrasPrices) {
        const { data: addOnPriceRows } = await supabase
          .from("booking_add_ons")
          .select("price")
          .eq("booking_id", bookingId);
        const { data: driverFeeRows } = await supabase
          .from("booking_additional_drivers")
          .select("young_driver_fee")
          .eq("booking_id", bookingId);
        const addOnSum = (addOnPriceRows || []).reduce((s: number, r: any) => s + Number(r.price || 0), 0);
        const driverSum = (driverFeeRows || []).reduce((s: number, r: any) => s + Number(r.young_driver_fee || 0), 0);
        extrasRowsTotal = roundCents(addOnSum + driverSum);
      }

      // If upgrade fee exists, add it to the canonical totals
      let finalSubtotal = roundCents(serverTotals.subtotal + extrasRowsTotal);
      let finalTaxAmount = preserveExtrasPrices
        ? roundCents(finalSubtotal * 0.07) + roundCents(finalSubtotal * 0.05)
        : serverTotals.taxAmount;
      let finalTotal = roundCents(finalSubtotal + finalTaxAmount);
      if (upgradeFee > 0) {
        const upgradeTotal = roundCents(upgradeFee * serverTotals.days);
        finalSubtotal = roundCents(finalSubtotal + upgradeTotal);
        const pst = roundCents(finalSubtotal * 0.07);
        const gst = roundCents(finalSubtotal * 0.05);
        finalTaxAmount = roundCents(pst + gst);
        finalTotal = roundCents(finalSubtotal + finalTaxAmount);
      }

      oldData = {
        start_at: booking.start_at, end_at: booking.end_at, total_days: booking.total_days,
        daily_rate: booking.daily_rate, location_id: booking.location_id,
        subtotal: booking.subtotal, tax_amount: booking.tax_amount, total_amount: booking.total_amount,
      };

      updateData = {
        start_at: effectiveStartAt,
        end_at: effectiveEndAt,
        total_days: serverTotals.days,
        subtotal: finalSubtotal,
        tax_amount: finalTaxAmount,
        total_amount: finalTotal,
        young_driver_fee: serverTotals.youngDriverFee,
        weekend_surcharge: serverTotals.weekendSurcharge,
        duration_discount: serverTotals.durationDiscount,
        different_dropoff_fee: serverTotals.differentDropoffFee,
      };
      if (overrideRate !== null) {
        updateData.daily_rate = overrideRate;
      }
      // Handle location change
      if (newLocationId && newLocationId !== booking.location_id) {
        updateData.location_id = newLocationId;
        // Clear vehicle assignment when location changes
        updateData.vehicle_id = null;
        updateData.assigned_unit_id = null;
        // Release VIN if one was assigned
        if (booking.assigned_unit_id) {
          try {
            await supabase.rpc("release_vin_from_booking", { p_booking_id: booking.id });
          } catch (e) {
            console.error("[reprice-booking] Failed to release VIN on location change:", e);
          }
        }
      }
      auditAction = "booking_modified";

    } else if (operation === "upgrade") {
      // Apply upgrade fee
      const { upgradeDailyFee, showToCustomer, categoryLabel, upgradeReason, assignUnitId, assignUnitCategoryId } = body;
      const fee = Number(upgradeDailyFee) || 0;

      const currentUpgradeFee = Number(booking.upgrade_daily_fee) || 0;

      // Compute canonical totals (without upgrade fee) then add upgrade
      // Always use the booking's stored daily_rate so category changes don't override admin-intended rate
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
        overrideDailyRate: Number(booking.daily_rate),
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
        total_days: serverTotals.days,
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
      // Use booking's stored daily_rate to preserve admin-intended rate after category changes
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
        overrideDailyRate: Number(booking.daily_rate),
      });

      oldData = {
        upgrade_daily_fee: currentUpgradeFee,
        total_amount: booking.total_amount,
      };

      updateData = {
        upgrade_daily_fee: 0,
        upgrade_category_label: null,
        upgrade_visible_to_customer: false,
        total_days: serverTotals.days,
        subtotal: serverTotals.subtotal,
        tax_amount: serverTotals.taxAmount,
        total_amount: serverTotals.total,
        different_dropoff_fee: serverTotals.differentDropoffFee,
      };
      auditAction = "upgrade_fee_removed";

    } else if (operation === "update_time_only") {
      // Update pickup/return timestamps WITHOUT recalculating any financial fields
      const { newStartAt, newEndAt } = body;
      if (!newStartAt && !newEndAt) {
        return jsonResp({ error: "Missing newStartAt or newEndAt" }, 400, corsHeaders);
      }

      if (!["draft", "pending", "confirmed", "active", "overdue"].includes(booking.status)) {
        return jsonResp({ error: "Only pending/confirmed/active/overdue bookings can be modified" }, 400, corsHeaders);
      }

      const effectiveStartAt = newStartAt || booking.start_at;
      const effectiveEndAt = newEndAt || booking.end_at;

      if (new Date(effectiveEndAt) <= new Date(effectiveStartAt)) {
        return jsonResp({ error: "Return date must be after pickup date" }, 400, corsHeaders);
      }

      oldData = {
        start_at: booking.start_at,
        end_at: booking.end_at,
      };

      updateData = {};
      if (newStartAt) updateData.start_at = newStartAt;
      if (newEndAt) updateData.end_at = newEndAt;
      // NO financial field changes — preserves customer's agreed price
      auditAction = "booking_time_adjusted";

    } else if (operation === "change_protection") {
      // Change protection plan and recalculate totals
      const { newProtectionPlan } = body;
      if (newProtectionPlan === undefined) {
        return jsonResp({ error: "Missing newProtectionPlan" }, 400, corsHeaders);
      }

      const upgradeFee = Number(booking.upgrade_daily_fee) || 0;
      const effectivePlan = newProtectionPlan === "none" ? undefined : newProtectionPlan;

      const serverTotals = await computeBookingTotals({
        vehicleId: booking.vehicle_id,
        startAt: booking.start_at,
        endAt: booking.end_at,
        protectionPlan: effectivePlan,
        addOns: addOnInputs.length > 0 ? addOnInputs : undefined,
        additionalDrivers: driverInputs.length > 0 ? driverInputs : undefined,
        driverAgeBand: booking.driver_age_band || undefined,
        deliveryFee,
        locationId: booking.location_id,
        returnLocationId: booking.return_location_id,
        overrideDailyRate: Number(booking.daily_rate),
      });

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
        protection_plan: booking.protection_plan,
        subtotal: booking.subtotal, tax_amount: booking.tax_amount, total_amount: booking.total_amount,
      };

      updateData = {
        protection_plan: newProtectionPlan === "none" ? null : newProtectionPlan,
        total_days: serverTotals.days,
        subtotal: finalSubtotal,
        tax_amount: finalTaxAmount,
        total_amount: finalTotal,
        young_driver_fee: serverTotals.youngDriverFee,
        weekend_surcharge: serverTotals.weekendSurcharge,
        duration_discount: serverTotals.durationDiscount,
        different_dropoff_fee: serverTotals.differentDropoffFee,
      };
      auditAction = "protection_plan_changed";

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
      new_data: {
        ...updateData,
        operation,
        ...(extensionInfo ? { extension_odometer_km: extensionInfo.odometerKm } : {}),
      },
    });

    // Record the extension (odometer reading at time of extension) and keep the
    // vehicle's mileage in sync.
    let extensionRowId: string | null = null;
    if (extensionInfo) {
      const { data: extRow, error: extErr } = await supabase
        .from("booking_extensions")
        .insert({
          booking_id: bookingId,
          previous_end_at: extensionInfo.previousEndAt,
          new_end_at: extensionInfo.newEndAt,
          odometer_km: extensionInfo.odometerKm,
          previous_odometer_km: extensionInfo.previousOdometerKm,
          reason: extensionInfo.reason,
          price_difference:
            updateData.total_amount != null
              ? Number(updateData.total_amount) - Number(booking.total_amount || 0)
              : 0,
          recorded_by: authResult.userId,
        })
        .select("id")
        .maybeSingle();

      if (extErr) {
        console.error("[reprice-booking] Failed to record extension:", extErr);
      } else {
        extensionRowId = extRow?.id ?? null;
      }

      if (booking.assigned_unit_id) {
        await supabase
          .from("vehicle_units")
          .update({ current_mileage: extensionInfo.odometerKm, updated_at: new Date().toISOString() })
          .eq("id", booking.assigned_unit_id);
      }
    }

    // Keep the rental agreement in sync: when the billed days or the total change,
    // the stored agreement is stale (it still shows the pre-change figures).
    // Regenerate a fresh copy — generate-agreement preserves the prior record for history.
    const daysChanged = updateData.total_days != null
      && Number(updateData.total_days) !== Number(booking.total_days);
    const totalChanged = updateData.total_amount != null
      && Number(updateData.total_amount) !== Number(booking.total_amount);

    if (daysChanged || totalChanged || extensionInfo) {
      try {
        const { data: existingAgreement } = await supabase
          .from("rental_agreements")
          .select("id, customer_signed_at")
          .eq("booking_id", bookingId)
          .neq("status", "voided")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingAgreement) {
          const { data: regenData, error: regenErr } = await supabase.functions.invoke("generate-agreement", {
            body: {
              bookingId,
              forceRegenerate: true,
              suppressNotifications: true,
              copySignatureFromLatest: !!existingAgreement.customer_signed_at,
              ...(extensionInfo
                ? { agreementType: "extension", odometerOutOverride: extensionInfo.odometerKm }
                : {}),
            },
          });
          if (regenErr) {
            console.error("[reprice-booking] Agreement regeneration failed:", regenErr);
          } else {
            console.log(`[reprice-booking] Agreement regenerated for ${bookingId}`);
            if (extensionRowId && regenData?.agreementId) {
              await supabase
                .from("booking_extensions")
                .update({ agreement_id: regenData.agreementId })
                .eq("id", extensionRowId);
            }
          }
        }
      } catch (e) {
        console.error("[reprice-booking] Agreement sync error:", e);
      }
    }


    console.log(`[reprice-booking] ${operation} on ${bookingId}: total ${updateData.total_amount}`);


    return jsonResp({
      bookingId,
      operation,
      subtotal: updateData.subtotal ?? booking.subtotal,
      taxAmount: updateData.tax_amount ?? booking.tax_amount,
      total: updateData.total_amount ?? booking.total_amount,
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
