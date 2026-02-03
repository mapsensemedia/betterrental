/**
 * Late Return Fee Calculation
 * Handles grace period, fee calculation, and customer self-return marking
 */
import { differenceInMinutes, isPast } from "date-fns";

// ========== LATE RETURN CONFIGURATION ==========
export const LATE_RETURN_GRACE_PERIOD_MINUTES = 15; // 15 minutes grace period
export const LATE_RETURN_HOURLY_FEE = 25; // $25 per hour after grace period

export interface LateReturnInfo {
  isLate: boolean;
  inGracePeriod: boolean;
  minutesLate: number;
  hoursLate: number;
  fee: number;
  message: string;
}

/**
 * Calculate late return fee based on actual return time vs scheduled return time
 * @param scheduledEndAt Scheduled return datetime
 * @param actualReturnAt Actual return datetime (or now if still active)
 * @returns Late return information including fee
 */
export function calculateLateReturnFee(
  scheduledEndAt: Date | string,
  actualReturnAt?: Date | string | null
): LateReturnInfo {
  const scheduled = typeof scheduledEndAt === "string" ? new Date(scheduledEndAt) : scheduledEndAt;
  const actual = actualReturnAt 
    ? (typeof actualReturnAt === "string" ? new Date(actualReturnAt) : actualReturnAt)
    : new Date();
  
  // Check if past scheduled return
  if (!isPast(scheduled) && actual <= scheduled) {
    return {
      isLate: false,
      inGracePeriod: false,
      minutesLate: 0,
      hoursLate: 0,
      fee: 0,
      message: "On time",
    };
  }

  const minutesLate = differenceInMinutes(actual, scheduled);
  
  // Check if within grace period
  if (minutesLate <= LATE_RETURN_GRACE_PERIOD_MINUTES) {
    return {
      isLate: false,
      inGracePeriod: true,
      minutesLate,
      hoursLate: 0,
      fee: 0,
      message: `Within ${LATE_RETURN_GRACE_PERIOD_MINUTES}-minute grace period`,
    };
  }

  // Calculate billable time (minutes after grace period)
  const billableMinutes = minutesLate - LATE_RETURN_GRACE_PERIOD_MINUTES;
  
  // Round up to nearest hour for billing
  const hoursLate = Math.ceil(billableMinutes / 60);
  
  // Calculate fee
  const fee = hoursLate * LATE_RETURN_HOURLY_FEE;

  return {
    isLate: true,
    inGracePeriod: false,
    minutesLate,
    hoursLate,
    fee,
    message: `${hoursLate} hour${hoursLate !== 1 ? "s" : ""} late - CA$${fee} fee`,
  };
}

/**
 * Get late return fee summary for display
 */
export function getLateReturnSummary(): string {
  return `${LATE_RETURN_GRACE_PERIOD_MINUTES}-minute grace period, then CA$${LATE_RETURN_HOURLY_FEE}/hour`;
}

/**
 * Check if customer can self-mark as returned (for key drop scenarios)
 * Returns true if booking is active and past scheduled return time
 */
export function canCustomerMarkReturned(
  status: string,
  scheduledEndAt: Date | string,
  customerMarkedReturnedAt?: string | null
): boolean {
  // Already marked
  if (customerMarkedReturnedAt) return false;
  
  // Only active bookings can be marked
  if (status !== "active") return false;
  
  // Allow marking within 30 minutes of scheduled return or after
  const scheduled = typeof scheduledEndAt === "string" ? new Date(scheduledEndAt) : scheduledEndAt;
  const thirtyMinsBeforeScheduled = new Date(scheduled.getTime() - 30 * 60 * 1000);
  
  return new Date() >= thirtyMinsBeforeScheduled;
}
