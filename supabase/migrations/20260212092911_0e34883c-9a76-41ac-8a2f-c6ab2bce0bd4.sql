
-- Create booking_access_tokens table for post-OTP session tokens
CREATE TABLE public.booking_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by booking_id
CREATE INDEX idx_booking_access_tokens_booking_id ON public.booking_access_tokens(booking_id);

-- Enable RLS
ALTER TABLE public.booking_access_tokens ENABLE ROW LEVEL SECURITY;

-- No client access — only service role (edge functions) can read/write
-- No policies = no client access, service role bypasses RLS
