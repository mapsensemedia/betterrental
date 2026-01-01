-- Create notification_logs table for SMS and email tracking with idempotency
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  notification_type TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  user_id UUID,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Only admin/staff can view all notification logs
CREATE POLICY "Admin staff can view all notification logs"
  ON public.notification_logs
  FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

-- Users can view their own notification logs
CREATE POLICY "Users can view their own notification logs"
  ON public.notification_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (edge functions)
CREATE POLICY "Service role can insert notification logs"
  ON public.notification_logs
  FOR INSERT
  WITH CHECK (true);

-- Service role can update (edge functions)
CREATE POLICY "Service role can update notification logs"
  ON public.notification_logs
  FOR UPDATE
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_notification_logs_booking ON public.notification_logs(booking_id);
CREATE INDEX idx_notification_logs_idempotency ON public.notification_logs(idempotency_key);