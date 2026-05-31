
DELETE FROM public.payments WHERE transaction_id = 'CASH-ZB5NSXJJ-20260528';

INSERT INTO public.payments (
  booking_id, user_id, amount, payment_type, status, payment_method, transaction_id, created_at
)
SELECT '7825fa05-a783-4415-916e-b131f88da6a1', b.user_id, 305.03, 'rental', 'completed', 'card',
       '10000272', '2026-05-13T13:03:47.234368+00:00'
FROM public.bookings b WHERE b.id = '7825fa05-a783-4415-916e-b131f88da6a1';

UPDATE public.final_invoices SET payments_received = 526.79, amount_due = 0, status = 'paid', updated_at = now() WHERE invoice_number = 'INV-2026-01093';
UPDATE public.final_invoices SET payments_received = 147.66, amount_due = 0, status = 'paid', updated_at = now() WHERE invoice_number = 'INV-2026-01076';
UPDATE public.final_invoices SET payments_received = 192.06, amount_due = 0, status = 'paid', updated_at = now() WHERE invoice_number = 'INV-2026-01067';
UPDATE public.final_invoices SET payments_received = 95.74,  amount_due = 0, status = 'paid', updated_at = now() WHERE invoice_number = 'INV-2026-01072';
UPDATE public.final_invoices SET payments_received = 106.07, amount_due = 0, status = 'paid', updated_at = now() WHERE invoice_number = 'INV-2026-01071';
