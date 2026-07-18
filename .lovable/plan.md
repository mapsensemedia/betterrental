## Problem

In `src/components/admin/ChangeVehicleDialog.tsx`, the submit button uses:

```ts
disabled={!selectedUnitId || !newStartMileage || swap.isPending}
```

Combined with the fact that mileage is only auto-filled from the selected unit's `current_mileage` (which is often `0` or `null`), and that the "swap effective at" datetime is initialized from `new Date().toISOString().slice(0,16)` (UTC — often invalid in the browser's locale for `<input type="datetime-local">`), the button can appear stuck disabled even when the user thinks the form is complete. There is also no per-field validation feedback — users can't tell which field is blocking them.

## Fix Plan (UI/presentation only)

### 1. Robust enablement + explicit validation state

In `ChangeVehicleDialog.tsx`, replace the ad-hoc disabled expression with a computed `validation` object:

- `unit`: required — a unit must be selected.
- `newStartMileage`: required, must parse to a finite non-negative integer.
- `oldEndMileage`: optional, but if provided must be a finite non-negative integer ≥ current mileage (warn, not block).
- `swapEffectiveAt`: required, must be a valid parseable datetime.
- `newLicensePlate` / `newVin`: optional; if present, trim and (for VIN) enforce 17 chars A-HJ-NPR-Z0-9 using existing `isValidVin` from `src/lib/schemas/vehicle.ts`.

Track errors in a `Record<string, string>` and only disable the button when the required-field errors set is non-empty or `swap.isPending`.

### 2. Fix the datetime-local default

Replace `new Date().toISOString().slice(0,16)` with a local-time formatter (offset-adjusted) so the input is always pre-populated with a valid value and doesn't silently render empty in some browsers.

### 3. Auto-fill mileage more safely

In `onSelect`, if the unit's `current_mileage` is null/0, leave the field empty and focus it so the user knows they must enter it. Show a small helper text under the field: "Required — enter the odometer reading of the new vehicle."

### 4. Inline error messages

Under each field, render `{errors.fieldName && <p className="text-xs text-destructive mt-1">{errors.fieldName}</p>}`. Also add a top-of-footer summary line when the button is disabled: "Complete: {list of missing fields}" so the blocker is always visible.

### 5. Submit path unchanged

The `swap.mutate()` call and the `change-booking-vehicle` edge function stay as-is — they already:
- release the old unit,
- assign + update the new unit's plate/VIN/mileage,
- void the prior agreement,
- insert a `vehicle_swap_history` row,
- call `generate-agreement` with `forceRegenerate: true`,
- link the new agreement back into the history row.

So the "new agreement generated + old vehicle & agreement preserved in history" behavior is already implemented on the backend; this plan only fixes the client-side gating and feedback so the button reliably activates and the user can actually submit.

### 6. Verification

- Open an active rental → Change vehicle → confirm button is disabled with a visible reason.
- Pick a unit, fill mileage → button activates.
- Submit → toast "Vehicle changed successfully" + "New rental agreement generated"; Vehicle History panel shows the prior unit with the voided agreement PDF link.

### Files touched

- `src/components/admin/ChangeVehicleDialog.tsx` (only)

No database, edge function, or business-logic changes.
