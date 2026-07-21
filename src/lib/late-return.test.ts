import { describe, it, expect } from "vitest";
import {
  LATE_RETURN_GRACE_PERIOD_MINUTES,
  LATE_RETURN_SURCHARGE_HOURLY_PCT,
  LATE_RETURN_SURCHARGE_MAX_HOURS,
  calculateLateReturnFee,
  calculateLateReturnFeeWithRate,
} from "./late-return";
import { calculateLateFee } from "./pricing";

const DAILY = 100; // $100/day → hourly surcharge = $25

describe("late-return constants", () => {
  it("matches the published policy", () => {
    expect(LATE_RETURN_GRACE_PERIOD_MINUTES).toBe(30);
    expect(LATE_RETURN_SURCHARGE_HOURLY_PCT).toBe(0.25);
    expect(LATE_RETURN_SURCHARGE_MAX_HOURS).toBe(2);
  });
});

describe("calculateLateReturnFee (grace detection)", () => {
  const start = new Date("2026-01-01T10:00:00Z");
  it("on-time is not late", () => {
    const r = calculateLateReturnFee(start, start);
    expect(r.isLate).toBe(false);
  });
  it("29 minutes past = still in grace", () => {
    const at = new Date(start.getTime() + 29 * 60_000);
    expect(calculateLateReturnFee(start, at).isLate).toBe(false);
  });
  it("31 minutes past = late", () => {
    const at = new Date(start.getTime() + 31 * 60_000);
    expect(calculateLateReturnFee(start, at).isLate).toBe(true);
  });
});

describe("calculateLateReturnFeeWithRate (tiered fee)", () => {
  const start = new Date("2026-01-01T10:00:00Z");
  const at = (minutes: number) => new Date(start.getTime() + minutes * 60_000);

  it("within grace → $0", () => {
    expect(calculateLateReturnFeeWithRate(start, DAILY, at(20)).fee).toBe(0);
  });

  it("1 hour past grace → 1 × 25% × daily = $25", () => {
    // 30 min grace + 60 min = 90 min late → hoursLate = ceil(60/60) = 1
    expect(calculateLateReturnFeeWithRate(start, DAILY, at(90)).fee).toBe(25);
  });

  it("2 hours past grace → 2 × 25% × daily = $50", () => {
    // 30 min grace + 120 min = 150 min → hoursLate = 2
    expect(calculateLateReturnFeeWithRate(start, DAILY, at(150)).fee).toBe(50);
  });

  it("3 hours past grace → switches to full daily rate = $100", () => {
    // 30 min grace + 180 min = 210 min → hoursLate = 3 → 1 extra day
    expect(calculateLateReturnFeeWithRate(start, DAILY, at(210)).fee).toBe(100);
  });

  it("27 hours past grace → 2 extra days = $200", () => {
    const minutes = 30 + 27 * 60;
    expect(calculateLateReturnFeeWithRate(start, DAILY, at(minutes)).fee).toBe(200);
  });
});

describe("calculateLateFee (pricing.ts delegate)", () => {
  it("mirrors the tiered rule from late-return.ts", () => {
    expect(calculateLateFee(20, DAILY)).toBe(0);      // in grace
    expect(calculateLateFee(90, DAILY)).toBe(25);     // 1 hr past grace
    expect(calculateLateFee(150, DAILY)).toBe(50);    // 2 hrs past grace
    expect(calculateLateFee(210, DAILY)).toBe(100);   // 3 hrs → full day
  });
  it("returns 0 (and does not use a $25/hr fallback) when dailyRate missing", () => {
    expect(calculateLateFee(180)).toBe(0);
  });
});
