-- 1. Drop the existing check constraint and add updated one with 'unassigned'
ALTER TABLE public.delivery_statuses 
DROP CONSTRAINT IF EXISTS delivery_status_check;

ALTER TABLE public.delivery_statuses 
ADD CONSTRAINT delivery_status_check 
CHECK (status = ANY (ARRAY['unassigned', 'assigned', 'picked_up', 'en_route', 'delivered', 'issue', 'cancelled']));

-- 2. Add unique constraint on delivery_statuses.booking_id to prevent duplicates
ALTER TABLE public.delivery_statuses 
DROP CONSTRAINT IF EXISTS delivery_statuses_booking_id_unique;

ALTER TABLE public.delivery_statuses 
ADD CONSTRAINT delivery_statuses_booking_id_unique UNIQUE (booking_id);

-- 3. Create function to auto-create delivery_status when a delivery booking is created
CREATE OR REPLACE FUNCTION public.create_delivery_status_for_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create delivery status for bookings with a delivery address (delivery bookings)
  IF NEW.pickup_address IS NOT NULL THEN
    -- Check if delivery_status already exists (for idempotency)
    IF NOT EXISTS (SELECT 1 FROM public.delivery_statuses WHERE booking_id = NEW.id) THEN
      INSERT INTO public.delivery_statuses (
        booking_id,
        status,
        updated_by,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        CASE WHEN NEW.assigned_driver_id IS NOT NULL THEN 'assigned' ELSE 'unassigned' END,
        NEW.assigned_driver_id,
        now(),
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create trigger for new bookings
DROP TRIGGER IF EXISTS trigger_create_delivery_status ON public.bookings;
CREATE TRIGGER trigger_create_delivery_status
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.create_delivery_status_for_booking();

-- 5. Create function to update delivery_status when booking is updated
CREATE OR REPLACE FUNCTION public.update_delivery_status_on_booking_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If pickup_address was just added (booking converted to delivery)
  IF OLD.pickup_address IS NULL AND NEW.pickup_address IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.delivery_statuses WHERE booking_id = NEW.id) THEN
      INSERT INTO public.delivery_statuses (
        booking_id,
        status,
        updated_by,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        CASE WHEN NEW.assigned_driver_id IS NOT NULL THEN 'assigned' ELSE 'unassigned' END,
        NEW.assigned_driver_id,
        now(),
        now()
      );
    END IF;
  END IF;
  
  -- If driver was just assigned, update status from unassigned to assigned
  IF OLD.assigned_driver_id IS NULL AND NEW.assigned_driver_id IS NOT NULL THEN
    UPDATE public.delivery_statuses 
    SET status = 'assigned', 
        updated_by = NEW.assigned_driver_id,
        updated_at = now()
    WHERE booking_id = NEW.id AND status = 'unassigned';
  END IF;
  
  -- If driver was removed, set status back to unassigned
  IF OLD.assigned_driver_id IS NOT NULL AND NEW.assigned_driver_id IS NULL THEN
    UPDATE public.delivery_statuses 
    SET status = 'unassigned', 
        updated_by = NULL,
        updated_at = now()
    WHERE booking_id = NEW.id AND status = 'assigned';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Create trigger for booking updates
DROP TRIGGER IF EXISTS trigger_update_delivery_status ON public.bookings;
CREATE TRIGGER trigger_update_delivery_status
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_delivery_status_on_booking_change();

-- 7. Update RLS policy for staff/admin to see all delivery statuses
DROP POLICY IF EXISTS "Staff can view unassigned deliveries" ON public.delivery_statuses;
CREATE POLICY "Staff can view all delivery statuses"
ON public.delivery_statuses
FOR SELECT
USING (
  is_admin_or_staff(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = delivery_statuses.booking_id
    AND b.pickup_address IS NOT NULL
  )
);

-- 8. Create delivery_status records for existing delivery bookings that don't have one
INSERT INTO public.delivery_statuses (booking_id, status, updated_by, created_at, updated_at)
SELECT 
  b.id,
  CASE WHEN b.assigned_driver_id IS NOT NULL THEN 'assigned' ELSE 'unassigned' END,
  b.assigned_driver_id,
  now(),
  now()
FROM public.bookings b
WHERE b.pickup_address IS NOT NULL
AND b.status IN ('pending', 'confirmed', 'active')
AND NOT EXISTS (
  SELECT 1 FROM public.delivery_statuses ds WHERE ds.booking_id = b.id
)
ON CONFLICT (booking_id) DO NOTHING;