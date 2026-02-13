/**
 * Central pricing utility - Single source of truth for all booking price calculations
 * All fee logic should be defined here to ensure consistency across the app
 */

// ========== FEE CONSTANTS ==========
export const YOUNG_DRIVER_FEE = 15; // Daily fee for drivers aged 20-24 (CAD/day)
export const DEFAULT_DEPOSIT_AMOUNT = 350; // Standard security deposit
export const MINIMUM_DEPOSIT_AMOUNT = 350; // BUSINESS RULE: Deposit is ALWAYS required, never zero

// ========== TAX RATES (BC Canada) ==========
export const PST_RATE = 0.07; // 7% Provincial Sales Tax
export const GST_RATE = 0.05; // 5% Goods and Services Tax
export const TOTAL_TAX_RATE = PST_RATE + GST_RATE; // 12% combined

// ========== DAILY REGULATORY FEES ==========
export const PVRT_DAILY_FEE = 1.50; // Passenger Vehicle Rental Tax
export const ACSRCH_DAILY_FEE = 1.00; // Airport Concession/Surcharge

// ========== WEEKEND PRICING ==========
export const WEEKEND_SURCHARGE_RATE = 0.15; // 15% weekend surcharge (Fri-Sun pickups)

// ========== DURATION DISCOUNTS ==========
export const WEEKLY_DISCOUNT_THRESHOLD = 7; // Days for weekly discount
export const WEEKLY_DISCOUNT_RATE = 0.10; // 10% off for 7+ days
export const MONTHLY_DISCOUNT_THRESHOLD = 21; // Days for monthly discount
export const MONTHLY_DISCOUNT_RATE = 0.20; // 20% off for 21+ days

// ========== LATE RETURN FEES ==========
export const LATE_RETURN_HOURLY_RATE = 25; // Per hour late fee
export const LATE_RETURN_GRACE_MINUTES = 30; // Grace period before fees apply
export const LATE_RETURN_MAX_HOURS = 24; // Cap at 24 hours (then it's another day)

// ========== AGE CONSTANTS ==========
export const MIN_DRIVER_AGE = 20;
export const YOUNG_DRIVER_MAX_AGE = 24;
export const MAX_DRIVER_AGE = 70;

// ========== CANCELLATION FEE ==========
export const CANCELLATION_FEE = 19.99; // CAD

// ========== DROP-OFF FEE TIERS ==========
// Must mirror server-side computeDropoffFee in booking-core.ts
const DROPOFF_LOCATION_GROUPS: Record<string, string> = {
  "a1b2c3d4-1111-4000-8000-000000000001": "surrey",
  "a1b2c3d4-2222-4000-8000-000000000002": "langley",
  "a1b2c3d4-3333-4000-8000-000000000003": "abbotsford",
};

/**
 * Compute drop-off fee for display based on pickup/return location IDs.
 * Server recomputes this canonically — this is for UI preview only.
 */
export function computeDropoffFeeClient(
  pickupLocationId: string | null | undefined,
  returnLocationId: string | null | undefined,
): number {
  if (!pickupLocationId || !returnLocationId) return 0;
  if (pickupLocationId === returnLocationId) return 0;

  const pickupGroup = DROPOFF_LOCATION_GROUPS[pickupLocationId];
  const returnGroup = DROPOFF_LOCATION_GROUPS[returnLocationId];
  if (!pickupGroup || !returnGroup || pickupGroup === returnGroup) return 0;

  const pair = [pickupGroup, returnGroup].sort().join("|");
  switch (pair) {
    case "langley|surrey": return 50;
    case "abbotsford|langley":
    case "abbotsford|surrey": return 75;
    default: return 0;
  }
}

// ========== MYSTERY CAR PRICING ==========
export const MYSTERY_CAR_FEE = 30; // CAD base price for Mystery Car category

// ========== BAGGAGE CAPACITY BY VEHICLE TYPE ==========
export const BAGGAGE_CAPACITY: Record<string, number> = {
  sedan: 3,
  economy: 3,
  midsize: 3,
  fullsize: 3,
  suv: 4,
  midsizesuv: 4,
  largesuv: 4,
  minivan: 5,
  default: 3,
};

