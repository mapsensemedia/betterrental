import { describe, it, expect } from "vitest";
import {
  countWeekendDays,
  calculateBookingPricing,
  WEEKEND_SURCHARGE_RATE,
} from "./pricing";

describe("countWeekendDays", () => {
  it("Thu→Mon (5 days) = 3 weekend days (Fri, Sat, Sun)", () => {
    // 2025-03-06 is Thursday
    const thu = new Date(2025, 2, 6);
    expect(countWeekendDays(thu, 5)).toBe(3);
  });

  it("Mon→Thu (4 days) = 0 weekend days", () => {
    // 2025-03-03 is Monday
    const mon = new Date(2025, 2, 3);
    expect(countWeekendDays(mon, 4)).toBe(0);
  });

  it("Fri→Sun (3 days) = 3 weekend days", () => {
    // 2025-03-07 is Friday
    const fri = new Date(2025, 2, 7);
    expect(countWeekendDays(fri, 3)).toBe(3);
  });

  it("Sat→Sat (1 day same-day) = 1 weekend day", () => {
    // 2025-03-08 is Saturday
    const sat = new Date(2025, 2, 8);
    expect(countWeekendDays(sat, 1)).toBe(1);
  });

  it("handles month boundary (Sun Mar 30 → Wed Apr 2 = 4 days, 1 weekend day)", () => {
    // 2025-03-30 is Sunday
    const sun = new Date(2025, 2, 30);
    expect(countWeekendDays(sun, 4)).toBe(1); // only the Sunday
  });

  it("null pickupDate returns 0", () => {
    expect(countWeekendDays(null, 5)).toBe(0);
  });

  it("0 rental days returns 0", () => {
    expect(countWeekendDays(new Date(2025, 2, 7), 0)).toBe(0);
  });

  it("full week (7 days starting Monday) = 3 weekend days", () => {
    const mon = new Date(2025, 2, 3);
    expect(countWeekendDays(mon, 7)).toBe(3);
  });
});

describe("calculateBookingPricing - weekend surcharge", () => {
  const baseInput = {
    vehicleDailyRate: 100,
    rentalDays: 5,
    protectionDailyRate: 0,
    addOnsTotal: 0,
    deliveryFee: 0,
    driverAgeBand: null,
  };

  it("Thu→Mon: surcharge on 3 weekend days only", () => {
    const thu = new Date(2025, 2, 6); // Thursday
    const result = calculateBookingPricing({
      ...baseInput,
      pickupDate: thu,
    });
    // 3 weekend days × $100 × 15% = $45
    expect(result.weekendSurcharge).toBeCloseTo(45, 2);
  });

  it("Mon→Thu: zero surcharge", () => {
    const mon = new Date(2025, 2, 3); // Monday
    const result = calculateBookingPricing({
      ...baseInput,
      rentalDays: 4,
      pickupDate: mon,
    });
    expect(result.weekendSurcharge).toBe(0);
  });

  it("Fri→Sun: surcharge on all 3 days", () => {
    const fri = new Date(2025, 2, 7); // Friday
    const result = calculateBookingPricing({
      ...baseInput,
      rentalDays: 3,
      pickupDate: fri,
    });
    // 3 × $100 × 15% = $45
    expect(result.weekendSurcharge).toBeCloseTo(45, 2);
  });

  it("no pickupDate: zero surcharge", () => {
    const result = calculateBookingPricing({
      ...baseInput,
      pickupDate: null,
    });
    expect(result.weekendSurcharge).toBe(0);
  });

  it("taxes, discounts, fees unchanged by surcharge fix", () => {
    const mon = new Date(2025, 2, 3);
    const result = calculateBookingPricing({
      ...baseInput,
      rentalDays: 4,
      pickupDate: mon,
      deliveryFee: 25,
      protectionDailyRate: 10,
    });
    // No weekend surcharge
    expect(result.weekendSurcharge).toBe(0);
    expect(result.deliveryFee).toBe(25);
    expect(result.protectionTotal).toBe(40);
    // Verify tax is applied
    expect(result.pstAmount).toBeGreaterThan(0);
    expect(result.gstAmount).toBeGreaterThan(0);
  });
});
