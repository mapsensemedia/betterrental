-- Remove the terminal payment record
DELETE FROM public.payments WHERE id = 'd2a67a6b-d976-4d02-a17b-b52c9ccac251';

-- Reset the booking's transaction reference back to unpaid state
UPDATE public.bookings 
SET wl_transaction_id = NULL,
    wl_auth_status = NULL,
    status = 'draft',
    updated_at = now()
WHERE id = '835248a1-380f-4818-9253-4c9d8e0a757b';