
-- Drop duplicate constraint (keep the original unique index rate_limits_key_key)
ALTER TABLE public.rate_limits DROP CONSTRAINT IF EXISTS rate_limits_key_unique;
