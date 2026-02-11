/**
 * Late Return Fee Calculation
 * Handles grace period, fee calculation, and customer self-return marking
 */
import { differenceInMinutes, isPast } from "date-fns";

// ========== LATE RETURN CONFIGURATION ==========
export const LATE_RETURN_GRACE_PERIOD_MINUTES = 30; // 30 minutes grace period
export const LATE_RETURN_FEE_PERCENTAGE = 0.25; // 25% of daily rate per hour after grace period

export interface LateReturnInfo {
  isLate: boolean;
  inGracePeriod: boolean;
  minutesLate: number;
  hoursLate: number;
  fee: number;
  message: string;
}

/**
 * Calculate late return info (without fee - use calculateLateReturnFeeWithRate for fee)
 * @param scheduledEndAt Scheduled return datetime
 * @param actualReturnAt Actual return datetime (or now if still active)
 * @returns Late return information (fee requires daily rate)
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

  return {
    isLate: true,
    inGracePeriod: false,
    minutesLate,
    hoursLate,
    fee: 0, // Fee calculated with daily rate in calculateLateReturnFeeWithRate
    message: `${hoursLate} hour${hoursLate !== 1 ? "s" : ""} late`,
  };
}

/**
 * Calculate late return fee with daily rate
 * Tiered: 25% of daily rate per hour for first 2 hours after grace, then full day charge
 */
export function calculateLateReturnFeeWithRate(
  scheduledEndAt: Date | string,
  dailyRate: number,
  actualReturnAt?: Date | string | null
): LateReturnInfo {
  const baseInfo = calculateLateReturnFee(scheduledEndAt, actualReturnAt);
  
  if (!baseInfo.isLate) {
    return baseInfo;
  }
  
  let fee: number;
  let message: string;
  
  if (baseInfo.hoursLate <= 2) {
    // 25% of daily rate per hour for first 2 hours
    const hourlyFee = dailyRate * LATE_RETURN_FEE_PERCENTAGE;
    fee = Math.round(baseInfo.hoursLate * hourlyFee * 100) / 100;
    message = `${baseInfo.hoursLate} hour${baseInfo.hoursLate !== 1 ? "s" : ""} late - CA$${fee.toFixed(2)} fee`;
  } else {
    // From 3rd hour onward: full day charge
    fee = Math.round(dailyRate * 100) / 100;
    message = `${baseInfo.hoursLate} hour${baseInfo.hoursLate !== 1 ? "s" : ""} late - Full day charge CA$${fee.toFixed(2)}`;
  }
  
  return {
    ...baseInfo,
    fee,
    message,
  };
}

/**
 * Get late return fee summary for display
 */
export function getLateReturnSummary(dailyRate?: number): string {
  if (dailyRate) {
    const hourlyFee = dailyRate * LATE_RETURN_FEE_PERCENTAGE;
    return `${LATE_RETURN_GRACE_PERIOD_MINUTES}-min grace, then CA$${hourlyFee.toFixed(2)}/hr (25% of daily rate) for first 2 hours, then full day charge CA$${dailyRate.toFixed(2)}`;
  }
  return `${LATE_RETURN_GRACE_PERIOD_MINUTES}-min grace period, then 25% of daily rate per hour for first 2 hours, then full day charge`;
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
