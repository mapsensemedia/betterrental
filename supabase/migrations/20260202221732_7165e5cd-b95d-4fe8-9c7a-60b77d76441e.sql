-- Add booking_source column to track channel (online vs walk_in)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'online';

-- Add index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_bookings_source ON public.bookings(booking_source);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON public.bookings(status, created_at);
CREATE INDEX IF NOT EXISTS idx_booking_add_ons_booking_id ON public.booking_add_ons(booking_id);

-- Comment for clarity
COMMENT ON COLUMN public.bookings.booking_source IS 'Channel: online (customer booking) or walk_in (admin/ops created)';