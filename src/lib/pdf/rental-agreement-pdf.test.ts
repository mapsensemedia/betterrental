/**
 * End-to-end PDF generation test.
 *
 * Builds a full rental-agreement PDF for a late-return scenario and
 * asserts that the rendered document contains the fee-tier and
 * km-allowance figures dictated by the shared constants in
 * `src/lib/late-return.ts` and `src/lib/km-allowance.ts`.
 *
 * jsPDF emits uncompressed content streams by default, so the raw
 * output string contains readable substrings such as
 * `(25% surcharge of daily rate per extra hour...) Tj`. That's enough
 * to catch drift between the constants and the customer-visible copy
 * without a heavyweight PDF text-extractor dependency.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { buildRentalAgreementPdf } from "./rental-agreement-pdf";
import {
  LATE_RETURN_GRACE_PERIOD_MINUTES,
  LATE_RETURN_SURCHARGE_HOURLY_PCT,
  LATE_RETURN_SURCHARGE_MAX_HOURS,
  calculateLateReturnFeeWithRate,
} from "../late-return";
import {
  WEEKLY_KM_ALLOWANCE,
  MONTHLY_KM_ALLOWANCE,
  EXCESS_KM_RATE,
} from "../km-allowance";
import type { RentalAgreement } from "@/hooks/use-rental-agreement";

// jsdom's fetch will 404 on the logo asset — silence the noise.
beforeAll(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("no network in test"))),
  );
});

const DAILY_RATE = 60;
const RENTAL_DAYS = 3;
const BOOKING_ID = "abcdef1234567890";

function makeAgreement(): RentalAgreement {
  const terms = {
    bookingCode: "LATE9999",
    vehicle: {
      category: "Compact SUV",
      make: "Hyundai",
      model: "Kona",
      year: 2023,
      color: "White",
      licensePlate: "AB123CD",
      vin: "KM8K12AA0PU123456",
      fuelType: "Gasoline",
      transmission: "Automatic",
      seats: 5,
      tankCapacityLiters: 50,
    },
    condition: { odometerOut: 12_000, fuelLevelOut: 100 },
    rental: {
      startAt: "2026-07-01T09:00:00.000Z",
      endAt: "2026-07-04T09:00:00.000Z",
      totalDays: RENTAL_DAYS,
      dailyRate: DAILY_RATE,
      weekendDays: 0,
    },
    locations: {
      pickup: { name: "Surrey Newton", address: "6768 King George Blvd", city: "Surrey" },
      deliveryAddress: null,
      dropoff: { name: "Surrey Newton", address: "6768 King George Blvd", city: "Surrey" },
    },
    customer: { name: "Late Renter", email: "late@example.com" },
    protection: { planName: "No Extra Protection", dailyRate: 0, total: 0 },
    financial: {
      vehicleSubtotal: DAILY_RATE * RENTAL_DAYS,
      weekendSurcharge: 0,
      weekendDays: 0,
      protectionTotal: 0,
      addOnsTotal: 0,
      youngDriverFee: 0,
      pvrtTotal: 4.5,
      acsrchTotal: 3,
      subtotalBeforeTax: 187.5,
      pstAmount: 13.13,
      gstAmount: 9.38,
      totalTax: 22.51,
      grandTotal: 210.01,
      depositAmount: 500,
      addOns: [],
    },
    policies: {
      minAge: 21,
      lateFeePercentOfDaily: LATE_RETURN_SURCHARGE_HOURLY_PCT,
      gracePeriodMinutes: LATE_RETURN_GRACE_PERIOD_MINUTES,
      thirdPartyLiabilityIncluded: true,
      optionalCoverageAvailable: true,
      fuelReturnPolicy: "Same level as pickup",
      smokingAllowed: false,
      petsAllowed: false,
      internationalTravel: false,
    },
    taxes: { pstRate: 0.07, gstRate: 0.05, pvrtDailyFee: 1.5, acsrchDailyFee: 1 },
  };

  return {
    id: "agreement-1",
    booking_id: BOOKING_ID,
    version: 1,
    agreement_content: "",
    terms_json: terms as any,
    status: "confirmed",
    customer_signature: "Late Renter",
    customer_signed_at: "2026-07-01T09:05:00.000Z",
    staff_confirmed_at: "2026-07-01T09:06:00.000Z",
    created_at: "2026-07-01T09:00:00.000Z",
    signed_manually: false,
  } as unknown as RentalAgreement;
}

async function renderPdfString(): Promise<string> {
  const pdf = await buildRentalAgreementPdf(makeAgreement(), BOOKING_ID);
  // jsPDF's default output() returns the raw PDF as a binary string —
  // content streams are uncompressed so text is directly searchable.
  return pdf.output();
}

describe("rental-agreement PDF: late-return + km-allowance rendering", () => {
  let pdfText: string;

  beforeAll(async () => {
    pdfText = await renderPdfString();
  });

  it("produces a non-empty PDF document", () => {
    expect(pdfText.startsWith("%PDF-")).toBe(true);
    expect(pdfText.length).toBeGreaterThan(2000);
  });

  describe("late-return fee tiers", () => {
    it(`shows the ${LATE_RETURN_GRACE_PERIOD_MINUTES}-min grace period`, () => {
      expect(pdfText).toContain(`${LATE_RETURN_GRACE_PERIOD_MINUTES} min`);
    });

    it(`shows the ${LATE_RETURN_SURCHARGE_HOURLY_PCT * 100}% hourly surcharge tier`, () => {
      const pct = `${(LATE_RETURN_SURCHARGE_HOURLY_PCT * 100).toFixed(0)}%`;
      expect(pdfText).toContain(`${pct} surcharge of daily rate per extra hour`);
    });

    it(`caps the hourly tier at ${LATE_RETURN_SURCHARGE_MAX_HOURS} hrs before full-day charge`, () => {
      expect(pdfText).toContain(`up to ${LATE_RETURN_SURCHARGE_MAX_HOURS} hrs`);
      expect(pdfText).toMatch(/full day charge/i);
    });

    it("calculates the tiered fee correctly for a 1.5 hr late return", () => {
      // 30 min grace + 1.5 hrs → billed as 2 hrs @ 25% of daily rate.
      const scheduled = new Date("2026-07-04T09:00:00.000Z");
      const actual = new Date(scheduled.getTime() + (30 + 90) * 60_000);
      const info = calculateLateReturnFeeWithRate(scheduled, DAILY_RATE, actual);
      expect(info.isLate).toBe(true);
      expect(info.hoursLate).toBe(2);
      expect(info.fee).toBeCloseTo(
        DAILY_RATE * LATE_RETURN_SURCHARGE_HOURLY_PCT * 2,
        2,
      );
    });

    it("switches to a full daily-rate charge past the 2 hr window", () => {
      const scheduled = new Date("2026-07-04T09:00:00.000Z");
      const actual = new Date(scheduled.getTime() + (30 + 3 * 60) * 60_000); // 3 hrs late
      const info = calculateLateReturnFeeWithRate(scheduled, DAILY_RATE, actual);
      expect(info.fee).toBeCloseTo(DAILY_RATE, 2);
    });
  });

  describe("kilometre policy", () => {
    it("omits the KILOMETRE ALLOWANCE section header", () => {
      expect(pdfText).not.toContain("KILOMETRE ALLOWANCE");
    });

    it("omits the weekly and monthly caps", () => {
      expect(pdfText).not.toContain(`${WEEKLY_KM_ALLOWANCE.toLocaleString()} km per 7 days`);
      expect(pdfText).not.toContain(`${MONTHLY_KM_ALLOWANCE.toLocaleString()} km per 30 days`);
    });

    it("omits the excess km rate", () => {
      expect(pdfText).not.toContain(`$${EXCESS_KM_RATE.toFixed(2)}/km`);
    });

    it("states unlimited kilometres", () => {
      expect(pdfText).toMatch(/unlimited kilometres/i);
    });
  });
});
