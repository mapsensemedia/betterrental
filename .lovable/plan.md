# Fix: Can't change a vehicle unit's location in admin inventory

## Root cause

`src/components/admin/fleet/VehicleUnitEditDialog.tsx` (the dialog opened from the admin fleet inventory's "Edit" action) renders fields for VIN, plate, color, status, category, cost, mileage, tank, and notes — but **has no Location field**. Even though `vehicle_units.location_id` exists in the DB and is editable via `useUpdateVehicleUnit`, the UI never lets the user change it. The only place location is set today is the create flow (`VinFormDialog`), so once a unit is added, its location is effectively frozen in the admin panel.

## Fix

Add a Location selector to the edit dialog and include `location_id` in the update payload.

### Changes in `src/components/admin/fleet/VehicleUnitEditDialog.tsx`

1. Import `LocationSelector` from `@/components/shared/LocationSelector` (already wired to `useLocations`).
2. Add `location_id: ""` to the `formData` state shape.
3. In the `useEffect` that hydrates `formData` from `unit`, populate `location_id: unit.location_id || ""`.
4. Add a new form row (next to Category, or just below Status) labeled "Location" rendering `<LocationSelector value={formData.location_id || null} onChange={(v) => setFormData({ ...formData, location_id: v })} />`.
5. In `handleSubmit`, pass `location_id: formData.location_id || null` to `updateUnit.mutateAsync(...)`.

### Out of scope

- No DB migration (column already exists, RLS already allows admin/staff updates via `useUpdateVehicleUnit`).
- No change to the move-with-reason audit flow used in ops (`MoveUnitInput`); this is the admin inventory edit path only.
- No change to status auto-transitions — admin keeps current status field as-is.

### Files touched

- `src/components/admin/fleet/VehicleUnitEditDialog.tsx` (edit only)
