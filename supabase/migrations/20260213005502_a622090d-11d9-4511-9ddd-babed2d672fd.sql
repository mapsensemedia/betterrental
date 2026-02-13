CREATE UNIQUE INDEX IF NOT EXISTS ux_booking_access_tokens_one_unrevoked
ON public.booking_access_tokens(booking_id)
WHERE revoked_at IS NULL;