-- Add driver age band and young driver fee columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS driver_age_band TEXT CHECK (driver_age_band IN ('21_25', '25_70')),
ADD COLUMN IF NOT EXISTS young_driver_fee NUMERIC DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.driver_age_band IS 'Driver age band: 21_25 for 21-25 years, 25_70 for 25-70 years';
COMMENT ON COLUMN public.bookings.young_driver_fee IS 'One-time young driver fee applied if driver is 21-25 ($20)';