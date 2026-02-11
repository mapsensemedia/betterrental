
-- Add upgrade and cross-category columns to bookings
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS upgrade_daily_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upgrade_category_label text,
  ADD COLUMN IF NOT EXISTS upgrade_visible_to_customer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_unit_category_id uuid REFERENCES public.vehicle_categories(id);
