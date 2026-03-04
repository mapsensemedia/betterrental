
-- Add separate deposit transaction tracking columns
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS wl_deposit_transaction_id text,
  ADD COLUMN IF NOT EXISTS wl_deposit_auth_status text;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.wl_deposit_transaction_id IS 'Worldline transaction ID for deposit pre-auth (separate from rental wl_transaction_id)';
COMMENT ON COLUMN public.bookings.wl_deposit_auth_status IS 'Auth status of deposit hold: authorized, captured, released, cancelled';
