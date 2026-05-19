UPDATE rental_agreements
SET status = 'voided', updated_at = now()
WHERE booking_id = '1a0cf2ea-7eab-494e-8904-fda659b9166d'
  AND status = 'pending';

INSERT INTO audit_logs (action, entity_type, entity_id, new_data)
VALUES (
  'agreement_voided',
  'rental_agreements',
  '45a3d40c-1402-4fdd-897c-873681e305db',
  jsonb_build_object('reason', 'Voided to regenerate with attached vehicle VIN/plate', 'source', 'manual_data_fix')
);