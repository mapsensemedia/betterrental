/**
 * Shared Booking Creation Logic
 * 
 * Core functions used by both authenticated and guest booking flows.
 * PR5: Edge Function Deduplication - Consolidates duplicated logic
 * PR6: Server-side price validation + ownership helpers
 */

import { getAdminClient, AuthError } from "./auth.ts";
import { sanitizePhone } from "./cors.ts";

// ========== PRICING CONSTANTS (mirrors src/lib/pricing.ts) ==========
const PST_RATE = 0.07;
const GST_RATE = 0.05;
const PVRT_DAILY_FEE = 1.50;
const ACSRCH_DAILY_FEE = 1.00;
const YOUNG_DRIVER_FEE = 15;
const WEEKEND_SURCHARGE_RATE = 0.15;
const WEEKLY_DISCOUNT_THRESHOLD = 7;
const WEEKLY_DISCOUNT_RATE = 0.10;
const MONTHLY_DISCOUNT_THRESHOLD = 21;
const MONTHLY_DISCOUNT_RATE = 0.20;

// BUSINESS RULE: Deposit is ALWAYS required - minimum $350 CAD
const MINIMUM_DEPOSIT_AMOUNT = 350;

// ========== PRICE VALIDATION TOLERANCE ==========
const PRICE_MISMATCH_TOLERANCE = 2.00; // $2 tolerance for rounding differences

export interface BookingInput {
  userId: string;
  vehicleId: string;
  locationId: string;
  startAt: string;
  endAt: string;
  dailyRate: number;
  totalDays: number;
  subtotal: number;
  taxAmount: number;
  depositAmount: number;
  totalAmount: number;
  driverAgeBand: string;
  youngDriverFee?: number;
  notes?: string;
  status?: "draft" | "pending" | "confirmed";
  pickupAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  pickupContactName?: string;
  pickupContactPhone?: string;
  specialInstructions?: string;
  saveTimeAtCounter?: boolean;
  cardLastFour?: string;
  cardType?: string;
  cardHolderName?: string;
  returnLocationId?: string;
  differentDropoffFee?: number;
}

export interface AddOnInput {
  addOnId: string;
  price: number;
  quantity: number;
}

export interface AdditionalDriverInput {
  driverName: string | null;
  driverAgeBand: string;
  youngDriverFee: number;
}

export interface BookingResult {
  success: boolean;
  booking?: {
    id: string;
    bookingCode: string;
    status: string;
  };
  error?: string;
  errorCode?: string;
}

