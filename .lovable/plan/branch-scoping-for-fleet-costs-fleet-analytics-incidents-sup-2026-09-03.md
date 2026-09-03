# Branch scoping for Fleet Costs, Fleet Analytics, Incidents, Support and Ops

Extend the existing branch scope (Super Admin = any/all branches, Manager = own branch only) to the remaining operational sections.

## What changes for users

- Fleet Costs and Fleet Analytics show only vehicles of the selected branch; totals, charts, utilization, cost/health cards and category rollups recalculate from that branch's vehicles only.
- Incidents lists only incidents tied to the selected branch (via the incident's vehicle unit, or the linked booking when the unit is missing).
- Support tickets are branch-scoped through the linked booking (or the linked incident/damage's vehicle unit).
- Support Analytics counts only branch tickets.
- Ops panel: Super Admin sees all branches (and may switch); a Manager is hard-locked to their branch on Workboard, Bookings, Pickups, Returns, Active Rentals and Fleet — no view can widen it, and pages hold their queries until the scope resolves instead of briefly loading everything.
- The top-bar branch selector stays the single control; no section adds its own dropdown.

## Tickets that have no branch

Support tickets carry no location field and many are not linked to a booking or vehicle. Rule applied: a ticket resolves to a branch through booking, incident or damage; unresolvable tickets are shown to Super Admins only, plus to any manager who created or is assigned to them, under an "Unassigned branch" label.

## Technical notes

Verified current state:
- `incident_cases`, `support_tickets_v2`, `tickets`, `vehicle_expenses`, `maintenance_logs`, `fleet_cost_cache` have no `location_id`. Branch is derivable only via `vehicle_units.location_id` (or `bookings.location_id`).
- `src/pages/admin/Incidents.tsx:58` `useIncidentCasesWithTickets()` and `src/hooks/use-incidents.ts` `useIncidentCases()` apply no branch filter.
- `src/hooks/use-fleet-cost-enhanced.ts:66` declares `locationId` in its filter type but never uses it; `src/pages/admin/FleetCosts.tsx:108` and `FleetAnalytics.tsx` call the hooks with no filters at all.
- `src/hooks/use-fleet-analytics.ts:95` and `use-fleet-analytics-enhanced.ts:85` filter on `unit.vehicle.location_id` (category-level) rather than `vehicle_units.location_id` (unit-level) — switch to the unit column with the vehicle column as fallback.
- Ops pages already read scope through `useOpsLocationFilter()` → `useEffectiveLocationId()` (`src/hooks/use-staff-location.ts`), but they ignore `isReady`/`isUnassignedManager`, so an unscoped fetch can fire first.

Work items:
1. Resolve unit → branch once: fetch `vehicle_units(id, location_id, vehicle_id)` for the scope and filter fleet cost/analytics datasets server-side by `location_id` when a branch is active; recompute every aggregate from the filtered set.
2. Thread the effective branch into `useFleetCostAnalysisByVehicle`, `useFleetCostAnalysisEnhanced`, `useFleetAnalytics`, `useFleetAnalyticsEnhanced` and their category/utilization/comparison tabs, including the branch in query keys.
3. Add branch filtering to `useIncidentCases` and `Incidents.tsx`: pre-resolve branch unit ids and booking ids, then filter with `.in(...)` server-side; keep the existing 50-row cap per branch.
4. Add branch filtering to `use-support-v2.ts` list/analytics queries using booking/incident/damage → branch resolution plus the unassigned rule above.
5. Ops hardening: gate each ops query on `isReady`, disable it for an unassigned manager, and remove any path where a manager's branch can be overridden by URL params.
6. Verify with a Playwright pass as Super Admin (branch switch changes numbers) and confirm typecheck/build are clean.

No database migration and no RLS change in this pass; this is query-level scoping consistent with the rest of the admin panel.
