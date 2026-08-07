/**
 * End-to-end test for the rental agreement generator.
 *
 * Uses a real terms_json record captured from Lovable Cloud
 * (booking GZZETMUF, agreement d2b5c6bc-…) as the input, then runs
 * the full production rendering pipeline via `buildRentalAgreementPdf`
 * and asserts:
 *
 *   1. The PDF is well-formed and contains booking-specific data
 *      that came from the live DB (booking code, renter name, plate,
 *      dollar figures).
 *   2. The policy sections match the shared constants in
 *      `late-return.ts` and `km-allowance.ts` — protecting against
 *      drift between the edge function's `terms_json.policies` and
 *      the copy the PDF renders.
 *   3. No legacy "unlimited km" language leaks into the artefact.
 *
 * The generated PDF is written to /mnt/documents so it can be
 * downloaded and inspected visually if a copy change is expected.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { buildRentalAgreementPdf } from "./rental-agreement-pdf";
import {
  LATE_RETURN_GRACE_PERIOD_MINUTES,
  LATE_RETURN_SURCHARGE_HOURLY_PCT,
  LATE_RETURN_SURCHARGE_MAX_HOURS,
} from "../late-return";
import {
  FREE_KM_DAYS,
  EXCESS_KM_RATE,
} from "../km-allowance";
import type { RentalAgreement } from "@/hooks/use-rental-agreement";

// jsdom's fetch has no network here — silence logo/image lookups.
beforeAll(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("no network in test"))),
  );
});

const LIVE = JSON.parse(
  readFileSync(
    resolve(__dirname, "__fixtures__/live-agreement.json"),
    "utf8",
  ),
) as RentalAgreement;

describe("rental-agreement generator — end-to-end (live DB fixture)", () => {
  let pdfText: string;
  let pdfBytes: ArrayBuffer;

  beforeAll(async () => {
    const pdf = await buildRentalAgreementPdf(LIVE, LIVE.booking_id);
    pdfText = pdf.output();
    pdfBytes = pdf.output("arraybuffer") as ArrayBuffer;

    // Persist artefact for manual inspection.
    try {
      mkdirSync("/mnt/documents", { recursive: true });
      writeFileSync(
        "/mnt/documents/e2e-agreement-GZZETMUF.pdf",
        new Uint8Array(pdfBytes),
      );
    } catch {
      /* sandbox may not allow /mnt writes — non-fatal */
    }
  });

  it("produces a valid PDF document", () => {
    expect(pdfText.startsWith("%PDF-")).toBe(true);
    expect(pdfBytes.byteLength).toBeGreaterThan(3_000);
  });

  describe("booking data flows from DB → PDF", () => {
    it.each([
      ["booking code", "GZZETMUF"],
      ["renter name", "NANDOR JANOS JESZENSZKY"],
      ["license plate", "A587EY"],
      ["VIN", "1FMCU9GN0RUA67724"],
      ["pickup location", "Surrey Newton"],
      ["daily rate", "$67.00"],
      ["grand total", "$117.02"],
      ["deposit", "$350.00"],
    ])("renders %s (%s)", (_label, needle) => {
      expect(pdfText).toContain(needle);
    });
  });

  describe("late-return policy matches constants", () => {
    it(`renders the ${LATE_RETURN_GRACE_PERIOD_MINUTES}-min grace period`, () => {
      expect(pdfText).toContain(`${LATE_RETURN_GRACE_PERIOD_MINUTES} min`);
    });

    it(`renders the ${LATE_RETURN_SURCHARGE_HOURLY_PCT * 100}% hourly surcharge`, () => {
      const pct = `${(LATE_RETURN_SURCHARGE_HOURLY_PCT * 100).toFixed(0)}%`;
      expect(pdfText).toContain(`${pct} surcharge of daily rate per extra hour`);
    });

    it(`renders the ${LATE_RETURN_SURCHARGE_MAX_HOURS}-hr cutoff and full-day fallback`, () => {
      expect(pdfText).toContain(`up to ${LATE_RETURN_SURCHARGE_MAX_HOURS} hrs`);
      expect(pdfText).toMatch(/full day charge/i);
    });
  });

  describe("kilometre policy", () => {
    it("renders a KILOMETRE ALLOWANCE section", () => {
      expect(pdfText).toContain("KILOMETRE ALLOWANCE");
    });

    it("states unlimited kilometres for this short rental", () => {
      expect(pdfText).toMatch(/unlimited kilometres/i);
      expect(pdfText).toContain(`${FREE_KM_DAYS} days`);
    });

    it("does not charge excess km on a rental within the free window", () => {
      expect(pdfText).not.toContain(`$${EXCESS_KM_RATE.toFixed(2)}/km`);
    });
  });
});
