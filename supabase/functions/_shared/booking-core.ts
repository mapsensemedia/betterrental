/**
 * Shared Booking Creation Logic
 * 
 * Core functions used by both authenticated and guest booking flows.
 * PR5: Edge Function Deduplication
 * PR6: Server-side price validation + ownership helpers
 * PR7: OTP-based guest auth, fail-closed pricing, server-only totals
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
const PRICE_MISMATCH_TOLERANCE = 0.50; // $0.50 tolerance for rounding

export interface BookingInput {
  userId: string;
  vehicleId: string;
  locationId: string;
  startAt: string;
  endAt: string;
  driverAgeBand: string;
  protectionPlan?: string;
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
  deliveryFee?: number;
  differentDropoffFee?: number;
  addOns?: { addOnId: string; quantity: number }[];
}

export interface AddOnInput {
  addOnId: string;
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
  deliveryFee: number;
  differentDropoffFee: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  depositAmount: number;
  /** Per-add-on server-computed prices for DB insert */
  addOnPrices: { addOnId: string; quantity: number; price: number }[];
}

// ========== OTP HASHING (mirrors verify-booking-otp) ==========

async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ========== GUEST AUTH: OTP-BASED ==========

/**
 * Verify booking ownership:
 *   - Authenticated user: booking.user_id must match authUserId
 *   - Guest: must provide valid OTP code (hashed, not expired, not used)
 * 
 * booking_code is NOT authorization — only OTP is.
 */
export async function requireBookingOwnerOrOtp(
  bookingId: string,
  authUserId: string | null,
  otpCode: string | undefined,
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

  // Path 2: Guest must provide valid OTP
  if (!otpCode || typeof otpCode !== "string" || otpCode.length < 4) {
    throw new AuthError("OTP required for guest access", 401);
  }

  const otpHash = await hashOtp(otpCode);

  // Find matching, unused, unexpired OTP for this booking
  const { data: otpRecord, error: otpErr } = await supabase
    .from("booking_otps")
    .select("id, otp_hash, expires_at, verified_at")
    .eq("booking_id", bookingId)
    .eq("otp_hash", otpHash)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpErr || !otpRecord) {
    throw new AuthError("Invalid or already-used OTP", 401);
  }

  // Check expiry
  if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
    throw new AuthError("OTP expired", 401);
  }

  // Consume the OTP (one-time use)
  await supabase
    .from("booking_otps")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", otpRecord.id);

  return booking;
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

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute canonical booking totals from DB prices.
 * This is the server-side source of truth for price validation.
 * 
 * IMPORTANT: input.vehicleId is vehicles.id (NOT vehicle_categories.id).
 * We read vehicles.daily_rate directly.
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

  // 2) Fetch canonical daily rate from vehicles table (NOT vehicle_categories)
  const { data: vehicle, error: vehErr } = await supabase
    .from("vehicles")
    .select("id, daily_rate, category")
    .eq("id", input.vehicleId)
    .single();

  if (vehErr || !vehicle) {
    throw new Error(`Invalid vehicle: ${input.vehicleId}`);
  }

  const dailyRate = Number(vehicle.daily_rate);

  // 3) Vehicle total with weekend surcharge + duration discount
  const vehicleBaseTotal = roundCents(dailyRate * days);
  const weekendSurcharge = isWeekendPickup(input.startAt)
    ? roundCents(vehicleBaseTotal * WEEKEND_SURCHARGE_RATE)
    : 0;
  const afterSurcharge = roundCents(vehicleBaseTotal + weekendSurcharge);
  const discountRate = getDurationDiscount(days);
  const durationDiscount = roundCents(afterSurcharge * discountRate);
  const vehicleTotal = roundCents(afterSurcharge - durationDiscount);

  // 4) Protection pricing (from system_settings or hardcoded fallback)
  let protectionDailyRate = 0;
  if (input.protectionPlan && input.protectionPlan !== "none") {
    const settingsKey = `protection_${input.protectionPlan}_daily_rate`;
    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", settingsKey)
      .maybeSingle();

    if (setting?.value) {
      protectionDailyRate = Number(setting.value);
    } else {
      const defaults: Record<string, number> = {
        basic: 32.99,
        smart: 37.99,
        premium: 49.99,
      };
      protectionDailyRate = defaults[input.protectionPlan] ?? 0;
    }
  }
  const protectionTotal = roundCents(protectionDailyRate * days);

  // 5) Add-ons (canonical prices from DB — never from client)
  let addOnsTotal = 0;
  const addOnPrices: { addOnId: string; quantity: number; price: number }[] = [];

  if (input.addOns && input.addOns.length > 0) {
    // Filter out Premium Roadside if All Inclusive protection
    let filteredAddOns = input.addOns.slice(0, 10);

    if (input.protectionPlan === "premium" && filteredAddOns.length > 0) {
      const addOnIds = filteredAddOns.map(a => a.addOnId);
      const { data: addOnDetails } = await supabase
        .from("add_ons")
        .select("id, name")
        .in("id", addOnIds);

      if (addOnDetails) {
        const roadsideIds = new Set(
          addOnDetails
            .filter(a => {
              const lower = a.name.toLowerCase();
              return lower.includes("roadside") && (lower.includes("premium") || lower.includes("extended"));
            })
            .map(a => a.id)
        );
        if (roadsideIds.size > 0) {
          console.log(`[booking-core] Filtering Premium Roadside (All Inclusive): ${[...roadsideIds].join(", ")}`);
          filteredAddOns = filteredAddOns.filter(a => !roadsideIds.has(a.addOnId));
        }
      }
    }

    if (filteredAddOns.length > 0) {
      const addOnIds = filteredAddOns.map(a => a.addOnId);
      const { data: addOnRows } = await supabase
        .from("add_ons")
        .select("id, daily_rate, one_time_fee")
        .in("id", addOnIds);

      if (addOnRows) {
        const priceMap = new Map(addOnRows.map(a => [a.id, a]));
        for (const a of filteredAddOns) {
          const row = priceMap.get(a.addOnId);
          if (!row) throw new Error(`Invalid add-on: ${a.addOnId}`);
          const qty = Math.min(10, Math.max(1, a.quantity));
          const dailyCost = roundCents(Number(row.daily_rate) * days * qty);
          const oneTimeCost = roundCents(Number(row.one_time_fee ?? 0) * qty);
          const totalPrice = roundCents(dailyCost + oneTimeCost);
          addOnsTotal = roundCents(addOnsTotal + totalPrice);
          addOnPrices.push({ addOnId: a.addOnId, quantity: qty, price: totalPrice });
        }
      }
    }
  }

  // 6) Young driver fee
  const youngDriverFee = input.driverAgeBand === "20_24" ? roundCents(YOUNG_DRIVER_FEE * days) : 0;

  // 7) Daily regulatory fees
  const dailyFeesTotal = roundCents((PVRT_DAILY_FEE + ACSRCH_DAILY_FEE) * days);

  // 8) Delivery + dropoff fees
  const deliveryFee = roundCents(Number(input.deliveryFee ?? 0));
  const differentDropoffFee = roundCents(Number(input.differentDropoffFee ?? 0));

  // 9) Subtotal
  const subtotal = roundCents(
    vehicleTotal + protectionTotal + addOnsTotal + youngDriverFee +
    dailyFeesTotal + deliveryFee + differentDropoffFee
  );

  // 10) Taxes
  const pst = roundCents(subtotal * PST_RATE);
  const gst = roundCents(subtotal * GST_RATE);
  const taxAmount = roundCents(pst + gst);

  // 11) Total
  const total = roundCents(subtotal + taxAmount);

  // 12) Deposit
  const depositAmount = Math.max(MINIMUM_DEPOSIT_AMOUNT, roundCents(total));

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
    deliveryFee,
    differentDropoffFee,
    subtotal,
    taxAmount,
    total,
    depositAmount,
    addOnPrices,
  };
}

