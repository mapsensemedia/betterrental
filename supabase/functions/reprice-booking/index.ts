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
import {
  computeProcessingFee,
  getProcessingFeeRate,
} from "../_shared/processing-fee.ts";

function roundCents(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Taxes + card processing fee for a given pre-tax subtotal.
 * Processing fee is a pass-through: tiered on the pre-tax subtotal, added after tax.
 */
function finalizeTotals(subtotal: number) {
  const pst = roundCents(subtotal * 0.07);
  const gst = roundCents(subtotal * 0.05);
  const taxAmount = roundCents(pst + gst);
  const processingFeeRate = getProcessingFeeRate(subtotal);
  const processingFee = computeProcessingFee(subtotal);
  return {
    taxAmount,
    processingFee,
    processingFeeRate,
    total: roundCents(subtotal + taxAmount + processingFee),
  };
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

    // Set when the stored (agreed) price differs from today's canonical price list.
    let pricingDrift: PricingDrift | null = null;

    // Delta actually applied by a modify (extension / shortening) operation.
    let deltaInfo: { deltaSubtotal: number; deltaTotal: number } | null = null;


    // Set when a modify operation pushes the return date later (a rental extension)
    let extensionInfo: {
      previousEndAt: string;
      newEndAt: string;
      reason: string | null;
    } | null = null;

    if (operation === "modify") {
      // Extend/shorten rental, change dates, location, optionally override daily rate
      const { newEndAt, newStartAt, newDailyRate, newLocationId, reason, preserveExtrasPrices } = body;

      // Extras (add-on / additional driver) charge that was just persisted by
      // persist-booking-extras and must be billed on top of any duration/rate
      // delta. Positive = added charge, negative = removed charge. Without this
      // an upsell with unchanged dates produces a $0 delta, the charge is never
      // added to the subtotal, and screens surface the gap as a fake discount.
      const rawExtrasDelta = Number(body?.extrasDeltaSubtotal ?? 0);
      const extrasDeltaSubtotal =
        Number.isFinite(rawExtrasDelta) && Math.abs(rawExtrasDelta) <= 100000
          ? roundCents(rawExtrasDelta)
          : 0;
      if (rawExtrasDelta && !extrasDeltaSubtotal) {
        console.error("[reprice-booking] Rejected invalid extrasDeltaSubtotal:", rawExtrasDelta);
      }

      if (!newEndAt && !newDailyRate && !newStartAt && !newLocationId && !extrasDeltaSubtotal) {
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

      // A rate override is only a real override when it DIFFERS from the stored
      // (customer-agreed) rate. Screens pre-fill the rate input with the booking's
      // own rate; treating that as an override would rebuild the whole booking
      // from today's rate card and silently bill the drift as "extension".
      const requestedRate = newDailyRate ? Number(newDailyRate) : null;
      const storedDailyRate = Number(booking.daily_rate) || 0;
      const overrideRate =
        requestedRate !== null && Number.isFinite(requestedRate) && requestedRate > 0 &&
        roundCents(requestedRate) !== roundCents(storedDailyRate)
          ? requestedRate
          : null;
      const effectiveDailyRate = overrideRate ?? storedDailyRate;

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




      const oldDays = Number(booking.total_days) || 0;
      const storedSubtotal = roundCents(Number(booking.subtotal) || 0);
      const storedUpgradeTotal = roundCents(upgradeFee * (oldDays || serverTotals.days));

      let finalSubtotal: number;
      let finalTaxAmount: number;
      let finalTotal: number;
      let deltaSubtotal = 0;
      // Itemization fields must move with the SAME delta as the subtotal, otherwise
      // the stored breakdown (weekend surcharge / duration discount) contradicts
      // the money and screens show inflated vehicle lines.
      let finalWeekendSurcharge = serverTotals.weekendSurcharge;
      let finalDurationDiscount = serverTotals.durationDiscount;

      {
        // DELTA ONLY — for duration AND rate changes alike. Never rebuild the whole
        // booking from today's rate card: long-term / negotiated prices below the
        // current card (and retired discounts baked into the agreed subtotal) would
        // otherwise be silently re-priced and billed as part of the "extension".
        //
        // engineOld runs the OLD dates at the OLD stored rate, engineNew (serverTotals)
        // the new dates at the new rate, so the delta carries both the duration change
        // and the rate difference across the billed days — and nothing else.
        const engineOld = await computeBookingTotals({
          vehicleId: booking.vehicle_id,
          startAt: booking.start_at,
          endAt: booking.end_at,
          protectionPlan: booking.protection_plan || undefined,
          addOns: preserveExtrasPrices ? undefined : (addOnInputs.length > 0 ? addOnInputs : undefined),
          additionalDrivers: preserveExtrasPrices ? undefined : (driverInputs.length > 0 ? driverInputs : undefined),
          driverAgeBand: booking.driver_age_band || undefined,
          deliveryFee,
          locationId: booking.location_id,
          returnLocationId: booking.return_location_id,
          overrideDailyRate: storedDailyRate,
        });

        // Duration/rate delta from the engine, plus the extras charge that was
        // just persisted (add-on line price or additional-driver fee, already
        // pro-rated when added mid-rental).
        deltaSubtotal = roundCents(
          (serverTotals.subtotal - engineOld.subtotal) + extrasDeltaSubtotal,
        );

        // Day-count correction: if the STORED total_days disagrees with the day
        // count the booking's own dates imply (legacy walk-ins quoted on calendar
        // dates instead of ceil(hours / 24)), total_days is about to be corrected
        // upward while the base rental stays priced for fewer days — surfacing as
        // a phantom "discount". Bill the missing days' base rate + daily
        // regulatory fees as part of this delta.
        const engineOldDays = Number(engineOld.days) || 0;
        if (oldDays > 0 && engineOldDays > 0 && engineOldDays !== oldDays) {
          const missingDays = engineOldDays - oldDays;
          const dayCountCorrection = roundCents(missingDays * (storedDailyRate + 2.50));
          deltaSubtotal = roundCents(deltaSubtotal + dayCountCorrection);
          console.warn("[reprice-booking] stored day count corrected", {
            bookingId: booking.id, storedDays: oldDays, actualDays: engineOldDays, dayCountCorrection,
          });
        }



        const baseStored = roundCents(storedSubtotal - storedUpgradeTotal);
        const newBase = roundCents(Math.max(baseStored + deltaSubtotal, 0));
        finalSubtotal = roundCents(newBase + roundCents(upgradeFee * serverTotals.days));

        // Carry the stored itemization forward by the engine delta only. A retired
        // discount that is baked into the agreed subtotal stays on the record; it is
        // never silently zeroed out (or re-derived) here.
        finalWeekendSurcharge = roundCents(
          Math.max(
            (Number(booking.weekend_surcharge) || 0) +
              roundCents(serverTotals.weekendSurcharge - engineOld.weekendSurcharge),
            0,
          ),
        );
        finalDurationDiscount = roundCents(
          Math.max(
            (Number(booking.duration_discount) || 0) +
              roundCents(serverTotals.durationDiscount - engineOld.durationDiscount),
            0,
          ),
        );


        // Drift is reported, never applied.
        pricingDrift = await detectPricingDrift(
          supabase,
          booking,
          addOnInputs,
          driverInputs,
          deliveryFee,
          baseStored,
        );
      }

      const finalFees = finalizeTotals(finalSubtotal);
      finalTaxAmount = finalFees.taxAmount;
      finalTotal = finalFees.total;

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
        processing_fee: finalFees.processingFee,
        processing_fee_rate: finalFees.processingFeeRate,
        total_amount: finalTotal,
        young_driver_fee: serverTotals.youngDriverFee,
        weekend_surcharge: finalWeekendSurcharge,
        duration_discount: finalDurationDiscount,
        different_dropoff_fee: serverTotals.differentDropoffFee,
      };
      deltaInfo = {
        deltaSubtotal,
        deltaTotal: roundCents(finalTotal - (Number(booking.total_amount) || 0)),
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
      // Apply upgrade fee — DELTA ONLY. The customer's agreed price is preserved;
      // we never silently re-derive the whole booking from current rate cards.
      const { upgradeDailyFee, showToCustomer, categoryLabel, upgradeReason, assignUnitId, assignUnitCategoryId } = body;
      const fee = Number(upgradeDailyFee) || 0;

      const currentUpgradeFee = Number(booking.upgrade_daily_fee) || 0;
      const days = Number(booking.total_days) || 1;

      const storedSubtotal = roundCents(Number(booking.subtotal) || 0);
      const currentUpgradeTotal = roundCents(currentUpgradeFee * days);
      const newUpgradeTotal = roundCents(fee * days);

      const finalSubtotal = roundCents(storedSubtotal - currentUpgradeTotal + newUpgradeTotal);
      const upgradeFees = finalizeTotals(finalSubtotal);
      const finalTaxAmount = upgradeFees.taxAmount;
      const finalTotal = upgradeFees.total;

      // Drift check (informational only — never applied silently)
      pricingDrift = await detectPricingDrift(
        supabase,
        booking,
        addOnInputs,
        driverInputs,
        deliveryFee,
        roundCents(storedSubtotal - currentUpgradeTotal),
      );

      oldData = {
        total_amount: booking.total_amount,
        subtotal: booking.subtotal,
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
        processing_fee: upgradeFees.processingFee,
        processing_fee_rate: upgradeFees.processingFeeRate,
        total_amount: finalTotal,
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
      // Remove upgrade fee — DELTA ONLY (mirror of the upgrade branch).
      const currentUpgradeFee = Number(booking.upgrade_daily_fee) || 0;
      const days = Number(booking.total_days) || 1;

      const storedSubtotal = roundCents(Number(booking.subtotal) || 0);
      const currentUpgradeTotal = roundCents(currentUpgradeFee * days);

      const finalSubtotal = roundCents(Math.max(storedSubtotal - currentUpgradeTotal, 0));
      const removalFees = finalizeTotals(finalSubtotal);
      const finalTaxAmount = removalFees.taxAmount;
      const finalTotal = removalFees.total;

      pricingDrift = await detectPricingDrift(
        supabase,
        booking,
        addOnInputs,
        driverInputs,
        deliveryFee,
        finalSubtotal,
      );

      oldData = {
        upgrade_daily_fee: currentUpgradeFee,
        subtotal: booking.subtotal,
        total_amount: booking.total_amount,
      };

      updateData = {
        upgrade_daily_fee: 0,
        upgrade_category_label: null,
        upgrade_visible_to_customer: false,
        subtotal: finalSubtotal,
        tax_amount: finalTaxAmount,
        processing_fee: removalFees.processingFee,
        processing_fee_rate: removalFees.processingFeeRate,
        total_amount: finalTotal,
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

    // Keep booking_additional_drivers.young_driver_fee in sync with the billed
    // duration. The pricing engine recomputes driver fees into the subtotal on
    // every reprice, so a stale row (e.g. 5-day fee on a shortened 4-day rental)
    // makes itemized breakdowns fail to reconcile and surfaces a phantom
    // "Discount / Adjustment" line. Skipped when extras prices are intentionally
    // preserved (mid-rental pro-rated upsells).
    const newTotalDays = updateData.total_days != null ? Number(updateData.total_days) : null;
    const preserveExtras = operation === "modify" && !!body?.preserveExtrasPrices;
    // An extras upsell bills the exact persisted (possibly pro-rated) amount —
    // never re-derive those rows to rate × total_days on the same call.
    const extrasDeltaApplied = operation === "modify"
      && Number(body?.extrasDeltaSubtotal ?? 0) !== 0;
    if (newTotalDays && newTotalDays > 0 && !preserveExtras && !extrasDeltaApplied
      && newTotalDays !== Number(booking.total_days)) {

      try {
        const { data: settingsRows } = await supabase
          .from("system_settings")
          .select("key, value")
          .in("key", ["additional_driver_daily_rate_standard", "additional_driver_daily_rate_young"]);
        const settings = new Map((settingsRows || []).map((r: any) => [r.key, Number(r.value)]));
        const standardRate = Number(settings.get("additional_driver_daily_rate_standard")) || 14.99;
        const youngRate = Number(settings.get("additional_driver_daily_rate_young")) || 19.99;

        const { data: rows } = await supabase
          .from("booking_additional_drivers")
          .select("id, driver_age_band, young_driver_fee")
          .eq("booking_id", bookingId);

        for (const row of rows || []) {
          const rate = row.driver_age_band === "20_24" ? youngRate : standardRate;
          const expected = roundCents(rate * newTotalDays);
          if (Number(row.young_driver_fee || 0) !== expected) {
            const { error: dErr } = await supabase
              .from("booking_additional_drivers")
              .update({ young_driver_fee: expected })
              .eq("id", row.id);
            if (dErr) {
              console.error("[reprice-booking] Failed to sync driver fee:", dErr);
            }
          }
        }
      } catch (e) {
        console.error("[reprice-booking] Driver fee sync failed:", e);
      }

      // Keep booking_add_ons.price in sync with the billed duration for the same
      // reason: the engine recomputes add-on charges into the subtotal, so a row
      // still priced for the old (shorter/longer) period makes the itemized
      // breakdown disagree with the stored total.
      try {
        const { data: addOnRows } = await supabase
          .from("booking_add_ons")
          .select("id, quantity, price, add_on_id, add_on:add_ons(daily_rate, one_time_fee)")
          .eq("booking_id", bookingId);

        for (const row of addOnRows || []) {
          const meta = (row as any).add_on;
          if (!meta) continue;
          const qty = Number((row as any).quantity) || 1;
          const dailyRate = Number(meta.daily_rate || 0);
          const oneTime = Number(meta.one_time_fee || 0);
          const expected = roundCents((dailyRate * newTotalDays + oneTime) * qty);
          if (Number((row as any).price || 0) !== expected) {
            const { error: aErr } = await supabase
              .from("booking_add_ons")
              .update({ price: expected })
              .eq("id", (row as any).id);
            if (aErr) {
              console.error("[reprice-booking] Failed to sync add-on price:", aErr);
            }
          }
        }
      } catch (e) {
        console.error("[reprice-booking] Add-on price sync failed:", e);
      }
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
      },
    });

    // Record the extension for history
    let extensionRowId: string | null = null;
    if (extensionInfo) {
      const { data: extRow, error: extErr } = await supabase
        .from("booking_extensions")
        .insert({
          booking_id: bookingId,
          previous_end_at: extensionInfo.previousEndAt,
          new_end_at: extensionInfo.newEndAt,
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
    }


    // Keep the rental agreement in sync: when the billed days or the total change,
    // the stored agreement is stale (it still shows the pre-change figures).
    // Regenerate a fresh copy — generate-agreement preserves the prior record for history.
    const daysChanged = updateData.total_days != null
      && Number(updateData.total_days) !== Number(booking.total_days);
    const totalChanged = updateData.total_amount != null
      && Number(updateData.total_amount) !== Number(booking.total_amount);

    let agreementRegenerated: boolean | null = null;
    let agreementError: string | null = null;

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
          agreementRegenerated = false;
          // Direct service-role call: supabase.functions.invoke() would forward a
          // key generate-agreement may not accept, and the failure was silent.
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const resp = await fetch(`${supabaseUrl}/functions/v1/generate-agreement`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
            },
            body: JSON.stringify({
              bookingId,
              forceRegenerate: true,
              suppressNotifications: true,
              copySignatureFromLatest: !!existingAgreement.customer_signed_at,
              ...(extensionInfo ? { agreementType: "extension" } : {}),
            }),
          });

          const regenText = await resp.text();
          let regenData: any = null;
          try { regenData = JSON.parse(regenText); } catch (_) { /* non-JSON */ }

          if (!resp.ok) {
            agreementError = `generate-agreement ${resp.status}: ${regenText.slice(0, 300)}`;
            console.error("[reprice-booking] Agreement regeneration failed:", agreementError);
          } else {
            agreementRegenerated = true;
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
        agreementRegenerated = false;
        agreementError = e instanceof Error ? e.message : String(e);
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
      agreementRegenerated,
      agreementError,
      pricingDrift,
      deltaSubtotal: deltaInfo?.deltaSubtotal ?? null,
      deltaTotal: deltaInfo?.deltaTotal ?? null,

    }, 200, corsHeaders);


  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, corsHeaders);
    console.error("[reprice-booking] Error:", err);
    return jsonResp({ error: "Internal server error" }, 500, corsHeaders);
  }
});

