# Location-Based Business Units (Abbotsford / Langley / Surrey)

Goal: each branch operates as an independent internal business unit. There are exactly two roles — **Super Admin** (all branches, company-wide) and **Manager** (one branch only). The customer-facing site, booking funnel, and rental experience stay exactly as they are.

## What already exists (verified by audit)

- Three active locations: Surrey Newton, Langley Centre, Abbotsford Centre.
- `bookings.location_id` already exists and is NOT NULL — all 660 bookings are already assigned (Surrey 469, Langley 41, Abbotsford 150). No booking backfill needed.
- `bookings` already tracks `created_by`, `activated_by`, `handed_over_by`, `return_intake_completed_by`, `return_issues_reviewed_by`, `upgraded_by`, `offline_paid_by`, plus `return_location_id`.
- `vehicle_units.location_id` exists; **8** units have no location and **all 8 are retired** — cosmetic cleanup, not an operational blocker.
- `user_roles` holds 9 rows: 7 `admin`, 1 `staff`, 1 `driver`. No location column on roles today. A role-assignment UI exists (`src/components/admin/UserRolesPanel.tsx`, in Settings → Users & Roles) but it cannot create accounts — there is no staff account-creation function.
- Child tables are cleanly traceable to a booking location: only 1 support ticket, 22 admin alerts and 50 audit rows cannot be resolved. `payments.location_id` exists but is NULL on 806/1024 rows and must be backfilled from the booking.
- There are **no views or materialized views** in the database — every dashboard reads tables directly, so there is no view-based RLS bypass.
- **No index exists on `bookings.location_id`, `bookings.return_location_id`, `vehicle_units.location_id` or `payments.location_id`** — these must be added with the scoping work.
- 128 policies across 47 tables use the flat `is_admin_or_staff(auth.uid())` check — this is the single biggest change.
- 26 SECURITY DEFINER functions bypass RLS; the client-callable ones needing location checks are `assign_vin_to_booking`, `release_vin_from_booking`, `get_category_availability`, `check_category_availability`, `get_available_categories`, `update_points_balance`.

## 1. Database changes

**New: staff assignment table**

- `public.staff_assignments` — one row per staff user: `user_id` (unique), `location_id`, `display_name`, `employee_code`, `is_active`, `created_by`, timestamps.
- Enum extension: add `super_admin` and `manager` to `app_role`. Because Postgres cannot use a new enum value in the same transaction that adds it, this ships as **two separate migrations**: one that only runs `ALTER TYPE app_role ADD VALUE`, then everything else. `admin` is treated as Super Admin during transition, then converted to `super_admin`; the single `staff` holder becomes `manager`.


**New security-definer helpers** (used by every policy so there is no recursion):

- `public.is_super_admin(uid)` — true for `super_admin` (and legacy `admin`).
- `public.staff_location(uid)` — returns the assigned `location_id`, NULL for super admin.
- `public.can_access_location(uid, loc)` — super admin → true; active staff → `staff_location(uid) = loc`; inactive staff → false.
- `public.is_active_staff(uid)` — blocks logins of deactivated accounts at the data layer.

**Location columns to add where missing** so filtering never needs a join chain:

- `damage_reports`, `incident_cases`, `walkaround_inspections`, `checkin_records`, `delivery_tasks`, `support_tickets_v2`, `final_invoices`, `payments`, `receipts` → derive location from the parent booking with a trigger (`location_id` set on insert, immutable afterwards). For tables where adding a column is heavy, policies instead use an `EXISTS` check against `bookings.location_id`.

**Processed-by / accountability columns on `bookings`**

- `processed_by` (uuid), `processed_at`, `processed_at_location_id`, `closed_by`, `last_modified_by`.

**Audit log upgrade**

- Add `location_id`, `actor_role`, `actor_location_id` to `audit_logs`; add a `booking_activity` view over `audit_logs` filtered to `entity_type='booking'` for the rental history timeline.

Every new public table gets GRANTs to `authenticated` + `service_role` in the same migration, then RLS, then policies.

## 2. Role and permission structure — exactly two roles

| Role | Scope | Key rights |
| --- | --- | --- |
| `super_admin` | All locations + combined | Everything: rentals, fleet, finance, settings, company-wide reports, location switching, create/deactivate/reassign staff at any branch |
| `manager` | One assigned location only | Everything operational for that branch — create and process rentals, handover, returns, fleet, payments, deposits, branch reports. No staff management, no location switching, no company-wide totals |

There are no other admin roles. `staff`, `cleaner`, `finance`, `support` and `location_manager` are not used: existing holders are converted (`admin` → `super_admin`, `staff` → `manager`) and the legacy values stop being granted. The only role kept outside this pair is `driver`, because it is not an admin-panel role — it gates the separate delivery portal (`delivery@c2crental.ca`), and removing it would break delivery dispatch. Say the word if you want the driver portal folded into `manager` too.

