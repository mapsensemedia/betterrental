import { describe, it, expect } from "vitest";
import {
  WEEKLY_KM_ALLOWANCE,
  MONTHLY_KM_ALLOWANCE,
  EXCESS_KM_RATE,
  calculateKmAllowance,
  calculateExcessKm,
  formatKmAllowanceSummary,
} from "./km-allowance";

describe("km-allowance constants", () => {
  it("matches the published policy", () => {
    expect(WEEKLY_KM_ALLOWANCE).toBe(1400);
    expect(MONTHLY_KM_ALLOWANCE).toBe(4800);
    expect(EXCESS_KM_RATE).toBe(0.25);
  });
});

describe("calculateKmAllowance (prorated)", () => {
  it("30 days = 4,800 km (monthly cap)", () => {
    expect(calculateKmAllowance(30)).toBe(4800);
  });
  it("7 days = 1,120 km (prorated on ~160/day, not the weekly 1,400)", () => {
    // Intentional: docs example says 4,800/30*20 = 3,200, so we prorate off the monthly base.
    expect(calculateKmAllowance(7)).toBe(Math.round(4800 / 30 * 7));
  });
  it("20 days = 3,200 km (docs example)", () => {
    expect(calculateKmAllowance(20)).toBe(3200);
  });
  it("1 day = 160 km", () => {
    expect(calculateKmAllowance(1)).toBe(160);
  });
  it("0 or negative days = 0", () => {
    expect(calculateKmAllowance(0)).toBe(0);
    expect(calculateKmAllowance(-5)).toBe(0);
  });
});

describe("calculateExcessKm", () => {
  it("no excess when driven ≤ allowance", () => {
    const r = calculateExcessKm(10_000, 13_200, 20); // drove 3,200 km on 3,200 allowance
    expect(r.kmDriven).toBe(3200);
    expect(r.excessKm).toBe(0);
    expect(r.excessFee).toBe(0);
    expect(r.excessFeeCents).toBe(0);
  });

  it("charges $0.25/km over the allowance", () => {
    const r = calculateExcessKm(10_000, 13_300, 20); // 100 km over
    expect(r.excessKm).toBe(100);
    expect(r.excessFeeCents).toBe(2500);
    expect(r.excessFee).toBe(25);
  });

  it("clamps negative driven distance to zero", () => {
    const r = calculateExcessKm(500, 400, 5);
    expect(r.kmDriven).toBe(0);
    expect(r.excessKm).toBe(0);
  });

  it("handles null odometer values", () => {
    const r = calculateExcessKm(null, null, 7);
    expect(r.kmDriven).toBe(0);
    expect(r.excessKm).toBe(0);
  });
});

describe("formatKmAllowanceSummary", () => {
  it("prorated string mentions the calculated allowance and rate", () => {
    const s = formatKmAllowanceSummary(20);
    expect(s).toContain("3,200 km");
    expect(s).toContain("0.25");
  });
  it("static string mentions weekly and monthly caps", () => {
    const s = formatKmAllowanceSummary();
    expect(s).toContain("1,400");
    expect(s).toContain("4,800");
    expect(s).toContain("0.25");
  });
});
