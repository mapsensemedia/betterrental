
-- More robust role detection for service_role in Edge Functions
-- Uses multiple detection methods to handle PostgREST session semantics

CREATE OR REPLACE FUNCTION public.enforce_addon_price_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text := current_setting('request.jwt.claim.role', true);
  pg_role text := current_setting('role', true);
  sess_role text := session_user;
BEGIN
  -- Allow if ANY role indicator matches service_role / admin
  IF jwt_role = 'service_role' 
     OR pg_role = 'service_role' 
     OR pg_role = 'supabase_admin' 
     OR pg_role = 'postgres'
     OR sess_role = 'service_role'
     OR sess_role = 'supabase_admin'
     OR sess_role = 'postgres'
     OR current_user = 'service_role'
     OR current_user = 'supabase_admin'
     OR current_user = 'postgres'
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.price IS NOT NULL AND NEW.price != 0 THEN
    RAISE EXCEPTION 'Price cannot be set by non-service roles (jwt=%, pg=%, sess=%, cur=%). Use server-side pricing.', jwt_role, pg_role, sess_role, current_user;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.price IS DISTINCT FROM OLD.price THEN
    RAISE EXCEPTION 'Price cannot be modified by non-service roles.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_driver_fee_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text := current_setting('request.jwt.claim.role', true);
  pg_role text := current_setting('role', true);
  sess_role text := session_user;
BEGIN
  IF jwt_role = 'service_role' 
     OR pg_role = 'service_role' 
     OR pg_role = 'supabase_admin' 
     OR pg_role = 'postgres'
     OR sess_role = 'service_role'
     OR sess_role = 'supabase_admin'
     OR sess_role = 'postgres'
     OR current_user = 'service_role'
     OR current_user = 'supabase_admin'
     OR current_user = 'postgres'
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.young_driver_fee IS NOT NULL AND NEW.young_driver_fee != 0 THEN
    RAISE EXCEPTION 'Young driver fee cannot be set by non-service roles (jwt=%, pg=%, sess=%, cur=%). Use server-side pricing.', jwt_role, pg_role, sess_role, current_user;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.young_driver_fee IS DISTINCT FROM OLD.young_driver_fee THEN
    RAISE EXCEPTION 'Young driver fee cannot be modified by non-service roles.';
  END IF;
  RETURN NEW;
END;
$$;

-- Also update the booking insert/update triggers with same robust check
CREATE OR REPLACE FUNCTION public.block_sensitive_booking_inserts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text := current_setting('request.jwt.claim.role', true);
  pg_role text := current_setting('role', true);
  sess_role text := session_user;
BEGIN
  IF jwt_role = 'service_role' 
     OR pg_role = 'service_role' 
     OR pg_role = 'supabase_admin' 
     OR pg_role = 'postgres'
     OR sess_role = 'service_role'
     OR sess_role = 'supabase_admin'
     OR sess_role = 'postgres'
     OR current_user = 'service_role'
     OR current_user = 'supabase_admin'
     OR current_user = 'postgres'
  THEN
    RETURN NEW;
  END IF;

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
    RAISE EXCEPTION 'Booking financial fields can only be set via service_role (jwt=%, pg=%, sess=%, cur=%)', jwt_role, pg_role, sess_role, current_user;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.block_sensitive_booking_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text := current_setting('request.jwt.claim.role', true);
  pg_role text := current_setting('role', true);
  sess_role text := session_user;
BEGIN
  IF jwt_role = 'service_role' 
     OR pg_role = 'service_role' 
     OR pg_role = 'supabase_admin' 
     OR pg_role = 'postgres'
     OR sess_role = 'service_role'
     OR sess_role = 'supabase_admin'
     OR sess_role = 'postgres'
     OR current_user = 'service_role'
     OR current_user = 'supabase_admin'
     OR current_user = 'postgres'
  THEN
    RETURN NEW;
  END IF;

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
    RAISE EXCEPTION 'Client updates to booking financial/status fields are not allowed (jwt=%, pg=%, sess=%, cur=%)', jwt_role, pg_role, sess_role, current_user;
  END IF;

  RETURN NEW;
END;
$$;
