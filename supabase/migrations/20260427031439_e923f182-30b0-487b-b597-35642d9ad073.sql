-- Drop Stripe-related columns and tables (Stripe is being removed entirely)
-- All targeted columns/rows are unused (verified empty before drop).

-- 1. bookings: drop Stripe deposit columns
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS stripe_deposit_pi_id,
  DROP COLUMN IF EXISTS stripe_deposit_pm_id,
  DROP COLUMN IF EXISTS stripe_deposit_charge_id,
  DROP COLUMN IF EXISTS stripe_deposit_client_secret,
  DROP COLUMN IF EXISTS stripe_deposit_refund_id;

-- 2. deposit_ledger: drop Stripe ID columns and rebuild action CHECK without stripe_* values
ALTER TABLE public.deposit_ledger
  DROP COLUMN IF EXISTS stripe_refund_id,
  DROP COLUMN IF EXISTS stripe_charge_id,
  DROP COLUMN IF EXISTS stripe_balance_txn_id,
  DROP COLUMN IF EXISTS stripe_pi_id;

ALTER TABLE public.deposit_ledger DROP CONSTRAINT IF EXISTS deposit_ledger_action_check;
ALTER TABLE public.deposit_ledger ADD CONSTRAINT deposit_ledger_action_check
  CHECK (action IN ('hold','release','deduct','authorize','partial_capture','capture','expire','cancel'));

-- 3. final_invoices: drop Stripe ID arrays
ALTER TABLE public.final_invoices
  DROP COLUMN IF EXISTS stripe_payment_ids,
  DROP COLUMN IF EXISTS stripe_refund_ids,
  DROP COLUMN IF EXISTS stripe_charge_ids;

-- 4. Drop the stripe_webhook_events table entirely (0 rows)
DROP TABLE IF EXISTS public.stripe_webhook_events;

-- 5. Update audit-log trigger function to no longer reference dropped Stripe columns
CREATE OR REPLACE FUNCTION public.log_deposit_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.deposit_status IS DISTINCT FROM NEW.deposit_status THEN
    INSERT INTO public.audit_logs (
      action,
      entity_type,
      entity_id,
      old_data,
      new_data
    ) VALUES (
      'deposit_status_change',
      'booking',
      NEW.id,
      jsonb_build_object('deposit_status', OLD.deposit_status),
      jsonb_build_object('deposit_status', NEW.deposit_status)
    );
  END IF;
  RETURN NEW;
END;
$function$;