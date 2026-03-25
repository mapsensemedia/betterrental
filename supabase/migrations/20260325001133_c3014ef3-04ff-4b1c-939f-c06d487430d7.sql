
-- Fix user_id on 3 mismatched bookings where correct profiles exist
-- GJ662UXA and E6MA7C5T: MALKEET SINGH SOHAL (profile 8b1f8a54)
UPDATE bookings 
SET user_id = '8b1f8a54-4639-4c28-b4f2-b09465c66363'
WHERE id = '4be67d23-50d2-482d-9545-f3cd59b76064' AND booking_code = 'GJ662UXA';

UPDATE bookings 
SET user_id = '8b1f8a54-4639-4c28-b4f2-b09465c66363'
WHERE id = 'cb721f90-6100-4369-a206-1407ee19067c' AND booking_code = 'E6MA7C5T';

-- 4HL5K9QV: Singh Lovepreet (profile 527d264d)
UPDATE bookings 
SET user_id = '527d264d-9b7c-474e-a7ed-b08303a5acd2'
WHERE id = '3fb4970e-08aa-4baf-9c1e-af5bc0309e87' AND booking_code = '4HL5K9QV';
