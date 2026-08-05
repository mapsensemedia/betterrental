import { describe, it, expect } from "vitest";
import {
  countWeekendDays,
  calculateBookingPricing,
  WEEKEND_SURCHARGE_RATE,
  deriveVehicleAdjustments,
} from "./pricing";
import { buildVehicleAdjustmentLines } from "./vehicle-adjustments";

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

describe("rentalDays boundary rule (Math.ceil(hours/24))", () => {
  // Mirrors src/contexts/RentalBookingContext.tsx rentalDays computation.
  const days = (hours: number) => {
    const ms = hours * 60 * 60 * 1000;
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  };

  it("24 hours = 1 day", () => expect(days(24)).toBe(1));
  it("24h 30m = 2 days", () => expect(days(24.5)).toBe(2));
  it("25 hours = 2 days", () => expect(days(25)).toBe(2));
  it("48 hours = 2 days", () => expect(days(48)).toBe(2));
  it("49 hours = 3 days", () => expect(days(49)).toBe(3));
  it("72 hours = 3 days", () => expect(days(72)).toBe(3));
  it("72h 1m = 4 days", () => expect(days(72 + 1/60)).toBe(4));
});

describe("weekend surcharge + duration discount (booking W9JD9JDV regression)", () => {
  // start 2026-07-18T03:00Z = Fri Jul 17, 8:00 PM Vancouver
  // end   2026-07-26T00:00Z = Sat Jul 25, 5:00 PM Vancouver → 8 billable days
  const START = "2026-07-18T03:00:00Z";
  const DAILY = 89.99;
  const DAYS = 8;

  it("counts weekend days on the business calendar, not UTC", () => {
    // Business anchor is Fri Jul 17 → Fri 17, Sat 18, Sun 19, Fri 24 = 4
    expect(countWeekendDays(START, DAYS)).toBe(4);
  });

  it("derives the surcharge and applies no duration discount (discounts retired)", () => {
    const adj = deriveVehicleAdjustments({ dailyRate: DAILY, totalDays: DAYS, startAt: START });
    expect(adj.baseCents).toBe(71992);
    expect(adj.weekendSurchargeCents).toBe(5399); // 89.99 × 4 × 15%
    expect(adj.discountType).toBe("none");
    expect(adj.durationDiscountCents).toBe(0);
  });

  it("itemizes surcharge and the legacy discount remainder as distinct signed lines", () => {
    const baseCents = 71992;
    // Real vehicle amount stored for this booking: 716.52 subtotal − 20.00 daily fees
    const remainderCents = 69652;
    const lines = buildVehicleAdjustmentLines({
      booking: { daily_rate: DAILY, total_days: DAYS, start_at: START },
      vehicleBaseCents: baseCents,
      vehicleRemainderCents: remainderCents,
      useRemainder: true,
    });

    const surcharge = lines.find((l) => l.label.startsWith("Weekend Surcharge"));
    const discount = lines.find((l) => l.label === "Discount / Adjustment");
    expect(surcharge?.cents).toBe(5399);
    expect(discount?.cents).toBe(-7739);
    expect(surcharge!.label).toContain("4 days");

    // Itemization reconciles exactly to the stored vehicle amount
    const sum = baseCents + lines.reduce((s, l) => s + l.cents, 0);
    expect(sum).toBe(remainderCents);
  });

  it("prefers stored columns when present", () => {
    const lines = buildVehicleAdjustmentLines({
      booking: {
        daily_rate: DAILY,
        total_days: DAYS,
        start_at: START,
        weekend_surcharge: 53.99,
        duration_discount: 77.39,
      },
      vehicleBaseCents: 71992,
      vehicleRemainderCents: 69652,
      useRemainder: true,
    });
    expect(lines.map((l) => l.cents)).toEqual([5399, -7739]);
  });

  it("evening pickup does not shift the weekend window (client === server anchor)", () => {
    // Fri Jul 17 2026, 9:00 PM Vancouver = Sat Jul 18 04:00Z
    const evening = "2026-07-18T04:00:00Z";
    expect(countWeekendDays(evening, 3)).toBe(3); // Fri 17, Sat 18, Sun 19
  });

  it("full subtotal reconstruction matches the stored subtotal (legacy stored discount)", () => {
    const adj = deriveVehicleAdjustments({ dailyRate: DAILY, totalDays: DAYS, startAt: START });
    const storedDiscountCents = 7739; // discount stored on this legacy booking
    const vehicleCents = adj.baseCents + adj.weekendSurchargeCents - storedDiscountCents;
    const dailyFeesCents = Math.round((1.5 + 1.0) * 100) * DAYS;
    expect((vehicleCents + dailyFeesCents) / 100).toBeCloseTo(716.52, 2);
  });
});
});
