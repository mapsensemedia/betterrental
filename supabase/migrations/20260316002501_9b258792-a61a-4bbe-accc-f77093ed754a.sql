-- Activate booking BXUF8BJR directly
UPDATE public.bookings 
SET status = 'active',
    activated_at = now(),
    activation_source = 'ops_manual',
    activation_reason = 'Admin activated directly, SMS suppressed per request',
    updated_at = now()
WHERE id = '835248a1-380f-4818-9253-4c9d8e0a757b';

-- Update the assigned vehicle unit to on_rent
UPDATE public.vehicle_units
SET status = 'on_rent', updated_at = now()
WHERE id = (SELECT assigned_unit_id FROM public.bookings WHERE id = '835248a1-380f-4818-9253-4c9d8e0a757b');

-- Log the activation in audit_logs
INSERT INTO public.audit_logs (action, entity_type, entity_id, new_data)
VALUES ('status_change', 'booking', '835248a1-380f-4818-9253-4c9d8e0a757b', 
  '{"old_status": "confirmed", "new_status": "active", "activation_source": "ops_manual", "note": "Admin activated, SMS suppressed"}'::jsonb);