export interface ServerPricingResult {
  days: number;
  dailyRate: number;
  vehicleBaseTotal: number;
  weekendSurcharge: number;
  durationDiscount: number;
  vehicleTotal: number;
  protectionDailyRate: number;
  protectionTotal: number;
  addOnsTotal: number;
  youngDriverFee: number;
  dailyFeesTotal: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

// ========== SERVER-SIDE PRICING ==========

function isWeekendPickup(dateStr: string): boolean {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  return day === 5 || day === 6 || day === 0;
}

function getDurationDiscount(days: number): number {
  if (days >= MONTHLY_DISCOUNT_THRESHOLD) return MONTHLY_DISCOUNT_RATE;
  if (days >= WEEKLY_DISCOUNT_THRESHOLD) return WEEKLY_DISCOUNT_RATE;
  return 0;
}

/**
 * Compute canonical booking totals from DB prices.
 * This is the server-side source of truth for price validation.
 */
export async function computeBookingTotals(input: {
  vehicleId: string;
  startAt: string;
  endAt: string;
  protectionPlan?: string;
  addOns?: { addOnId: string; quantity: number }[];
  driverAgeBand?: string;
  deliveryFee?: number;
  differentDropoffFee?: number;
}): Promise<ServerPricingResult> {
  const supabase = getAdminClient();

  // 1) Compute days
  const msPerDay = 1000 * 60 * 60 * 24;
  const ms = new Date(input.endAt).getTime() - new Date(input.startAt).getTime();
  const days = Math.max(1, Math.ceil(ms / msPerDay));

  // 2) Fetch canonical daily rate from vehicle_categories
  const { data: category, error: catErr } = await supabase
    .from("vehicle_categories")
    .select("id, daily_rate, name")
    .eq("id", input.vehicleId)
    .single();

  if (catErr || !category) {
    throw new Error(`Invalid vehicle category: ${input.vehicleId}`);
  }

  const dailyRate = Number(category.daily_rate);

  // 3) Vehicle total with weekend surcharge + duration discount
  const vehicleBaseTotal = dailyRate * days;
  const weekendSurcharge = isWeekendPickup(input.startAt)
    ? vehicleBaseTotal * WEEKEND_SURCHARGE_RATE
    : 0;
  const afterSurcharge = vehicleBaseTotal + weekendSurcharge;
  const discountRate = getDurationDiscount(days);
  const durationDiscount = afterSurcharge * discountRate;
  const vehicleTotal = afterSurcharge - durationDiscount;

  // 4) Protection pricing (from system_settings or hardcoded fallback)
  let protectionDailyRate = 0;
  if (input.protectionPlan && input.protectionPlan !== "none") {
    // Try system_settings first
    const settingsKey = `protection_${input.protectionPlan}_daily_rate`;
    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", settingsKey)
      .maybeSingle();

    if (setting?.value) {
      protectionDailyRate = Number(setting.value);
    } else {
      // Fallback to Group 1 defaults (matches pricing.ts)
      const defaults: Record<string, number> = {
        basic: 32.99,
        smart: 37.99,
        premium: 49.99,
      };
      protectionDailyRate = defaults[input.protectionPlan] ?? 0;
    }
  }
  const protectionTotal = protectionDailyRate * days;

  // 5) Add-ons (canonical prices from DB)
  let addOnsTotal = 0;
  if (input.addOns && input.addOns.length > 0) {
    const addOnIds = input.addOns.map(a => a.addOnId);
    const { data: addOnRows } = await supabase
      .from("add_ons")
      .select("id, daily_rate, one_time_fee")
      .in("id", addOnIds);

    if (addOnRows) {
      const priceMap = new Map(addOnRows.map(a => [a.id, a]));
      for (const a of input.addOns) {
        const row = priceMap.get(a.addOnId);
        if (!row) throw new Error(`Invalid add-on: ${a.addOnId}`);
        const qty = Math.min(10, Math.max(1, a.quantity));
        const dailyCost = Number(row.daily_rate) * days * qty;
        const oneTimeCost = Number(row.one_time_fee ?? 0) * qty;
        addOnsTotal += dailyCost + oneTimeCost;
      }
    }
  }

  // 6) Young driver fee
  const youngDriverFee = input.driverAgeBand === "20_24" ? YOUNG_DRIVER_FEE * days : 0;

  // 7) Daily regulatory fees
  const dailyFeesTotal = (PVRT_DAILY_FEE + ACSRCH_DAILY_FEE) * days;

  // 8) Delivery + dropoff fees
  const deliveryFee = Number(input.deliveryFee ?? 0);
  const differentDropoffFee = Number(input.differentDropoffFee ?? 0);

  // 9) Subtotal (rounded to avoid float drift)
  const subtotal = Math.round(
    (vehicleTotal + protectionTotal + addOnsTotal + youngDriverFee +
     dailyFeesTotal + deliveryFee + differentDropoffFee) * 100
  ) / 100;

  // 10) Taxes
  const pst = Math.round(subtotal * PST_RATE * 100) / 100;
  const gst = Math.round(subtotal * GST_RATE * 100) / 100;
  const taxAmount = Math.round((pst + gst) * 100) / 100;

  // 11) Total
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    days,
    dailyRate,
    vehicleBaseTotal,
    weekendSurcharge,
    durationDiscount,
    vehicleTotal,
    protectionDailyRate,
    protectionTotal,
    addOnsTotal,
    youngDriverFee,
    dailyFeesTotal,
    subtotal,
    taxAmount,
    total,
  };
}

/**
 * Validate client-sent totals against server-computed totals.
 * Returns null if valid, or an error message string.
 */
