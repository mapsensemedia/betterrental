CREATE OR REPLACE FUNCTION public.get_available_categories(p_location_id uuid)
 RETURNS TABLE(id uuid, name text, description text, image_url text, daily_rate numeric, seats integer, fuel_type text, transmission text, available_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    vc.id,
    vc.name,
    vc.description,
    vc.image_url,
    vc.daily_rate,
    vc.seats,
    vc.fuel_type,
    vc.transmission,
    COUNT(vu.id) FILTER (WHERE vu.status = 'available') as available_count
  FROM vehicle_categories vc
  LEFT JOIN vehicle_units vu ON vu.category_id = vc.id AND vu.location_id = p_location_id
  WHERE vc.is_active = true
  GROUP BY vc.id, vc.name, vc.description, vc.image_url, vc.daily_rate, vc.seats, vc.fuel_type, vc.transmission
  ORDER BY vc.sort_order ASC, vc.name ASC;
$function$;