
-- Force RLS on money/ledger tables
ALTER TABLE public.booking_add_ons FORCE ROW LEVEL SECURITY;
ALTER TABLE public.booking_additional_drivers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE public.final_invoices FORCE ROW LEVEL SECURITY;

-- Drop orphaned "zero out" functions (no triggers reference these)
-- Verified via: SELECT tgname FROM pg_trigger WHERE tgfoid = 'enforce_addon_price'::regproc; → 0 rows
-- Verified via: SELECT tgname FROM pg_trigger WHERE tgfoid = 'enforce_driver_fee'::regproc; → 0 rows
DROP FUNCTION IF EXISTS public.enforce_addon_price() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_driver_fee() CASCADE;

-- Post-check (informational):
-- SELECT relname, relforcerowsecurity FROM pg_class
-- WHERE relname IN ('booking_add_ons','booking_additional_drivers','deposit_ledger','final_invoices');
-- Expected: all relforcerowsecurity = true
