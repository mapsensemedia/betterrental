-- =====================================================
-- Stripe Security Deposit Hold System - Database Schema
-- =====================================================

-- Add deposit hold columns to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'none' 
  CHECK (deposit_status IN ('none', 'requires_payment', 'authorizing', 'authorized', 'capturing', 'captured', 'releasing', 'released', 'failed', 'expired', 'canceled')),
ADD COLUMN IF NOT EXISTS stripe_deposit_pi_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_deposit_pm_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_deposit_charge_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_deposit_client_secret TEXT,
ADD COLUMN IF NOT EXISTS stripe_deposit_refund_id TEXT,
ADD COLUMN IF NOT EXISTS deposit_authorized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_captured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_released_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_captured_amount INTEGER,
ADD COLUMN IF NOT EXISTS deposit_capture_reason TEXT,
ADD COLUMN IF NOT EXISTS final_invoice_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS final_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS account_closed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS account_closed_by UUID REFERENCES auth.users(id);

-- Add Stripe tracking columns to deposit_ledger table
ALTER TABLE public.deposit_ledger
ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_balance_txn_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_pi_id TEXT;

-- Drop existing action constraint and add new one with extended values
ALTER TABLE public.deposit_ledger DROP CONSTRAINT IF EXISTS deposit_ledger_action_check;
ALTER TABLE public.deposit_ledger ADD CONSTRAINT deposit_ledger_action_check 
  CHECK (action IN ('hold', 'release', 'deduct', 'authorize', 'partial_capture', 'capture', 'expire', 'stripe_hold', 'stripe_release', 'cancel'));

-- Create final_invoices table for account closeout
CREATE TABLE IF NOT EXISTS public.final_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  
  -- Rental charges
  rental_subtotal NUMERIC NOT NULL DEFAULT 0,
  addons_total NUMERIC DEFAULT 0,
  taxes_total NUMERIC NOT NULL DEFAULT 0,
  fees_total NUMERIC DEFAULT 0,
  late_fees NUMERIC DEFAULT 0,
  damage_charges NUMERIC DEFAULT 0,
  
  -- Deposit reconciliation
  deposit_held NUMERIC DEFAULT 0,
  deposit_captured NUMERIC DEFAULT 0,
  deposit_released NUMERIC DEFAULT 0,
  
  -- Payments received
  payments_received NUMERIC DEFAULT 0,
  
  -- Final amounts
  grand_total NUMERIC NOT NULL DEFAULT 0,
  amount_due NUMERIC DEFAULT 0,
  amount_refunded NUMERIC DEFAULT 0,
  
  -- Stripe references (store all IDs for audit)
  stripe_payment_ids JSONB DEFAULT '[]',
  stripe_refund_ids JSONB DEFAULT '[]',
  stripe_charge_ids JSONB DEFAULT '[]',
  
  -- Metadata
  line_items_json JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'voided')),
  issued_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create invoice number sequence
CREATE SEQUENCE IF NOT EXISTS final_invoice_seq START 1000;

-- Create trigger to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('final_invoice_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_invoice_number ON public.final_invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON public.final_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invoice_number();

-- Create updated_at trigger for final_invoices
DROP TRIGGER IF EXISTS update_final_invoices_updated_at ON public.final_invoices;
CREATE TRIGGER update_final_invoices_updated_at
  BEFORE UPDATE ON public.final_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_status ON public.bookings(deposit_status) WHERE deposit_status != 'none';
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_expires ON public.bookings(deposit_expires_at) WHERE deposit_status = 'authorized';
CREATE INDEX IF NOT EXISTS idx_final_invoices_booking ON public.final_invoices(booking_id);

-- Enable RLS on final_invoices
ALTER TABLE public.final_invoices ENABLE ROW LEVEL SECURITY;

-- Admin/staff can read all final invoices
CREATE POLICY "Staff can view all final invoices"
ON public.final_invoices FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

-- Admin/staff can create final invoices
CREATE POLICY "Staff can create final invoices"
ON public.final_invoices FOR INSERT
WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Admin/staff can update final invoices
CREATE POLICY "Staff can update final invoices"
ON public.final_invoices FOR UPDATE
USING (public.is_admin_or_staff(auth.uid()));

-- Users can view their own invoices
CREATE POLICY "Users can view own final invoices"
ON public.final_invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND b.user_id = auth.uid()
  )
);

-- Audit log trigger for deposit status changes
CREATE OR REPLACE FUNCTION public.log_deposit_status_change()
RETURNS TRIGGER AS $$
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
      jsonb_build_object(
        'deposit_status', OLD.deposit_status,
        'stripe_deposit_pi_id', OLD.stripe_deposit_pi_id
      ),
      jsonb_build_object(
        'deposit_status', NEW.deposit_status,
        'stripe_deposit_pi_id', NEW.stripe_deposit_pi_id,
        'stripe_deposit_charge_id', NEW.stripe_deposit_charge_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS log_booking_deposit_status ON public.bookings;
CREATE TRIGGER log_booking_deposit_status
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_deposit_status_change();