/**
 * Central pricing utility - Single source of truth for all booking price calculations
 * All fee logic should be defined here to ensure consistency across the app
 */

// ========== FEE CONSTANTS ==========
export const YOUNG_DRIVER_FEE = 20; // One-time fee for drivers aged 21-25
export const TAX_RATE = 0.13; // 13% tax

// ========== TYPES ==========
export type DriverAgeBand = "21_25" | "25_70";

export interface PricingInput {
  vehicleDailyRate: number;
  rentalDays: number;
  protectionDailyRate?: number;
  addOnsTotal?: number;
  deliveryFee?: number;
  driverAgeBand?: DriverAgeBand | null;
}

export interface PricingBreakdown {
  vehicleTotal: number;
  protectionTotal: number;
  addOnsTotal: number;
  deliveryFee: number;
  youngDriverFee: number;
  subtotal: number;
  taxAmount: number;
  total: number;
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
    driverAgeBand,
  } = input;

  const vehicleTotal = vehicleDailyRate * rentalDays;
  const protectionTotal = protectionDailyRate * rentalDays;
  
  // Young driver fee: one-time $20 for 21-25 age band
  const youngDriverFee = driverAgeBand === "21_25" ? YOUNG_DRIVER_FEE : 0;

  const subtotal = vehicleTotal + protectionTotal + addOnsTotal + deliveryFee + youngDriverFee;
  const taxAmount = subtotal * TAX_RATE;
  const total = subtotal + taxAmount;

  return {
    vehicleTotal,
    protectionTotal,
    addOnsTotal,
    deliveryFee,
    youngDriverFee,
    subtotal,
    taxAmount,
    total,
  };
}

/**
 * Convert ageRange format ("21-25") to driverAgeBand format ("21_25")
 */
export function ageRangeToAgeBand(ageRange: "21-25" | "25-70" | null): DriverAgeBand | null {
  if (!ageRange) return null;
  return ageRange === "21-25" ? "21_25" : "25_70";
}

/**
 * Convert driverAgeBand format ("21_25") to ageRange format ("21-25")
 */
export function ageBandToAgeRange(ageBand: DriverAgeBand | null): "21-25" | "25-70" | null {
  if (!ageBand) return null;
  return ageBand === "21_25" ? "21-25" : "25-70";
}
