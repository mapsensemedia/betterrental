-- Reopen Lovpreet Singh's booking: set status back to active, clear return fields
UPDATE bookings
SET 
  status = 'active',
  actual_return_at = NULL,
  return_state = 'not_started',
  return_started_at = NULL,
  return_intake_completed_at = NULL,
  return_intake_completed_by = NULL,
  return_evidence_completed_at = NULL,
  return_evidence_completed_by = NULL,
  return_issues_reviewed_at = NULL,
  return_issues_reviewed_by = NULL,
  return_is_exception = NULL,
  return_exception_reason = NULL,
  updated_at = now()
WHERE id = '131595a7-2aaa-4104-ab3c-dbf07128c85c';

-- Set the assigned vehicle unit back to on_rent
UPDATE vehicle_units
SET status = 'on_rent', updated_at = now()
WHERE id = (
  SELECT assigned_unit_id FROM bookings WHERE id = '131595a7-2aaa-4104-ab3c-dbf07128c85c'
);

-- Audit log
INSERT INTO audit_logs (action, entity_type, entity_id, new_data)
VALUES (
  'booking_reopened',
  'booking',
  '131595a7-2aaa-4104-ab3c-dbf07128c85c',
  '{"status": "active", "notes": "Rental reopened to re-enter correct return details", "skipNotifications": true}'::jsonb
);