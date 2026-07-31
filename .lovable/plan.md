## Goal

Bring back the kilometre range clause on the rental agreement, replacing the current "Unlimited kilometres" language.

## Clause content (from existing shared constants in `src/lib/km-allowance.ts`)

- 1,400 km per 7 days, or 4,800 km per 30 days, prorated (~160 km/day)
- This booking's allowance shown as a concrete number based on its rental days
- Excess kilometres charged at $0.25/km, calculated at return from odometer readings

## Changes

1. **Agreement PDF** (`src/lib/pdf/rental-agreement-pdf.ts`, line ~549)
  - Replace the "Unlimited kilometres" bullet with a `KILOMETRE ALLOWANCE` section that prints the prorated allowance for this rental (`calculateKmAllowance(totalDays)`), the weekly/monthly caps, and the $0.25/km excess rate.
2. **On-screen agreement view** (`src/components/booking/AgreementStructuredView.tsx`, line 207)
  - Replace "No kilometre limit applies to this rental." with the allowance bullet(s) using the same helper, reading `t.rental.totalDays` and any `policies.kmAllowance` value stored on the agreement.
3. **Agreement generator** (`supabase/functions/generate-agreement/index.ts`)
  - Restore km fields in `terms_json.policies` (`kmAllowance`, `excessKmRate`, weekly/monthly caps) so newly generated agreements persist the numbers.
  - Update the plain-text `Terms:` string (line 501) to state the km allowance instead of "Unlimited kilometres".
  - Existing agreements without those fields fall back to computing from rental days, so old records still render correctly.
4. **Tests**
  - Flip the assertions in `src/lib/policy-copy.test.ts`, `src/lib/pdf/rental-agreement-pdf.test.ts`, and `src/lib/pdf/rental-agreement-pdf.e2e.test.ts` back to expecting the km allowance section and rate, and no "unlimited kilometres" wording.

## Out of scope

No pricing-engine changes: excess-km fees remain computed at return via the existing `calculateExcessKm` helper; marketing pages already carry the km copy.