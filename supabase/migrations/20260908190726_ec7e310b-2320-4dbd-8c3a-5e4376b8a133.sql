ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS promo_discount numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS bookings_promo_code_idx ON public.bookings (promo_code) WHERE promo_code IS NOT NULL;