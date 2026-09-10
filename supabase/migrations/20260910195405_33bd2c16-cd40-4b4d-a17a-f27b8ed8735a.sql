UPDATE public.system_settings
SET value = jsonb_build_object(
  'Abbotsford Centre', COALESCE(NULLIF(value::jsonb->>'Abbotsford Centre', ''), '+16043061029'),
  'Surrey Newton', '+16047634242',
  'Langley Centre', '+16047634242'
)::text
WHERE key = 'branch_sms_recipients';

INSERT INTO public.system_settings (key, value)
SELECT 'branch_sms_recipients', jsonb_build_object(
  'Abbotsford Centre', '+16043061029',
  'Surrey Newton', '+16047634242',
  'Langley Centre', '+16047634242'
)::text
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE key = 'branch_sms_recipients');