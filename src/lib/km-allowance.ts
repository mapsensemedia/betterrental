/**
 * Kilometre Allowance — Single source of truth
 *
 * Rule B: 1,400 km per 7 days, 4,800 km per 30 days (prorated).
 * Excess kilometres are charged at $0.25/km, computed at return from odometer readings.
 */

// ========== CONSTANTS ==========
export const WEEKLY_KM_ALLOWANCE = 1400;
export const MONTHLY_KM_ALLOWANCE = 4800;
export const EXCESS_KM_RATE = 0.25; // CAD per km

// Prorate off the monthly base (matches the 4,800/30 = 160 km/day used in the plan example).
const KM_PER_DAY = MONTHLY_KM_ALLOWANCE / 30;

// ========== TYPES ==========
export interface ExcessKmBreakdown {
  kmDriven: number;
  allowance: number;
  excessKm: number;
  excessFee: number;
  excessFeeCents: number;
}

// ========== CALCULATIONS ==========

/**
 * Prorated km allowance for a rental of `rentalDays` days.
 * Rounded to the nearest whole km.
 */
export function calculateKmAllowance(rentalDays: number): number {
  if (!Number.isFinite(rentalDays) || rentalDays <= 0) return 0;
  return Math.round(KM_PER_DAY * rentalDays);
}

/**
 * Compute excess kilometres and fee from odometer readings.
 * Integer-cents math to avoid float drift.
 */
export function calculateExcessKm(
  kmOut: number | null | undefined,
  kmIn: number | null | undefined,
  rentalDays: number,
): ExcessKmBreakdown {
  const out = Number(kmOut ?? 0);
  const inn = Number(kmIn ?? 0);
  const allowance = calculateKmAllowance(rentalDays);
  const kmDriven = Math.max(0, Math.round(inn - out));
  const excessKm = Math.max(0, kmDriven - allowance);
  const excessFeeCents = Math.round(excessKm * EXCESS_KM_RATE * 100);
  const excessFee = excessFeeCents / 100;
  return { kmDriven, allowance, excessKm, excessFee, excessFeeCents };
}

/** Human-readable one-liner for UI/marketing surfaces. */
export function formatKmAllowanceSummary(rentalDays?: number): string {
  if (rentalDays && rentalDays > 0) {
    const allowance = calculateKmAllowance(rentalDays);
    return `Includes ${allowance.toLocaleString()} km — extra km at $${EXCESS_KM_RATE.toFixed(2)}/km`;
  }
  return `${WEEKLY_KM_ALLOWANCE.toLocaleString()} km/week or ${MONTHLY_KM_ALLOWANCE.toLocaleString()} km/month (prorated); extra km $${EXCESS_KM_RATE.toFixed(2)}/km`;
}
