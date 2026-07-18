# Change Vehicle on Active Rental

Add an **Edit / Change Vehicle** action on the Booking Detail page (and Ops Active Rental Detail) for `active` bookings, so staff can swap the assigned unit mid-rental. The swap is fully audited: the previous unit + previous rental agreement stay attached to the booking history, and a new agreement PDF is generated for the new vehicle.

## User flow

1. On an active booking, the **Assigned Vehicle** card shows a new **"Change Vehicle"** button (visible only to admin/staff, only when `status = 'active'` and an `assigned_unit_id` already exists).
2. Clicking it opens a dialog listing available units at the booking's location that match the booking's category (with a toggle to allow any category — will trigger a category-upgrade note if different).
3. Staff picks a new unit and fills:
   - Swap effective date/time (defaults to now)
   - Starting mileage on the new vehicle (required)
   - Confirms/edits license plate + VIN (prefilled from the unit record; edits update `vehicle_units`)
   - Optional reason / notes (breakdown, upgrade, customer request, etc.)
4. Save runs an atomic edge function that:
   - Releases the old unit (status → `available` or `maintenance` if reason = breakdown)
   - Attaches the new unit (`bookings.assigned_unit_id`, `vehicle_units.status = on_rent`)
   - Writes a `vehicle_swap_history` row with old/new unit, mileage, timestamp, staff user, reason, and a snapshot of the old agreement id
   - Voids the current pending/active agreement, calls `generate-agreement` with `forceRegenerate: true`
   - Inserts an `audit_logs` entry
5. UI refreshes: card shows the new vehicle; a **"Vehicle History"** collapsible lists prior units with their agreement PDF links and the swap timestamp/reason.

## Files to add / edit

**New**
- `supabase/migrations/<ts>_vehicle_swap_history.sql` — table + grants + RLS + trigger to keep `rental_agreements` history intact (see Technical).
- `supabase/functions/change-booking-vehicle/index.ts` — the atomic swap edge function (mirrors `assign-unit-to-active-booking` but handles the release + swap history + regen).
- `src/components/admin/ChangeVehicleDialog.tsx` — unit picker + mileage/plate/VIN/notes form.
- `src/components/admin/VehicleHistoryList.tsx` — collapsible list of prior units + agreement links.
- `src/hooks/use-vehicle-swap-history.ts` — react-query hook.

**Edit**
- `src/pages/admin/BookingDetail.tsx` — inject the Edit button + dialog + history list into the Assigned Vehicle section.
- `src/pages/admin/ActiveRentalDetail.tsx` — same treatment for the ops-facing active rental view.
- `src/components/admin/VehicleAssignment.tsx` / `UnitAssignmentCard.tsx` — add the Change Vehicle CTA when a unit is already assigned and status is active.
- `src/hooks/use-vehicle-assignment.ts` — add `useChangeVehicle()` mutation calling the new edge function; keep existing assign/unassign hooks untouched.
- `src/lib/pdf/rental-agreement-pdf.ts` — no logic change; regeneration is triggered via the existing `generate-agreement` function so both PDFs coexist in `rental_agreements`.

## Technical details

**New table `public.vehicle_swap_history`**
```
booking_id uuid FK → bookings(id)
old_unit_id uuid FK → vehicle_units(id)
new_unit_id uuid FK → vehicle_units(id)
old_agreement_id uuid FK → rental_agreements(id) NULL
new_agreement_id uuid FK → rental_agreements(id) NULL
swap_effective_at timestamptz
old_end_mileage int NULL
new_start_mileage int NOT NULL
reason text NULL         -- 'breakdown' | 'upgrade' | 'customer_request' | 'other'
notes text NULL
changed_by uuid           -- auth.uid()
created_at timestamptz default now()
```
- GRANT SELECT to authenticated, ALL to service_role.
- RLS: admin/staff can select; inserts restricted to service_role (edge function).
- No DELETE / UPDATE policies — history is immutable.

**Agreement preservation**
- Do NOT hard-delete or overwrite `rental_agreements`. The current void pattern (`status = 'voided'`) is kept — old PDF stays fetchable. `generate-agreement` will produce a new row. The swap row links both `old_agreement_id` and `new_agreement_id` for the timeline UI.

**Edge function `change-booking-vehicle`** (verify_jwt via `getUserOrThrow` + `requireRoleOrThrow(['admin','staff'])`):
- Validates booking is `active` and has an existing `assigned_unit_id`.
- Validates new unit exists, is at same location, is `available` or same booking's current unit, and is not held by another active/confirmed booking.
- Wrapped in try/rollback: releases old unit, attaches new unit, applies plate/VIN edits to the new unit, writes `vehicle_swap_history`, voids old agreement, calls `generate-agreement`, backfills `new_agreement_id` on the history row.
- Returns `{ success, oldUnit, newUnit, agreementRegenerated }`.

**UI guardrails**
- Button hidden unless `has_role admin|staff` and booking status is `active`.
- Confirmation step in dialog summarizes: old VIN/plate → new VIN/plate, mileage, agreement regeneration notice, "This action is logged and cannot be undone."
- Toast on success + query invalidation for `booking`, `rental-agreement`, `vehicle-units`, `vehicle-swap-history`.

## Out of scope (not changed)

- Pricing / daily rate — swap is treated as an operational change, no reprice unless category upgrade is confirmed (existing `CategoryUpgradeDialog` remains the path for rate changes).
- Payment / deposit flows.
- Delivery-task assignments.
- Customer-facing pass or self-serve — this is staff-only.
