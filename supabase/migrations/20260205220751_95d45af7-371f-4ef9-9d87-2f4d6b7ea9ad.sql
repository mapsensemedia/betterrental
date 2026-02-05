-- Add fields for customer return location (GPS for key-drop scenarios)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS customer_return_lat DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS customer_return_lng DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS customer_return_address TEXT;

-- Add withhold category to deposit_ledger for structured reasoning
ALTER TABLE deposit_ledger
ADD COLUMN IF NOT EXISTS category TEXT;