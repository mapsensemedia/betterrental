/**
 * CARD PROCESSING FEE — SINGLE SOURCE OF TRUTH (client)
 *
 * Mandatory card processing fee applied to every rental transaction.
 *  - Pre-tax rental subtotal up to $450.00  -> 2.5%
 *  - Pre-tax rental subtotal $450.01+       -> 1.5%
 *
 * The fee is a pass-through: it is added AFTER PST/GST and is not itself taxed.
 * It is never waivable at the counter.
 *
 * Keep in sync with supabase/functions/_shared/processing-fee.ts
 */

export const PROCESSING_FEE_THRESHOLD = 450; // CAD, pre-tax subtotal
export const PROCESSING_FEE_RATE_LOW_TIER = 0.025; // <= $450
export const PROCESSING_FEE_RATE_HIGH_TIER = 0.015; // > $450

export const PROCESSING_FEE_LABEL = "Credit card processing fee";

/** Rate that applies to a given pre-tax subtotal. */
export function getProcessingFeeRate(subtotal: number): number {
  const safe = Number.isFinite(subtotal) ? subtotal : 0;
  return safe > PROCESSING_FEE_THRESHOLD
    ? PROCESSING_FEE_RATE_HIGH_TIER
    : PROCESSING_FEE_RATE_LOW_TIER;
}

/**
 * Compute the processing fee from a pre-tax subtotal (integer-cents math).
 * Returns 0 for non-positive subtotals.
 */
export function computeProcessingFee(subtotal: number): number {
  const safe = Number.isFinite(subtotal) ? subtotal : 0;
  if (safe <= 0) return 0;
  const rate = getProcessingFeeRate(safe);
  const cents = Math.round(Math.round(safe * 100) * rate);
  return Math.round(cents) / 100;
}

/** "2.5%" / "1.5%" for display next to the dollar amount. */
export function formatProcessingFeeRate(rate: number): string {
  const pct = Math.round(rate * 1000) / 10;
  return `${pct}%`;
}

/** "Credit card processing fee (2.5%)" */
export function processingFeeLabel(rateOrSubtotal: number, isRate = true): string {
  const rate = isRate ? rateOrSubtotal : getProcessingFeeRate(rateOrSubtotal);
  return `${PROCESSING_FEE_LABEL} (${formatProcessingFeeRate(rate)})`;
}

export const PROCESSING_FEE_EXPLAINER =
  "Covers the cost of card processing. Charged on every booking at 2.5% of the rental subtotal, reduced to 1.5% on bookings over $450.";
