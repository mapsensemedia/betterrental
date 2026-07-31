# Goal

No changes to booking 7HNPMA5E (or any existing booking). Only prevent this from happening again on future bookings.

# What actually went wrong (verified in the database)

For 7HNPMA5E the driver fees **were** added to the booking price: subtotal $682.00 → $761.95 → $841.90, total now **$942.93**, with two `booking_additional_drivers` rows at $79.95 each (15.99/day × 5 days).

What silently did **not** happen:

1. **No charge for the delta.** `payments` only holds the original $763.84 rental authorization (created 23:28), while the drivers were added at 23:29 and 23:30. The $179.09 difference was never requested and nothing warned the operator.
2. **The agreement was never refreshed.** The one agreement row still shows `grandTotal: 763.84` and no drivers. `reprice-booking` does have a regeneration step for total changes, but no updated agreement exists — it failed or was skipped silently.
3. **Drivers are never itemized on the agreement anyway.** `generate-agreement` folds `driversTotal` into `addOnsTotal`, so additional drivers have no line of their own.

# Prevention plan (no data edits)

## 1. Never let a price increase go uncollected

- `persist-booking-extras` returns the delta on every upsell action: `previousTotal`, `newTotal`, `deltaTotal`, and `authorizedTotal` (non-voided rental payments).
- `CounterUpsellPanel` replaces its plain success toast with a result panel: "Driver added — +$89.54 incl. tax. Balance due $179.09" plus a **Collect balance** button that opens the existing Worldline/terminal payment surface pre-filled with the delta.
- A persistent **Balance due** badge appears on the booking financial panel whenever `total_amount − non-voided rental payments > $0.50`, so any future gap is visible without hunting.

## 2. Make agreement regeneration reliable and loud

- `reprice-booking` returns `agreementRegenerated` / `agreementError` instead of only logging on failure; `persist-booking-extras` passes it through.
- `CounterUpsellPanel` shows "Agreement needs regeneration" with a one-click retry when regeneration fails.
- Booking detail shows an "Agreement out of date — regenerate" banner when the latest non-voided agreement's `terms_json.financial.grandTotal` differs from `bookings.total_amount`.
- Switch the internal `generate-agreement` call in `reprice-booking` to a service-role invocation so it can't fail on a forwarded staff token.

## 3. Itemize additional drivers going forward

- `generate-agreement` stops merging drivers into add-ons: adds `additionalDriversTotal` and `additionalDrivers: [{ name, ageBand, dailyRate, total }]` to `terms_json.financial`.
- Agreement PDF (`src/lib/pdf/rental-agreement-pdf.ts`) and `AgreementStructuredView.tsx` render a dedicated "Additional Drivers" section, falling back to the merged value for older agreements.
- Update the agreement PDF tests for the new line.

## Explicitly out of scope

7HNPMA5E stays exactly as it is — no reprice, no repayment, no agreement regeneration, no data patch.

## Technical notes

Files: `supabase/functions/persist-booking-extras/index.ts`, `supabase/functions/reprice-booking/index.ts`, `supabase/functions/generate-agreement/index.ts`, `src/components/admin/ops/CounterUpsellPanel.tsx`, `src/components/admin/ops/FinancialBreakdown.tsx`, `src/lib/pdf/rental-agreement-pdf.ts`, `src/components/booking/AgreementStructuredView.tsx`, plus tests. Money math stays in integer cents; driver rates in `system_settings` (standard 15.99, young 15.00) are unchanged; no schema changes — balance due is derived.
