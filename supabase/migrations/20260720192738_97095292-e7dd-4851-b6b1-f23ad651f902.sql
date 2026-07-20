
DO $$
DECLARE
  v_booking_id uuid;
  v_old jsonb;
BEGIN
  SELECT id INTO v_booking_id FROM public.bookings WHERE booking_code = 'SEE8QAKY';
  IF v_booking_id IS NULL THEN RAISE EXCEPTION 'Booking SEE8QAKY not found'; END IF;

  SELECT jsonb_build_object(
    'account_closed_at', account_closed_at,
    'account_closed_by', account_closed_by,
    'final_invoice_generated', final_invoice_generated,
    'final_invoice_id', final_invoice_id
  ) INTO v_old FROM public.bookings WHERE id = v_booking_id;

  UPDATE public.bookings
  SET account_closed_at = NULL,
      account_closed_by = NULL,
      final_invoice_generated = false,
      final_invoice_id = NULL,
      updated_at = now()
  WHERE id = v_booking_id;

  INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, new_data)
  VALUES (
    'reopen_cleanup_account_close_fields',
    'booking',
    v_booking_id,
    v_old,
    jsonb_build_object('reason', 'Cleared stale close fields left over from premature close on 2026-07-14 so Close Rental can be re-run after reopen.')
  );
END $$;
