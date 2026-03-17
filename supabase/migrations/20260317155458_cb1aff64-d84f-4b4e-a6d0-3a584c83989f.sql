ALTER TABLE bookings 
ADD CONSTRAINT walkin_requires_customer_id 
CHECK (booking_source != 'walk_in' OR customer_id IS NOT NULL);