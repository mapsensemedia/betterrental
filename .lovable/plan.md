## Goal
Remove the 2023 Range Rover Evoque (Large SUV) from the vehicles inventory.

## Findings
- Vehicle row found: `vehicles.id = 7cbccacf-1dfe-4802-8cca-4c9549ab7f12` (2023 RANGE ROVER EVOQUE, category "LARGE SUV - Dodge Durango or Similar").
- No bookings reference this vehicle (safe to delete).
- No damage reports reference it.
- 1 row in `vehicle_units` references it and must be removed first to satisfy FK constraints.

## Steps
1. Delete the related `vehicle_units` row for this vehicle.
2. Delete any `audit_logs` entries with `entity_type='vehicles'` and `entity_id` matching, to mirror the app's `useDeleteVehicle` cleanup.
3. Delete the `vehicles` row `7cbccacf-1dfe-4802-8cca-4c9549ab7f12`.
4. Verify the vehicle no longer appears in `/admin/fleet`.

## Notes
- No code changes required — this is a data-only removal.
- Other Large SUV inventory and the category itself remain intact.