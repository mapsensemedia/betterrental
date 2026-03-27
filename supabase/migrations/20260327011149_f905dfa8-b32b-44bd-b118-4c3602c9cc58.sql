
-- Drop the old FK that points to vehicles table
ALTER TABLE public.damage_reports DROP CONSTRAINT IF EXISTS damage_reports_vehicle_id_fkey;

-- Add new FK pointing to vehicle_categories (which is what bookings.vehicle_id references)
ALTER TABLE public.damage_reports
  ADD CONSTRAINT damage_reports_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES public.vehicle_categories(id);
