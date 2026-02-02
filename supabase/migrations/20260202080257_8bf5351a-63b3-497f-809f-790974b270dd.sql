
-- Add columns for category upgrade tracking
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS original_vehicle_id UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS upgraded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS upgraded_by UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS upgrade_reason TEXT;

-- Index for tracking upgrades
CREATE INDEX IF NOT EXISTS idx_bookings_upgraded ON public.bookings (upgraded_at) WHERE upgraded_at IS NOT NULL;

-- Add fuel pricing to add_ons - need to store this as a calculated price per liter
COMMENT ON COLUMN add_ons.daily_rate IS 'For fuel add-on, this represents the per-liter rate discount (e.g., 0.05 for 5 cents below market)';
