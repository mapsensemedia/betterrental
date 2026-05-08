UPDATE public.locations
SET
  address = '20178 96 Ave, Langley Twp, BC V1M 0B2',
  city = 'Langley',
  lat = 49.1556,
  lng = -122.6784,
  phone = '+1 (604) 763-4242',
  email = 'langley@c2crental.ca',
  hours_json = '{"fri": "8:00 AM - 6:00 PM", "mon": "8:00 AM - 6:00 PM", "sat": "8:00 AM - 6:00 PM", "sun": "11:00 AM - 5:00 PM", "thu": "8:00 AM - 6:00 PM", "tue": "8:00 AM - 6:00 PM", "wed": "8:00 AM - 6:00 PM"}'::jsonb,
  is_active = true,
  fee_group = 'langley'
WHERE id = 'a1b2c3d4-2222-4000-8000-000000000002';