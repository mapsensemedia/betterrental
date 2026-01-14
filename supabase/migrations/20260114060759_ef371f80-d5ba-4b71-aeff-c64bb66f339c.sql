-- Add save_time_at_counter fields to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS save_time_at_counter boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pickup_contact_name text,
ADD COLUMN IF NOT EXISTS pickup_contact_phone text,
ADD COLUMN IF NOT EXISTS special_instructions text;