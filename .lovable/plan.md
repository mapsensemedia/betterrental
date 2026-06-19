## Goal

When you click **Delete** on a vehicle (VIN) in Admin → Inventory → All Vehicles, the vehicle should be permanently removed from the database — not silently archived as `retired`.

## Why it currently archives

The `vehicle_units` row is referenced by other tables. Two of those references actively block a hard delete:

- `bookings.assigned_unit_id` (historical bookings the unit was assigned to)
- `damage_reports.vehicle_unit_id` (damage reports filed against the unit)

Three more references already clean themselves up automatically (`vehicle_expenses`, `fleet_cost_cache`, `maintenance_logs` cascade-delete; `incident_cases` sets to NULL).

So today, as soon as a unit has any past booking or damage report, the delete falls through to the "archive as retired" branch in `useDeleteVehicleUnit` (`src/hooks/use-vehicle-units.ts`).

## What changes

### 1. Hard-delete logic (`src/hooks/use-vehicle-units.ts`)

Update `useDeleteVehicleUnit` so it performs a true delete:

1. Keep the existing guard: block deletion if the unit is on a `pending`, `confirmed`, or `active` booking (those must be cancelled/completed first — this protects live operations).
2. Detach historical references that would otherwise block the delete:
   - `UPDATE bookings SET assigned_unit_id = NULL WHERE assigned_unit_id = <id>` (only completed/cancelled bookings remain at this point). The booking, its payments, invoices, receipts, and agreement records are untouched — finance history stays intact, the booking just no longer points at a deleted VIN.
   - `DELETE FROM damage_reports WHERE vehicle_unit_id = <id>` (damage reports are about the physical unit and don't carry standalone financial value).
3. `DELETE FROM vehicle_units WHERE id = <id>`. The remaining FKs (`vehicle_expenses`, `fleet_cost_cache`, `maintenance_logs`) cascade automatically; `incident_cases.vehicle_unit_id` is set to NULL automatically.
4. Remove the "archive as retired" fallback branch entirely so a delete is always a delete.
5. Return `{ archived: false }` and keep the existing query invalidations and toast.

### 2. Confirmation dialog copy (`src/components/admin/fleet/AllVehiclesTable.tsx`)

Rewrite the dialog text so it accurately reflects the new behaviour:

- Title: **Permanently delete this vehicle?**
- Body: VIN `<vin>` will be permanently deleted. Its expense, maintenance, and fleet-cost records will be removed. Past bookings and their invoices/payments will be kept for finance history but will no longer reference this VIN. Damage reports filed against this VIN will be deleted. Active or upcoming bookings will block this action.
- Action button stays **Delete** (destructive styling).

No other UI changes; the row's "Delete" action and the existing "block if active booking" toast still work the same way.

## Out of scope

- No schema/migration changes — existing FK rules already support the new flow.
- No changes to the "active/upcoming booking blocks delete" rule (kept as a safety net).
- No changes to vehicle **categories** deletion — only individual VIN units.

## Technical notes

- Files touched: `src/hooks/use-vehicle-units.ts`, `src/components/admin/fleet/AllVehiclesTable.tsx`.
- Project memory currently records a "Vehicle Deletion Restrictions" rule preserving FKs. After this change ships, that memory will be updated to reflect the new policy (hard delete with reference detach).
