/**
 * Vehicle-line adjustment itemization.
 *
 * The vehicle portion of a booking subtotal is base rate × days, plus a weekend
 * surcharge, minus a duration (weekly/monthly) discount. Historically these two
 * adjustments were never stored, so display surfaces derived a single net
 * remainder — which silently hid the weekend surcharge whenever a duration
 * discount was larger (e.g. booking W9JD9JDV: +$53.99 surcharge and −$77.39
 * discount collapsed into one "Discount −$3.40" line).
 *
 * This helper always produces explicit, signed lines: it prefers the stored
 * `weekend_surcharge` / `duration_discount` columns, and recomputes them for
 * historic bookings. Any leftover between the itemized adjustments and the real
 * remainder is surfaced as its own "Rate Adjustment" line so the itemization
 * still reconciles to the stored subtotal to the cent.
 */
import { deriveVehicleAdjustments, WEEKEND_SURCHARGE_RATE } from "./pricing";

export interface AdjustmentLine {
  /** Human label for the line. */
  label: string;
  /** Signed amount in integer cents (positive = charge, negative = credit). */
  cents: number;
}

function toCents(n: number | string | null | undefined): number {
  return Math.round(Number(n || 0) * 100);
}

export function buildVehicleAdjustmentLines(input: {
  booking: {
    daily_rate?: number | string | null;
    total_days?: number | null;
    start_at?: string | null;
    weekend_surcharge?: number | string | null;
    duration_discount?: number | string | null;
  };
  /** base rate × days, in cents */
  vehicleBaseCents: number;
  /** Actual vehicle amount derived from the stored subtotal, in cents */
  vehicleRemainderCents: number;
  /** Whether the remainder is trustworthy (positive + sane) */
  useRemainder: boolean;
}): AdjustmentLine[] {
  const { booking, vehicleBaseCents, vehicleRemainderCents, useRemainder } = input;

  if (!useRemainder) return [];

  const actualAdjustmentCents = vehicleRemainderCents - vehicleBaseCents;
  if (actualAdjustmentCents === 0) return [];

  const storedSurchargeCents = toCents(booking.weekend_surcharge);
  const storedDiscountCents = toCents(booking.duration_discount);
  const hasStored = storedSurchargeCents > 0 || storedDiscountCents > 0;

  const derived = deriveVehicleAdjustments({
    dailyRate: booking.daily_rate,
    totalDays: booking.total_days ?? 0,
    startAt: booking.start_at,
  });

  const surchargeCents = hasStored ? storedSurchargeCents : derived.weekendSurchargeCents;
  const discountCents = hasStored ? storedDiscountCents : derived.durationDiscountCents;

  const lines: AdjustmentLine[] = [];

  if (surchargeCents > 0) {
    const days = derived.weekendDays;
    const pct = Math.round(WEEKEND_SURCHARGE_RATE * 100);
    lines.push({
      label: days > 0
        ? `Weekend Surcharge (${days} day${days === 1 ? "" : "s"} × ${pct}%)`
        : `Weekend Surcharge (${pct}%)`,
      cents: surchargeCents,
    });
  }

  if (discountCents > 0) {
    const pct = Math.round(derived.discountRate * 100);
    const label = derived.discountType === "monthly"
      ? `Monthly Discount${pct ? ` (${pct}%)` : ""}`
      : derived.discountType === "weekly"
        ? `Weekly Discount${pct ? ` (${pct}%)` : ""}`
        : "Discount";
    lines.push({ label, cents: -discountCents });
  }

  // Reconcile: anything the two adjustments don't explain (manual rate overrides,
  // legacy data) becomes its own line so the itemization still sums to subtotal.
  const explained = lines.reduce((sum, l) => sum + l.cents, 0);
  const leftover = actualAdjustmentCents - explained;
  if (leftover !== 0) {
    lines.push({
      label: leftover > 0 ? "Rate Adjustment" : "Discount / Adjustment",
      cents: leftover,
    });
  }

  return lines;
}