export async function validateClientPricing(params: {
  vehicleId: string;
  startAt: string;
  endAt: string;
  protectionPlan?: string;
  addOns?: { addOnId: string; quantity: number }[];
  driverAgeBand?: string;
  deliveryFee?: number;
  differentDropoffFee?: number;
  clientTotal: number;
}): Promise<{ valid: boolean; serverTotal: number; error?: string }> {
  try {
    const server = await computeBookingTotals({
      vehicleId: params.vehicleId,
      startAt: params.startAt,
      endAt: params.endAt,
      protectionPlan: params.protectionPlan,
      addOns: params.addOns,
      driverAgeBand: params.driverAgeBand,
      deliveryFee: params.deliveryFee,
      differentDropoffFee: params.differentDropoffFee,
    });

    const diff = Math.abs(server.total - params.clientTotal);
    if (diff > PRICE_MISMATCH_TOLERANCE) {
      console.warn(
        `[price-validation] MISMATCH: client=$${params.clientTotal}, server=$${server.total}, diff=$${diff.toFixed(2)}`
      );
      return {
        valid: false,
        serverTotal: server.total,
        error: `Price mismatch: expected $${server.total.toFixed(2)}, received $${params.clientTotal.toFixed(2)}`,
      };
    }

    return { valid: true, serverTotal: server.total };
  } catch (err) {
    console.error("[price-validation] Error computing server totals:", err);
    // If we can't validate, allow but log — don't block checkout entirely
    return { valid: true, serverTotal: params.clientTotal };
  }
}

// ========== BOOKING OWNERSHIP HELPERS ==========

/**
 * Verify booking ownership via authenticated user OR booking_code (guest proof-of-knowledge).
 * Returns the booking row if authorized.
 */
export async function requireBookingOwnerOrCode(
  bookingId: string,
  authUserId: string | null,
  bookingCode: string | undefined,
): Promise<{ id: string; user_id: string; booking_code: string; total_amount: number }> {
  const supabase = getAdminClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, user_id, booking_code, total_amount, deposit_amount, status")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    throw new AuthError("Booking not found", 404);
  }

  // Path 1: Authenticated user owns booking
  if (authUserId && booking.user_id === authUserId) {
    return booking;
  }

  // Path 2: Guest provides booking_code as proof of knowledge
  if (bookingCode && booking.booking_code === bookingCode) {
    return booking;
  }

  // Neither path succeeded
  throw new AuthError("Forbidden: not booking owner", 403);
}

// ========== EXISTING FUNCTIONS ==========

/**
 * Check for conflicting bookings
 */
export async function checkBookingConflicts(
  vehicleId: string,
  startAt: string,
  endAt: string
): Promise<boolean> {
  const supabase = getAdminClient();
  
  const { data: conflicts } = await supabase
    .from("bookings")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .in("status", ["draft", "pending", "confirmed", "active"])
    .or(`and(start_at.lte.${endAt},end_at.gte.${startAt})`)
    .limit(1);
  
  return !!(conflicts && conflicts.length > 0);
}

/**
 * Validate driver age band
 */
export function isValidAgeBand(ageBand: string | undefined): boolean {
  return !!ageBand && ["20_24", "25_70"].includes(ageBand);
}

/**
 * Create booking record
 */
export async function createBookingRecord(input: BookingInput): Promise<BookingResult> {
  const supabase = getAdminClient();
  
  // BUSINESS RULE: Enforce minimum deposit
  const enforcedDepositAmount = Math.max(input.depositAmount, MINIMUM_DEPOSIT_AMOUNT);
  
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      user_id: input.userId,
      vehicle_id: input.vehicleId,
      location_id: input.locationId,
      start_at: input.startAt,
      end_at: input.endAt,
      daily_rate: input.dailyRate,
      total_days: input.totalDays,
      subtotal: input.subtotal,
      tax_amount: input.taxAmount,
      deposit_amount: enforcedDepositAmount,
      total_amount: input.totalAmount,
      booking_code: "", // Generated by trigger
      status: input.status || "confirmed",
      notes: input.notes?.slice(0, 1000) || null,
      driver_age_band: input.driverAgeBand,
      young_driver_fee: input.youngDriverFee || 0,
      pickup_address: input.pickupAddress?.slice(0, 500) || null,
      pickup_lat: input.pickupLat || null,
      pickup_lng: input.pickupLng || null,
      pickup_contact_name: input.pickupContactName?.slice(0, 100) || null,
      pickup_contact_phone: sanitizePhone(input.pickupContactPhone || "") || null,
      special_instructions: input.specialInstructions?.slice(0, 500) || null,
      save_time_at_counter: input.saveTimeAtCounter || false,
      card_last_four: input.cardLastFour?.slice(0, 4) || null,
      card_type: input.cardType?.slice(0, 20) || null,
      card_holder_name: input.cardHolderName?.slice(0, 255) || null,
      return_location_id: input.returnLocationId || null,
      different_dropoff_fee: input.differentDropoffFee || 0,
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error creating booking:", error);
    return {
      success: false,
      error: "Failed to create booking",
      errorCode: "booking_failed",
    };
  }
  
  return {
    success: true,
    booking: {
      id: booking.id,
      bookingCode: booking.booking_code,
      status: booking.status,
    },
  };
}

