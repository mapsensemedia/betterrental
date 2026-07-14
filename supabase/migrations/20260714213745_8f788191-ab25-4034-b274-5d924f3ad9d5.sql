
DO $$
DECLARE
  v_booking_id uuid := '7cd9b812-b1a6-46b2-86c4-f7fc4948b681';
  v_unit_id uuid;
  v_old_status text;
BEGIN
  SELECT status, assigned_unit_id INTO v_old_status, v_unit_id
  FROM public.bookings WHERE id = v_booking_id;

  UPDATE public.bookings
  SET status = 'active',
      actual_return_at = NULL,
      return_state = 'not_started',
      updated_at = now()
  WHERE id = v_booking_id;

  IF v_unit_id IS NOT NULL THEN
    UPDATE public.vehicle_units
    SET status = 'on_rent', updated_at = now()
    WHERE id = v_unit_id;
  END IF;

  INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, new_data)
  VALUES (
    'booking_reopened',
    'booking',
    v_booking_id,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', 'active', 'reason', 'Prematurely marked completed; rental runs until 2026-07-20', 'panel_source', 'admin_manual_migration')
  );
END $$;
