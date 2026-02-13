
-- 1) Replace "zero out" triggers with "reject" triggers on booking_add_ons
CREATE OR REPLACE FUNCTION public.enforce_addon_price_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') != 'service_role' THEN
    IF TG_OP = 'INSERT' AND NEW.price IS NOT NULL AND NEW.price != 0 THEN
      RAISE EXCEPTION 'Price cannot be set by non-service roles. Use server-side pricing.';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.price IS DISTINCT FROM OLD.price THEN
      RAISE EXCEPTION 'Price cannot be modified by non-service roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2) Replace "zero out" trigger on booking_additional_drivers
CREATE OR REPLACE FUNCTION public.enforce_driver_fee_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') != 'service_role' THEN
    IF TG_OP = 'INSERT' AND NEW.young_driver_fee IS NOT NULL AND NEW.young_driver_fee != 0 THEN
      RAISE EXCEPTION 'Young driver fee cannot be set by non-service roles. Use server-side pricing.';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.young_driver_fee IS DISTINCT FROM OLD.young_driver_fee THEN
      RAISE EXCEPTION 'Young driver fee cannot be modified by non-service roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) Add UNIQUE constraint on rate_limits.key for atomic upserts
ALTER TABLE public.rate_limits ADD CONSTRAINT rate_limits_key_unique UNIQUE (key);

-- 4) Create atomic check-and-increment RPC function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_window_seconds INT,
  p_max_requests INT
)
RETURNS TABLE(allowed BOOLEAN, remaining INT, reset_at TIMESTAMPTZ) AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ;
  v_count INT;
  v_reset TIMESTAMPTZ;
BEGIN
  -- Atomic upsert + check in single statement
  INSERT INTO public.rate_limits (key, window_start, request_count, window_seconds, max_requests)
  VALUES (p_key, v_now, 1, p_window_seconds, p_max_requests)
  ON CONFLICT (key) DO UPDATE SET
    -- Reset window if expired, otherwise increment
    window_start = CASE
      WHEN rate_limits.window_start + (rate_limits.window_seconds * interval '1 second') < v_now
      THEN v_now
      ELSE rate_limits.window_start
    END,
    request_count = CASE
      WHEN rate_limits.window_start + (rate_limits.window_seconds * interval '1 second') < v_now
      THEN 1
      ELSE rate_limits.request_count + 1
    END,
    window_seconds = p_window_seconds,
    max_requests = p_max_requests
  RETURNING
    rate_limits.request_count <= p_max_requests,
    GREATEST(p_max_requests - rate_limits.request_count, 0),
    rate_limits.window_start + (p_window_seconds * interval '1 second')
  INTO allowed, remaining, reset_at;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