/**
 * Check if an add-on name matches "Premium Roadside" / "Extended Roadside"
 */
function isPremiumRoadsideAddOn(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("roadside") && (lower.includes("premium") || lower.includes("extended"));
}

/**
 * Create booking add-ons
 * BUSINESS RULE: If protection plan is "premium" (All Inclusive), 
 * Premium Roadside add-on is automatically excluded (it's already included).
 */
export async function createBookingAddOns(
  bookingId: string,
  addOns: AddOnInput[],
  protectionPlan?: string,
): Promise<void> {
  if (!addOns || addOns.length === 0) return;
  
  const supabase = getAdminClient();
  
  // If All Inclusive protection, look up and filter out Premium Roadside add-ons
  let filteredAddOns = addOns.slice(0, 10);
  
  if (protectionPlan === "premium" && filteredAddOns.length > 0) {
    const addOnIds = filteredAddOns.map(a => a.addOnId);
    const { data: addOnDetails } = await supabase
      .from("add_ons")
      .select("id, name")
      .in("id", addOnIds);
    
    if (addOnDetails) {
      const roadsideIds = new Set(
        addOnDetails.filter(a => isPremiumRoadsideAddOn(a.name)).map(a => a.id)
      );
      if (roadsideIds.size > 0) {
        console.log(`[booking-core] Filtering out Premium Roadside add-ons (All Inclusive protection): ${[...roadsideIds].join(", ")}`);
        filteredAddOns = filteredAddOns.filter(a => !roadsideIds.has(a.addOnId));
      }
    }
  }
  
  if (filteredAddOns.length === 0) return;
  
  const addOnRecords = filteredAddOns.map((addon) => ({
    booking_id: bookingId,
    add_on_id: addon.addOnId,
    price: addon.price,
    quantity: Math.min(addon.quantity, 10),
  }));
  
  await supabase.from("booking_add_ons").insert(addOnRecords);
}

/**
 * Create additional drivers
 */
export async function createAdditionalDrivers(
  bookingId: string,
  drivers: AdditionalDriverInput[]
): Promise<void> {
  if (!drivers || drivers.length === 0) return;
  
  const supabase = getAdminClient();
  
  const driverRecords = drivers.slice(0, 5).map((driver) => ({
    booking_id: bookingId,
    driver_name: driver.driverName?.slice(0, 100) || null,
    driver_age_band: driver.driverAgeBand,
    young_driver_fee: driver.youngDriverFee || 0,
  }));
  
  await supabase.from("booking_additional_drivers").insert(driverRecords);
}

/**
 * Send booking notifications (awaitable)
 */
export async function sendBookingNotifications(params: {
  bookingId: string;
  bookingCode: string;
  customerName?: string;
  vehicleName?: string;
  isGuest?: boolean;
}): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const sendNotification = async (endpoint: string, body: Record<string, unknown>) => {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(body),
      });
      console.log(`Notification ${endpoint} response: ${resp.status}`);
    } catch (err) {
      console.error(`Notification ${endpoint} failed:`, err);
    }
  };
  
  await Promise.all([
    sendNotification("send-booking-email", {
      bookingId: params.bookingId,
      templateType: "confirmation",
    }),
    sendNotification("send-booking-sms", {
      bookingId: params.bookingId,
      templateType: "confirmation",
    }),
    sendNotification("notify-admin", {
      eventType: "new_booking",
      bookingId: params.bookingId,
      bookingCode: params.bookingCode,
      customerName: params.customerName || "Customer",
      vehicleName: params.vehicleName || "",
      isGuest: params.isGuest || false,
    }),
  ]);
}
