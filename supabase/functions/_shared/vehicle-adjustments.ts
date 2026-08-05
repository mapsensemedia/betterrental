/**
 * Vehicle-line adjustment itemization (edge runtime).
 *
 * Mirrors src/lib/vehicle-adjustments.ts + deriveVehicleAdjustments() in
 * src/lib/pricing.ts so printed documents itemize the weekend surcharge and the
 * duration discount as separate signed lines instead of netting them into one
 * (which hid the surcharge whenever the discount was larger).
 */

export const WEEKEND_SURCHARGE_RATE = 0.15;
// Duration discounts are RETIRED — rates kept at 0 (historic bookings still
// itemize from their stored duration_discount value).
export const WEEKLY_DISCOUNT_THRESHOLD = 7;
export const WEEKLY_DISCOUNT_RATE = 0;
export const MONTHLY_DISCOUNT_THRESHOLD = 21;
export const MONTHLY_DISCOUNT_RATE = 0;

export interface AdjustmentLine {
  label: string;
  /** Signed amount in integer cents (positive = charge, negative = credit). */
  cents: number;
}

function toCents(n: number | string | null | undefined): number {
  return Math.round(Number(n || 0) * 100);
}

/** Count Fri/Sat/Sun days in the range, on the America/Vancouver calendar. */
export function countWeekendDaysVancouver(startISO: string | null | undefined, days: number): number {
  if (!startISO || !days || days < 1) return 0;
  const start = new Date(startISO);
  if (Number.isNaN(start.getTime())) return 0;
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Vancouver", weekday: "short" });
  let count = 0;
  for (let i = 0; i < days; i++) {
    const wk = fmt.format(new Date(start.getTime() + i * 86400000));
    if (wk === "Fri" || wk === "Sat" || wk === "Sun") count++;
  }
  return count;
}

export function getDurationDiscount(days: number): { rate: number; type: "none" | "weekly" | "monthly" } {
  if (days >= MONTHLY_DISCOUNT_THRESHOLD) return { rate: MONTHLY_DISCOUNT_RATE, type: "monthly" };
  if (days >= WEEKLY_DISCOUNT_THRESHOLD) return { rate: WEEKLY_DISCOUNT_RATE, type: "weekly" };
  return { rate: 0, type: "none" };
}

export function deriveVehicleAdjustments(input: {
  dailyRate: number | string | null | undefined;
  totalDays: number;
  startAt: string | null | undefined;
}) {
  const dailyRateCents = toCents(input.dailyRate);
  const days = Math.max(0, Number(input.totalDays) || 0);
  const baseCents = dailyRateCents * days;
  const weekendDays = countWeekendDaysVancouver(input.startAt, days);
  const weekendSurchargeCents = weekendDays > 0
    ? Math.round(dailyRateCents * weekendDays * WEEKEND_SURCHARGE_RATE)
    : 0;
  const { rate: discountRate, type: discountType } = getDurationDiscount(days);
  const durationDiscountCents = discountRate > 0
    ? Math.round((baseCents + weekendSurchargeCents) * discountRate)
    : 0;
  return { weekendDays, baseCents, weekendSurchargeCents, durationDiscountCents, discountRate, discountType };
}

/**
 * Build explicit signed adjustment lines for the vehicle portion of a booking.
 * `actualAdjustmentCents` is the true remainder (dbSubtotal − all known lines),
 * so the itemization always reconciles to the stored subtotal to the cent.
 */
export function buildVehicleAdjustmentLines(input: {
  dailyRate: number | string | null | undefined;
  totalDays: number;
  startAt: string | null | undefined;
  storedWeekendSurcharge?: number | string | null;
  storedDurationDiscount?: number | string | null;
  actualAdjustmentCents: number;
}): { lines: AdjustmentLine[]; weekendDays: number; weekendSurchargeCents: number; durationDiscountCents: number } {
  const derived = deriveVehicleAdjustments(input);

  const storedSurchargeCents = toCents(input.storedWeekendSurcharge);
  const storedDiscountCents = toCents(input.storedDurationDiscount);
  const hasStored = storedSurchargeCents > 0 || storedDiscountCents > 0;

  let surchargeCents = hasStored ? storedSurchargeCents : derived.weekendSurchargeCents;
  let discountCents = hasStored ? storedDiscountCents : derived.durationDiscountCents;

  const lines: AdjustmentLine[] = [];
  if (input.actualAdjustmentCents === 0) {
    return { lines, weekendDays: derived.weekendDays, weekendSurchargeCents: 0, durationDiscountCents: 0 };
  }

  if (surchargeCents > 0) {
    const pct = Math.round(WEEKEND_SURCHARGE_RATE * 100);
    lines.push({
      label: derived.weekendDays > 0
        ? `Weekend Surcharge (${derived.weekendDays} day${derived.weekendDays === 1 ? "" : "s"} × ${pct}%)`
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

  const explained = lines.reduce((sum, l) => sum + l.cents, 0);
  const leftover = input.actualAdjustmentCents - explained;
  if (leftover !== 0) {
    lines.push({
      label: leftover > 0 ? "Rate Adjustment" : "Discount / Adjustment",
      cents: leftover,
    });
  }

  return {
    lines,
    weekendDays: derived.weekendDays,
    weekendSurchargeCents: surchargeCents,
    durationDiscountCents: discountCents,
  };
}
