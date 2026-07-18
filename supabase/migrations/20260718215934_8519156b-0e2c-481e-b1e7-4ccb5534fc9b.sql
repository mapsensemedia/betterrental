
CREATE TABLE public.vehicle_swap_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  old_unit_id uuid REFERENCES public.vehicle_units(id) ON DELETE SET NULL,
  new_unit_id uuid REFERENCES public.vehicle_units(id) ON DELETE SET NULL,
  old_agreement_id uuid REFERENCES public.rental_agreements(id) ON DELETE SET NULL,
  new_agreement_id uuid REFERENCES public.rental_agreements(id) ON DELETE SET NULL,
  swap_effective_at timestamptz NOT NULL DEFAULT now(),
  old_end_mileage integer,
  new_start_mileage integer NOT NULL,
  reason text,
  notes text,
  old_vin text,
  old_license_plate text,
  new_vin text,
  new_license_plate text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_swap_history_booking ON public.vehicle_swap_history(booking_id, created_at DESC);

GRANT SELECT ON public.vehicle_swap_history TO authenticated;
GRANT ALL ON public.vehicle_swap_history TO service_role;

ALTER TABLE public.vehicle_swap_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/staff can view vehicle swap history"
  ON public.vehicle_swap_history
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff(auth.uid()));
