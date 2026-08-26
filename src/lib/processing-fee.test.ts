import { describe, it, expect } from "vitest";
import {
  computeProcessingFee,
  getProcessingFeeRate,
  processingFeeLabel,
} from "./processing-fee";
import { calculateBookingPricing } from "./pricing";

describe("processing fee tiers", () => {
  it("charges 2.5% below the threshold", () => {
    expect(computeProcessingFee(223.6)).toBe(5.59);
    expect(getProcessingFeeRate(223.6)).toBe(0.025);
  });

  it("charges 2.5% exactly at $450", () => {
    expect(getProcessingFeeRate(450)).toBe(0.025);
    expect(computeProcessingFee(450)).toBe(11.25);
  });

  it("charges 1.5% above $450", () => {
    expect(getProcessingFeeRate(450.01)).toBe(0.015);
    expect(computeProcessingFee(1000)).toBe(15);
  });

  it("returns 0 for empty or invalid subtotals", () => {
    expect(computeProcessingFee(0)).toBe(0);
    expect(computeProcessingFee(-10)).toBe(0);
    expect(computeProcessingFee(NaN)).toBe(0);
  });

  it("labels the applied rate", () => {
    expect(processingFeeLabel(0.025)).toBe("Credit card processing fee (2.5%)");
    expect(processingFeeLabel(0.015)).toBe("Credit card processing fee (1.5%)");
  });
});

describe("pricing engine integration", () => {
  it("adds the fee after tax and never taxes it", () => {
    const p = calculateBookingPricing({
      vehicleDailyRate: 100,
      rentalDays: 1,
      pickupDate: new Date("2026-09-01T16:00:00Z"), // Tuesday, no weekend surcharge
    });
    const expectedFee = computeProcessingFee(p.subtotal);
    expect(p.processingFee).toBe(expectedFee);
    expect(p.taxAmount).toBeCloseTo(
      Math.round(p.subtotal * 0.07 * 100) / 100 + Math.round(p.subtotal * 0.05 * 100) / 100,
      2,
    );
    expect(p.total).toBeCloseTo(p.subtotal + p.taxAmount + p.processingFee, 2);
  });

  it("drops to the 1.5% tier on large bookings", () => {
    const p = calculateBookingPricing({
      vehicleDailyRate: 200,
      rentalDays: 5,
      pickupDate: new Date("2026-09-01T16:00:00Z"),
    });
    expect(p.subtotal).toBeGreaterThan(450);
    expect(p.processingFeeRate).toBe(0.015);
  });
});
