import { describe, it, expect } from "vitest";
import {
  FREE_KM_DAYS,
  EXCESS_KM_RATE,
  KM_PER_DAY,
  calculateKmAllowance,
  calculateExcessKm,
  formatKmAllowanceSummary,
  isUnlimitedKm,
} from "./km-allowance";

describe("km-allowance constants", () => {
  it("matches the published policy", () => {
    expect(FREE_KM_DAYS).toBe(7);
    expect(KM_PER_DAY).toBe(160);
    expect(EXCESS_KM_RATE).toBe(0.25);
  });
});

describe("isUnlimitedKm", () => {
  it("is unlimited for 1–7 day rentals", () => {
    expect(isUnlimitedKm(1)).toBe(true);
    expect(isUnlimitedKm(7)).toBe(true);
  });
  it("is not unlimited beyond 7 days", () => {
    expect(isUnlimitedKm(8)).toBe(false);
    expect(isUnlimitedKm(30)).toBe(false);
  });
  it("is not unlimited for zero/negative days", () => {
    expect(isUnlimitedKm(0)).toBe(false);
    expect(isUnlimitedKm(-3)).toBe(false);
  });
});

describe("calculateKmAllowance", () => {
  it("returns Infinity for rentals up to 7 days", () => {
    expect(calculateKmAllowance(1)).toBe(Infinity);
    expect(calculateKmAllowance(7)).toBe(Infinity);
  });
  it("10 days = 480 km (3 chargeable days)", () => {
    expect(calculateKmAllowance(10)).toBe(480);
  });
  it("30 days = 3,680 km (23 chargeable days)", () => {
    expect(calculateKmAllowance(30)).toBe(Math.round(160 * 23));
  });
  it("0 or negative days = 0", () => {
    expect(calculateKmAllowance(0)).toBe(0);
    expect(calculateKmAllowance(-5)).toBe(0);
  });
});

describe("calculateExcessKm", () => {
  it("never charges excess on a 1–7 day rental", () => {
    const r = calculateExcessKm(10_000, 15_000, 3);
    expect(r.kmDriven).toBe(5000);
    expect(r.unlimited).toBe(true);
    expect(r.excessKm).toBe(0);
    expect(r.excessFee).toBe(0);
    expect(r.excessFeeCents).toBe(0);
  });

  it("no excess when driven ≤ allowance on a long rental", () => {
    const r = calculateExcessKm(10_000, 10_480, 10); // 480 km on 480 allowance
    expect(r.kmDriven).toBe(480);
    expect(r.excessKm).toBe(0);
    expect(r.excessFeeCents).toBe(0);
  });

  it("charges $0.25/km over the allowance on a long rental", () => {
    const r = calculateExcessKm(10_000, 10_580, 10); // 100 km over
    expect(r.unlimited).toBe(false);
    expect(r.excessKm).toBe(100);
    expect(r.excessFeeCents).toBe(2500);
    expect(r.excessFee).toBe(25);
  });

  it("clamps negative driven distance to zero", () => {
    const r = calculateExcessKm(500, 400, 10);
    expect(r.kmDriven).toBe(0);
    expect(r.excessKm).toBe(0);
  });

  it("handles null odometer values", () => {
    const r = calculateExcessKm(null, null, 10);
    expect(r.kmDriven).toBe(0);
    expect(r.excessKm).toBe(0);
  });
});

describe("formatKmAllowanceSummary", () => {
  it("short rentals read as unlimited", () => {
    expect(formatKmAllowanceSummary(3)).toMatch(/unlimited/i);
  });
  it("long rentals mention the included km and excess rate", () => {
    const s = formatKmAllowanceSummary(10);
    expect(s).toContain("480 km");
    expect(s).toContain("0.25");
  });
  it("static string mentions the 7-day unlimited window and rate", () => {
    const s = formatKmAllowanceSummary();
    expect(s).toMatch(/unlimited/i);
    expect(s).toContain("7");
    expect(s).toContain("0.25");
  });
});
