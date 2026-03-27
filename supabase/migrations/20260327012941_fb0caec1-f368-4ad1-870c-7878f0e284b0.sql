CREATE OR REPLACE FUNCTION public.auto_create_damage_ticket()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT user_id INTO v_customer_id 
  FROM public.bookings 
  WHERE id = NEW.booking_id;

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
    CASE WHEN NEW.severity = 'severe' THEN 'high' ELSE 'medium' END,
    NEW.severity = 'severe',
    NEW.booking_id,
    NEW.id,
    v_customer_id,
    NEW.reported_by,
    'staff',
    'new'
  );
  
  RETURN NEW;
END;
$function$;