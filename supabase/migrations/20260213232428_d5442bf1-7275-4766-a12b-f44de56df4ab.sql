
-- Fix the update trigger to use the same robust role check
CREATE OR REPLACE FUNCTION public.block_sensitive_booking_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  current_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    current_setting('role', true)
  );
BEGIN
  -- Allow service_role (edge functions, webhooks, DB functions)
  IF current_role = 'service_role' THEN
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

-- Also fix the addon and driver fee triggers
CREATE OR REPLACE FUNCTION public.enforce_addon_price_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    current_setting('role', true)
  );
BEGIN
  IF current_role != 'service_role' THEN
    IF TG_OP = 'INSERT' AND NEW.price IS NOT NULL AND NEW.price != 0 THEN
      RAISE EXCEPTION 'Price cannot be set by non-service roles. Use server-side pricing.';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.price IS DISTINCT FROM OLD.price THEN
      RAISE EXCEPTION 'Price cannot be modified by non-service roles.';
    END IF;
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
  current_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    current_setting('role', true)
  );
BEGIN
  IF current_role != 'service_role' THEN
    IF TG_OP = 'INSERT' AND NEW.young_driver_fee IS NOT NULL AND NEW.young_driver_fee != 0 THEN
      RAISE EXCEPTION 'Young driver fee cannot be set by non-service roles. Use server-side pricing.';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.young_driver_fee IS DISTINCT FROM OLD.young_driver_fee THEN
      RAISE EXCEPTION 'Young driver fee cannot be modified by non-service roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
