-- Enhance vehicle_categories table for customer-facing display
ALTER TABLE public.vehicle_categories 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS daily_rate NUMERIC NOT NULL DEFAULT 50,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS fuel_type TEXT DEFAULT 'Gas',
ADD COLUMN IF NOT EXISTS transmission TEXT DEFAULT 'Automatic',
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add location_id to vehicle_units for location-based availability
ALTER TABLE public.vehicle_units 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Create atomic VIN assignment function to prevent race conditions
CREATE OR REPLACE FUNCTION public.assign_vin_to_booking(
  p_category_id UUID,
  p_booking_id UUID,
  p_location_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit_id UUID;
BEGIN
  -- Lock and select an available unit from the category at the location
  SELECT id INTO v_unit_id
  FROM vehicle_units
  WHERE category_id = p_category_id
    AND location_id = p_location_id
    AND status = 'available'
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;
  
  IF v_unit_id IS NULL THEN
    RAISE EXCEPTION 'No available units in this category at this location';
  END IF;
  
  -- Mark the unit as on_rent
  UPDATE vehicle_units
  SET status = 'on_rent',
      updated_at = now()
  WHERE id = v_unit_id;
  
  -- Assign to booking
  UPDATE bookings
  SET assigned_unit_id = v_unit_id,
      updated_at = now()
  WHERE id = p_booking_id;
  
  RETURN v_unit_id;
END;
$$;

-- Create function to check category availability
CREATE OR REPLACE FUNCTION public.get_available_categories(p_location_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  image_url TEXT,
  daily_rate NUMERIC,
  seats INTEGER,
  fuel_type TEXT,
  transmission TEXT,
  available_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  HAVING COUNT(vu.id) FILTER (WHERE vu.status = 'available') > 0
  ORDER BY vc.sort_order ASC, vc.name ASC;
$$;

-- Create function to release VIN when booking is cancelled/completed
CREATE OR REPLACE FUNCTION public.release_vin_from_booking(p_booking_id UUID, p_new_status TEXT DEFAULT 'available')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit_id UUID;
BEGIN
  SELECT assigned_unit_id INTO v_unit_id
  FROM bookings
  WHERE id = p_booking_id;
  
  IF v_unit_id IS NOT NULL THEN
    UPDATE vehicle_units
    SET status = p_new_status,
        updated_at = now()
    WHERE id = v_unit_id;
  END IF;
END;
$$;

-- Allow public to call get_available_categories
GRANT EXECUTE ON FUNCTION public.get_available_categories(UUID) TO anon, authenticated;

-- Allow authenticated to call assign function (will be called from edge function)
GRANT EXECUTE ON FUNCTION public.assign_vin_to_booking(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_vin_from_booking(UUID, TEXT) TO authenticated;

-- Make vehicle_categories publicly readable for customer browsing
DROP POLICY IF EXISTS "Categories are publicly readable" ON vehicle_categories;
CREATE POLICY "Categories are publicly readable" 
ON vehicle_categories FOR SELECT 
USING (is_active = true);

-- Update vehicle_units status enum values
COMMENT ON COLUMN vehicle_units.status IS 'Status values: available, on_rent, maintenance, damage';