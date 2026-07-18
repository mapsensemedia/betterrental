## What's actually happening

The edge function is working — it's rejecting the swap on purpose. The Nissan Rogue **A859JZ** (unit `d54cbab5…`) is currently **still assigned to another active booking**: **SEE8QAKY** (Naqib Noor — the one we manually reopened for the July 20 return). Its unit `status` was reset to `available`, but the `bookings.assigned_unit_id` link was never cleared, so the conflict check returns HTTP 409:

> "Unit is already assigned to booking SEE8QAKY"

The dialog swallows that message and only shows "Edge Function returned a non-2xx status code", which is why it looks like a generic crash.

## Plan

### 1. Decide which booking should actually hold A859JZ

The Rogue can't be on two active rentals at once. Pick one:

- **Option B — AMY KERR (W9JD9JDV) gets A859JZ.** Then we clear the assignment on SEE8QAKY first (unassign the unit on that booking and, if needed, put a different unit on Naqib's booking). After that, the swap on AMY's booking will go through.

I need you to tell me which option before I touch any data.

### 2. Fix the misleading error toast (code-only)

Regardless of which option you pick, update `src/components/admin/ChangeVehicleDialog.tsx` so the mutation reads the JSON error the function actually returned (`data.error` on 4xx via `FunctionsHttpError.context.json()`), and shows that in the toast instead of the generic Supabase message. This is the actual "fix" — same class of issues (unit conflict, wrong location, wrong status, agreement regen failure) will all display the human-readable reason from now on.

### 3. No other code or schema changes

The edge function logic is correct — a unit already linked to another active booking must block the swap. We should not weaken that check.

## Technical notes

- Confirmed via DB: `vehicle_units` row for A859JZ = `available` at Abbotsford, but `bookings` row `SEE8QAKY` still has `assigned_unit_id = d54cbab5…` with `status = active`.
- Edge function line 78–87 in `supabase/functions/change-booking-vehicle/index.ts` returns the 409 with the correct booking code — no function change needed.
- Client fix: in the `swap` mutation's `mutationFn`, when `error` is a `FunctionsHttpError`, call `await error.context.json()` (or `.text()` fallback) and throw with that `error.error` string so `onError` surfaces it.
- If you pick Option B, the data fix is a targeted migration on booking `7cd9b812-b1a6-46b2-86c4-f7fc4948b681`: set `assigned_unit_id = null` (and optionally assign a replacement unit) plus an `audit_logs` row noting the correction.

**Which option do you want — A or B?**