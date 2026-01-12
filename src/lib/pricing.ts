/**
 * Central pricing utility - Single source of truth for all booking price calculations
 * All fee logic should be defined here to ensure consistency across the app
 */

// ========== FEE CONSTANTS ==========
export const YOUNG_DRIVER_FEE = 20; // One-time fee for drivers aged 21-25
export const TAX_RATE = 0.13; // 13% tax
export const DEFAULT_DEPOSIT_AMOUNT = 500; // Standard security deposit

// ========== AGE CONSTANTS ==========
export const MIN_DRIVER_AGE = 21;
export const YOUNG_DRIVER_MAX_AGE = 25;
export const MAX_DRIVER_AGE = 70;

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
    dailyRate: 33.99,
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
    dailyRate: 39.25,
    originalRate: 50.97,
    discount: "23% online discount",
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
    dailyRate: 49.77,
    originalRate: 59.96,
    discount: "17% online discount",
    deductible: "No deductible",
    rating: 3,
    features: [
      { name: "Loss Damage Waiver", included: true, tooltip: "Complete peace of mind" },
      { name: "Tire and Glass Protection", included: true, tooltip: "Full tire and glass coverage" },
      { name: "Extended Roadside Protection", included: true, tooltip: "24/7 roadside assistance anywhere" },
    ],
  },
];

// Quick lookup map for protection rates
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
  "Unlimited kilometers",
  "Extended Roadside Protection",
  "Booking option: Best price - Pay now, cancel and rebook for a fee",
];

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
  
  const ageBand: DriverAgeBand = age <= YOUNG_DRIVER_MAX_AGE ? "21_25" : "25_70";
  return { valid: true, ageBand };
}

/**
 * Get protection package by ID
 */
export function getProtectionPackage(id: string): ProtectionPackage | undefined {
  return PROTECTION_PACKAGES.find(pkg => pkg.id === id);
}
