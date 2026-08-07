/**
 * Kilometre Allowance — Single source of truth
 *
 * Rule: rentals of 1–7 days include UNLIMITED kilometres.
 * From day 8 onward, an allowance of 160 km accrues for each day beyond
 * the first 7 (e.g. a 10-day rental includes 3 × 160 = 480 km).
 * Excess kilometres are charged at $0.25/km, computed at return from odometer readings.
 */

// ========== CONSTANTS ==========
/** Rentals up to (and including) this many days have unlimited kilometres. */
export const FREE_KM_DAYS = 7;
export const WEEKLY_KM_ALLOWANCE = 1400;
export const MONTHLY_KM_ALLOWANCE = 4800;
export const EXCESS_KM_RATE = 0.25; // CAD per km

/** Daily allowance applied to each day beyond FREE_KM_DAYS. */
export const KM_PER_DAY = MONTHLY_KM_ALLOWANCE / 30; // 160 km/day

// ========== TYPES ==========
export interface ExcessKmBreakdown {
  kmDriven: number;
  allowance: number;
  excessKm: number;
  excessFee: number;
  excessFeeCents: number;
  /** True when the rental qualifies for unlimited kilometres (1–7 days). */
  unlimited: boolean;
}

// ========== CALCULATIONS ==========

/** True when a rental of `rentalDays` days includes unlimited kilometres. */
export function isUnlimitedKm(rentalDays: number | null | undefined): boolean {
  const days = Number(rentalDays ?? 0);
  return Number.isFinite(days) && days > 0 && days <= FREE_KM_DAYS;
}

/**
 * Km allowance for a rental of `rentalDays` days.
 * Returns `Infinity` for unlimited (1–7 day) rentals.
 * Rounded to the nearest whole km otherwise.
 */
export function calculateKmAllowance(rentalDays: number): number {
  if (!Number.isFinite(rentalDays) || rentalDays <= 0) return 0;
  if (isUnlimitedKm(rentalDays)) return Infinity;
  return Math.round(KM_PER_DAY * (rentalDays - FREE_KM_DAYS));
}

/**
 * Compute excess kilometres and fee from odometer readings.
 * Integer-cents math to avoid float drift.
 * Rentals of 1–7 days never incur an excess-km fee.
 */
export function calculateExcessKm(
  kmOut: number | null | undefined,
  kmIn: number | null | undefined,
  rentalDays: number,
): ExcessKmBreakdown {
  const out = Number(kmOut ?? 0);
  const inn = Number(kmIn ?? 0);
  const kmDriven = Math.max(0, Math.round(inn - out));
  const unlimited = isUnlimitedKm(rentalDays);

  if (unlimited) {
    return {
      kmDriven,
      allowance: Infinity,
      excessKm: 0,
      excessFee: 0,
      excessFeeCents: 0,
      unlimited: true,
    };
  }

  const allowance = calculateKmAllowance(rentalDays);
  const excessKm = Math.max(0, kmDriven - allowance);
  const excessFeeCents = Math.round(excessKm * EXCESS_KM_RATE * 100);
  const excessFee = excessFeeCents / 100;
  return { kmDriven, allowance, excessKm, excessFee, excessFeeCents, unlimited: false };
}

/** Human-readable one-liner for UI/marketing surfaces. */
export function formatKmAllowanceSummary(rentalDays?: number): string {
  if (rentalDays && rentalDays > 0) {
    if (isUnlimitedKm(rentalDays)) {
      return "Unlimited kilometres — no distance limit on rentals up to 7 days";
    }
    const allowance = calculateKmAllowance(rentalDays);
    return `Unlimited km for the first ${FREE_KM_DAYS} days, then ${allowance.toLocaleString()} km included — extra km at $${EXCESS_KM_RATE.toFixed(2)}/km`;
  }
  return `Unlimited kilometres on rentals of 1–${FREE_KM_DAYS} days; longer rentals include ${KM_PER_DAY.toLocaleString()} km for each day past day ${FREE_KM_DAYS}, extra km $${EXCESS_KM_RATE.toFixed(2)}/km`;
}
