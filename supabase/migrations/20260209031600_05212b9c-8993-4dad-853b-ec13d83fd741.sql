-- Add "draft" to the booking_status enum
-- Draft bookings are created during Pay Now checkout but are NOT yet payment-authorized
-- They become "pending" only after Stripe payment confirmation
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'pending';