`src/auth/capabilities.ts` collapses to two rows: `super_admin` (everything true, `canSwitchLocation`, `canManageStaff`, `canViewAllLocations`) and `manager` (all operational capabilities true, those three false, plus a fixed `locationId`). `is_admin_or_staff()` is kept as-is so nothing breaks, and simply returns true for both roles.


## 3. Backend authorization logic

Three enforcement layers, all required:

1. **RLS** — replace `is_admin_or_staff(auth.uid())` with `is_admin_or_staff(auth.uid()) AND can_access_location(auth.uid(), location_id)` on `bookings`, `vehicle_units`, `vehicles`, `payments`, `final_invoices`, `receipts`, `damage_reports`, `incident_cases`, `walkaround_inspections`, `checkin_records`, `delivery_tasks`, `reservation_holds`, `deposit_ledger`, `admin_alerts`, `audit_logs`, `support_tickets_v2`. Customer-facing policies (`auth.uid() = user_id`) are untouched, so the customer experience does not change.
2. **Edge functions** — a shared `_shared/location-guard.ts` exposing `requireLocationAccess(userId, bookingId)` and `resolveStaffLocation(userId)`. Every staff-invoked function (`create-walk-in-booking`, `update-booking-status`, `reprice-booking`, `force-close-booking`, `void-booking`, `assign-unit-to-active-booking`, `change-booking-vehicle`, `log-terminal-payment`, `wl-*` staff paths, `persist-booking-extras`, `generate-agreement`, `generate-return-receipt`) calls it before any write. Because these run with the service role and bypass RLS, this guard is the real boundary for them.
3. **UI** — filtering and hidden controls, purely cosmetic; never the only check.

An Abbotsford staff member editing a URL to a Surrey booking id gets a 403 from the guard and an empty row from RLS.

## 4. Automatic location assignment

- Walk-in / staff-created bookings: the edge function ignores any client-supplied `location_id` for non-super-admins and stamps `staff_location(userId)`, plus `created_by`, `processed_by`, `processed_at`.
- Handover, activation, return and close steps stamp the acting staff into `handed_over_by` / `activated_by` / `processed_by` / `closed_by` and write an audit row.
- Super admins must pass an explicit location (the UI shows the switcher).
- Customer online bookings keep using the location the customer picked — unchanged.

## 5. Dashboard, workflow and reporting changes

- New `useStaffLocation()` hook plus a `LocationScopeProvider`. For staff it returns a fixed location with no switcher; for super admin it renders a location switcher (All / Surrey / Langley / Abbotsford) persisted in the URL, consistent with the existing URL-state pattern.
- Every admin query hook adds `.eq("location_id", scope)` when scope is a single location: Overview, Bookings, ActiveRentals, Pickups, Returns, Handovers, Inventory, FleetManagement, Finance, Reports, Analytics, Alerts, Damages, Incidents, Calendar, AbandonedCarts. RLS makes this an optimisation, not the guard.
- `Reports.tsx` and `Finance.tsx` get a location column/label; exports are scoped identically. Super admin gets a location comparison view (revenue, rentals, utilisation side by side).
- New "Processed By" block in Active Rental detail and Booking detail: `Processed By: John Smith` / `Location: Abbotsford`, plus an Activity History timeline (staff, action, date/time, location) sourced from `audit_logs`.
- New Super-Admin-only page `/admin/staff`: list, create, deactivate, reassign location, change role. Account creation goes through a new `manage-staff` edge function (service role) that creates the auth user, the `staff_assignments` row and the `user_roles` row atomically, then sends the existing account-setup link email.

## 6. Existing data migration strategy

