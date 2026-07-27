ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS overbooked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS overbooked_at timestamptz;