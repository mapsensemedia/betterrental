-- Enable realtime for bookings table (admin_alerts is already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;