-- Fix category constraint to include 'incident'
ALTER TABLE public.support_tickets_v2 DROP CONSTRAINT IF EXISTS support_tickets_v2_category_check;
ALTER TABLE public.support_tickets_v2 
ADD CONSTRAINT support_tickets_v2_category_check 
CHECK (category IN ('billing', 'booking', 'ops', 'damage', 'website_bug', 'general', 'incident'));

-- Fix created_by_type constraint to include 'staff'  
ALTER TABLE public.support_tickets_v2 DROP CONSTRAINT IF EXISTS support_tickets_v2_created_by_type_check;
ALTER TABLE public.support_tickets_v2 
ADD CONSTRAINT support_tickets_v2_created_by_type_check 
CHECK (created_by_type IN ('customer', 'admin', 'support', 'system', 'staff'));

-- Update the trigger function with correct created_by_type value
CREATE OR REPLACE FUNCTION public.auto_create_incident_ticket()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Get customer ID from booking (if exists)
  IF NEW.booking_id IS NOT NULL THEN
    SELECT user_id INTO v_customer_id 
    FROM public.bookings 
    WHERE id = NEW.booking_id;
  ELSE
    v_customer_id := NEW.customer_id;
  END IF;

  -- Create support ticket linked to incident
  INSERT INTO public.support_tickets_v2 (
    subject,
    description,
    category,
    priority,
    is_urgent,
    booking_id,
    incident_id,
    customer_id,
    created_by,
    created_by_type,
    status
  ) VALUES (
    'Incident: ' || INITCAP(REPLACE(NEW.incident_type, '_', ' ')) || 
    ' - ' || INITCAP(NEW.severity),
    NEW.description,
    'incident',
    CASE 
      WHEN NEW.severity = 'major' THEN 'high'
      WHEN NEW.severity = 'moderate' THEN 'medium'
      ELSE 'low'
    END,
    NEW.severity = 'major' OR COALESCE(NOT NEW.is_drivable, false),
    NEW.booking_id,
    NEW.id,
    v_customer_id,
    NEW.created_by,
    'staff',
    'new'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_create_incident_ticket ON public.incident_cases;
CREATE TRIGGER trigger_auto_create_incident_ticket
  AFTER INSERT ON public.incident_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_incident_ticket();

-- Backfill existing incidents without tickets
INSERT INTO public.support_tickets_v2 (
  subject, description, category, priority, is_urgent,
  booking_id, incident_id, customer_id, created_by, created_by_type, status
)
SELECT 
  'Incident: ' || INITCAP(REPLACE(ic.incident_type, '_', ' ')) || ' - ' || INITCAP(ic.severity),
  ic.description,
  'incident',
  CASE WHEN ic.severity = 'major' THEN 'high' ELSE 'medium' END,
  ic.severity = 'major',
  ic.booking_id,
  ic.id,
  ic.customer_id,
  ic.created_by,
  'staff',
  'new'
FROM public.incident_cases ic
WHERE NOT EXISTS (
  SELECT 1 FROM public.support_tickets_v2 st 
  WHERE st.incident_id = ic.id
);