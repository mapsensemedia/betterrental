-- Release vehicle units stuck at on_rent with no active/confirmed/pending booking
UPDATE public.vehicle_units vu
SET status = 'available', updated_at = now()
WHERE vu.status = 'on_rent'
  AND NOT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.assigned_unit_id = vu.id
      AND b.status IN ('active','confirmed','pending')
  );

INSERT INTO public.audit_logs (action, entity_type, entity_id, new_data)
VALUES ('vehicle_unit_orphan_release', 'vehicle_units', gen_random_uuid(),
  jsonb_build_object('note', 'Batch released on_rent units with no live booking (Change Vehicle picker fix)'));