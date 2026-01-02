-- Create table for OTP verification
CREATE TABLE public.booking_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  otp_hash TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.booking_otps ENABLE ROW LEVEL SECURITY;

-- Users can view their own OTPs
CREATE POLICY "Users can view their own OTPs"
ON public.booking_otps
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert OTPs (edge functions)
CREATE POLICY "Service role can insert OTPs"
ON public.booking_otps
FOR INSERT
WITH CHECK (true);

-- Service role can update OTPs (for verification attempts)
CREATE POLICY "Service role can update OTPs"
ON public.booking_otps
FOR UPDATE
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_booking_otps_booking_id ON public.booking_otps(booking_id);
CREATE INDEX idx_booking_otps_expires_at ON public.booking_otps(expires_at);