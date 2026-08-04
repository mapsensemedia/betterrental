# Remove Duration Discounts + Add $4.99 Processing Fee

## Objective

1. Stop applying the 10% weekly discount (7+ days) to any new or repriced booking.
2. Stop applying the 20% monthly discount (21+ days) to any new or repriced booking.
3. Add a flat **$4.99 processing fee** to every booking created from the cutover onward (online checkout, walk-in, and any reprice/extension of a booking created after cutover).

## Current State Assessment

Pricing lives in two mirrored engines that must stay in sync:

| Layer | File | Role |
|---|---|---|
| Server (authoritative) | `supabase/functions/_shared/booking-core.ts` | `computeBookingTotals()` writes `subtotal`, `tax_amount`, `total_amount`, `weekend_surcharge`, `duration_discount` |
| Client (display only) | `src/lib/pricing.ts` | `calculateBookingPricing()` + `deriveVehicleAdjustments()` for previews |

Discount logic today:
- Constants `WEEKLY_DISCOUNT_THRESHOLD/RATE` and `MONTHLY_DISCOUNT_THRESHOLD/RATE` exist in three places: `src/lib/pricing.ts`, `src/lib/vehicle-adjustments.ts`, `supabase/functions/_shared/vehicle-adjustments.ts`.
- `getDurationDiscount(days)` is applied to (vehicle base + weekend surcharge), then written to `bookings.duration_discount` by `create-booking` and `reprice-booking`.
- Discount is displayed in `NewCheckout.tsx`, `BookingSummaryPanel.tsx`, `WalkInBookingDialog.tsx`, `TotalBar.tsx`, and itemized on documents via `vehicle-adjustments.ts` (agreement PDF, invoice builder, `FinancialBreakdown`, `AgreementStructuredView`, return receipt).
- Client/server totals are reconciled by `validateClientPricing()` with a **$0.50 tolerance** — any one-sided change breaks checkout with `PRICE_MISMATCH`.

Data check performed against the live database:
- **0 upcoming bookings** (`start_at > now()`) currently carry a non-zero `duration_discount`.
- **0 upcoming bookings** have `total_days >= 7`.

So requirement 1 and 2 need **no data migration or repricing of existing reservations** — they are forward-logic changes only. Historical completed bookings keep their discount for accounting integrity.

There is no `processing_fee` column on `bookings` and no `processing_fee` key in `system_settings`. Daily regulatory fees (PVRT $1.50/day, ACSRCH $1.00/day) are the existing pattern for a non-negotiable added fee and are the model to follow.

## Assumptions (correct me if wrong)

- Processing fee is **one-time per booking** (not per day).
- It is **taxable** (included in subtotal, so PST 7% + GST 5% apply) — matches how PVRT/ACSRCH are treated. Effective customer cost $5.59.
- It applies to online, guest, and walk-in bookings alike, and is **not duplicated** when a booking is extended or repriced.
- Existing pending/confirmed bookings created before cutover are **not** retroactively charged.

## Impact Analysis

**Technical**
- Both pricing engines change together, or every checkout fails price validation. This is the single biggest risk in the change.
- Adding a subtotal component shifts tax and total, so every document/display that reconstructs a subtotal from known lines must learn the new line, or the itemizers will emit a leftover "Rate Adjustment" line (`buildVehicleAdjustmentLines` puts unexplained cents there).
- Affected surfaces: checkout summary, total bar, walk-in dialog, ops `FinancialBreakdown`, invoice PDF/builder, rental agreement PDF + structured view, return receipt, `agreement-adjustments.ts` terms metadata.
- Discount removal is a deletion of behaviour; the safest form is to make `getDurationDiscount()` return zero at a single point per engine rather than ripping out constants, so document code that reads stored historical discounts still renders old bookings correctly.

**Operational**
- Prices for 7+ day rentals rise 10% and 21+ day rentals rise 20%. Counter and phone staff quoting from memory will be wrong; they need a heads-up before cutover.
- Quotes given verbally today for long rentals will not match the system tomorrow. Decide a grace policy (see Recommendations).
- Marketing/site copy or tooltips promising weekly/monthly discounts must be pulled the same day, or the site advertises a discount it no longer gives (`PRICE_TOOLTIPS.weeklyDiscount` / `monthlyDiscount`).

**Business**
- Long-rental conversion may drop; the processing fee is small but appears on every agreement and invoice, so its label must be clear for chargeback defence.
- Agreements and invoices already issued are untouched; only new documents show the fee.

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Client/server drift → `PRICE_MISMATCH`, no bookings can be completed | Critical | Medium | Change both engines in the same deploy; run the pricing unit tests; smoke-test one real online checkout and one walk-in immediately after deploy |
| Stale open browser tabs mid-checkout hit price mismatch | Low | High (briefly) | Checkout already surfaces the corrected server total; deploy in a low-traffic window |
| Documents show an unexplained "Rate Adjustment" line instead of "Processing Fee" | Medium | High if missed | Add the fee to every itemizer and the invoice/agreement builders in the same change |
| Fee double-charged on extension/reprice | Medium | Medium | Fee derived once from a stored booking value, not re-added per reprice call; assert in tests |
| Historical bookings' discounts disappear from reprinted agreements | Medium | Low | Keep discount constants and stored-column rendering paths intact; only stop *new* computation |
| Staff quote old discounted prices | Medium | High | Pre-cutover notice + updated internal price sheet |

