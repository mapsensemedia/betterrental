/**
 * CARD PROCESSING FEE — SINGLE SOURCE OF TRUTH (server)
 *
 *  - Pre-tax rental subtotal up to $450.00  -> 2.5%
 *  - Pre-tax rental subtotal $450.01+       -> 1.5%
 *
 * Pass-through fee: added AFTER PST/GST, never itself taxed.
 * Keep in sync with src/lib/processing-fee.ts
 */

export const PROCESSING_FEE_THRESHOLD = 450;
export const PROCESSING_FEE_RATE_LOW_TIER = 0.025;
export const PROCESSING_FEE_RATE_HIGH_TIER = 0.015;

export function getProcessingFeeRate(subtotal: number): number {
  const safe = Number.isFinite(subtotal) ? subtotal : 0;
  return safe > PROCESSING_FEE_THRESHOLD
    ? PROCESSING_FEE_RATE_HIGH_TIER
    : PROCESSING_FEE_RATE_LOW_TIER;
}

export function computeProcessingFee(subtotal: number): number {
  const safe = Number.isFinite(subtotal) ? subtotal : 0;
  if (safe <= 0) return 0;
  const rate = getProcessingFeeRate(safe);
  return Math.round(Math.round(safe * 100) * rate) / 100;
}
