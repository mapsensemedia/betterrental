/**
 * Policy copy regression tests.
 *
 * These read the actual source of the customer-facing surfaces (FAQ page,
 * agreement view, PDF template, edge-function terms string) and assert that:
 *   - the km-allowance figures match `src/lib/km-allowance.ts`
 *   - the late-return copy matches `src/lib/late-return.ts`
 *   - no "unlimited kilometres" language slipped back in
 *
 * String-based assertions are enough here — the goal is to catch drift
 * between the constants and the human-readable copy without booting the UI.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  WEEKLY_KM_ALLOWANCE,
  MONTHLY_KM_ALLOWANCE,
  EXCESS_KM_RATE,
} from "./km-allowance";
import {
  LATE_RETURN_GRACE_PERIOD_MINUTES,
  LATE_RETURN_SURCHARGE_HOURLY_PCT,
  LATE_RETURN_SURCHARGE_MAX_HOURS,
} from "./late-return";

const read = (p: string) =>
  readFileSync(resolve(process.cwd(), p), "utf8");

const SURFACES = {
  faq: read("src/pages/Surrey.tsx"),
  agreementView: read("src/components/booking/AgreementStructuredView.tsx"),
  pdfTemplate: read("src/lib/pdf/rental-agreement-pdf.ts"),
  edgeAgreement: read("supabase/functions/generate-agreement/index.ts"),
  pdfViewer: read("src/pages/PdfViewerPage.tsx"),
  checkout: read("src/pages/NewCheckout.tsx"),
};

describe("no 'unlimited km' language anywhere customer-facing", () => {
  for (const [name, src] of Object.entries(SURFACES)) {
    it(`${name} does not mention 'unlimited km/kilometres'`, () => {
      expect(src).not.toMatch(/unlimited\s+(km|kilometre|kilometer)/i);
    });
  }
});

describe("km-allowance copy matches constants", () => {
  const weekly = WEEKLY_KM_ALLOWANCE.toLocaleString(); // "1,400"
  const monthly = MONTHLY_KM_ALLOWANCE.toLocaleString(); // "4,800"
  const rate = `$${EXCESS_KM_RATE.toFixed(2)}`;         // "$0.25"

  it("Surrey FAQ mentions weekly + monthly caps and excess rate", () => {
    expect(SURFACES.faq).toContain(weekly);
    expect(SURFACES.faq).toContain(monthly);
    expect(SURFACES.faq).toContain(rate);
  });

  it("Agreement structured view mentions caps + excess rate", () => {
    expect(SURFACES.agreementView).toContain(weekly);
    expect(SURFACES.agreementView).toContain(monthly);
    expect(SURFACES.agreementView).toContain(rate);
  });

  it("PDF template section 7 mentions caps + excess rate", () => {
    expect(SURFACES.pdfTemplate).toContain("KILOMETRE ALLOWANCE");
    expect(SURFACES.pdfTemplate).toContain(weekly);
    expect(SURFACES.pdfTemplate).toContain(monthly);
    expect(SURFACES.pdfTemplate).toContain(rate);
  });

  it("Edge function terms string mentions caps + excess rate", () => {
    expect(SURFACES.edgeAgreement).toContain(weekly);
    expect(SURFACES.edgeAgreement).toContain(monthly);
    expect(SURFACES.edgeAgreement).toContain(rate);
  });

  it("PDF viewer policy banner mentions caps + excess rate", () => {
    expect(SURFACES.pdfViewer).toContain(weekly);
    expect(SURFACES.pdfViewer).toContain(monthly);
    expect(SURFACES.pdfViewer).toContain(rate);
  });

  it("Checkout tooltip references the monthly cap + excess rate", () => {
    expect(SURFACES.checkout).toContain(monthly);
    expect(SURFACES.checkout).toContain(rate);
  });
});

describe("late-return copy matches constants", () => {
  const grace = String(LATE_RETURN_GRACE_PERIOD_MINUTES);          // "30"
  const pct = `${(LATE_RETURN_SURCHARGE_HOURLY_PCT * 100).toFixed(0)}%`; // "25%"
  const hrs = String(LATE_RETURN_SURCHARGE_MAX_HOURS);              // "2"

  const surfacesToCheck = {
    faq: SURFACES.faq,
    agreementView: SURFACES.agreementView,
    pdfTemplate: SURFACES.pdfTemplate,
    edgeAgreement: SURFACES.edgeAgreement,
    pdfViewer: SURFACES.pdfViewer,
  };

  for (const [name, src] of Object.entries(surfacesToCheck)) {
    it(`${name} mentions the ${grace}-min grace period`, () => {
      expect(src).toMatch(new RegExp(`${grace}[\\s-]*(min|minute)`, "i"));
    });
    it(`${name} mentions the ${pct} hourly surcharge`, () => {
      expect(src).toContain(pct);
    });
    it(`${name} mentions the ${hrs}-hour cutoff before full-day charge`, () => {
      expect(src).toMatch(new RegExp(`${hrs}\\s*(hr|hour)`, "i"));
      expect(src).toMatch(/full[- ](?:day|additional day)|full daily rate/i);
    });
  }
});
