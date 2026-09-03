# Roadmap — Location-Based Business Units

Approved plan: `.lovable/plan/location-based-business-units-abbotsford-langley-surrey-2026-09-03.md`

Roles: exactly two — `super_admin` (all branches) and `manager` (one branch). `driver` kept only for the delivery portal.

## Phase 1 — Foundations
- [x] Migration A: `ALTER TYPE app_role ADD VALUE 'super_admin'`, `'manager'` (own migration)
- [x] Migration B: `staff_assignments` table + GRANTs + RLS, helper functions (`is_super_admin`, `staff_location`, `can_access_location`, `is_active_staff`), accountability columns on `bookings`, audit_logs location columns, location indexes, payments location backfill, staff assignment backfill
- [x] Role model in code: `src/auth/capabilities.ts`, `src/hooks/use-admin.ts`, edge-function role arrays
- [x] Legacy `staff` account (operations@c2crental.ca) converted to `manager` (branch still unassigned)

## Phase 2 — Attribution
- [ ] Stamp `processed_by` / `processed_at` / `closed_by` in staff edge functions
- [ ] Processed By + Activity History UI on booking / active rental detail

## Phase 3 — Scoping (read)
- [x] `useStaffLocation()` + `LocationScopeProvider` + super-admin switcher in `AdminShell` (URL state)
- [ ] Apply scope filter across admin hooks/pages

## Phase 4 — Enforcement
- [x] `supabase/functions/_shared/location-guard.ts`
- [ ] Wire the guard into every staff-invoked edge function
- [ ] RLS policy replacement (last), with pre-written rollback migration

## Phase 5 — Staff management
- [ ] `/admin/staff` page + `manage-staff` edge function (assign branches, deactivate)
- [x] Super admin access for sshankx@gmail.com and mohammadhilalmalik@gmail.com

## Phase 6 — Reporting
- [ ] Super-admin multi-location comparison + company-wide totals


## Completed (location enforcement pass)
- [x] Location guard on 13 staff-invoked edge functions (booking/financial writes + walk-in creation + upsell extras), deployed
- [x] Server-side branch filtering: Active Rentals, Admin Bookings/Pickups, Finance (revenue + transactions), Reports
- [x] /admin/staff page + manage-staff edge function (list, create, branch assign/change, activate/deactivate, setup email)
- [x] Processed-by + activity history block on Active Rental detail
