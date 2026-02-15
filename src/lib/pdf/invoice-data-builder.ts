/**
 * Invoice Data Builder
 * Fetches booking + join tables and builds InvoicePdfData using the same
 * deterministic breakdown logic as the shared FinancialBreakdown component.
 * This ensures the invoice PDF matches Ops Summary and customer views exactly.
 */
import { supabase } from "@/integrations/supabase/client";
import { PVRT_DAILY_FEE, ACSRCH_DAILY_FEE } from "@/lib/pricing";
import { getProtectionRateForCategory } from "@/lib/protection-groups";
import type { InvoicePdfData } from "./invoice-pdf";

// Protection plan display labels (same as FinancialBreakdown)
const PROTECTION_PLAN_LABELS: Record<string, string> = {
  premium: "All Inclusive Coverage",
  smart: "Smart Coverage",
  basic: "Basic Coverage",
  none: "No Coverage",
};

function toCents(n: number | string | null | undefined): number {
  return Math.round(Number(n || 0) * 100);
}
function fromCents(c: number): number {
  return c / 100;
}

async function fetchDriverFeeSettings(): Promise<{ standard: number; young: number }> {
  const DEFAULTS = { standard: 14.99, young: 19.99 };
  try {
    const { data } = await supabase
      .from("system_settings" as any)
      .select("key, value")
      .in("key", [
        "additional_driver_daily_rate_standard",
        "additional_driver_daily_rate_young",
        "additional_driver_daily_rate",
        "young_additional_driver_daily_rate",
      ]);
    const rows = (data ?? []) as unknown as { key: string; value: string }[];
    const get = (key: string) => {
      const r = rows.find((r) => r.key === key);
      return r ? parseFloat(r.value) || undefined : undefined;
    };
    return {
      standard: get("additional_driver_daily_rate_standard") ?? get("additional_driver_daily_rate") ?? DEFAULTS.standard,
      young: get("additional_driver_daily_rate_young") ?? get("young_additional_driver_daily_rate") ?? DEFAULTS.young,
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Build InvoicePdfData for a given booking, using the same source of truth
 * as the FinancialBreakdown component.
 */
export async function buildInvoicePdfData(
  bookingId: string,
  invoice: {
    invoice_number: string;
    status: string | null;
    issued_at: string | null;
    grand_total: number;
    rental_subtotal: number;
    taxes_total: number;
    late_fees: number | null;
    damage_charges: number | null;
    payments_received: number | null;
    amount_due: number | null;
    deposit_held: number | null;
    deposit_released: number | null;
    deposit_captured: number | null;
    notes: string | null;
  }
): Promise<InvoicePdfData> {
  // Fetch booking with all fields needed for breakdown
  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id, booking_code, start_at, end_at, total_days, daily_rate,
      subtotal, tax_amount, total_amount, deposit_amount,
      protection_plan, different_dropoff_fee, delivery_fee,
      young_driver_fee, upgrade_daily_fee, vehicle_id, user_id,
      location_id, return_location_id
    `)
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  // Parallel fetches
  const [
    { data: profile },
    { data: category },
    { data: addOns },
    { data: drivers },
    { data: pickupLoc },
    { data: returnLoc },
    driverFees,
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, email, phone").eq("id", booking.user_id).maybeSingle(),
    supabase.from("vehicle_categories").select("name").eq("id", booking.vehicle_id).maybeSingle(),
    supabase.from("booking_add_ons").select("id, price, quantity, add_on:add_ons(name, daily_rate, one_time_fee)").eq("booking_id", bookingId),
    supabase.from("booking_additional_drivers").select("id, driver_name, driver_age_band, young_driver_fee").eq("booking_id", bookingId),
    supabase.from("locations").select("name, address, city").eq("id", booking.location_id).maybeSingle(),
    booking.return_location_id
      ? supabase.from("locations").select("name, address, city").eq("id", booking.return_location_id).maybeSingle()
      : Promise.resolve({ data: null }),
    fetchDriverFeeSettings(),
  ]);

  const totalDays = booking.total_days ?? 0;
  const vehicleCat = category?.name || "";
  const bookingAddOns = addOns || [];
  const additionalDrivers = drivers || [];

  // ── Same calculation logic as FinancialBreakdown ──
  const vehicleBaseCents = toCents(booking.daily_rate) * totalDays;

  const plan = booking.protection_plan && booking.protection_plan !== "none"
    ? getProtectionRateForCategory(booking.protection_plan, vehicleCat)
    : null;
  const protectionCents = plan ? toCents(plan.rate) * totalDays : 0;

  const addOnsCents = bookingAddOns.reduce((sum: number, a: any) => sum + toCents(a.price), 0);

  const driversCents = additionalDrivers.reduce((sum: number, d: any) => {
    const fee = Number(d.young_driver_fee);
    if (fee > 0) return sum + toCents(fee);
    const rate = d.driver_age_band === "20_24" ? driverFees.young : driverFees.standard;
    return sum + toCents(rate) * totalDays;
  }, 0);

  const youngRenterCents = toCents(booking.young_driver_fee);
  const dropoffCents = toCents(booking.different_dropoff_fee);
  const deliveryCents = toCents(booking.delivery_fee);
  const upgradeDailyCents = toCents(booking.upgrade_daily_fee);
  const upgradeCents = upgradeDailyCents > 0 ? upgradeDailyCents * totalDays : 0;
  const pvrtCents = toCents(PVRT_DAILY_FEE) * totalDays;
  const acsrchCents = toCents(ACSRCH_DAILY_FEE) * totalDays;

  // Derive vehicle remainder (same as FinancialBreakdown)
  const dbSubtotalCents = toCents(booking.subtotal);
  const nonVehicleCents = protectionCents + addOnsCents + driversCents
    + youngRenterCents + dropoffCents + deliveryCents + upgradeCents + pvrtCents + acsrchCents;
  const vehicleRemainderCents = dbSubtotalCents - nonVehicleCents;
  const useRemainder = vehicleRemainderCents > 0 && vehicleRemainderCents <= vehicleBaseCents * 10;
  const vehicleCents = useRemainder ? vehicleRemainderCents : vehicleBaseCents;

  // ── Build line items (same order as FinancialBreakdown) ──
  const lineItems: InvoicePdfData["lineItems"] = [];

  // Vehicle rental
  const vehicleHasAdjustments = useRemainder && vehicleRemainderCents !== vehicleBaseCents;
  lineItems.push({
    description: vehicleHasAdjustments
      ? `Vehicle Rental (${totalDays} days, incl. surcharges/discounts)`
      : `Vehicle Rental ($${Number(booking.daily_rate).toFixed(2)}/day × ${totalDays} days)`,
    amount: fromCents(vehicleCents),
  });

  // Protection
  if (plan && protectionCents > 0) {
    const label = PROTECTION_PLAN_LABELS[booking.protection_plan] || plan.name;
    lineItems.push({
      description: `${label} ($${plan.rate.toFixed(2)}/day × ${totalDays} days)`,
      amount: fromCents(protectionCents),
    });
  }

  // Add-ons
  for (const addon of bookingAddOns) {
    const qty = Number((addon as any).quantity) || 1;
    const lineTotalCents = toCents((addon as any).price);
    const name = (addon as any).add_on?.name || "Add-on";
    lineItems.push({
      description: qty > 1 ? `${name} ×${qty}` : name,
      amount: fromCents(lineTotalCents),
      qty,
    });
  }

  // Additional drivers
  for (let i = 0; i < additionalDrivers.length; i++) {
    const d = additionalDrivers[i] as any;
    const isYoung = d.driver_age_band === "20_24";
    const fee = Number(d.young_driver_fee);
    const rate = isYoung ? driverFees.young : driverFees.standard;
    const displayCents = fee > 0 ? toCents(fee) : toCents(rate) * totalDays;
    const rateLabel = isYoung ? `Young $${driverFees.young.toFixed(2)}` : `Standard $${driverFees.standard.toFixed(2)}`;
    lineItems.push({
      description: `${d.driver_name || `Driver ${i + 1}`} (${rateLabel}/day × ${totalDays}d)`,
      amount: fromCents(displayCents),
    });
  }

  // Young renter fee
  if (youngRenterCents > 0) {
    lineItems.push({
      description: `Young Renter Fee ($${fromCents(Math.round(youngRenterCents / totalDays)).toFixed(2)}/day × ${totalDays} days)`,
      amount: fromCents(youngRenterCents),
    });
  }

  // Drop-off fee
  if (dropoffCents > 0) {
    lineItems.push({
      description: "Different Drop-off Location Fee",
      amount: fromCents(dropoffCents),
    });
  }

  // Delivery fee
  if (deliveryCents > 0) {
    lineItems.push({
      description: "Delivery Fee",
      amount: fromCents(deliveryCents),
    });
  }

  // Upgrade
  if (upgradeCents > 0) {
    lineItems.push({
      description: `Upgrade ($${Number(booking.upgrade_daily_fee).toFixed(2)}/day × ${totalDays} days)`,
      amount: fromCents(upgradeCents),
    });
  }

  // Regulatory fees
  lineItems.push({
    description: `PVRT ($${PVRT_DAILY_FEE.toFixed(2)}/day × ${totalDays} days)`,
    amount: fromCents(pvrtCents),
  });
  lineItems.push({
    description: `ACSRCH ($${ACSRCH_DAILY_FEE.toFixed(2)}/day × ${totalDays} days)`,
    amount: fromCents(acsrchCents),
  });

  // Tax breakdown
  const dbTaxCents = toCents(booking.tax_amount);
  const dbTotalCents = toCents(booking.total_amount);
  const pstCents = Math.round(dbSubtotalCents * 0.07);
  const gstCents = dbTaxCents - pstCents;

  // Location formatting
  const fmtLoc = (loc: any) => loc ? `${loc.name}${loc.address ? `, ${loc.address}` : ""}${loc.city ? `, ${loc.city}` : ""}` : undefined;

  return {
    invoiceNumber: invoice.invoice_number,
    status: invoice.status || "draft",
    issuedAt: invoice.issued_at,
    customerName: profile?.full_name || "N/A",
    customerEmail: profile?.email || "",
    customerPhone: profile?.phone || undefined,
    bookingCode: booking.booking_code,
    vehicleName: vehicleCat || "N/A",
    startDate: booking.start_at,
    endDate: booking.end_at,
    totalDays,
    pickupLocation: fmtLoc(pickupLoc),
    returnLocation: fmtLoc(returnLoc) || fmtLoc(pickupLoc),
    dailyRate: Number(booking.daily_rate),
    protectionPlan: plan ? (PROTECTION_PLAN_LABELS[booking.protection_plan] || plan.name) : undefined,
    protectionDailyRate: plan?.rate,
    protectionTotal: plan ? fromCents(protectionCents) : undefined,
    deliveryFee: fromCents(deliveryCents),
    lineItems,
    rentalSubtotal: fromCents(dbSubtotalCents),
    differentDropoffFee: fromCents(dropoffCents),
    addonsTotal: fromCents(addOnsCents),
    feesTotal: fromCents(pvrtCents + acsrchCents),
    taxesTotal: fromCents(dbTaxCents),
    pstAmount: fromCents(pstCents),
    gstAmount: fromCents(gstCents),
    lateFees: Number(invoice.late_fees || 0),
    damageCharges: Number(invoice.damage_charges || 0),
    grandTotal: fromCents(dbTotalCents),
    paymentsReceived: Number(invoice.payments_received || 0),
    amountDue: Number(invoice.amount_due || 0),
    depositHeld: Number(invoice.deposit_held || 0),
    depositReleased: Number(invoice.deposit_released || 0),
    depositCaptured: Number(invoice.deposit_captured || 0),
    notes: invoice.notes,
  };
}
