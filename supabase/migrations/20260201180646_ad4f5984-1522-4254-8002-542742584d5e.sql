-- Create table to store additional drivers for bookings
CREATE TABLE public.booking_additional_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  driver_name TEXT,
  driver_age_band TEXT NOT NULL CHECK (driver_age_band IN ('21_25', '25_70')),
  young_driver_fee NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups by booking
CREATE INDEX idx_booking_additional_drivers_booking_id ON public.booking_additional_drivers(booking_id);

-- Enable RLS
ALTER TABLE public.booking_additional_drivers ENABLE ROW LEVEL SECURITY;

-- Users can view additional drivers for their own bookings
CREATE POLICY "Users can view their own booking additional drivers"
ON public.booking_additional_drivers
FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM public.bookings WHERE user_id = auth.uid()
  )
);

-- Users can insert additional drivers for their own bookings
CREATE POLICY "Users can add additional drivers to their bookings"
ON public.booking_additional_drivers
FOR INSERT
WITH CHECK (
  booking_id IN (
    SELECT id FROM public.bookings WHERE user_id = auth.uid()
  )
);

-- Admin staff can manage all additional drivers using existing helper function
CREATE POLICY "Admin staff can manage all additional drivers"
ON public.booking_additional_drivers
FOR ALL
USING (is_admin_or_staff(auth.uid()));

-- Enable realtime for admin monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_additional_drivers;