-- Activate booking NQWRN79T
UPDATE public.bookings 
SET status = 'active',
    activated_at = now(),
    activation_source = 'ops_manual',
    activation_reason = 'Admin activated directly, SMS suppressed per request',
    handed_over_at = now(),
    updated_at = now()
WHERE id = '7d0cdf9c-3acc-488b-b24f-3efd95148b56';

-- Update assigned vehicle unit to on_rent
UPDATE public.vehicle_units
SET status = 'on_rent', updated_at = now()
WHERE id = '8cd72798-4c0c-4441-9df3-05b07b49f977';

-- Audit log
INSERT INTO public.audit_logs (action, entity_type, entity_id, new_data)
VALUES ('status_change', 'booking', '7d0cdf9c-3acc-488b-b24f-3efd95148b56', 
  '{"old_status": "confirmed", "new_status": "active", "activation_source": "ops_manual", "note": "Admin activated, SMS suppressed"}'::jsonb);