1. Backfill `staff_assignments` for the 9 existing role holders. All 7 current admins become `super_admin` so nobody is locked out at cutover; `operations@c2crental.ca` (today's only `staff`) becomes a `manager` at a branch you choose; `delivery@c2crental.ca` keeps `driver`. Accounts are converted to `manager` deliberately, one at a time.
2. Assign the 8 retired `vehicle_units` with NULL `location_id` (A587EY, A586EY, A817JZ, A833JZ, A818JZ, A211WN, A594EY, A161WM — six last rented from Surrey, two never rented). Confirmed with you first; no guessing.
3. Derive location on child records from `bookings.location_id`, including backfilling the 806 NULL `payments.location_id` rows. Unresolvable rows (1 support ticket, 22 admin alerts, 50 audit rows pointing at deleted bookings) stay NULL and are Super-Admin-only. Indexes on `bookings.location_id`, `bookings.return_location_id`, `vehicle_units.location_id`, `payments.location_id` and every new `location_id` column ship in the same migration — none exist today.
4. Backfill `bookings.processed_by` from the best available existing signal in priority order: `handed_over_by` → `activated_by` → `created_by`; leave NULL when none exists (206 bookings have no `created_by`). Historical rows are never invented.
5. No financial column is touched by the migration — money fields, statuses and totals are read-only in every step.
6. RLS tightening ships **last**, behind a verification pass, so bookings/invoices stay reachable throughout.

## 7. Edge cases

- One-way rentals: a booking picked up at Surrey and dropped at Abbotsford. Recommended rule: visible read-only to the return location's staff via a policy branch on `return_location_id`, editable only by the pickup location and super admin.
- Vehicle transfers between branches: only super admin / location manager may change `vehicle_units.location_id`; the change is audited.
- Overbooked / unassigned category bookings keep their `location_id`, so they stay in the right branch queue.
- Staff deactivated mid-shift: `is_active=false` immediately fails `can_access_location`, so open tabs stop returning data.
- Staff reassigned to another branch: history stays attributed to the old branch; the account sees only the new branch going forward.
- Delivery drivers and support agents may need cross-location reach — their existing policies are preserved and scoped by config rather than hard location match.
- Deposits/refunds processed by a different branch than the rental branch: recorded with the acting staff's location in the audit row while remaining attached to the rental's branch.

## 8. Development phases

1. **Foundations** — enum + `staff_assignments` + helper functions + audit columns (no behaviour change).
2. **Attribution** — `processed_by` etc., stamping in edge functions, backfill, Processed By UI + Activity History.
3. **Scoping (read)** — `LocationScopeProvider`, hook filtering, super-admin switcher, scoped reports.
4. **Enforcement** — edge-function `location-guard`, then RLS policy replacement.
5. **Staff management** — `/admin/staff` page + `manage-staff` function, then conversion of accounts from `super_admin` to `manager`.
6. **Comparison & reporting** — super-admin multi-location comparison and company-wide totals.

## 9. Testing checklist

- Abbotsford staff: dashboard counts, revenue, pickups, returns, inventory, reports all Abbotsford-only; no location switcher.
- Direct URL to a Surrey booking id as Abbotsford staff → access denied, and the raw query returns no row.
- Edge-function probe: call `update-booking-status` / `reprice-booking` with an out-of-branch booking id → 403.
- Super admin: switch between the three branches, view combined totals, compare branches, manage staff.
- Deactivated staff cannot read any operational data.
- Walk-in created by Abbotsford staff → `location_id` Abbotsford, `processed_by` set, audit row written.
- Regression: customer search, booking, payment, confirmation, agreement, self-service rental management all unchanged (guest and logged-in).
- Financial regression: revenue totals per branch sum to today's company total; no invoice or payment amount changes.

## 10. Rollout strategy

Ship phases 1–3 with enforcement off (all current admins stay Super Admin) and validate against production data read-only. Then enable the edge-function guard, confirm ops flows for a day, then apply RLS tightening. Only after that, convert individual accounts to `manager` one branch at a time, starting with Abbotsford. Keep a documented rollback: re-grant `super_admin` to an account, plus one pre-written migration that restores today's 128 permissive policies verbatim (the project is forward-only — there is no automatic down-migration, so this file must be written in advance).

## 11. Decisions (confirmed)

1. Exactly two admin roles: `super_admin` and `manager`. `staff`, `cleaner`, `finance`, `support` are retired; `driver` stays only because it gates the separate delivery portal.
2. One-way rentals: the drop-off branch sees the rental **read-only**; only the pickup branch and Super Admin can edit it.
3. Staff creation, deactivation, location reassignment and role changes are **Super Admin only**, for any branch. Managers have no staff-management access.
4. Two Super Admin accounts to be created in Phase 5 (or immediately, if you want them before the rest ships):
   - Shanky@c2crental.ca
   - Hilal@c2crental.ca

   Both get `super_admin` plus a `staff_assignments` row with no fixed branch. For security, each account is created with a temporary password and must set its own password through the existing "Forgot password" / account-setup email before first use — passwords are never stored in the codebase or in the plan. If the account already exists, only the role is granted.

## 12. Impact on current rental operations

Direct answer: **no booking, rental or financial data changes, and no interruption to live operations**, provided the phase order is respected.

- Booking, payment, invoice, receipt, deposit and agreement rows are never rewritten. The only writes to `bookings` are the new nullable accountability columns (`processed_by`, `processed_at`, `closed_by`, `last_modified_by`) — no money, status, date or vehicle field is touched.
- Phases 1–3 are purely additive: new table, new nullable columns, new helper functions, new UI. Nothing existing is removed, so any in-flight pickup, handover or return continues to work exactly as it does today.
- Every current admin becomes `super_admin` at cutover, so no one loses access when the tighter RLS lands in Phase 4. Conversion to branch-scoped `manager` happens only when you ask, one account at a time.
- The one real risk is Phase 4 (RLS tightening): a `manager` account without a `staff_assignments` row would see nothing. Mitigation: the migration asserts every role holder has an assignment before the policies are swapped, and the swap is a single migration with a pre-written rollback to the current permissive policies.
- Second smaller risk: the 8 vehicle units with no `location_id` would be invisible to branch managers. They get assigned first, from the confirmed list above — all 8 are retired, so no live rental is affected.
- Customer side is untouched: customer-facing policies (`auth.uid() = user_id`), the booking funnel, pricing, payments and notifications are not modified.
- Recommended timing for Phase 4: outside counter hours, with a spot check of a live active rental immediately afterwards.

