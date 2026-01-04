-- Create rental_agreements table
CREATE TABLE public.rental_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  agreement_content TEXT NOT NULL,
  terms_json JSONB NOT NULL DEFAULT '{}',
  customer_signature TEXT,
  customer_signed_at TIMESTAMPTZ,
  customer_ip_address TEXT,
  staff_confirmed_by UUID,
  staff_confirmed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'confirmed', 'voided')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rental_agreements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their booking agreements"
  ON public.rental_agreements
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = rental_agreements.booking_id
    AND bookings.user_id = auth.uid()
  ));

CREATE POLICY "Users can sign their booking agreements"
  ON public.rental_agreements
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = rental_agreements.booking_id
    AND bookings.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = rental_agreements.booking_id
    AND bookings.user_id = auth.uid()
  ));

CREATE POLICY "Admin staff can view all agreements"
  ON public.rental_agreements
  FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can manage agreements"
  ON public.rental_agreements
  FOR ALL
  USING (is_admin_or_staff(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_rental_agreements_updated_at
  BEFORE UPDATE ON public.rental_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for booking lookup
CREATE INDEX idx_rental_agreements_booking_id ON public.rental_agreements(booking_id);