export function getBaggageCapacity(category: string): number {
  const normalized = category.toLowerCase().replace(/[\s-]/g, "");
  if (normalized.includes("minivan")) return BAGGAGE_CAPACITY.minivan;
  if (normalized.includes("largesuv")) return BAGGAGE_CAPACITY.largesuv;
  if (normalized.includes("suv")) return BAGGAGE_CAPACITY.suv;
  if (normalized.includes("sedan") || normalized.includes("economy") || normalized.includes("midsize") || normalized.includes("fullsize")) return BAGGAGE_CAPACITY.sedan;
  return BAGGAGE_CAPACITY.default;
}

// ========== TYPES ==========
export type DriverAgeBand = "20_24" | "25_70";

export interface PricingInput {
  vehicleDailyRate: number;
  rentalDays: number;
  protectionDailyRate?: number;
  addOnsTotal?: number;
  deliveryFee?: number;
  differentDropoffFee?: number;
  driverAgeBand?: DriverAgeBand | null;
  pickupDate?: Date | null; // For weekend pricing detection
  lateFeeAmount?: number; // For return calculations
}

export interface PricingBreakdown {
  vehicleTotal: number;
  vehicleBaseTotal: number; // Before any adjustments
  weekendSurcharge: number;
  durationDiscount: number;
  discountType: "none" | "weekly" | "monthly";
  protectionTotal: number;
  addOnsTotal: number;
  deliveryFee: number;
  differentDropoffFee: number;
  youngDriverFee: number;
  dailyFeesTotal: number; // PVRT + ACSRCH
  pvrtTotal: number;
  acsrchTotal: number;
  lateFee: number;
  subtotal: number;
  pstAmount: number;
  gstAmount: number;
  taxAmount: number; // Combined for backward compatibility
  total: number;
}

// ========== PROTECTION PACKAGES ==========
export interface ProtectionPackage {
  id: string;
  name: string;
  dailyRate: number;
  originalRate?: number;
  deductible: string;
  discount?: string;
  rating: number;
  features: {
    name: string;
    included: boolean;
    tooltip?: string;
  }[];
  isRecommended?: boolean;
}

export const PROTECTION_PACKAGES: ProtectionPackage[] = [
  {
    id: "none",
    name: "No extra protection",
    dailyRate: 0,
    deductible: "Up to full vehicle value",
    rating: 0,
    features: [
      { name: "Loss Damage Waiver", included: false },
      { name: "Tire and Glass Protection", included: false },
      { name: "Extended Roadside Protection", included: false },
    ],
  },
  {
    id: "basic",
    name: "Basic Protection",
    dailyRate: 32.99,
    deductible: "Up to $800.00",
    rating: 1,
    features: [
      { name: "Loss Damage Waiver", included: true, tooltip: "Covers vehicle damage and theft with reduced deductible" },
      { name: "Tire and Glass Protection", included: false },
      { name: "Extended Roadside Protection", included: false },
    ],
  },
  {
    id: "smart",
    name: "Smart Protection",
    dailyRate: 37.99,
    deductible: "No deductible",
    rating: 2,
    isRecommended: true,
    features: [
      { name: "Loss Damage Waiver", included: true, tooltip: "Full coverage with zero deductible" },
      { name: "Tire and Glass Protection", included: true, tooltip: "Covers tire and windshield damage" },
      { name: "Extended Roadside Protection", included: false },
    ],
  },
  {
    id: "premium",
    name: "All Inclusive Protection",
    dailyRate: 49.99,
    deductible: "No deductible",
    rating: 3,
    features: [
      { name: "Loss Damage Waiver", included: true, tooltip: "Complete peace of mind" },
      { name: "Tire and Glass Protection", included: true, tooltip: "Full tire and glass coverage" },
      { name: "Extended Roadside Protection", included: true, tooltip: "24/7 roadside assistance anywhere" },
    ],
  },
];

// Quick lookup map for protection rates (Group 1 defaults)
export const PROTECTION_RATES: Record<string, { name: string; rate: number }> = Object.fromEntries(
  PROTECTION_PACKAGES.map(pkg => [pkg.id, { name: pkg.name, rate: pkg.dailyRate }])
);

