-- Close booking 4JCKCRNF at original due date (customer returned on time)
UPDATE public.bookings
SET status = 'completed',
    actual_return_at = end_at,
    account_closed_at = COALESCE(account_closed_at, now()),
    updated_at = now()
WHERE id = '80a314a4-219c-41d4-a72f-940ce284c28a';

INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, old_data, new_data)
VALUES (
  'booking_manual_close',
  'booking',
  '80a314a4-219c-41d4-a72f-940ce284c28a',
  NULL,
  jsonb_build_object('status','active','actual_return_at','2026-05-20 00:01:55.126+00'),
  jsonb_build_object('status','completed','actual_return_at','2026-05-20 00:00:00+00','reason','Customer returned on time; closing at original due date. Return workflow (all 4 steps) already complete, deposit released, unit available.')
);