## Implementation Steps

**Phase 0 — Prerequisites**
1. Confirm the assumptions above (one-time, taxable, applies to walk-ins).
2. Snapshot current pricing behaviour: capture server totals for three sample quotes (3-day, 10-day, 25-day) as a before/after comparison sheet.
3. Notify counter staff of the cutover date and new long-rental pricing.

**Phase 1 — Data model (single migration)**
4. Add `bookings.processing_fee numeric not null default 0`.
5. Add a `system_settings` row `processing_fee` = `4.99` so Finance can change it later without a deploy (mirrors `different_dropoff_fee`).

**Phase 2 — Server engine (authoritative)**
6. In `booking-core.ts`: set the duration-discount rate to 0 at the single decision point, keeping the `durationDiscount` field in the result type (always 0).
7. In `booking-core.ts`: read the processing fee from `system_settings` (fallback 4.99), add `processingFee` to `ServerPricingResult`, include it in `subtotal` **before** PST/GST, and persist it to `bookings.processing_fee` in `create-booking` / `create-guest-booking` / `reprice-booking`.
8. Ensure reprice does not stack the fee: it recomputes the same single fee, never adds to the previous value.
9. Mirror the discount-off change in `supabase/functions/_shared/vehicle-adjustments.ts` for *new* derivations while continuing to honour stored `duration_discount` values for historical bookings.

**Phase 3 — Client mirror**
10. Same two changes in `src/lib/pricing.ts` (`getDurationDiscount` returns none; `PROCESSING_FEE` added to subtotal) and `src/lib/vehicle-adjustments.ts`.
11. Update displays to show a "Processing Fee $4.99" line and remove discount rows/tooltips from live quoting: `NewCheckout.tsx`, `BookingSummaryPanel.tsx`, `WalkInBookingDialog.tsx`, `TotalBar.tsx`, `PriceTooltip` copy.

**Phase 4 — Documents & ops**
12. Add the fee line to `src/lib/pdf/invoice-data-builder.ts`, `rental-agreement-pdf.ts`, `AgreementStructuredView.tsx`, `FinancialBreakdown.tsx`, `generate-agreement`, `generate-return-receipt`, and `agreement-adjustments.ts` terms metadata — placed next to the PVRT/ACSRCH daily-fees group.
13. Keep discount rendering code in documents so reprints of older bookings remain accurate.

**Phase 5 — Deploy**
14. Deploy migration → edge functions → frontend, in that order, in a low-traffic window (early morning Vancouver).
15. Update `knowledgebase/04-pricing-engine.md` and the pricing diagram.

## Testing & Validation

- Unit tests (`src/lib/pricing.test.ts`): 10-day and 25-day quotes return `durationDiscount === 0`; subtotal includes exactly one 499-cent fee; tax is computed on the fee-inclusive subtotal; existing weekend-surcharge assertions still pass.
- Itemization test: `buildVehicleAdjustmentLines` produces **no** leftover "Rate Adjustment" line for a fee-bearing booking, and still renders a stored historical `duration_discount` correctly.
- Parity test: for a fixed input set, client `calculateBookingPricing()` and server `computeBookingTotals()` agree within $0.01 (well inside the $0.50 gate).
- End-to-end on preview: complete one online booking and one walk-in booking; verify DB `subtotal`/`tax_amount`/`total_amount`/`processing_fee`, then open the generated agreement PDF and the invoice and confirm one "Processing Fee" line.
- Reprice test: extend that booking and confirm `processing_fee` stays $4.99 and the agreement regenerates with a single fee line.

## Rollback Plan

- Each change is code-level and reversible by redeploying the previous frontend + edge functions; the migration is additive (`default 0`), so an old build simply ignores the column — no schema rollback needed.
- To roll back pricing only: restore the discount rate at the single decision point in both engines and set the `system_settings.processing_fee` value to `0` (kills the fee instantly with no deploy).
- Any bookings created during the window keep their stored totals; correct individually via the existing manual reprice + audit-log path if a customer disputes.

## Post-Implementation Verification

1. Query bookings created after cutover: every row has `processing_fee = 4.99` and `duration_discount = 0`.
2. Confirm no booking created after cutover has a non-zero `duration_discount`.
3. Spot-check one 7+ day quote on the public site: no discount row, total 10% higher than the pre-change snapshot plus $5.59.
4. Check edge function logs for `PRICE_MISMATCH` / `PRICE_VALIDATION_FAILED` in the first 24 hours — expect zero after the deploy completes.
5. Confirm invoice, agreement, and return receipt PDFs each show the fee and reconcile to the stored subtotal to the cent.

## Recommendations

- **Store the fee, don't hardcode it in display code.** Documents should render `bookings.processing_fee`, so a future rate change never rewrites history.
- **Make the fee configurable via `system_settings`** (as planned) — it doubles as the instant kill switch in rollback.
- **Grace policy for verbal quotes:** honour pre-cutover long-rental quotes for a defined window (e.g. 7 days) using the existing manual reprice + audit path, rather than reintroducing the discount.
- **Consider keeping a manual discount capability** for negotiated corporate long rentals, applied by staff as an explicit line rather than an automatic duration rule — otherwise long-stay corporate deals lose their only lever.
- **Label the fee precisely** on documents ("Processing Fee") and add it to the fee disclosure in terms, which reduces chargeback exposure.
