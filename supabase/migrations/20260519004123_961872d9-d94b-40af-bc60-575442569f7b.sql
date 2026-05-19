UPDATE bookings
SET assigned_unit_id = 'e2004597-29ca-4d42-a0a3-f661d4bd4262',
    updated_at = now()
WHERE id = '1a0cf2ea-7eab-494e-8904-fda659b9166d'
  AND assigned_unit_id IS NULL;

UPDATE vehicle_units
SET status = 'on_rent', updated_at = now()
WHERE id = 'e2004597-29ca-4d42-a0a3-f661d4bd4262';

INSERT INTO audit_logs (action, entity_type, entity_id, new_data)
VALUES (
  'unit_assigned_post_activation',
  'bookings',
  '1a0cf2ea-7eab-494e-8904-fda659b9166d',
  jsonb_build_object(
    'unit_id', 'e2004597-29ca-4d42-a0a3-f661d4bd4262',
    'vin', '3N1CP5CV7RL483132',
    'plate', 'A819JZ',
    'source', 'manual_data_fix'
  )
);