

## Fix Plan: Return Ops — Two Bugs

### BUG 1: Return time is auto-set and not editable

**Root cause**: In `StepReturnIntake.tsx` (lines 306-312), the return time is hardcoded to display `new Date()` with text "(Current time will be used)". There is no input field — staff cannot edit it. Then in `use-return-state.ts` line 84, `actual_return_at` is set to `new Date().toISOString()` at the moment the closeout step completes, which could be well after the actual vehicle return.

Similarly, the late fee calculation in `StepReturnCloseout.tsx` line 136 uses `new Date().toISOString()` as `actualReturnAt`, meaning the late fee grows the longer staff takes to process the return.

**Fix**:

1. **`StepReturnIntake.tsx`** — Replace the static time badge (lines 294-313) with an editable datetime input. Default value: `booking.end_at` (scheduled return time). Store the selected time in component state and persist it to the booking record (e.g. `actual_return_at`) when saving intake metrics. Need to pass the booking object into this component (or just `end_at`).

2. **`use-return-state.ts`** — In the `closeout_done` case (line 84), do NOT overwrite `actual_return_at` with `new Date()`. Instead, only set it if it's not already set (it should have been set during intake). Change to a conditional: `if (!booking.actual_return_at) updateData.actual_return_at = new Date().toISOString()`.

3. **`StepReturnCloseout.tsx`** — Line 136: Use `booking.actual_return_at` instead of `new Date().toISOString()` for the late fee calculation so it reflects the staff-recorded return time, not panel-open time.

4. **`StepReturnIssues.tsx`** — Lines 73-77: Same issue — late detection uses `now` instead of recorded return time. Update to use `booking.actual_return_at` if available, fall back to `now`.

### BUG 2: Flagging an issue throws FK violation error

**Root cause**: Postgres error log shows: `insert or update on table "admin_alerts" violates foreign key constraint "admin_alerts_vehicle_id_fkey"`. The FK points to the `vehicles` table (physical units), but the code passes `booking.vehicle_id` which is a `vehicle_categories` UUID (not a physical vehicle).

**Fix in two files** (`StepReturnIssues.tsx` line 192, `StepReturnFlags.tsx` line 66):

Change `vehicleId: booking.vehicle_id` → `vehicleId: booking.assigned_unit_id || undefined`. The `assigned_unit_id` references `vehicle_units` which maps to `vehicles`. If no unit is assigned, pass `undefined` (the column is nullable).

Alternatively, if the booking doesn't have `assigned_unit_id` available in the passed-in `booking` object, simply omit `vehicleId` from the alert creation — it's nullable and the alert still works fine with just `bookingId`.

### Files to Change

| File | Change |
|------|--------|
| `src/components/admin/return-ops/steps/StepReturnIntake.tsx` | Add editable datetime input for return time, default to `end_at`, persist to `actual_return_at` on save |
| `src/hooks/use-return-state.ts` | Don't overwrite `actual_return_at` in closeout if already set during intake |
| `src/components/admin/return-ops/steps/StepReturnCloseout.tsx` | Use `booking.actual_return_at` for late fee calc instead of `new Date()` |
| `src/components/admin/return-ops/steps/StepReturnIssues.tsx` | Use `booking.actual_return_at` for late detection; fix `vehicleId` in flag creation |
| `src/components/admin/return-ops/steps/StepReturnFlags.tsx` | Fix `vehicleId` in flag creation (same FK issue) |

### Ripple Check

- `StepReturnIntake` currently doesn't receive the booking object — need to check if it's passed from `ReturnOps.tsx` or if we need to add it as a prop (it already fetches the booking internally via a query, so we can use that).
- The `handleCompleteReturn` in `ReturnOps.tsx` doesn't need changes since it delegates to `completeStep` which calls the state transition.
- No payment amounts are altered — only the time used for display and late fee calculation changes.

