## Goal
Make rental agreements display weekend surcharge as a distinct line so the totals reconcile cleanly (Vehicle + Weekend Surcharge + Protection + Add-ons + PVRT + ACSRCH + Tax = Grand Total).

## Why it currently looks wrong
In `supabase/functions/generate-agreement/index.ts` (line 352) the agreement records:

```
vehicleSubtotal = dailyRate × totalDays          // base only, e.g. $175
```

The DB-stored `subtotal` already contains the weekend surcharge (e.g. $10.50 on ZB5NSXJJ). Because that surcharge isn't materialised as a line item, the rendered breakdown looks like 175 + 7.50 + 5.00 + tax ≠ subtotal/total.

## Changes

### 1. `supabase/functions/generate-agreement/index.ts`
- Compute `weekendSurcharge`:
  - Prefer `pricing_snapshot.weekendSurcharge` when present.
  - Otherwise derive: count Fri/Sat/Sun days in `[start_at, start_at + totalDays)` (America/Vancouver) and apply `dailyRate × weekendDays × 0.15`.
  - Final fallback: `subtotal − (vehicleBase + protection + addOns + drivers + young + pvrt + acsrch + delivery + dropoff + upgrade)` if positive (handles legacy rows where snapshot is null).
- Add `weekendSurcharge` and `weekendDays` to `terms.financial` and `terms.rental`.
- Update the plain-text `agreementContent` block (line 424) to include a `Weekend Surcharge:` line when > 0.

### 2. `src/lib/pdf/rental-agreement-pdf.ts`
- Extend `RentalAgreementPdfData.financial` with optional `weekendSurcharge` and `weekendDays`.
- In the VEHICLE RENTAL section (line 395), if `weekendSurcharge > 0`, render a second `finRow`:
  `Weekend Surcharge (${weekendDays} day(s) × 15%)` → `+$X.XX`.

### 3. `src/components/booking/AgreementStructuredView.tsx`
- Below the Vehicle Subtotal row (line 146), conditionally render a "Weekend Surcharge" row using the same data.

### 4. `src/lib/pdf/invoice-data-builder.ts` (consistency)
- Stop labelling the derived remainder as `"Vehicle Rental (… incl. surcharges/discounts)"`. Split it into:
  - `Vehicle Rental ($X.XX/day × N days)` = base
  - `Weekend Surcharge (W day(s) × 15%)` if positive remainder ≤ a sane cap
  - `Discount` if remainder is negative
  This keeps invoices, agreements, and the ops Financial Breakdown labelled identically.

### 5. Reuse existing helpers
Add a small shared helper `countWeekendDays(startISO, days, tz="America/Vancouver")` in `supabase/functions/_shared/booking-core.ts` (one already exists in `src/lib/pricing.ts`; mirror the logic) and import it from the agreement function.

## Out of scope
- No re-signing of already-signed agreements. Newly generated/regenerated PDFs and the on-screen structured view will show the corrected layout. Existing signed PDFs keep their archived content unchanged (per agreement-lifecycle rules).
- No pricing recomputation — totals in the DB are unchanged; this is presentation only.

## Verification
- Regenerate the agreement for `ZB5NSXJJ`: expect `Vehicle $175.00 + Weekend Surcharge $10.50 + PVRT $7.50 + ACSRCH $5.00 = Subtotal $198.00`, then `Tax $23.76`, `Total $221.76`.
- Spot-check one weekday-only booking to confirm the surcharge row is hidden when zero.
- Spot-check one booking with a duration discount to confirm it renders as a negative line instead of being absorbed silently.
