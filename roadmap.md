# Roadmap — Location-Based Business Units

Approved plan: `.lovable/plan/location-based-business-units-abbotsford-langley-surrey-2026-09-03.md`

Roles: exactly two — `super_admin` (all branches) and `manager` (one branch). `driver` kept only for the delivery portal.

## Phase 1 — Foundations
- [ ] Migration A: `ALTER TYPE app_role ADD VALUE 'super_admin'`, `'manager'` (own migration)
- [ ] Migration B: `staff_assignments` table + GRANTs + RLS, helper functions (`is_super_admin`, `staff_location`, `can_access_location`, `is_active_staff`), accountability columns on `bookings`, audit_logs location columns, location indexes, payments location backfill, staff assignment backfill

## Phase 2 — Attribution
- [ ] Stamp `processed_by` / `processed_at` / `closed_by` in staff edge functions
- [ ] Processed By + Activity History UI on booking / active rental detail

## Phase 3 — Scoping (read)
- [ ] `LocationScopeProvider` + `useStaffLocation()`; super-admin location switcher (URL state)
- [ ] Apply scope filter across admin hooks/pages

## Phase 4 — Enforcement
- [ ] `_shared/location-guard.ts` + guard every staff-invoked edge function
- [ ] RLS policy replacement (last), with pre-written rollback migration

## Phase 5 — Staff management
- [ ] `/admin/staff` page + `manage-staff` edge function
- [ ] Create super admins Shanky@c2crental.ca and Hilal@c2crental.ca

## Phase 6 — Reporting
- [ ] Super-admin multi-location comparison + company-wide totals
