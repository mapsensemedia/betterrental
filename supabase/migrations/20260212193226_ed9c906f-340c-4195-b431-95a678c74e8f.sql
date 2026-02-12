CREATE INDEX IF NOT EXISTS idx_booking_access_tokens_booking_expires
  ON public.booking_access_tokens (booking_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_booking_access_tokens_token_hash
  ON public.booking_access_tokens (token_hash);