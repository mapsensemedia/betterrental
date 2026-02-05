-- Create delivery_status_log table for tracking full status history
CREATE TABLE public.delivery_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  photo_urls JSONB,
  location_lat NUMERIC,
  location_lng NUMERIC,
  odometer_reading INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for efficient queries by booking
CREATE INDEX idx_delivery_status_log_booking ON public.delivery_status_log(booking_id);
CREATE INDEX idx_delivery_status_log_created ON public.delivery_status_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.delivery_status_log ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view all logs
CREATE POLICY "Staff can view delivery status logs"
ON public.delivery_status_log
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

-- Policy: Staff can insert logs
CREATE POLICY "Staff can insert delivery status logs"
ON public.delivery_status_log
FOR INSERT
WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Trigger to automatically log status changes
CREATE OR REPLACE FUNCTION public.log_delivery_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log every status change to the history table
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.delivery_status_log (
      booking_id,
      status,
      notes,
      photo_urls,
      location_lat,
      location_lng,
      created_by
    ) VALUES (
      NEW.booking_id,
      NEW.status,
      NEW.notes,
      NEW.photo_urls,
      NEW.location_lat,
      NEW.location_lng,
      NEW.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to delivery_statuses table
CREATE TRIGGER trigger_log_delivery_status_change
AFTER UPDATE ON public.delivery_statuses
FOR EACH ROW
EXECUTE FUNCTION public.log_delivery_status_change();

-- Add comment documenting valid statuses
COMMENT ON COLUMN public.delivery_statuses.status IS 
  'Valid values: unassigned, assigned, picked_up, en_route, arrived, delivered, issue, cancelled';

-- Enable realtime for delivery_status_log
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_status_log;