interface PricingDrift {
  storedSubtotal: number;
  canonicalSubtotal: number;
  difference: number;
}

/**
 * Compares the booking's stored (customer-agreed) subtotal against the canonical
 * engine price. Purely informational: the caller applies a delta and reports drift
 * instead of silently absorbing it into the new total.
 */
async function detectPricingDrift(
  supabase: any,
  booking: any,
  addOnInputs: { addOnId: string; quantity: number }[],
  driverInputs: any[],
  deliveryFee: number,
  storedSubtotalExUpgrade: number,
): Promise<PricingDrift | null> {
  try {
    const canonical = await computeBookingTotals({
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

    const difference = roundCents(storedSubtotalExUpgrade - canonical.subtotal);
    if (Math.abs(difference) <= 0.5) return null;

    const drift: PricingDrift = {
      storedSubtotal: storedSubtotalExUpgrade,
      canonicalSubtotal: roundCents(canonical.subtotal),
      difference,
    };

    await supabase.from("audit_logs").insert({
      action: "pricing_drift",
      entity_type: "booking",
      entity_id: booking.id,
      old_data: { stored_subtotal: drift.storedSubtotal },
      new_data: { canonical_subtotal: drift.canonicalSubtotal, difference },
    });

    console.warn(`[reprice-booking] pricing drift on ${booking.id}:`, drift);
    return drift;
  } catch (e) {
    console.error("[reprice-booking] drift check failed:", e);
    return null;
  }
}

function jsonResp(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
