
-- 1. Booking offline-payment fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS paid_offline boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offline_payment_method text,
  ADD COLUMN IF NOT EXISTS offline_payment_reference text,
  ADD COLUMN IF NOT EXISTS offline_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS offline_paid_by uuid;

-- 2. Update block_sensitive_booking_updates trigger to also protect the new fields
CREATE OR REPLACE FUNCTION public.block_sensitive_booking_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  jwt_role text := current_setting('request.jwt.claim.role', true);
  pg_role text := current_setting('role', true);
  sess_role text := session_user;
BEGIN
  IF jwt_role = 'service_role'
     OR pg_role = 'service_role'
     OR pg_role = 'supabase_admin'
     OR pg_role = 'postgres'
     OR sess_role = 'service_role'
     OR sess_role = 'supabase_admin'
     OR sess_role = 'postgres'
     OR current_user = 'service_role'
     OR current_user = 'supabase_admin'
     OR current_user = 'postgres'
  THEN
    RETURN NEW;
  END IF;

  IF (
    NEW.status IS DISTINCT FROM OLD.status
    OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
    OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
    OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
    OR NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount
    OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
    OR NEW.different_dropoff_fee IS DISTINCT FROM OLD.different_dropoff_fee
    OR NEW.upgrade_daily_fee IS DISTINCT FROM OLD.upgrade_daily_fee
    OR NEW.young_driver_fee IS DISTINCT FROM OLD.young_driver_fee
    OR NEW.daily_rate IS DISTINCT FROM OLD.daily_rate
    OR NEW.paid_offline IS DISTINCT FROM OLD.paid_offline
    OR NEW.offline_payment_method IS DISTINCT FROM OLD.offline_payment_method
    OR NEW.offline_payment_reference IS DISTINCT FROM OLD.offline_payment_reference
    OR NEW.offline_paid_at IS DISTINCT FROM OLD.offline_paid_at
    OR NEW.offline_paid_by IS DISTINCT FROM OLD.offline_paid_by
  ) THEN
    RAISE EXCEPTION 'Client updates to booking financial/status fields are not allowed (jwt=%, pg=%, sess=%, cur=%)', jwt_role, pg_role, sess_role, current_user;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Dedicated OTP table for bank-transfer confirmations
CREATE TABLE IF NOT EXISTS public.bank_transfer_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_transfer_otps_booking ON public.bank_transfer_otps(booking_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfer_otps_expires ON public.bank_transfer_otps(expires_at);

GRANT SELECT ON public.bank_transfer_otps TO authenticated;
GRANT ALL ON public.bank_transfer_otps TO service_role;

ALTER TABLE public.bank_transfer_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/staff can view bank transfer OTPs"
ON public.bank_transfer_otps
FOR SELECT
TO authenticated
USING (public.is_admin_or_staff(auth.uid()));
