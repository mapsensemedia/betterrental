
-- ============================================================
-- BUNDLE 1: RLS Policy Hardening
-- Tables: booking_otps, notification_logs, vendors
-- Goal: Remove overly permissive true/public write policies
-- ============================================================

-- ========================
-- 1A) booking_otps
-- Drop dangerous INSERT/UPDATE policies that use `true`
-- OTP writes MUST go through edge functions (service role bypasses RLS)
-- Clients can only SELECT their own OTPs
-- ========================

DROP POLICY IF EXISTS "Service role can insert OTPs" ON public.booking_otps;
DROP POLICY IF EXISTS "Service role can update OTPs" ON public.booking_otps;

-- No client-side INSERT/UPDATE policies needed.
-- Service role (edge functions) bypasses RLS automatically.
-- The existing SELECT policy "Users can view their own OTPs" (auth.uid() = user_id) remains.

-- ========================
-- 1B) notification_logs
-- Same issue: true INSERT/UPDATE policies
-- Notification writes go through edge functions only
-- ========================

DROP POLICY IF EXISTS "Service role can insert notification logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Service role can update notification logs" ON public.notification_logs;

-- Existing SELECT policies remain:
-- "Admin staff can view all notification logs" (is_admin_or_staff)
-- "Users can view their own notification logs" (auth.uid() = user_id)

-- ========================
-- 1C) vendors
-- Lock all CRUD to admin/staff only
-- ========================

DROP POLICY IF EXISTS "Authenticated users can delete vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can update vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can view vendors" ON public.vendors;

CREATE POLICY "Admin staff can view vendors"
  ON public.vendors FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can insert vendors"
  ON public.vendors FOR INSERT
  WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can update vendors"
  ON public.vendors FOR UPDATE
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can delete vendors"
  ON public.vendors FOR DELETE
  USING (is_admin_or_staff(auth.uid()));
