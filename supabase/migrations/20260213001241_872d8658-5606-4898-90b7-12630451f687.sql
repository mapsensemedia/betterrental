
-- =====================================================
-- PRIORITY 1: Replace staff ALL policies with granular (no DELETE)
-- PRIORITY 2: Lock user-writable money columns + remove user DELETE
-- =====================================================

-- ─── deposit_ledger ───
DROP POLICY IF EXISTS "Admin staff can manage deposit ledger" ON public.deposit_ledger;

CREATE POLICY "Staff can insert deposit ledger"
ON public.deposit_ledger FOR INSERT TO authenticated
WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can update deposit ledger"
ON public.deposit_ledger FOR UPDATE TO authenticated
USING (is_admin_or_staff(auth.uid()))
WITH CHECK (is_admin_or_staff(auth.uid()));

-- ─── damage_reports ───
DROP POLICY IF EXISTS "Admin staff can manage damages" ON public.damage_reports;

CREATE POLICY "Staff can insert damage reports"
ON public.damage_reports FOR INSERT TO authenticated
WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can update damage reports"
ON public.damage_reports FOR UPDATE TO authenticated
USING (is_admin_or_staff(auth.uid()))
WITH CHECK (is_admin_or_staff(auth.uid()));

-- ─── incident_cases ───
DROP POLICY IF EXISTS "Admin staff can manage incident cases" ON public.incident_cases;

CREATE POLICY "Staff can insert incident cases"
ON public.incident_cases FOR INSERT TO authenticated
WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can update incident cases"
ON public.incident_cases FOR UPDATE TO authenticated
USING (is_admin_or_staff(auth.uid()))
WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can select incident cases"
ON public.incident_cases FOR SELECT TO authenticated
USING (is_admin_or_staff(auth.uid()));

-- ─── incident_repairs ───
DROP POLICY IF EXISTS "Admin staff can manage incident repairs" ON public.incident_repairs;

CREATE POLICY "Staff can insert incident repairs"
ON public.incident_repairs FOR INSERT TO authenticated
WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can update incident repairs"
ON public.incident_repairs FOR UPDATE TO authenticated
USING (is_admin_or_staff(auth.uid()))
WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can select incident repairs"
ON public.incident_repairs FOR SELECT TO authenticated
USING (is_admin_or_staff(auth.uid()));

-- ─── maintenance_logs ───
DROP POLICY IF EXISTS "Admin staff can manage maintenance logs" ON public.maintenance_logs;

CREATE POLICY "Staff can insert maintenance logs"
ON public.maintenance_logs FOR INSERT TO authenticated
WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can update maintenance logs"
ON public.maintenance_logs FOR UPDATE TO authenticated
USING (is_admin_or_staff(auth.uid()))
WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can select maintenance logs"
ON public.maintenance_logs FOR SELECT TO authenticated
USING (is_admin_or_staff(auth.uid()));

-- ─── booking_additional_drivers ───
DROP POLICY IF EXISTS "Admin staff can manage all additional drivers" ON public.booking_additional_drivers;

CREATE POLICY "Staff can insert additional drivers"
ON public.booking_additional_drivers FOR INSERT TO authenticated
WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can update additional drivers"
ON public.booking_additional_drivers FOR UPDATE TO authenticated
USING (is_admin_or_staff(auth.uid()))
WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can select additional drivers"
ON public.booking_additional_drivers FOR SELECT TO authenticated
USING (is_admin_or_staff(auth.uid()));

-- ─── booking_add_ons: remove user DELETE ───
DROP POLICY IF EXISTS "Users can delete their own booking add-ons" ON public.booking_add_ons;
DROP POLICY IF EXISTS "Admin staff can delete booking add-ons" ON public.booking_add_ons;

-- ─── PRIORITY 2: Triggers to enforce server-derived money fields ───

-- Trigger: booking_add_ons.price must come from add_ons.daily_rate (non-service-role)
CREATE OR REPLACE FUNCTION public.enforce_addon_price()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For non-service-role: zero out the price; server will fill it
  NEW.price := 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_addon_price ON public.booking_add_ons;
CREATE TRIGGER trg_enforce_addon_price
BEFORE INSERT OR UPDATE ON public.booking_add_ons
FOR EACH ROW
EXECUTE FUNCTION public.enforce_addon_price();

-- Trigger: booking_additional_drivers.young_driver_fee must be server-derived
CREATE OR REPLACE FUNCTION public.enforce_driver_fee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.young_driver_fee := 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_driver_fee ON public.booking_additional_drivers;
CREATE TRIGGER trg_enforce_driver_fee
BEFORE INSERT OR UPDATE ON public.booking_additional_drivers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_driver_fee();

-- ─── PRIORITY 4: DB-backed rate limit table for OTP ───
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count int NOT NULL DEFAULT 1,
  window_seconds int NOT NULL DEFAULT 600,
  max_requests int NOT NULL DEFAULT 5,
  UNIQUE(key)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No client policies — service-role only

-- Cleanup function for expired windows
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $$
  DELETE FROM public.rate_limits
  WHERE window_start + (window_seconds || ' seconds')::interval < now();
$$;
