

## Fix: Return Time Picker Cannot Switch Between AM/PM

### Problem

The Return Intake step in `StepReturnIntake.tsx` uses a native `<input type="datetime-local">` for setting the actual return time. This input's AM/PM behavior is browser-dependent and unreliable — staff cannot switch from PM to AM when the default value (from `end_at` at 23:59) initializes in PM. This causes returns recorded at 9:30 AM to be saved as 9:30 PM (21:30), triggering false late-return flags.

### Fix

Replace the single native `datetime-local` input with a split date + time + AM/PM picker using existing shadcn components:

- **Date**: Keep as `<input type="date">` (reliable across browsers)
- **Hour**: `<Select>` dropdown (1–12)
- **Minute**: `<Select>` dropdown (00, 15, 30, 45) with manual entry option
- **AM/PM**: Explicit `<Select>` toggle — this is the critical fix

The component will compose these values back into a proper ISO string for saving to `actual_return_at`.

### Scope

**One file modified**: `src/components/admin/return-ops/steps/StepReturnIntake.tsx`

- Replace the `<Input type="datetime-local">` block (lines 326–343) with the split picker
- Update the `formatDatetimeLocal` helper to a `parseReturnTime`/`buildReturnTime` pair
- Update the `useEffect` that initializes `returnTime` to populate the split state (date, hour, minute, ampm)
- Update the save mutation to compose the split values back into an ISO timestamp
- Display a human-readable summary (e.g., "March 26, 2026 at 9:30 AM") below the inputs for confirmation

### What does NOT change

- No changes to late return calculation logic (`src/lib/late-return.ts`)
- No changes to the save target (`actual_return_at` column)
- No changes to other datetime-local inputs in `BookingEditPanel`, `BookingModificationPanel`, or `CreateIncidentDialog`
- No changes to any other return flow steps

