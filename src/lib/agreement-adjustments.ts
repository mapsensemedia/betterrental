/**
 * Resolves the explicit vehicle-line adjustments (weekend surcharge / duration
 * discount) for a stored rental agreement's terms_json.
 *
 * New agreements persist `financial.adjustmentLines`. Historic agreements only
 * stored a single netted `weekendSurcharge` (often 0 when a duration discount
 * outweighed the surcharge), so the lines are recomputed from the rental facts
 * and reconciled against the stored subtotal.
 */
import { buildVehicleAdjustmentLines } from "./vehicle-adjustments";

export interface AgreementAdjustmentLine {
  label: string;
  amount: number;
}

interface AgreementTermsLike {
  rental: {
    startAt?: string | null;
    dailyRate: number;
    totalDays: number;
  };
  financial: {
    vehicleSubtotal: number;
    weekendSurcharge?: number;
    durationDiscount?: number;
    adjustmentLines?: AgreementAdjustmentLine[];
    protectionTotal?: number;
    addOnsTotal: number;
    youngDriverFee: number;
    pvrtTotal: number;
    acsrchTotal: number;
    subtotalBeforeTax: number;
  };
}

function toCents(n: number | null | undefined): number {
  return Math.round(Number(n || 0) * 100);
}

export function resolveAgreementAdjustmentLines(t: AgreementTermsLike): AgreementAdjustmentLine[] {
  const stored = t.financial.adjustmentLines;
  if (Array.isArray(stored) && stored.length > 0) return stored;

  const f = t.financial;
  const knownCents = toCents(f.vehicleSubtotal) + toCents(f.protectionTotal)
    + toCents(f.addOnsTotal) + toCents(f.youngDriverFee)
    + toCents(f.pvrtTotal) + toCents(f.acsrchTotal);
  const actualAdjustmentCents = toCents(f.subtotalBeforeTax) - knownCents;
  if (actualAdjustmentCents === 0) return [];

  const vehicleBaseCents = toCents(f.vehicleSubtotal);
  const lines = buildVehicleAdjustmentLines({
    booking: {
      daily_rate: t.rental.dailyRate,
      total_days: t.rental.totalDays,
      start_at: t.rental.startAt ?? null,
      weekend_surcharge: f.weekendSurcharge ?? 0,
      duration_discount: f.durationDiscount ?? 0,
    },
    vehicleBaseCents,
    vehicleRemainderCents: vehicleBaseCents + actualAdjustmentCents,
    useRemainder: true,
  });

  return lines.map((l) => ({ label: l.label, amount: l.cents / 100 }));
}
