-- Reopen booking 4JCKCRNF (closed by mistake) and restore it to active state
UPDATE public.bookings
SET status = 'active',
    actual_return_at = NULL,
    return_state = NULL,
    updated_at = now()
WHERE id = '80a314a4-219c-41d4-a72f-940ce284c28a'
  AND status = 'completed';

INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, new_data)
VALUES (
  'booking_reopened',
  'booking',
  '80a314a4-219c-41d4-a72f-940ce284c28a',
  jsonb_build_object('status','completed','return_state','closeout_done','actual_return_at','2026-05-19T00:00:00Z'),
  jsonb_build_object('status','active','return_state',null,'actual_return_at',null,'reason','closed by mistake - manual reopen')
);