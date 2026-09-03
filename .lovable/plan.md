# Inventory: editing, retiring, returning — plus Abbotsford data cleanup

## Part 1 — Missing inventory actions

### What's happening today

The actions partly exist but are effectively invisible:

- Every row's Edit/Delete sits behind a small three-dot icon at the far right of a table that is 900px+ wide, so on a laptop it is off-screen until you scroll the table sideways.
- All Vehicles has only Edit and Delete — no direct "Retire"; retiring is only possible by opening Edit and changing a Status dropdown buried mid-form.
- Temporary vehicles do have "Return to source" and Delete in that same hidden menu, and the dialog they open has no temporary fields at all (source, start/end date, daily cost), so a temp vehicle's dates cannot be corrected.

### What will change

**All Vehicles tab**
- Visible Actions column: an "Edit" button plus a labelled menu, pinned as a sticky last column so it stays reachable when the table scrolls.
- Explicit actions: Edit vehicle; Set status (Available / Maintenance / Damage); Retire vehicle (confirmation explaining it leaves the active fleet and stops appearing in availability while all history is kept); Reactivate (retired units only); Delete permanently (existing guards and warning kept).
- "Retired" added to the status filter; retired units hidden by default with a "Show retired" toggle.

**Temporary tab**
- Same visible actions column: Edit, Mark as returned, Change/extend return date, Delete.
- "Mark as returned" gets a proper confirmation and records the return date; label stays "Returned".
- Delete keeps current behaviour (hard delete when unused, archive when the unit has history).

**Edit dialog**
- For temporary units, an extra section: Source, Start date, End/return date, Daily cost.

**Guards**
- Retire, mark-returned and delete are blocked with a clear message when the vehicle has an active or upcoming booking.
- Actions stay branch-scoped: managers act on their own location only, super admins on all.

## Part 2 — Abbotsford inventory cleanup

The Abbotsford location currently holds 22 vehicle records instead of your 10. Confirmed problems:

- **Duplicate plates:** A221WM exists twice (your Sentra VIN, plus a Toyota Corolla Cross), A315WE twice (your Palisade, plus a Kia Forte), A618YX twice, B977BH twice (your Kia Rio, plus a "Nissan Pathfinder" with a near-identical VIN).
- **Wrong make/model on your units:** A221WM (VIN ...SY354377) is recorded as Nissan Rogue, should be Nissan Sentra.
- **Wrong VIN:** B079BK is recorded as 3N1AB8BV7SY297656; your list says 3N1AB8BV7S4297656.
- **Wrong location:** A628YX Nissan Sentra (3N1AB8DV6RY326491) sits under Surrey Newton and needs to move to Abbotsford.
- **Statuses out of sync:** many Abbotsford units show "On Rent" with no booking attached (A318WE, A590EY, A642WE, plus extras), while B079BK shows "Available" even though booking E5JS3DUZ is active on it.
- **Records not in your list at all:** A718YX, A687YX, "A59 4EY", A346WE, A834JZ, B053BK, B983BH, the two TMP-placeholder Elantras, and the duplicate rows above.

### Booking attachments found

| Plate | Vehicle | Booking | Window |
| --- | --- | --- | --- |
| A164WM | Nissan Rogue | UCF5DBFJ (active) | Sep 1 – Sep 8 |
| A221WM | Nissan Sentra | KXAL3ZYY (active) | Aug 31 – Sep 4 |
| B977BH | Kia Rio | 3STR9EL7 (active) | Sep 2 – Sep 11 |
| B079BK | Nissan Sentra | E5JS3DUZ (active) | Aug 21 – Sep 4 |
| A315WE | Hyundai Palisade | U54QZP6Y (active, not closed) | Aug 28 – Sep 1 |

All five stay "On Rent", which matches what you described (the Palisade is on the lot but its rental is still open).

### Cleanup steps

1. Correct the make/model, VIN and location of the ten vehicles on your list so each record matches the plate/VIN you gave.
2. Set status: On Rent for the five with active bookings above; Available for the other five (A628YX, A852YX, A642WE, A318WE, A590EY).
3. Retire — not delete — every other Abbotsford record, including the duplicate-plate rows and the TMP placeholders, so booking, invoice and expense history stays intact and they drop out of availability and the active fleet lists.

## Technical notes

- UI files: `src/components/admin/fleet/AllVehiclesTable.tsx`, `TemporaryVehiclesTable.tsx`, `VehicleUnitEditDialog.tsx`, plus a `useSetVehicleUnitStatus` helper and an active/upcoming-booking check in `src/hooks/use-vehicle-units.ts`.
- No schema change: `vehicle_units.status` already accepts `retired`, and the `temp_*` / `actual_disposal_date` columns exist.
- The Abbotsford cleanup is data-only (targeted updates on `vehicle_units` by id), applied after the UI work so the results are verifiable in the new list.
