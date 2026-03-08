UPDATE public.bookings
SET account_closed_at = NULL,
    account_closed_by = NULL,
    final_invoice_generated = NULL,
    final_invoice_id = NULL
WHERE id = '131595a7-2aaa-4104-ab3c-dbf07128c85c';