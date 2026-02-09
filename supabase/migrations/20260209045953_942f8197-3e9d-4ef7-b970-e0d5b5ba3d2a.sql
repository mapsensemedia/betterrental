-- Add card_view_password setting to system_settings (admin-configurable password for viewing card details)
INSERT INTO public.system_settings (key, value)
VALUES ('card_view_password', 'admin123')
ON CONFLICT (key) DO NOTHING;
