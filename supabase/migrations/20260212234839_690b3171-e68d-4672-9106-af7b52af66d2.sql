
-- 0) Force RLS on high-integrity tables
ALTER TABLE public.bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

-- 1) Remove overly broad user UPDATE policy on bookings
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;

-- 2) Remove user INSERT policy on payments (ledger = server-only)
DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;

-- 3) Replace staff ALL policy on payments with granular INSERT + UPDATE (no DELETE)
DROP POLICY IF EXISTS "Admin staff can manage payments" ON public.payments;

CREATE POLICY "Admin staff can insert payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can update payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (is_admin_or_staff(auth.uid()))
WITH CHECK (is_admin_or_staff(auth.uid()));

-- 4A) Trigger function: block sensitive column updates unless service_role
CREATE OR REPLACE FUNCTION public.block_sensitive_booking_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- Allow service_role (edge functions, webhooks, DB functions)
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block updates to sensitive fields from client contexts
  IF (
    NEW.status IS DISTINCT FROM OLD.status
    OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
    OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
    OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
    OR NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount
    OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
    OR NEW.different_dropoff_fee IS DISTINCT FROM OLD.different_dropoff_fee
    OR NEW.upgrade_daily_fee IS DISTINCT FROM OLD.upgrade_daily_fee
    OR NEW.young_driver_fee IS DISTINCT FROM OLD.young_driver_fee
    OR NEW.daily_rate IS DISTINCT FROM OLD.daily_rate
  ) THEN
    RAISE EXCEPTION 'Client updates to booking financial/status fields are not allowed';
  END IF;

  RETURN NEW;
END;
$$;

-- 4B) Attach trigger
DROP TRIGGER IF EXISTS trg_block_sensitive_booking_updates ON public.bookings;

CREATE TRIGGER trg_block_sensitive_booking_updates
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.block_sensitive_booking_updates();
