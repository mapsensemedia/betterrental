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

describe("agreement surfaces state the kilometre allowance", () => {
  const agreementSurfaces = {
    agreementView: SURFACES.agreementView,
    pdfTemplate: SURFACES.pdfTemplate,
    edgeAgreement: SURFACES.edgeAgreement,
  };

  for (const [name, src] of Object.entries(agreementSurfaces)) {
    it(`${name} contains no "unlimited kilometres" language`, () => {
      expect(src).not.toMatch(/unlimited kilometres/i);
      expect(src).not.toMatch(/no kilometre limit/i);
    });

    it(`${name} references the excess-km rate`, () => {
      expect(src).toMatch(
        new RegExp(
          `\\$\\{?${EXCESS_KM_RATE.toFixed(2)}|EXCESS_KM_RATE|excessKmRate`,
        ),
      );
    });
  }

  it("PDF template renders a KILOMETRE ALLOWANCE section", () => {
    expect(SURFACES.pdfTemplate).toMatch(/KILOMETRE ALLOWANCE/i);
  });

  it("agreement view states the kilometre allowance", () => {
    expect(SURFACES.agreementView).toMatch(/kilometre allowance/i);
  });

  it("edge function terms state the kilometre allowance", () => {
    expect(SURFACES.edgeAgreement).toMatch(/kilometre allowance/i);
    expect(SURFACES.edgeAgreement).toContain(
      `${WEEKLY_KM_ALLOWANCE.toLocaleString()} km per 7 days`,
    );
    expect(SURFACES.edgeAgreement).toContain(
      `${MONTHLY_KM_ALLOWANCE.toLocaleString()} km per 30 days`,
    );
  });
});

describe("marketing km-allowance copy matches constants", () => {
  const weekly = WEEKLY_KM_ALLOWANCE.toLocaleString();
  const monthly = MONTHLY_KM_ALLOWANCE.toLocaleString();
  const rate = `$${EXCESS_KM_RATE.toFixed(2)}`;

  it("Surrey FAQ mentions weekly + monthly caps and excess rate", () => {
    expect(SURFACES.faq).toContain(weekly);
    expect(SURFACES.faq).toContain(monthly);
    expect(SURFACES.faq).toContain(rate);
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
      // Static copy uses the literal (e.g. "30-min"); templated copy interpolates gracePeriodMinutes.
      expect(src).toMatch(
        new RegExp(`(${grace}[\\s-]*(min|minute))|gracePeriodMinutes`, "i"),
      );
    });
    it(`${name} mentions the ${pct} hourly surcharge`, () => {
      // Either the literal "25%" or a reference to the shared percent constant.
      expect(src).toMatch(new RegExp(`${pct}|lateFeePercentOfDaily|SURCHARGE_HOURLY_PCT`));
    });
    it(`${name} mentions the ${hrs}-hour cutoff before full-day charge`, () => {
      expect(src).toMatch(new RegExp(`${hrs}\\s*(hr|hour)`, "i"));
      expect(src).toMatch(/full[- ](?:day|additional day)|full daily rate/i);
    });
  }
});
