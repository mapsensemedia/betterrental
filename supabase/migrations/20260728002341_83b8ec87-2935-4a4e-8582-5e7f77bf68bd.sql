CREATE TABLE public.booking_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  previous_end_at timestamptz,
  new_end_at timestamptz,
  odometer_km integer,
  previous_odometer_km integer,
  reason text,
  price_difference numeric DEFAULT 0,
  recorded_by uuid,
  agreement_id uuid REFERENCES public.rental_agreements(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.booking_extensions TO authenticated;
GRANT ALL ON public.booking_extensions TO service_role;

ALTER TABLE public.booking_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin staff can view booking extensions"
ON public.booking_extensions FOR SELECT TO authenticated
USING (public.is_admin_or_staff(auth.uid()));

CREATE INDEX idx_booking_extensions_booking_id ON public.booking_extensions(booking_id, created_at DESC);

CREATE TRIGGER update_booking_extensions_updated_at
BEFORE UPDATE ON public.booking_extensions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();