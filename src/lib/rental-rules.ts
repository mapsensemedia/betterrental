/**
 * Rental Rules & Business Logic - Central configuration for rental policies
 * Single source of truth for all business rules
 */

// ========== RENTAL DURATION RULES ==========
export const MIN_RENTAL_DAYS = 1;
export const MAX_RENTAL_DAYS = 30; // Maximum rental duration

// ========== CANCELLATION POLICY ==========
export const FREE_CANCELLATION_HOURS = 48; // Hours before pickup for free cancellation
export const CANCELLATION_PENALTY_DAYS = 1; // Days of rental charged as penalty within 48hrs

/**
 * Calculate cancellation fee based on hours until pickup
 */
export function calculateCancellationFee(
  hoursUntilPickup: number,
  dailyRate: number
): { fee: number; isFree: boolean; reason: string } {
  if (hoursUntilPickup >= FREE_CANCELLATION_HOURS) {
    return {
      fee: 0,
      isFree: true,
      reason: `Free cancellation (more than ${FREE_CANCELLATION_HOURS} hours before pickup)`,
    };
  }

  const fee = dailyRate * CANCELLATION_PENALTY_DAYS;
  return {
    fee,
    isFree: false,
    reason: `Cancellation within ${FREE_CANCELLATION_HOURS} hours incurs a ${CANCELLATION_PENALTY_DAYS}-day rental penalty ($${fee.toFixed(2)})`,
  };
}

// ========== DELIVERY PRICING TIERS ==========
export interface DeliveryTier {
  maxKm: number;
  fee: number;
  label: string;
}

export const DELIVERY_TIERS: DeliveryTier[] = [
  { maxKm: 10, fee: 0, label: "Free" },
  { maxKm: 50, fee: 49, label: "$49" },
];

export const MAX_DELIVERY_DISTANCE_KM = 50;

/**
 * Calculate delivery fee based on distance
 */
export function calculateDeliveryFee(distanceKm: number): {
  fee: number;
  tier: DeliveryTier | null;
  isWithinRange: boolean;
} {
  if (distanceKm > MAX_DELIVERY_DISTANCE_KM) {
    return {
      fee: 0,
      tier: null,
      isWithinRange: false,
    };
  }

  for (const tier of DELIVERY_TIERS) {
    if (distanceKm <= tier.maxKm) {
      return {
        fee: tier.fee,
        tier,
        isWithinRange: true,
      };
    }
  }

  // Default to last tier if within max range
  const lastTier = DELIVERY_TIERS[DELIVERY_TIERS.length - 1];
  return {
    fee: lastTier.fee,
    tier: lastTier,
    isWithinRange: true,
  };
}

/**
 * Get delivery pricing summary text
 */
export function getDeliveryPricingSummary(): string {
  return DELIVERY_TIERS.map((tier, index) => {
    const prevMax = index === 0 ? 0 : DELIVERY_TIERS[index - 1].maxKm;
    if (index === 0) {
      return `Free (≤${tier.maxKm}km)`;
    }
    return `${tier.label} (${prevMax + 1}-${tier.maxKm}km)`;
  }).join(" • ");
}

// ========== PICKUP TIME WINDOWS ==========
export interface TimeWindow {
  value: string;
  label: string;
  displayLabel: string;
}

export const PICKUP_TIME_WINDOWS: TimeWindow[] = [
  { value: "08:00", label: "8:00 AM - 10:00 AM", displayLabel: "Morning (8-10 AM)" },
  { value: "10:00", label: "10:00 AM - 12:00 PM", displayLabel: "Late Morning (10 AM-12 PM)" },
  { value: "12:00", label: "12:00 PM - 2:00 PM", displayLabel: "Afternoon (12-2 PM)" },
  { value: "14:00", label: "2:00 PM - 4:00 PM", displayLabel: "Late Afternoon (2-4 PM)" },
  { value: "16:00", label: "4:00 PM - 6:00 PM", displayLabel: "Evening (4-6 PM)" },
];

export const DEFAULT_PICKUP_TIME = "10:00";

/**
 * Get time window by value
 */
export function getTimeWindow(value: string): TimeWindow | undefined {
  return PICKUP_TIME_WINDOWS.find((tw) => tw.value === value);
}

// ========== FUEL TYPES ==========
export const FUEL_TYPES = ["Gas", "Diesel", "Electric", "Hybrid"] as const;
export type FuelType = typeof FUEL_TYPES[number];

// ========== VEHICLE STATUSES ==========
export const VEHICLE_STATUSES = {
  available: { label: "Available", color: "green", canDelete: false },
  booked: { label: "Booked", color: "blue", canDelete: false },
  maintenance: { label: "Maintenance", color: "amber", canDelete: true },
  inactive: { label: "Inactive", color: "muted", canDelete: true },
} as const;

export type VehicleStatus = keyof typeof VEHICLE_STATUSES;

/**
 * Check if a vehicle can be deleted based on its status
 */
export function canDeleteVehicle(status: VehicleStatus | string | null): boolean {
  if (!status) return false;
  const statusInfo = VEHICLE_STATUSES[status as VehicleStatus];
  return statusInfo?.canDelete ?? false;
}

/**
 * Get vehicle status info
 */
export function getVehicleStatusInfo(status: string | null) {
  if (!status) return VEHICLE_STATUSES.available;
  return VEHICLE_STATUSES[status as VehicleStatus] || VEHICLE_STATUSES.available;
}

// ========== VALIDATION HELPERS ==========
/**
 * Validate rental duration
 */
export function validateRentalDuration(days: number): { valid: boolean; error?: string } {
  if (days < MIN_RENTAL_DAYS) {
    return { valid: false, error: `Minimum rental is ${MIN_RENTAL_DAYS} day` };
  }
  if (days > MAX_RENTAL_DAYS) {
    return { valid: false, error: `Maximum rental is ${MAX_RENTAL_DAYS} days` };
  }
  return { valid: true };
}
