
-- 1. Add column
ALTER TABLE public.final_invoices
  ADD COLUMN IF NOT EXISTS paid_offline_amount numeric NOT NULL DEFAULT 0;

-- 2. Recompute function
CREATE OR REPLACE FUNCTION public.recompute_invoice_totals(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payments numeric := 0;
  v_offline numeric := 0;
  v_grand numeric := 0;
  v_paid_offline boolean := false;
  v_total_amount numeric := 0;
  v_new_due numeric := 0;
  v_new_status text;
  v_current_status text;
BEGIN
  -- Sum of live payment rows (exclude deposits, only completed/captured)
  SELECT COALESCE(SUM(amount), 0) INTO v_payments
  FROM public.payments
  WHERE booking_id = p_booking_id
    AND status IN ('completed', 'captured')
    AND COALESCE(payment_type, '') <> 'deposit';

  -- Offline (bank transfer) paid: credit the invoice grand_total
  SELECT COALESCE(paid_offline, false), COALESCE(total_amount, 0)
    INTO v_paid_offline, v_total_amount
  FROM public.bookings
  WHERE id = p_booking_id;

  -- Update every invoice for this booking
  FOR v_grand, v_current_status IN
    SELECT grand_total, status FROM public.final_invoices WHERE booking_id = p_booking_id
  LOOP
    v_offline := CASE WHEN v_paid_offline THEN GREATEST(v_grand - v_payments, 0) ELSE 0 END;
    v_new_due := GREATEST(v_grand - v_payments - v_offline, 0);
    v_new_status := CASE
      WHEN v_new_due <= 0.005 AND v_current_status = 'issued' THEN 'paid'
      WHEN v_new_due > 0.005 AND v_current_status = 'paid' THEN 'issued'
      ELSE v_current_status
    END;

    UPDATE public.final_invoices
    SET payments_received = v_payments,
        paid_offline_amount = v_offline,
        amount_due = v_new_due,
        status = v_new_status,
        updated_at = now()
    WHERE booking_id = p_booking_id;
  END LOOP;
END;
$$;

-- 3. Trigger on payments
CREATE OR REPLACE FUNCTION public.trg_recompute_invoice_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);
  IF v_booking_id IS NOT NULL THEN
    PERFORM public.recompute_invoice_totals(v_booking_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recompute_invoice_on_payment ON public.payments;
CREATE TRIGGER recompute_invoice_on_payment
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_invoice_on_payment();

-- 4. Trigger on bookings paid_offline flag change
CREATE OR REPLACE FUNCTION public.trg_recompute_invoice_on_booking_offline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.paid_offline IS DISTINCT FROM OLD.paid_offline
     OR NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    PERFORM public.recompute_invoice_totals(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recompute_invoice_on_booking_offline ON public.bookings;
CREATE TRIGGER recompute_invoice_on_booking_offline
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_invoice_on_booking_offline();

-- 5. Also recompute when a new invoice is issued
CREATE OR REPLACE FUNCTION public.trg_recompute_invoice_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_invoice_totals(NEW.booking_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recompute_invoice_after_insert ON public.final_invoices;
CREATE TRIGGER recompute_invoice_after_insert
AFTER INSERT ON public.final_invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_invoice_on_insert();

-- 6. Backfill all existing invoices
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT booking_id FROM public.final_invoices LOOP
    PERFORM public.recompute_invoice_totals(r.booking_id);
  END LOOP;
END $$;
