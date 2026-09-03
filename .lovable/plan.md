# Inventory: visible edit, retire, return and delete actions

## What's happening today

The actions do partly exist, but they are effectively invisible:

- Every row's Edit/Delete sits behind a small three-dot icon at the far right of a table that is 900px+ wide, so on a laptop it is off-screen until you scroll the table sideways.
- All Vehicles has only Edit and Delete — no direct "Retire" action; retiring is only possible by opening Edit and changing a Status dropdown buried mid-form.
- Temporary vehicles do have "Return to source" and Delete in that same hidden menu, and the edit dialog they open has no temporary fields at all (source, start/end date, daily cost), so a temp vehicle's dates cannot be corrected.

## What will change

### All Vehicles tab
- Add a visible Actions column that stays reachable: a clear "Edit" button plus a labelled menu (not a bare icon) pinned as the last sticky column so it does not disappear when the table scrolls.
- Add explicit menu actions:
  - Edit vehicle
  - Set status: Available / Maintenance / Damage
  - Retire vehicle (confirmation dialog explaining it leaves the active fleet, stops appearing in availability, and keeps all history)
  - Reactivate (only for retired vehicles)
  - Delete permanently (existing guard behaviour and warning kept)
- Add "Retired" to the status filter and keep retired vehicles hidden by default, with a "Show retired" toggle.

### Temporary tab
- Same visible actions column, with: Edit, Mark as returned, Extend/change return date, Delete.
- "Mark as returned" gets a proper confirmation dialog and records the return date; the status label stays "Returned" for temporary units.
- Delete keeps its current behaviour (hard delete when unused, archive when the unit has history).

### Edit dialog
- When the unit is temporary, the edit dialog shows an extra section: Source, Start date, End/return date, Daily cost — so temp rentals can be corrected or extended without a separate flow.
- Status list in the dialog stays as-is (Available, On Rent, Maintenance, Damage, Sold, Retired).

### Guards
- Retire, mark-returned and delete are blocked with a clear message when the vehicle is on an active or upcoming booking.
- All actions stay branch-scoped: managers act only on their own location's vehicles, super admins on all.

## Technical notes

- Files touched: `src/components/admin/fleet/AllVehiclesTable.tsx`, `TemporaryVehiclesTable.tsx`, `VehicleUnitEditDialog.tsx`, and `src/hooks/use-vehicle-units.ts` (a small `useSetVehicleUnitStatus` helper plus an active/upcoming-booking check before retire/return/delete).
- No schema change needed: `vehicle_units.status` already accepts `retired`, and `temp_*` / `actual_disposal_date` columns already exist.
- Retire writes `status = 'retired'` (plus `actual_disposal_date` for temporary returns); existing `updated_at` trigger handles timestamps.