/**
 * Validate client-sent totals against server-computed totals.
 * FAIL CLOSED: if computation throws, return invalid.
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
}): Promise<{ valid: boolean; serverTotals: ServerPricingResult; error?: string }> {
  // FAIL CLOSED: if computeBookingTotals throws, we reject
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

  const diff = Math.abs(roundCents(server.total) - roundCents(params.clientTotal));
  if (diff > PRICE_MISMATCH_TOLERANCE) {
    console.warn(
      `[price-validation] MISMATCH: client=$${params.clientTotal}, server=$${server.total}, diff=$${diff.toFixed(2)}`
    );
    return {
      valid: false,
      serverTotals: server,
      error: `Price mismatch: expected $${server.total.toFixed(2)}, received $${params.clientTotal.toFixed(2)}`,
    };
  }

  return { valid: true, serverTotals: server };
}

// ========== BOOKING CREATION ==========

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
 * Create booking record using SERVER-COMPUTED totals only.
 * No client-sent pricing fields are accepted.
 */
export async function createBookingRecord(
  input: BookingInput,
  serverTotals: ServerPricingResult,
): Promise<BookingResult> {
  const supabase = getAdminClient();
  
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      user_id: input.userId,
      vehicle_id: input.vehicleId,
      location_id: input.locationId,
      start_at: input.startAt,
      end_at: input.endAt,
      // ALL financial fields from server computation
      daily_rate: serverTotals.dailyRate,
      total_days: serverTotals.days,
      subtotal: serverTotals.subtotal,
      tax_amount: serverTotals.taxAmount,
      deposit_amount: serverTotals.depositAmount,
      total_amount: serverTotals.total,
      young_driver_fee: serverTotals.youngDriverFee,
      booking_code: "", // Generated by trigger
      status: input.status || "confirmed",
      notes: input.notes?.slice(0, 1000) || null,
      driver_age_band: input.driverAgeBand,
      protection_plan: input.protectionPlan || null,
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
      different_dropoff_fee: serverTotals.differentDropoffFee,
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
 * Create booking add-ons using SERVER-COMPUTED prices.
 * Never uses client-sent addon.price.
 */
export async function createBookingAddOns(
  bookingId: string,
  serverAddOnPrices: { addOnId: string; quantity: number; price: number }[],
): Promise<void> {
  if (!serverAddOnPrices || serverAddOnPrices.length === 0) return;
  
  const supabase = getAdminClient();
  
  const addOnRecords = serverAddOnPrices.map((addon) => ({
    booking_id: bookingId,
    add_on_id: addon.addOnId,
    price: addon.price,
    quantity: addon.quantity,
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
