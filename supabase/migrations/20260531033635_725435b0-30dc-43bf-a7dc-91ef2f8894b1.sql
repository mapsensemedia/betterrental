INSERT INTO public.payments (booking_id, user_id, amount, payment_method, payment_type, status, transaction_id, created_at)
SELECT b.id, b.user_id, 112.55, 'card', 'rental', 'completed', '10000406', '2026-05-26T09:21:54.827291+00:00'
FROM public.bookings b
WHERE b.booking_code = 'P455Y39D';