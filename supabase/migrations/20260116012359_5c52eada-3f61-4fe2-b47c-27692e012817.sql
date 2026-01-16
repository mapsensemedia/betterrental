-- Create deposit_jobs table for queued deposit operations (prevents race conditions)
CREATE TABLE public.deposit_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  job_type TEXT NOT NULL CHECK (job_type IN ('release', 'withhold', 'partial_release')),
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for job processing
CREATE INDEX idx_deposit_jobs_status ON public.deposit_jobs(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_deposit_jobs_booking ON public.deposit_jobs(booking_id);
CREATE INDEX idx_deposit_jobs_created ON public.deposit_jobs(created_at);

-- Add unique constraint to prevent duplicate jobs
CREATE UNIQUE INDEX idx_deposit_jobs_unique_pending ON public.deposit_jobs(booking_id, job_type) 
  WHERE status IN ('pending', 'processing');

-- Create stripe_webhook_events table for idempotency
CREATE TABLE public.stripe_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  booking_id UUID REFERENCES public.bookings(id),
  payload_hash TEXT,
  result JSONB
);

-- Index for fast lookups
CREATE INDEX idx_stripe_events_event_id ON public.stripe_webhook_events(event_id);
CREATE INDEX idx_stripe_events_created ON public.stripe_webhook_events(processed_at);

-- Enable RLS
ALTER TABLE public.deposit_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS policies - admin/staff only
CREATE POLICY "Staff can view deposit jobs" ON public.deposit_jobs
  FOR SELECT USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can manage deposit jobs" ON public.deposit_jobs
  FOR ALL USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can view webhook events" ON public.stripe_webhook_events
  FOR SELECT USING (public.is_admin_or_staff(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_deposit_jobs_updated_at
  BEFORE UPDATE ON public.deposit_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.deposit_jobs IS 'Queued deposit operations to prevent race conditions and ensure reliable processing';
COMMENT ON TABLE public.stripe_webhook_events IS 'Stripe webhook event idempotency tracking';