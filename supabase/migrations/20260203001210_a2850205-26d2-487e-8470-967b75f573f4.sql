-- Add late return tracking columns to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS late_return_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_return_fee_override numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS late_return_override_reason text,
ADD COLUMN IF NOT EXISTS late_return_override_by uuid,
ADD COLUMN IF NOT EXISTS late_return_override_at timestamptz,
ADD COLUMN IF NOT EXISTS customer_marked_returned_at timestamptz;

-- Add comments for clarity
COMMENT ON COLUMN public.bookings.late_return_fee IS 'Automatically calculated late return fee';
COMMENT ON COLUMN public.bookings.late_return_fee_override IS 'Admin-adjusted late return fee (overrides automatic calculation)';
COMMENT ON COLUMN public.bookings.late_return_override_reason IS 'Reason for admin override of late fee';
COMMENT ON COLUMN public.bookings.customer_marked_returned_at IS 'Timestamp when customer self-marked vehicle as returned (for key drop scenarios)';