-- Deactivate Premium Roadside Assistance
UPDATE public.add_ons SET is_active = false WHERE name ILIKE '%premium%roadside%';

-- Add tank capacity to vehicle units for VIN-specific fuel pricing
ALTER TABLE public.vehicle_units 
ADD COLUMN IF NOT EXISTS tank_capacity_liters NUMERIC(5,1) DEFAULT 60;

COMMENT ON COLUMN public.vehicle_units.tank_capacity_liters IS 'Fuel tank capacity in liters for this specific vehicle unit';