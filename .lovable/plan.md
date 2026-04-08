

## Fix: Extension Agreement Not Generating

### Root Cause

Two issues:

1. **Edge function not deployed with extension logic** — The source code has the `isExtension` bypass but the logs show "Agreement already exists" was hit, meaning the deployed version didn't include the extension bypass. The edge function needs to be redeployed.

2. **UI shows false success** — `handleGenerateAgreement` always shows "generated successfully" even when the function returns `{ alreadyExists: true }`. It should check `data.alreadyExists` and show a different message, or better yet, not show success at all since no new agreement was created.

### Fix Plan

**1. Redeploy the edge function** (`supabase/functions/generate-agreement/index.ts`)
- No code changes needed — the extension bypass logic is already in the source (lines 327-340). Just needs redeployment.

**2. Fix success handling in `src/pages/admin/BookingDetail.tsx`** (line 363-364)
- After the function call, check `data.alreadyExists`:
  - If `true` and type is `extension`: show an info toast "Extension agreement already exists" instead of success
  - If `false`: show the success toast and invalidate queries as before

### Files
| File | Change |
|------|--------|
| `supabase/functions/generate-agreement/index.ts` | Redeploy (no code change needed) |
| `src/pages/admin/BookingDetail.tsx` | Check `data.alreadyExists` before showing success toast |

