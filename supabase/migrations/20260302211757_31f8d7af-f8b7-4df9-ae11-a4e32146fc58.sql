
-- Add Worldline columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS wl_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS wl_auth_status TEXT,
  ADD COLUMN IF NOT EXISTS wl_profile_customer_code TEXT;

-- Create payment_profiles table
CREATE TABLE IF NOT EXISTS public.payment_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  worldline_customer_code TEXT NOT NULL,
  card_last_four TEXT,
  card_type TEXT,
  card_expiry_month INTEGER,
  card_expiry_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, worldline_customer_code)
);

ALTER TABLE public.payment_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment profiles
CREATE POLICY "Users can view own payment profiles"
  ON public.payment_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role manages all payment profiles (via edge functions)
CREATE POLICY "Service role manages payment profiles"
  ON public.payment_profiles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Create webhook_events table for idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'worldline',
  booking_id UUID REFERENCES public.bookings(id),
  payload_hash TEXT,
  result JSONB,
  processed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only webhook events"
  ON public.webhook_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Add updated_at trigger for payment_profiles
CREATE TRIGGER update_payment_profiles_updated_at
  BEFORE UPDATE ON public.payment_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
