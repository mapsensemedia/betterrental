
-- 1) FORCE RLS on internal auth tables (service-role only, zero client policies)
ALTER TABLE public.booking_access_tokens FORCE ROW LEVEL SECURITY;
-- rate_limits already forced in prior migration, but idempotent:
ALTER TABLE public.rate_limits FORCE ROW LEVEL SECURITY;

-- 2) Index for token hash lookups
CREATE INDEX IF NOT EXISTS idx_booking_access_tokens_hash
ON public.booking_access_tokens(token_hash);

-- 3) Enable pg_cron and pg_net for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
