-- Drop the old foreign key constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_vehicle_id_fkey;