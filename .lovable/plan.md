# Late Return + Kilometre Allowance Reconciliation

Goal: two policies become the single source of truth everywhere, with no duplicated constants and no contradictory customer-facing copy.

**Rule A — Late return:** 30-min grace → 25% of daily rate/hour for up to 2 hrs past grace → full daily-rate charge per additional day.
**Rule B — Kilometres:** 1,400 km / 7 days, 4,800 km / 30 days, prorated (`allowance = MONTHLY_KM_ALLOWANCE / 30 * rentalDays`), excess $0.25/km measured from odometer at return.

---

## Confirmed current state (verified before planning)

- `src/lib/late-return.ts` already implements Rule A correctly (grace 30, 25%/hr tier ≤2 hrs, full-day thereafter).
- `src/lib/pricing.ts` has a **conflicting duplicate**: `LATE_RETURN_HOURLY_RATE = 25`, `LATE_RETURN_GRACE_MINUTES = 30`, and a flat-$25/hr `calculateLateFee()`.
- Three UI components read the stale flat-$25/hr constants from `pricing.ts`: `TicketBookingSummary`, `StepReturnIssues`, `LateFeeApprovalCard`.
- Website FAQ (Surrey only) states "pro-rated by the hour, min 1 hr" — inaccurate.
- "Unlimited km" appears in: `src/lib/pricing.ts` (`BOOKING_INCLUDED_FEATURES`), `src/pages/NewCheckout.tsx`, `src/components/booking/AgreementStructuredView.tsx` (§7), `src/lib/pdf/rental-agreement-pdf.ts` (§7), and `supabase/functions/generate-agreement/index.ts` (server-embedded terms string).
- `/terms`, `/legal`, `/privacy` all currently render `PdfViewerPage` only — no HTML policy text.
- Odometer capture already exists: `inspection_metrics.odometer` written at pickup (via `use-walkaround.ts`) and at return (via `StepReturnIntake.tsx`). Excess-km math can hook into this cleanly at return time.
- No km-allowance module currently exists; no per-category km rate overrides in DB — a single global set of constants is fine.

---

## Plan

### 1. Single source of truth: `src/lib/late-return.ts`
- Keep `LATE_RETURN_GRACE_PERIOD_MINUTES = 30`.
- Add exported constants `LATE_RETURN_SURCHARGE_HOURLY_PCT = 0.25` and `LATE_RETURN_SURCHARGE_MAX_HOURS = 2` (replace the local `LATE_RETURN_FEE_PERCENTAGE` magic number wired into these).
- `calculateLateReturnFeeWithRate()` already implements the tiered model — keep it as the only late-fee calculator.

### 2. New module: `src/lib/km-allowance.ts`
Exports:
- `WEEKLY_KM_ALLOWANCE = 1400`
- `MONTHLY_KM_ALLOWANCE = 4800`
- `EXCESS_KM_RATE = 0.25`
- `calculateKmAllowance(rentalDays: number): number` → `Math.round(MONTHLY_KM_ALLOWANCE / 30 * rentalDays)` (integer km).
- `calculateExcessKm(kmOut, kmIn, rentalDays)` → `{ kmDriven, allowance, excessKm, excessFee }` with integer-cent math for the fee.
- `formatKmAllowanceSummary(rentalDays)` → human string for UI.

### 3. Purge duplicates in `src/lib/pricing.ts`
- Remove `LATE_RETURN_HOURLY_RATE`, `LATE_RETURN_GRACE_MINUTES`, `LATE_RETURN_MAX_HOURS`, and the flat-rate branch inside `calculateLateFee()`.
- Have `calculateLateFee()` re-export / delegate to `calculateLateReturnFeeWithRate` (kept for call-site compatibility); mark old signature deprecated in a JSDoc comment.
- Replace the `"Unlimited kilometres"` line in `BOOKING_INCLUDED_FEATURES` with a dynamic entry: `"Includes {allowance} km — extra km at $0.25/km"` produced by a small helper that takes rentalDays (fallback copy for static contexts: `"Generous km allowance — 4,800 km/month, prorated"`).
- `PricingBreakdown` gains optional `kmAllowance`, `excessKm`, `excessKmFee`. `PricingInput` gains optional `kmOut`, `kmIn` (used only at return-time recompute).

### 4. Update the three ops/support components
`TicketBookingSummary.tsx`, `StepReturnIssues.tsx`, `LateFeeApprovalCard.tsx`:
- Switch imports to `late-return.ts` constants and `calculateLateReturnFeeWithRate`.
- Replace `"$25 CAD/hr after 30-min grace"` copy with tiered text produced by `getLateReturnSummary(dailyRate)`.
- `TicketBookingSummary` and `StepReturnFees` gain a Kilometre Allowance block: allowance granted / km driven / excess km / excess fee, using data from `inspection_metrics` (pickup + return odometer).

