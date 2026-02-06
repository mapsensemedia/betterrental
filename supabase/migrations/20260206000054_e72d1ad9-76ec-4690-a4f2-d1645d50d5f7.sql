-- Drop the old incorrect check constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_driver_age_band_check;

-- Add the correct check constraint with the actual values used by the app
ALTER TABLE public.bookings ADD CONSTRAINT bookings_driver_age_band_check 
CHECK (driver_age_band = ANY (ARRAY['20_24'::text, '25_70'::text]));