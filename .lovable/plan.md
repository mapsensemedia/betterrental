

# Make Verification Checklist Interactive in OPS Check-In Step

## Problem

The Verification Checklist in the OPS Check-In step (Step 1) displays 5 items as **read-only status indicators** -- staff can see them but cannot toggle or complete any of them. There are no checkboxes, no date inputs, and no save button.

Meanwhile, a fully interactive `CheckInSection` component already exists with:
- Checkboxes for Gov ID, Name Match, Age Verified
- Date input for License Expiry (auto-validates expired/valid)
- Date of Birth input (auto-calculates age and validates 21+)
- Notes fields for each section
- Save and Complete buttons that persist to the `checkin_records` database table

The OPS `StepCheckin` component was built separately and never integrated these interactive controls.

## Solution

Replace the read-only `VerificationItem` list in `StepCheckin` with interactive checkbox controls that persist to the `checkin_records` table, reusing the existing database hooks.

## Changes

### File: `src/components/admin/ops/steps/StepCheckin.tsx`

**Replace the Verification Checklist card** with an interactive version:

1. **Import the check-in hooks**: Add `useCheckInRecord`, `useCreateOrUpdateCheckIn`, `useCompleteCheckIn`, `calculateAge`, `isLicenseExpired` from `@/hooks/use-checkin`

2. **Add local state for each verification field**:
   - `govIdVerified` (boolean, checkbox)
   - `licenseNameMatches` (boolean, checkbox)
   - `licenseExpiryDate` (string, date input -- auto-checks if expired)
   - `ageVerified` (boolean, auto-set from DOB)
   - `customerDob` (string, date input -- auto-calculates age)

3. **Load existing check-in record**: Use `useCheckInRecord(booking.id)` to fetch any previously saved data and pre-fill the form fields

4. **Replace the 5 read-only `VerificationItem` components** with interactive controls:
   - **Gov Photo ID**: Checkbox toggle (staff clicks to verify)
   - **License on File**: Auto-detected from profile (read-only, already works)
   - **Name Matches**: Checkbox toggle
   - **License Not Expired**: Date input for expiry date, auto-validates
   - **Age Verified (21+)**: Date of Birth input, auto-calculates age and validates

5. **Add a "Save Check-In" button** at the bottom that calls `useCreateOrUpdateCheckIn` to persist all verification fields to the `checkin_records` table

6. **Add a "Complete Check-In" button** (enabled when all required items pass) that calls `useCompleteCheckIn` to mark the check-in as "passed"

7. **Remove the old `VerificationItem` and `StatusIndicator` helper components** since they will be replaced by the interactive controls

### No Other Files Change

- The `ops-steps.ts` completion logic already reads from `checkinRecord` in `BookingOps.tsx` (lines 157-163), so once the interactive controls save data to `checkin_records`, the step completion status will automatically update
- The database schema (`checkin_records` table) already has all the needed columns
- The hooks (`use-checkin.ts`) already handle create/update/complete flows

## How It Will Work

1. Staff opens the Check-In step
2. They see interactive checkboxes and date inputs instead of static icons
3. They toggle "Gov ID Verified", "Name Matches", enter license expiry date and DOB
4. They click "Save" to persist progress (can come back later)
5. When all items pass, they click "Complete Check-In" to finalize
6. The step status automatically updates to "Complete" and the green checkmark appears in the step nav

