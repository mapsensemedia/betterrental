
-- Customers table (auth-independent identity for walk-in bookings)
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_customers_email
  ON public.customers (lower(email)) WHERE email IS NOT NULL;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage customers" ON public.customers
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Add customer_id and created_by columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN customer_id UUID REFERENCES public.customers(id),
  ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Auto-update timestamps on customers
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
