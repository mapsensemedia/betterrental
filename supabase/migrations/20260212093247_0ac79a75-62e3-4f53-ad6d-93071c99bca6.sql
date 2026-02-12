
-- Add used_at, revoked_at columns to booking_access_tokens
ALTER TABLE public.booking_access_tokens
  ADD COLUMN IF NOT EXISTS used_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz NULL;

-- Unique constraint on (booking_id, token_hash)
ALTER TABLE public.booking_access_tokens
  ADD CONSTRAINT booking_access_tokens_booking_token_unique UNIQUE (booking_id, token_hash);

-- Index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_booking_access_tokens_expires_at
  ON public.booking_access_tokens (expires_at);
