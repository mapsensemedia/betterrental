-- Add assigned_driver_id to bookings for delivery driver assignment
ALTER TABLE public.bookings 
ADD COLUMN assigned_driver_id UUID REFERENCES auth.users(id);

-- Add comment for clarity
COMMENT ON COLUMN public.bookings.assigned_driver_id IS 'Staff user ID assigned to deliver the vehicle for delivery bookings';