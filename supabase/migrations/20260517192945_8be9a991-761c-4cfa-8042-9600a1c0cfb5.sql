-- Remove the 2023 Range Rover Evoque from inventory
-- A completed booking references its assigned unit; null the reference, then remove the unit and vehicle.
DO $$
DECLARE
  v_vehicle_id uuid := '7cbccacf-1dfe-4802-8cca-4c9549ab7f12';
BEGIN
  UPDATE public.bookings
    SET assigned_unit_id = NULL
    WHERE assigned_unit_id IN (SELECT id FROM public.vehicle_units WHERE vehicle_id = v_vehicle_id);

  DELETE FROM public.vehicle_units WHERE vehicle_id = v_vehicle_id;
  DELETE FROM public.audit_logs WHERE entity_type = 'vehicles' AND entity_id = v_vehicle_id;
  DELETE FROM public.vehicles WHERE id = v_vehicle_id;
END $$;