# Roadmap — Location-Based Business Units

Approved plan: `.lovable/plan/location-based-business-units-abbotsford-langley-surrey-2026-09-03.md`

Roles: exactly two — `super_admin` (all branches) and `manager` (one branch). `driver` kept only for the delivery portal.

## Phase 1 — Foundations — DONE
- [x] `app_role` extended with `super_admin`, `manager`
- [x] `staff_assignments` table + GRANTs + RLS, helper functions (`is_super_admin`, `staff_location`, `can_access_location`, `is_active_staff`)
- [x] Accountability columns on `bookings`, location columns on `audit_logs`, location indexes, payments location backfill
- [x] Role model in code: `src/auth/capabilities.ts`, `use-admin.ts`, edge-function role arrays

## Phase 2 — Attribution — DONE
- [x] `processed_by` / `processed_at` / `activated_by` / `handed_over_by` stamped by staff edge functions
- [x] Processed By + Activity History UI on Active Rental detail
- [x] Same block on the Ops handover / booking-ops screen, showing staff name + staff ID + branch, visible to all staff
- [x] Staff IDs backfilled (SUR-###, LAN-###, ABB-###, HQ-###)
- [ ] `closed_by` is still never stamped (0 rows) — close/force-close paths to set it

## Phase 3 — Scoping (read) — DONE
- [x] `useStaffLocation()` + `LocationScopeProvider` + persistent super-admin branch switcher
- [x] Branch scope applied to Bookings, Pickups, Returns, Active Rentals, Finance, Reports/Analytics, Calendar, Agreements, Inventory/Fleet (categories, all vehicles, temporary), Fleet Costs, Fleet Analytics, Incidents, Damages, Support (lists, counts, analytics) and the whole Ops panel
- [x] Duplicate per-page branch selectors removed; managers cannot widen scope via URL

## Phase 4 — Enforcement — PARTIAL
- [x] `supabase/functions/_shared/location-guard.ts`
- [x] Guard wired into 13 staff-invoked edge functions (booking/financial writes, walk-in creation, upsell extras)
- [ ] Remaining staff-invoked functions (reporting/export/notification helpers) still unguarded
- [ ] RLS policy replacement so the database itself enforces branch scope (last step, with rollback migration)

## Phase 5 — Staff management — DONE
- [x] `/admin/staff` page + `manage-staff` edge function (list, create with password, edit, branch assign/change, activate/deactivate, delete, setup email)
- [x] Roster reset to the 8 current accounts (2 super admins, 6 branch managers)

## Phase 6 — Reporting — NOT STARTED
- [ ] Super-admin multi-branch comparison view (side-by-side branch P&L / utilization) + company-wide totals alongside per-branch totals

## Remaining work (in order)
1. RLS branch enforcement + rollback migration (Phase 4)
2. Guard the remaining staff edge functions (Phase 4)
3. Stamp `closed_by` on close / force-close (Phase 2 tail)
4. Multi-branch comparison reporting (Phase 6)
