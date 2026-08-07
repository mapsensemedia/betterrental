/**
 * Policy copy regression tests.
 *
 * These read the actual source of the customer-facing surfaces (FAQ page,
 * agreement view, PDF template, edge-function terms string) and assert that:
 *   - the km-allowance copy matches `src/lib/km-allowance.ts`
 *     (unlimited for 1–7 days, then 160 km/day past day 7)
 *   - the late-return copy matches `src/lib/late-return.ts`
 *
 * String-based assertions are enough here — the goal is to catch drift
 * between the constants and the human-readable copy without booting the UI.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FREE_KM_DAYS, EXCESS_KM_RATE } from "./km-allowance";
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

describe("agreement surfaces state the kilometre policy", () => {
  const agreementSurfaces = {
    agreementView: SURFACES.agreementView,
    pdfTemplate: SURFACES.pdfTemplate,
    edgeAgreement: SURFACES.edgeAgreement,
  };

  for (const [name, src] of Object.entries(agreementSurfaces)) {
    it(`${name} states unlimited kilometres for short rentals`, () => {
      expect(src).toMatch(/unlimited kilometres/i);
    });

    it(`${name} references the excess-km rate for longer rentals`, () => {
      expect(src).toMatch(
        new RegExp(
          `\\$\\{?${EXCESS_KM_RATE.toFixed(2)}|EXCESS_KM_RATE|excessKmRate`,
        ),
      );
    });

    it(`${name} references the ${FREE_KM_DAYS}-day free window`, () => {
      expect(src).toMatch(new RegExp(`FREE_KM_DAYS|${FREE_KM_DAYS} day`));
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
  });
});

describe("marketing km copy matches the policy", () => {
  const rate = `$${EXCESS_KM_RATE.toFixed(2)}`;

  it("Surrey FAQ leads with unlimited km and states the excess rate", () => {
    expect(SURFACES.faq).toMatch(/unlimited kilometres/i);
    expect(SURFACES.faq).toContain(`${FREE_KM_DAYS} day`);
    expect(SURFACES.faq).toContain(rate);
  });

  it("PDF viewer policy banner mentions unlimited km + excess rate", () => {
    expect(SURFACES.pdfViewer).toMatch(/unlimited/i);
    expect(SURFACES.pdfViewer).toContain(rate);
  });

  it("Checkout tooltip mentions unlimited km + excess rate", () => {
    expect(SURFACES.checkout).toMatch(/unlimited kilometres/i);
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
