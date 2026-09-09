ALTER TABLE public.booking_additional_drivers
  ADD COLUMN IF NOT EXISTS driver_license_number text,
  ADD COLUMN IF NOT EXISTS driver_license_expiry date,
  ADD COLUMN IF NOT EXISTS authorized_start timestamptz,
  ADD COLUMN IF NOT EXISTS authorized_end timestamptz,
  ADD COLUMN IF NOT EXISTS authorized_days integer;

COMMENT ON COLUMN public.booking_additional_drivers.authorized_start IS 'Start of the window this additional driver is authorised to drive; NULL = whole rental';
COMMENT ON COLUMN public.booking_additional_drivers.authorized_end IS 'End of the window this additional driver is authorised to drive; NULL = whole rental';
COMMENT ON COLUMN public.booking_additional_drivers.authorized_days IS 'Billable days for this driver when shorter than the rental';