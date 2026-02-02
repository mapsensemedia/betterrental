-- Add card info columns to bookings table
-- Note: We only store last 4 digits and card type for display purposes, never full card numbers

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS card_last_four VARCHAR(4),
ADD COLUMN IF NOT EXISTS card_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS card_holder_name VARCHAR(255);

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_bookings_card_last_four ON public.bookings(card_last_four) WHERE card_last_four IS NOT NULL;