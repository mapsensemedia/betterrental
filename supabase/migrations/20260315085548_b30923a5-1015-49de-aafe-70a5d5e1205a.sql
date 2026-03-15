
-- Activate booking VQX7TWLZ directly
UPDATE bookings 
SET status = 'active', 
    activated_at = now(),
    activation_source = 'ops_manual'
WHERE id = '8661aef2-ab2f-4d70-865c-55a857157e55';

-- Set vehicle unit to on_rent
UPDATE vehicle_units 
SET status = 'on_rent', updated_at = now() 
WHERE id = '87193e39-d315-4651-be96-2e3d2d91f3b7';

-- Audit log
INSERT INTO audit_logs (action, entity_type, entity_id, new_data)
VALUES ('booking_status_change', 'booking', '8661aef2-ab2f-4d70-865c-55a857157e55', 
        '{"status": "active", "from": "confirmed", "skipNotifications": true, "manual_activation": true}'::jsonb);
