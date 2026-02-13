
-- Drop redundant duplicate index on token_hash (keep the composite unique + the original idx)
DROP INDEX IF EXISTS public.idx_booking_access_tokens_hash;
