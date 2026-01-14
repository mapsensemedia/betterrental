-- Add driver's license fields to profiles table for ONE-TIME document storage
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS driver_license_status text DEFAULT 'missing' CHECK (driver_license_status IN ('missing', 'on_file', 'expired')),
ADD COLUMN IF NOT EXISTS driver_license_front_url text,
ADD COLUMN IF NOT EXISTS driver_license_back_url text,
ADD COLUMN IF NOT EXISTS driver_license_expiry date,
ADD COLUMN IF NOT EXISTS driver_license_uploaded_at timestamptz,
ADD COLUMN IF NOT EXISTS driver_license_reviewed_by uuid,
ADD COLUMN IF NOT EXISTS driver_license_reviewed_at timestamptz;

-- Add handover tracking fields to bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS handed_over_at timestamptz,
ADD COLUMN IF NOT EXISTS handed_over_by uuid,
ADD COLUMN IF NOT EXISTS handover_sms_sent_at timestamptz;

-- Add agreement_signed_manually field
ALTER TABLE public.rental_agreements
ADD COLUMN IF NOT EXISTS signed_manually boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS signed_manually_by uuid,
ADD COLUMN IF NOT EXISTS signed_manually_at timestamptz;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_driver_license_status ON public.profiles(driver_license_status);
CREATE INDEX IF NOT EXISTS idx_bookings_handed_over_at ON public.bookings(handed_over_at);