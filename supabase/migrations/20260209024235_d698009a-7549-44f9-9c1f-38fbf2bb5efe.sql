-- Add protection_plan column to bookings table to persist which protection package was selected
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS protection_plan text DEFAULT 'none';

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.protection_plan IS 'Protection package ID: none, basic, smart, premium';