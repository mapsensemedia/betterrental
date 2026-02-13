/**
 * reprice-booking — Server-side booking financial field updates
 *
 * Handles two operations:
 *   1. "modify" — Extend/shorten rental duration, recalculate totals
 *   2. "upgrade" — Apply/remove upgrade daily fee, recalculate total
 *   3. "remove_upgrade" — Remove upgrade fee and restore total
 *
 * All pricing is computed server-side from DB values.
 * Only admin/staff can call this function.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
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
import { computeDropoffFee } from "../_shared/booking-core.ts";

// ========== Pricing constants (mirror src/lib/pricing.ts) ==========
const PST_RATE = 0.07;
const GST_RATE = 0.05;
const PVRT_DAILY_FEE = 1.50;
const ACSRCH_DAILY_FEE = 1.00;
const WEEKEND_SURCHARGE_RATE = 0.15;
const WEEKLY_DISCOUNT_THRESHOLD = 7;
const WEEKLY_DISCOUNT_RATE = 0.10;
const MONTHLY_DISCOUNT_THRESHOLD = 21;
const MONTHLY_DISCOUNT_RATE = 0.20;
const YOUNG_DRIVER_FEE = 15;

function isWeekendPickup(dateStr: string): boolean {
  const day = new Date(dateStr).getUTCDay();
  return day === 5 || day === 6 || day === 0;
}

function getDurationDiscount(days: number): number {
  if (days >= MONTHLY_DISCOUNT_THRESHOLD) return MONTHLY_DISCOUNT_RATE;
  if (days >= WEEKLY_DISCOUNT_THRESHOLD) return WEEKLY_DISCOUNT_RATE;
  return 0;
}

function roundCents(v: number): number {
  return Math.round(v * 100) / 100;
}

interface ServerPricing {
  subtotal: number;
  taxAmount: number;
  total: number;
  youngDriverFee: number;
}

function computeTotals(
  dailyRate: number,
  rentalDays: number,
  protectionDailyRate: number,
  addOnsTotal: number,
  deliveryFee: number,
  differentDropoffFee: number,
  driverAgeBand: string | null,
  pickupDate: string,
  upgradeDailyFee: number,
): ServerPricing {
  const vehicleBase = dailyRate * rentalDays;
  const weekendSurcharge = isWeekendPickup(pickupDate) ? vehicleBase * WEEKEND_SURCHARGE_RATE : 0;
  const discountRate = getDurationDiscount(rentalDays);
  const vehicleAfterSurcharge = vehicleBase + weekendSurcharge;
  const durationDiscount = vehicleAfterSurcharge * discountRate;
  const vehicleTotal = vehicleAfterSurcharge - durationDiscount;

  const protectionTotal = protectionDailyRate * rentalDays;
  const pvrtTotal = PVRT_DAILY_FEE * rentalDays;
  const acsrchTotal = ACSRCH_DAILY_FEE * rentalDays;
  const youngDriverFee = driverAgeBand === "20_24" ? YOUNG_DRIVER_FEE * rentalDays : 0;
  const upgradeTotal = upgradeDailyFee * rentalDays;

  const subtotal = roundCents(
    vehicleTotal + protectionTotal + addOnsTotal + deliveryFee +
    differentDropoffFee + youngDriverFee + pvrtTotal + acsrchTotal + upgradeTotal
  );

  const pst = roundCents(subtotal * PST_RATE);
  const gst = roundCents(subtotal * GST_RATE);
  const taxAmount = roundCents(pst + gst);
  const total = roundCents(subtotal + taxAmount);

  return { subtotal, taxAmount, total, youngDriverFee };
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
        return_location_id
      `)
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) {
      return jsonResp({ error: "Booking not found" }, 404, corsHeaders);
    }

    // Get add-ons total
    const { data: addOns } = await supabase
      .from("booking_add_ons")
      .select("price, quantity")
      .eq("booking_id", bookingId);
    const addOnsTotal = (addOns || []).reduce((s, a) => s + Number(a.price), 0);

    // Get protection daily rate
    let protectionDailyRate = 0;
    if (booking.protection_plan && booking.protection_plan !== "none") {
      // Look up from system settings first, then fallback to known rates
      const { data: settings } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", `protection_${booking.protection_plan}_rate`)
        .maybeSingle();
      if (settings?.value) {
        protectionDailyRate = Number(settings.value);
      } else {
        // Fallback to hardcoded rates matching pricing.ts
        const RATES: Record<string, number> = { basic: 32.99, smart: 37.99, premium: 49.99 };
        protectionDailyRate = RATES[booking.protection_plan] || 0;
      }
    }

    const deliveryFee = Number(booking.delivery_fee) || 0;
    // Always recompute drop-off fee from location IDs (canonical, DB-driven)
    const differentDropoffFee = await computeDropoffFee(booking.location_id, booking.return_location_id);

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

      const start = new Date(booking.start_at);
      const newEnd = new Date(newEndAt);
      const hoursDiff = (newEnd.getTime() - start.getTime()) / (1000 * 60 * 60);
      const newDays = Math.max(1, Math.ceil(hoursDiff / 24));

      const upgradeFee = Number(booking.upgrade_daily_fee) || 0;
      const pricing = computeTotals(
        booking.daily_rate, newDays, protectionDailyRate, addOnsTotal,
        deliveryFee, differentDropoffFee, booking.driver_age_band, booking.start_at, upgradeFee,
      );

      oldData = {
        end_at: booking.end_at, total_days: booking.total_days,
        subtotal: booking.subtotal, tax_amount: booking.tax_amount, total_amount: booking.total_amount,
      };

      updateData = {
        end_at: newEndAt,
        total_days: newDays,
        subtotal: pricing.subtotal,
        tax_amount: pricing.taxAmount,
        total_amount: pricing.total,
        young_driver_fee: pricing.youngDriverFee,
        different_dropoff_fee: differentDropoffFee,
      };
      auditAction = "booking_modified";

    } else if (operation === "upgrade") {
      // Apply upgrade fee
      const { upgradeDailyFee, showToCustomer, categoryLabel, upgradeReason, assignUnitId, assignUnitCategoryId } = body;
      const fee = Number(upgradeDailyFee) || 0;

      const currentUpgradeFee = Number(booking.upgrade_daily_fee) || 0;
      // Recalculate total with new upgrade fee
      const pricing = computeTotals(
        booking.daily_rate, booking.total_days, protectionDailyRate, addOnsTotal,
        deliveryFee, differentDropoffFee, booking.driver_age_band, booking.start_at, fee,
      );

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
        subtotal: pricing.subtotal,
        tax_amount: pricing.taxAmount,
        total_amount: pricing.total,
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
      // Recalculate with zero upgrade
      const pricing = computeTotals(
        booking.daily_rate, booking.total_days, protectionDailyRate, addOnsTotal,
        deliveryFee, differentDropoffFee, booking.driver_age_band, booking.start_at, 0,
      );

      oldData = {
        upgrade_daily_fee: currentUpgradeFee,
        total_amount: booking.total_amount,
      };

      updateData = {
        upgrade_daily_fee: 0,
        upgrade_category_label: null,
        upgrade_visible_to_customer: false,
        subtotal: pricing.subtotal,
        tax_amount: pricing.taxAmount,
        total_amount: pricing.total,
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
