## What the data actually shows for W9JD9JDV

Verified from the database (booking, both agreement records, invoice, payments):

| Source | Days | Base | Surcharge | Discount | Fees | Subtotal | Tax | Total |
|---|---|---|---|---|---|---|---|---|
| Signed agreement (Jul 18) | 7 | $629.93 | +$40.50 (hidden) | −$67.04 (hidden) | $17.50 | $620.89 | $74.50 | $695.39 |
| Booking row today | 8 | $719.92 | +$53.99 | −$77.39 | $20.00 | $716.52 | $85.99 | $802.51 |

So there are two separate, real problems — and the customer paid only $695.39, leaving $107.12 due (invoice INV-2026-01324 confirms `amount_due = 107.12`).

### Problem 1 — the agreement's own lines don't add up

The agreement prints `Daily Rate $89.99 x 7 = $629.93`, `PVRT $10.50`, `ACSRCH $7.00`, then jumps to `TOTAL $695.39`. Those visible lines sum to $647.43 + tax, not $695.39, because the weekend surcharge (+$40.50) and the 7-day 10% discount (−$67.04) were charged but never printed.

Cause, confirmed in `supabase/functions/generate-agreement/index.ts` (~lines 412-436): it derives a single `remainder = dbSubtotal − knownLineItems`. Here the remainder is **negative** (−$26.54, surcharge minus discount), and the code does `weekendSurcharge = remainder > 0 ? remainder : 0` — so the whole net adjustment is dropped from print. Same netting flaw already fixed for the Ops breakdown and invoice PDF via `src/lib/vehicle-adjustments.ts`; the agreement generator was never updated. `terms_json.financial.weekendSurcharge` is stored as `0`, so the structured view and the agreement PDF inherit the same gap.

### Problem 2 — the agreement is stale after the extension

Both agreement records carry `endAt = 2026-07-25`, `totalDays 7`, `grandTotal 695.39`. The booking was later extended to `2026-07-26` (8 billable days, $802.51). No agreement was regenerated, so the signed document understates the rental by one day and $107.12.

## Plan

### 1. Itemize adjustments in the agreement generator
In `supabase/functions/generate-agreement/index.ts`:
- Replace the single-remainder logic with the same explicit two-line derivation used by `src/lib/vehicle-adjustments.ts` (port it into `supabase/functions/_shared/` so both engines share one implementation): prefer the stored `weekend_surcharge` / `duration_discount` columns, recompute from the Vancouver calendar for historic bookings, and emit any leftover as a signed "Rate Adjustment" line.
- Print them as separate signed lines after the base rate: `Weekend Surcharge: +$X (N day(s) × 15%)` and `Weekly Discount: −$Y (10%)`.
- Add an explicit `Subtotal (before tax)` line so base + adjustments + protection + add-ons + fees visibly reconcile to it, and the subtotal + PST + GST reconcile to TOTAL.
- Store both values (and `durationDiscount`) in `terms_json.financial` instead of the current `weekendSurcharge: 0`.

### 2. Render them downstream
- `src/lib/pdf/rental-agreement-pdf.ts`: print the surcharge and discount lines when present in `terms_json.financial`, with the same reconciling subtotal row.
- `src/components/booking/AgreementStructuredView.tsx`: show the two lines in the on-screen agreement breakdown.
- Both read from `terms_json` with a recompute fallback, so already-signed historic agreements display correctly without a data backfill.

### 3. Keep agreements in sync with extensions
- After `reprice-booking` changes `total_days`/`subtotal`/`total_amount`, mark any non-voided agreement as stale (regenerate with `forceRegenerate` for unsigned agreements; for signed ones, create an amendment record and keep the original in history).
- Surface a "Agreement out of date — regenerate" badge on the booking detail page when the agreement's `terms_json.rental.totalDays`/`grandTotal` no longer match the booking.

### 4. Tests
- Extend `src/lib/pdf/rental-agreement-pdf.test.ts` with the exact W9JD9JDV shape (7 days, +$40.50, −$67.04, $620.89 subtotal) and assert the printed lines sum to the printed subtotal and total to the cent.
- Add a case where discount exceeds surcharge (net negative) to lock in that neither line is dropped.

### 5. This specific booking
Once the generator is fixed, regenerate the agreement for W9JD9JDV so it shows 8 days / $802.51 with itemized surcharge and discount. Separately, $107.12 remains unpaid on INV-2026-01324 — tell me whether to leave it outstanding, or collect/mark it (bank transfer or terminal) and I'll handle it.

### Technical notes
- No pricing math changes: the charged amounts are correct; this is print/itemization plus agreement freshness.
- New shared adjustment helper lives in `supabase/functions/_shared/` and mirrors `src/lib/vehicle-adjustments.ts` line-for-line so the two engines can't drift.
- Weekend-day counting stays on the America/Vancouver calendar in both engines.