// ========== STATUS MAPPINGS ==========
// Booking status (aligned with database enum: pending, confirmed, active, completed, cancelled)
export const BOOKING_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  confirmed: { label: "Confirmed", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  active: { label: "Active", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

// Damage status (aligned with database enum: reported, reviewing, approved, repaired, closed)
export const DAMAGE_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  reported: { label: "Reported", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  reviewing: { label: "Reviewing", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  approved: { label: "Approved", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  repaired: { label: "Repaired", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-muted" },
};

// Damage severity (aligned with database enum: minor, moderate, severe)
export const DAMAGE_SEVERITY_STYLES: Record<string, { label: string; className: string }> = {
  minor: { label: "Minor", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  moderate: { label: "Moderate", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  severe: { label: "Severe", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

// Ticket status (aligned with database enum)
export const TICKET_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  assigned: { label: "Assigned", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  waiting_customer: { label: "Waiting Customer", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  resolved: { label: "Resolved", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-muted" },
};

// Verification status (aligned with database enum: pending, verified, rejected)
export const VERIFICATION_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  verified: { label: "Verified", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

// ========== INCLUDED FEATURES ==========
export const BOOKING_INCLUDED_FEATURES = [
  "Third party insurance",
  "24/7 Roadside Assistance Hotline",
  "Unlimited kilometres",
  "Extended Roadside Protection",
  "Booking option: Best price - Pay now, cancel and rebook for a fee",
];

// ========== CURRENCY FORMATTING ==========
/**
 * Format a number as CAD currency: "$XX.XX CAD"
 * Use this everywhere prices are displayed
 */
export function formatCAD(amount: number, decimals: number = 2): string {
  return `$${amount.toFixed(decimals)} CAD`;
}

/**
 * Format a number as CAD currency for compact display: "$XX CAD"
 */
export function formatCADCompact(amount: number): string {
  return `$${Math.round(amount)} CAD`;
}

// ========== HELPER FUNCTIONS ==========

/**
 * Check if a date falls on a weekend (Friday, Saturday, or Sunday)
 */
export function isWeekendPickup(date: Date | null | undefined): boolean {
  if (!date) return false;
  const day = date.getDay();
  return day === 5 || day === 6 || day === 0; // Fri, Sat, Sun
}

/**
 * Get applicable duration discount
 */
export function getDurationDiscount(rentalDays: number): { rate: number; type: "none" | "weekly" | "monthly" } {
  if (rentalDays >= MONTHLY_DISCOUNT_THRESHOLD) {
    return { rate: MONTHLY_DISCOUNT_RATE, type: "monthly" };
  }
  if (rentalDays >= WEEKLY_DISCOUNT_THRESHOLD) {
    return { rate: WEEKLY_DISCOUNT_RATE, type: "weekly" };
  }
  return { rate: 0, type: "none" };
}

/**
 * Calculate late return fee based on minutes late
 */
export function calculateLateFee(minutesLate: number, dailyRate?: number): number {
  if (minutesLate <= LATE_RETURN_GRACE_MINUTES) return 0;
  
  const billableMinutes = minutesLate - LATE_RETURN_GRACE_MINUTES;
  const hoursLate = Math.ceil(billableMinutes / 60);
  
  // If dailyRate provided, use tiered structure
  if (dailyRate) {
    if (hoursLate <= 2) {
      return hoursLate * (dailyRate * 0.25);
    }
    return dailyRate; // Full day charge from 3rd hour
  }
  
  // Legacy fallback
  const cappedHours = Math.min(hoursLate, LATE_RETURN_MAX_HOURS);
  return cappedHours * LATE_RETURN_HOURLY_RATE;
}

// ========== CORE PRICING FUNCTION ==========
/**
 * Calculate complete booking pricing breakdown
 * This is the SINGLE SOURCE OF TRUTH for all pricing calculations
 */
export function calculateBookingPricing(input: PricingInput): PricingBreakdown {
  const {
    vehicleDailyRate,
    rentalDays,
    protectionDailyRate = 0,
    addOnsTotal = 0,
    deliveryFee = 0,
    differentDropoffFee = 0,
    driverAgeBand,
    pickupDate,
    lateFeeAmount = 0,
  } = input;

  // Base vehicle cost
  const vehicleBaseTotal = vehicleDailyRate * rentalDays;
  
  // Weekend surcharge (applied to vehicle rental only)
  const weekendSurcharge = isWeekendPickup(pickupDate) 
    ? vehicleBaseTotal * WEEKEND_SURCHARGE_RATE 
    : 0;
  
  // Duration discount (applied after weekend surcharge)
  const { rate: discountRate, type: discountType } = getDurationDiscount(rentalDays);
  const vehicleAfterSurcharge = vehicleBaseTotal + weekendSurcharge;
  const durationDiscount = vehicleAfterSurcharge * discountRate;
  
  // Final vehicle total
  const vehicleTotal = vehicleAfterSurcharge - durationDiscount;
  
  // Protection total
  const protectionTotal = protectionDailyRate * rentalDays;
  
  // Daily regulatory fees
  const pvrtTotal = PVRT_DAILY_FEE * rentalDays;
  const acsrchTotal = ACSRCH_DAILY_FEE * rentalDays;
  const dailyFeesTotal = pvrtTotal + acsrchTotal;
  
  // Young driver fee: $15/day for 20-24 age band
  const youngDriverFee = driverAgeBand === "20_24" ? YOUNG_DRIVER_FEE * rentalDays : 0;

  // Late fee (passed in from return calculations)
  const lateFee = lateFeeAmount;

  // Subtotal before tax (rounded to avoid floating point drift)
  const subtotal = Math.round(
    (vehicleTotal + protectionTotal + addOnsTotal + deliveryFee + 
     differentDropoffFee + youngDriverFee + dailyFeesTotal + lateFee) * 100
  ) / 100;
  
  // Tax breakdown (PST + GST) - round each individually, then derive combined
  const pstAmount = Math.round(subtotal * PST_RATE * 100) / 100;
  const gstAmount = Math.round(subtotal * GST_RATE * 100) / 100;
  const taxAmount = Math.round((pstAmount + gstAmount) * 100) / 100;
  
  // Total = subtotal + tax (exact, no further rounding needed)
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    vehicleTotal,
    vehicleBaseTotal,
    weekendSurcharge,
    durationDiscount,
    discountType,
    protectionTotal,
    addOnsTotal,
    deliveryFee,
    differentDropoffFee,
    youngDriverFee,
    dailyFeesTotal,
    pvrtTotal,
    acsrchTotal,
    lateFee,
    subtotal,
    pstAmount,
    gstAmount,
    taxAmount,
    total,
  };
}

/**
 * Convert ageRange format ("20-24") to driverAgeBand format ("20_24")
 */
export function ageRangeToAgeBand(ageRange: "20-24" | "25-70" | null): DriverAgeBand | null {
  if (!ageRange) return null;
  return ageRange === "20-24" ? "20_24" : "25_70";
}

/**
 * Convert driverAgeBand format ("20_24") to ageRange format ("20-24")
 */
export function ageBandToAgeRange(ageBand: DriverAgeBand | null): "20-24" | "25-70" | null {
  if (!ageBand) return null;
  return ageBand === "20_24" ? "20-24" : "25-70";
}

/**
 * Validate driver age band against a specific age
 */
export function validateDriverAge(age: number): { valid: boolean; ageBand: DriverAgeBand | null; error?: string } {
  if (age < MIN_DRIVER_AGE) {
    return { valid: false, ageBand: null, error: `Driver must be at least ${MIN_DRIVER_AGE} years old` };
  }
  if (age > MAX_DRIVER_AGE) {
    return { valid: false, ageBand: null, error: `Driver must be ${MAX_DRIVER_AGE} years old or younger` };
  }
  
  const ageBand: DriverAgeBand = age <= YOUNG_DRIVER_MAX_AGE ? "20_24" : "25_70";
  return { valid: true, ageBand };
}

/**
 * Get protection package by ID
 */
export function getProtectionPackage(id: string): ProtectionPackage | undefined {
  return PROTECTION_PACKAGES.find(pkg => pkg.id === id);
}
