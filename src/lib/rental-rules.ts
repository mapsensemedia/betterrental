/**
 * Rental Rules & Business Logic - Central configuration for rental policies
 * Single source of truth for all business rules
 */

// ========== RENTAL DURATION RULES ==========
export const MIN_RENTAL_DAYS = 1;
export const MAX_RENTAL_DAYS = 30; // Maximum rental duration

// ========== CANCELLATION POLICY ==========
export const FREE_CANCELLATION_HOURS = 48; // Hours before pickup for free cancellation (kept for reference)
export const CANCELLATION_PENALTY_DAYS = 1; // Days of rental charged as penalty after pickup time

/**
 * Calculate cancellation fee based on hours until pickup
 * Free cancellation if before pickup time, penalty only after pickup time has passed
 */
export function calculateCancellationFee(
  hoursUntilPickup: number,
  dailyRate: number
): { fee: number; isFree: boolean; reason: string } {
  // Free cancellation if pickup time hasn't passed yet
  if (hoursUntilPickup > 0) {
    return {
      fee: 0,
      isFree: true,
      reason: "Free cancellation (before pickup time)",
    };
  }

  // Penalty only applies after pickup time has passed (no-show scenario)
  const fee = dailyRate * CANCELLATION_PENALTY_DAYS;
  return {
    fee,
    isFree: false,
    reason: `Cancellation after pickup time incurs a ${CANCELLATION_PENALTY_DAYS}-day rental penalty ($${fee.toFixed(2)})`,
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

// ========== PICKUP TIME SLOTS ==========
export interface TimeSlot {
  value: string;      // 24h format "HH:MM"
  label: string;      // Display format "10:00 AM"
}

/**
 * Generate time slots from start to end with given interval
 * @param startHour Start hour (0-23)
 * @param endHour End hour (0-23)
 * @param intervalMinutes Interval in minutes (default 30)
 */
export function generateTimeSlots(
  startHour: number = 0, 
  endHour: number = 23, 
  intervalMinutes: number = 30
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let min = 0; min < 60; min += intervalMinutes) {
      // Skip if we've passed the end hour
      if (hour === endHour && min > 0) break;
      
      const value = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      const displayHour = hour % 12 || 12;
      const period = hour < 12 ? 'AM' : 'PM';
      const label = `${displayHour}:${String(min).padStart(2, '0')} ${period}`;
      
      slots.push({ value, label });
    }
  }
  
  return slots;
}

// Pre-generated time slots for 24-hour availability (30-min intervals)
export const PICKUP_TIME_SLOTS: TimeSlot[] = generateTimeSlots(0, 23, 30);

export const DEFAULT_PICKUP_TIME = "10:00";

/**
 * Format a 24h time string to display format
 * @param time24 Time in "HH:MM" format
 * @returns Formatted time like "10:00 AM"
 */
export function formatTimeDisplay(time24: string): string {
  if (!time24) return "";
  const [hourStr, minStr] = time24.split(':');
  const hour = parseInt(hourStr, 10);
  const displayHour = hour % 12 || 12;
  const period = hour < 12 ? 'AM' : 'PM';
  return `${displayHour}:${minStr} ${period}`;
}

// Legacy compatibility - keep for any code that might still reference this
/** @deprecated Use PICKUP_TIME_SLOTS instead */
export const PICKUP_TIME_WINDOWS = PICKUP_TIME_SLOTS.map(slot => ({
  value: slot.value,
  label: slot.label,
  displayLabel: slot.label,
}));

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
