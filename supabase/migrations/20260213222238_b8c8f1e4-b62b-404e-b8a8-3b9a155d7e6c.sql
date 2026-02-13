
-- 1) BEFORE INSERT trigger: block financial columns unless service_role
CREATE OR REPLACE FUNCTION public.block_sensitive_booking_inserts()
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

  -- Block inserts that set financial/status columns from client contexts
  IF (
    NEW.status IS DISTINCT FROM 'draft'
    OR COALESCE(NEW.subtotal, 0) != 0
    OR COALESCE(NEW.tax_amount, 0) != 0
    OR COALESCE(NEW.total_amount, 0) != 0
    OR COALESCE(NEW.deposit_amount, 0) != 0
    OR COALESCE(NEW.delivery_fee, 0) != 0
    OR COALESCE(NEW.different_dropoff_fee, 0) != 0
    OR COALESCE(NEW.upgrade_daily_fee, 0) != 0
    OR COALESCE(NEW.young_driver_fee, 0) != 0
    OR COALESCE(NEW.daily_rate, 0) != 0
  ) THEN
    RAISE EXCEPTION 'Booking financial fields can only be set via service_role';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_sensitive_booking_inserts ON public.bookings;

CREATE TRIGGER trg_block_sensitive_booking_inserts
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.block_sensitive_booking_inserts();

-- 2) Remove the policy that lets normal users insert bookings directly
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
