
-- Analytics events table for centralized tracking
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  page TEXT,
  session_id TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for date-range queries
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events (created_at DESC);
-- Index for event type filtering
CREATE INDEX idx_analytics_events_event ON public.analytics_events (event);

-- RLS: allow anonymous inserts (tracking from any visitor)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admin/staff can read analytics
CREATE POLICY "Admin and staff can read analytics"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff(auth.uid()));
