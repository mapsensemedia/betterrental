
ALTER TABLE public.bookings 
  ADD COLUMN return_location_id UUID REFERENCES public.locations(id),
  ADD COLUMN different_dropoff_fee NUMERIC DEFAULT 0;
