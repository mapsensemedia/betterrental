-- Fix constraint to accept '20_24' which the application code uses
ALTER TABLE public.booking_additional_drivers DROP CONSTRAINT booking_additional_drivers_driver_age_band_check;
ALTER TABLE public.booking_additional_drivers ADD CONSTRAINT booking_additional_drivers_driver_age_band_check 
  CHECK (driver_age_band = ANY (ARRAY['20_24'::text, '21_25'::text, '25_70'::text]));

-- Backfill booking C2CMLK6DLW1 add-ons and drivers
SET LOCAL ROLE service_role;

INSERT INTO public.booking_add_ons (booking_id, add_on_id, quantity, price) VALUES
  ('777ac8d6-012b-49c3-9a51-ace30377cd6f', '0d60997c-40fc-4517-8ffb-032285a310bc', 1, 64.95),
  ('777ac8d6-012b-49c3-9a51-ace30377cd6f', 'c3d4e5f6-2222-4000-8000-000000000002', 1, 64.95),
  ('777ac8d6-012b-49c3-9a51-ace30377cd6f', '7a092e45-666f-44bd-bd91-fde1e7f154ea', 1, 108.00),
  ('777ac8d6-012b-49c3-9a51-ace30377cd6f', '7e0bb0eb-68f8-4fc9-aded-407da165b507', 1, 64.95);

INSERT INTO public.booking_additional_drivers (booking_id, driver_name, driver_age_band, young_driver_fee) VALUES
  ('777ac8d6-012b-49c3-9a51-ace30377cd6f', NULL, '25_70', 74.95),
  ('777ac8d6-012b-49c3-9a51-ace30377cd6f', NULL, '20_24', 99.95);

RESET ROLE;