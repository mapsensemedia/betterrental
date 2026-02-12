-- UPSERT new spec-compliant keys with current production values
INSERT INTO public.system_settings (key, value)
VALUES
  ('additional_driver_daily_rate_standard', '14.99'),
  ('additional_driver_daily_rate_young', '19.99')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();