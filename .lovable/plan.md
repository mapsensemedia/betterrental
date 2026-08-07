# Unlimited kilometres for rentals of 1–7 days

Short rentals (1–7 days) get unlimited kilometres. Longer rentals keep an allowance, but it now only starts accruing after day 7 — roughly 160 km for each day beyond the first week. Excess kilometres stay at $0.25/km, measured from odometer readings.

## New rule

```text
1–7 days    -> unlimited kilometres, no excess charge
8+ days     -> 160 km/day for each day past day 7
               e.g. 10 days = 3 chargeable days = 480 km
Excess      -> $0.25/km (unchanged)
```

## What changes

**Kilometre rules (single source of truth)**
- Add a free-kilometre threshold of 7 days.
- `calculateKmAllowance(days)` returns unlimited for 1–7 days, otherwise 160 km × (days − 7).
- `calculateExcessKm(...)` returns zero excess and zero fee whenever the rental is unlimited.
- Summary helper now reads: "Unlimited kilometres for rentals up to 7 days" for short rentals, and states the post-week allowance plus the $0.25/km excess rate for longer ones.

**Rental agreement**
- PDF section 10 (Kilometre Allowance) states unlimited km for 1–7 day rentals; for longer rentals it shows the included km for that rental and the excess rate.
- On-screen structured agreement view uses the same wording.
- The generated terms text and `terms_json.kmAllowance` from the agreement generator follow the same rule (unlimited flagged explicitly instead of a prorated number).

**Website copy**
- Surrey FAQ answer rewritten for the new rule.
- Checkout tooltip and category feature bullet ("Generous km allowance…") updated to lead with unlimited km on rentals up to a week.
- PDF viewer policy banner kilometre line updated.

**Return / excess-fee flow**
- Because the shared calculator reports zero excess on unlimited rentals, return closeout no longer produces an excess-km fee for 1–7 day rentals. No separate change needed beyond the calculator.

## Technical notes

- `src/lib/km-allowance.ts` — add `FREE_KM_DAYS = 7`, an `isUnlimitedKm(days)` helper, and an `unlimited: boolean` field on `ExcessKmBreakdown`.
- `src/lib/pdf/rental-agreement-pdf.ts` — branch section 10 on `isUnlimitedKm(totalDays)`.
- `src/components/booking/AgreementStructuredView.tsx` — same branch for the policy bullet.
- `supabase/functions/generate-agreement/index.ts` — mirror the rule in the terms string and `terms_json` (edge functions can't import from `src/`, so the constants are duplicated with a comment pointing at `km-allowance.ts`).
- `src/pages/Surrey.tsx`, `src/pages/NewCheckout.tsx`, `src/lib/pricing.ts` (feature bullet), `src/pages/PdfViewerPage.tsx` — copy updates.
- Tests to update: `src/lib/km-allowance.test.ts`, `src/lib/policy-copy.test.ts`, `src/lib/pdf/rental-agreement-pdf.test.ts`, `rental-agreement-pdf.e2e.test.ts` — existing assertions forbid the word "unlimited" and require the old 1,400/4,800 phrasing; they get rewritten around the new rule (with a case for a 1-day and a 10-day rental).
- Existing signed agreements are not regenerated; the change applies to agreements generated from now on.
