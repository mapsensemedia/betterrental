-- Create walkaround_inspections table
CREATE TABLE public.walkaround_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  
  -- Exterior condition
  exterior_notes TEXT,
  scratches_dents JSONB DEFAULT '[]',
  
  -- Interior condition  
  interior_notes TEXT,
  interior_condition TEXT CHECK (interior_condition IN ('excellent', 'good', 'acceptable', 'needs_attention')),
  
  -- Readings
  odometer_reading INTEGER,
  fuel_level INTEGER CHECK (fuel_level >= 0 AND fuel_level <= 100),
  
  -- Staff conducting inspection
  conducted_by UUID NOT NULL,
  conducted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Customer acknowledgement
  customer_acknowledged BOOLEAN NOT NULL DEFAULT false,
  customer_acknowledged_at TIMESTAMPTZ,
  customer_signature TEXT,
  
  -- Final confirmation
  inspection_complete BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.walkaround_inspections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their booking walkarounds"
  ON public.walkaround_inspections
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = walkaround_inspections.booking_id
    AND bookings.user_id = auth.uid()
  ));

CREATE POLICY "Users can acknowledge walkarounds"
  ON public.walkaround_inspections
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = walkaround_inspections.booking_id
    AND bookings.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = walkaround_inspections.booking_id
    AND bookings.user_id = auth.uid()
  ));

CREATE POLICY "Admin staff can view all walkarounds"
  ON public.walkaround_inspections
  FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can manage walkarounds"
  ON public.walkaround_inspections
  FOR ALL
  USING (is_admin_or_staff(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_walkaround_inspections_updated_at
  BEFORE UPDATE ON public.walkaround_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for booking lookup
CREATE INDEX idx_walkaround_inspections_booking_id ON public.walkaround_inspections(booking_id);