## Goal

The rental agreement must not mention any kilometre limit or excess-kilometre charge. Marketing/FAQ pages stay as they are (not part of this change).

## Changes

1. **Agreement PDF** (`src/lib/pdf/rental-agreement-pdf.ts`)
   - Remove the "7. KILOMETRE ALLOWANCE" section (allowance + $0.25/km excess lines) and renumber the following sections (Termination, etc.).
   - Keep the "Km Out" odometer field in the vehicle-condition block — it records vehicle state, not a limit.

2. **On-screen agreement view** (`src/components/booking/AgreementStructuredView.tsx`)
   - Remove the terms bullet listing the kilometre allowance and excess-km charge.

3. **Agreement text generated server-side** (`supabase/functions/generate-agreement/index.ts`)
   - Remove the trailing "Kilometre allowance: 1,400 km / 7 days or 4,800 km / 30 days (prorated); excess $0.25/km." sentence from the stored terms paragraph. Redeploy the function.

4. **Tests**
   - Update `src/lib/pdf/rental-agreement-pdf.test.ts` / `policy-copy.test.ts` assertions that expect the allowance clause, so the suite asserts the clause is absent instead.

## Notes

- Existing agreements already generated keep their stored text; regenerating an agreement will produce the new clause-free version.
- The `km-allowance.ts` helper and `excess_km_fee_cents` invoice column are left in place but no longer referenced by the agreement; say the word if you also want excess-km charging removed from the return/closeout flow.
