
-- D92HPVQB: Replace cash $198.62 row with real card payment Worldline txn 10000407 (Henrik Ngo, MC 8212)
DELETE FROM public.payments WHERE transaction_id = 'CASH-D92HPVQB-20260528';

INSERT INTO public.payments (booking_id, user_id, amount, payment_method, payment_type, status, transaction_id, created_at)
SELECT b.id, b.user_id, 198.62, 'card', 'rental', 'completed', '10000407', '2026-05-26T08:24:10.834628+00:00'
FROM public.bookings b WHERE b.booking_code = 'D92HPVQB';

-- D92HPVQB: invoice fully paid (397.27 + 198.62 = 595.89)
UPDATE public.final_invoices
SET payments_received = 595.89, amount_due = 0, status = 'paid', updated_at = now()
WHERE invoice_number = 'INV-2026-01123';

-- UCTQZFCX: cash $251.98 is a duplicate — card 10000336 was completed by PAC 10000412 on 2026-05-26
DELETE FROM public.payments WHERE transaction_id = 'CASH-UCTQZFCX-20260528';

UPDATE public.final_invoices
SET payments_received = 251.98, amount_due = 0, status = 'paid', updated_at = now()
WHERE invoice_number = 'INV-2026-01111';

-- RNDMD2GQ: card 10000387 already collected $171.18; sync invoice
UPDATE public.final_invoices
SET payments_received = 171.18, amount_due = 0, status = 'paid', updated_at = now()
WHERE invoice_number = 'INV-2026-01121';
