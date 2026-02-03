-- Add driver role to app_role enum (must be committed first)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';

-- Add damage_id column to support_tickets_v2
ALTER TABLE public.support_tickets_v2 
  ADD COLUMN IF NOT EXISTS damage_id UUID REFERENCES public.damage_reports(id) ON DELETE SET NULL;

-- Create index for damage_id lookups
CREATE INDEX IF NOT EXISTS idx_support_tickets_v2_damage_id ON public.support_tickets_v2(damage_id);

-- Create delivery status tracking table
CREATE TABLE IF NOT EXISTS public.delivery_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned',
  notes TEXT,
  photo_urls JSONB DEFAULT '[]'::jsonb,
  location_lat NUMERIC,
  location_lng NUMERIC,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT delivery_status_check CHECK (
    status IN ('assigned', 'picked_up', 'en_route', 'delivered', 'issue', 'cancelled')
  )
);

-- Create indexes for delivery_statuses
CREATE INDEX IF NOT EXISTS idx_delivery_statuses_booking_id ON public.delivery_statuses(booking_id);
CREATE INDEX IF NOT EXISTS idx_delivery_statuses_status ON public.delivery_statuses(status);

-- Enable RLS on delivery_statuses
ALTER TABLE public.delivery_statuses ENABLE ROW LEVEL SECURITY;

-- RLS: Drivers can view their assigned deliveries, admins can view all
CREATE POLICY "Drivers can view their deliveries"
  ON public.delivery_statuses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = delivery_statuses.booking_id
      AND b.assigned_driver_id = auth.uid()
    )
    OR public.is_admin_or_staff(auth.uid())
  );

-- RLS: Drivers can insert status updates for their deliveries
CREATE POLICY "Drivers can insert delivery status"
  ON public.delivery_statuses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = delivery_statuses.booking_id
      AND b.assigned_driver_id = auth.uid()
    )
    OR public.is_admin_or_staff(auth.uid())
  );

-- RLS: Drivers can update their delivery statuses
CREATE POLICY "Drivers can update their delivery status"
  ON public.delivery_statuses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = delivery_statuses.booking_id
      AND b.assigned_driver_id = auth.uid()
    )
    OR public.is_admin_or_staff(auth.uid())
  );

-- RLS: Only admins can delete delivery statuses
CREATE POLICY "Admins can delete delivery status"
  ON public.delivery_statuses FOR DELETE
  USING (public.is_admin_or_staff(auth.uid()));

-- Function to auto-create support ticket on damage report
CREATE OR REPLACE FUNCTION public.auto_create_damage_ticket()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Get customer ID from booking
  SELECT user_id INTO v_customer_id 
  FROM public.bookings 
  WHERE id = NEW.booking_id;

  -- Create support ticket linked to damage
  INSERT INTO public.support_tickets_v2 (
    subject,
    description,
    category,
    priority,
    is_urgent,
    booking_id,
    damage_id,
    customer_id,
    created_by,
    created_by_type,
    status
  ) VALUES (
    'Damage Report: ' || NEW.severity || ' - ' || NEW.location_on_vehicle,
    NEW.description,
    'damage',
    CASE WHEN NEW.severity = 'major' THEN 'high' ELSE 'medium' END,
    NEW.severity = 'major',
    NEW.booking_id,
    NEW.id,
    v_customer_id,
    NEW.reported_by,
    'staff',
    'new'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create trigger for auto-creating damage tickets
DROP TRIGGER IF EXISTS trigger_auto_create_damage_ticket ON public.damage_reports;
CREATE TRIGGER trigger_auto_create_damage_ticket
  AFTER INSERT ON public.damage_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_damage_ticket();

-- Add RLS policy for drivers to view their assigned bookings
CREATE POLICY "Drivers can view assigned bookings"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() = assigned_driver_id
  );

-- Add RLS policy for drivers to create damage reports
CREATE POLICY "Drivers can create damage reports"
  ON public.damage_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = damage_reports.booking_id
      AND b.assigned_driver_id = auth.uid()
    )
    OR public.is_admin_or_staff(auth.uid())
  );

-- Trigger for updated_at on delivery_statuses
CREATE TRIGGER update_delivery_statuses_updated_at
  BEFORE UPDATE ON public.delivery_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();