### 5. Agreement structured view — `src/components/booking/AgreementStructuredView.tsx`
- §7 Kilometre Allowance: replace the single `"Unlimited kilometres included."` list item with the tiered allowance description + excess rate.
- Financial Summary: add itemized "Km allowance", "Km driven", "Excess km", "Excess km fee" rows, only rendered when a return with odometer data exists — mirrors how late fees are itemized.

### 6. PDF template + server terms string
- `src/lib/pdf/rental-agreement-pdf.ts` §7: swap the "Unlimited kilometres included." bullet for the new tiered language and add an excess-km bullet.
- `supabase/functions/generate-agreement/index.ts` line 492: rewrite the trailing `"Unlimited km."` clause to `"Km allowance: 1,400/week or 4,800/month prorated, excess $0.25/km."` The late-fee sentence already matches Rule A and stays.

### 7. Customer-facing surfaces
- `src/pages/Surrey.tsx` FAQ line ~99: rewrite the late-return answer to state the tiered policy exactly (30-min grace → 25% of daily rate per hour up to 2 hrs → full-day charge per additional day). Add a new FAQ entry: *"How many kilometres are included?"* with 1,400/week, 4,800/month prorated, $0.25/km excess.
- `src/pages/NewCheckout.tsx`: replace the `"Unlimited kilometres"` tooltip entry with the new allowance description; use `calculateKmAllowance(rentalDays)` so the checkout summary shows the concrete number for that booking ("Includes X km, extra $0.25/km").
- `src/pages/Langley.tsx` and `src/pages/Abbotsford.tsx`: no late-return / unlimited-km copy today (verified) — no change needed. If the Surrey FAQ is replicated later, the same block applies.

### 8. New HTML policy summaries at `/terms`, `/legal`, `/privacy`
- Convert `PdfViewerPage.tsx` to render an HTML summary section **above** the embedded PDF (PDF stays as the authoritative document).
- Summary pulls its numbers from `late-return.ts` and `km-allowance.ts` so it can never drift.
- Two new subsections on `/terms`: *Late Returns* (Rule A) and *Kilometre Allowance* (Rule B).

### 9. Booking engine / quote flow
- `BookingSummaryPanel` and any pricing display component that lists included features: replace the static "Unlimited kilometres" chip with `Includes {calculateKmAllowance(rentalDays)} km, $0.25/km excess`.
- No server pricing change on the checkout path (excess km is a return-time charge, not a pre-charge). Server-side excess-fee calculation runs in the return / close-out edge function using the odometer readings.

### 10. Return-time enforcement
- Extend `StepReturnFees.tsx` and the return finalization edge function to compute `excessFee = calculateExcessKm(km_out, km_in, rentalDays).excessFee` and post it into `final_invoices` as an itemized line, following the same pattern as `late_fee_amount`.
- Add a DB column `final_invoices.excess_km_fee_cents` (integer, default 0) via migration in the same step so the invoice ledger reflects it. GRANTs unchanged.

### 11. Regression sweep (verification, not code)
After edits, `rg` for:
- `LATE_RETURN_HOURLY_RATE`, `LATE_RETURN_GRACE_MINUTES`, literal `"$25"` / `25 CAD/hr` fragments outside `late-return.ts`.
- `Unlimited km`, `Unlimited kilometres`, `unlimited kilometer`, `mileage limits` — must have zero hits outside archived blog posts.
- Confirm `pricing.test.ts` still passes and add tests for `calculateKmAllowance(7) === 1120`, `calculateKmAllowance(20) === 3200`, `calculateKmAllowance(30) === 4800`, and a late-fee test at exactly 2 hrs vs 3 hrs past grace.

---

## Technical notes

- **Rounding:** km allowance rounded to nearest whole km; excess fee in integer cents (`Math.round(excessKm * 25)` cents).
- **Backward compatibility:** the legacy `pricing.calculateLateFee(minutesLate)` (no dailyRate) will throw or return 0 with a `console.warn` — every current caller already passes a rate or uses the late-return.ts helper (verified via grep in step 11).
- **DB migration:** one `ALTER TABLE public.final_invoices ADD COLUMN excess_km_fee_cents integer NOT NULL DEFAULT 0;` — no new tables, no policy changes, no GRANT changes.
- **No changes** to pickup-time price computation, deposit logic, Worldline flow, or the RLS/trigger stack.
- **Blog posts** (`C2cVsTuroVsEnterpriseSurrey.tsx` mentions "standard kilometres") are marketing narrative, not policy — left unchanged unless you want them rewritten too.

---

## Out of scope (flag before starting if you want them in)

- Per-vehicle-category km overrides (all categories share the global allowance).
- Historical bookings: excess-km recalculation only applies to bookings closed after deploy; already-closed invoices are not touched.
- Refactoring `NewCheckout.tsx`'s hardcoded feature-tooltip map into a data-driven module.
