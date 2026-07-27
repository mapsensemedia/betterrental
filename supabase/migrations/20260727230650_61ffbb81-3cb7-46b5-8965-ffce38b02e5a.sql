-- 1. Allow category-level reservation holds
ALTER TABLE public.reservation_holds ALTER COLUMN vehicle_id DROP NOT NULL;
ALTER TABLE public.reservation_holds ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.vehicle_categories(id) ON DELETE CASCADE;
ALTER TABLE public.reservation_holds ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_holds_category_location ON public.reservation_holds (category_id, location_id, status, expires_at);

GRANT SELECT, INSERT, UPDATE ON public.reservation_holds TO authenticated;
GRANT ALL ON public.reservation_holds TO service_role;

-- 2. Single source of truth: category availability for a location + window
CREATE OR REPLACE FUNCTION public.get_category_availability(
  p_location_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_exclude_hold uuid DEFAULT NULL,
  p_exclude_booking uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  image_url text,
  daily_rate numeric,
  seats integer,
  fuel_type text,
  transmission text,
  sort_order integer,
  total_count bigint,
  available_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH win AS (
    SELECT
      p_start_at - interval '30 minutes' AS w_start,
      p_end_at   + interval '30 minutes' AS w_end
  ),
  -- Units physically usable at this location
  cap AS (
    SELECT vu.category_id, COUNT(*)::bigint AS units
    FROM vehicle_units vu
    WHERE vu.category_id IS NOT NULL
      AND vu.location_id = p_location_id
      AND LOWER(COALESCE(vu.status, '')) NOT IN
          ('maintenance', 'damage', 'damaged', 'retired', 'inactive', 'out_of_service', 'sold')
      AND (
        vu.is_temporary = false
        OR (
          (vu.temp_start_date IS NULL OR vu.temp_start_date <= (SELECT w_start FROM win)::date)
          AND (vu.temp_end_date IS NULL OR vu.temp_end_date >= (SELECT w_end FROM win)::date)
        )
      )
    GROUP BY vu.category_id
  ),
  -- Bookings that consume a unit of a category at this location during the window
  demand AS (
    SELECT
      COALESCE(
        b.internal_unit_category_id,
        (SELECT vu2.category_id FROM vehicle_units vu2 WHERE vu2.id = b.assigned_unit_id),
        (SELECT vc.id FROM vehicle_categories vc WHERE vc.id = b.vehicle_id)
      ) AS category_id,
      COUNT(*)::bigint AS used
    FROM bookings b, win
    WHERE b.status IN ('pending', 'confirmed', 'active')
      AND (p_exclude_booking IS NULL OR b.id <> p_exclude_booking)
      AND b.start_at < win.w_end
      AND b.end_at   > win.w_start
      AND COALESCE(
            (SELECT vu3.location_id FROM vehicle_units vu3 WHERE vu3.id = b.assigned_unit_id),
            b.location_id
          ) = p_location_id
    GROUP BY 1
  ),
  -- Live checkout holds
  held AS (
    SELECT
      COALESCE(
        rh.category_id,
        (SELECT vc.id FROM vehicle_categories vc WHERE vc.id = rh.vehicle_id)
      ) AS category_id,
      COUNT(*)::bigint AS used
    FROM reservation_holds rh, win
    WHERE rh.status = 'active'
      AND rh.expires_at > now()
      AND (p_exclude_hold IS NULL OR rh.id <> p_exclude_hold)
      AND rh.start_at < win.w_end
      AND rh.end_at   > win.w_start
      AND (rh.location_id IS NULL OR rh.location_id = p_location_id)
    GROUP BY 1
  )
  SELECT
    c.id,
    c.name,
    c.description,
    c.image_url,
    c.daily_rate,
    c.seats,
    c.fuel_type,
    c.transmission,
    c.sort_order,
    COALESCE(cap.units, 0) AS total_count,
    GREATEST(
      COALESCE(cap.units, 0) - COALESCE(d.used, 0) - COALESCE(h.used, 0),
      0
    )::bigint AS available_count
  FROM vehicle_categories c
  LEFT JOIN cap    ON cap.category_id = c.id
  LEFT JOIN demand d ON d.category_id = c.id
  LEFT JOIN held   h ON h.category_id = c.id
  WHERE c.is_active = true
  ORDER BY c.sort_order ASC, c.name ASC;
$function$;

-- 3. Single-category boolean check sharing the exact same predicate
CREATE OR REPLACE FUNCTION public.check_category_availability(
  p_category_id uuid,
  p_location_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_exclude_hold uuid DEFAULT NULL,
  p_exclude_booking uuid DEFAULT NULL
)
RETURNS TABLE(available boolean, available_count bigint, total_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(a.available_count, 0) > 0,
    COALESCE(a.available_count, 0),
    COALESCE(a.total_count, 0)
  FROM (
    SELECT * FROM public.get_category_availability(
      p_location_id, p_start_at, p_end_at, p_exclude_hold, p_exclude_booking
    )
  ) a
  WHERE a.id = p_category_id;
$function$;

GRANT EXECUTE ON FUNCTION public.get_category_availability(uuid, timestamptz, timestamptz, uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_category_availability(uuid, uuid, timestamptz, timestamptz, uuid, uuid) TO anon, authenticated, service_role;