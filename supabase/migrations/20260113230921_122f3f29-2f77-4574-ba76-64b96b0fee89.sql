-- Add assigned_unit_id to bookings to link bookings to specific VINs
ALTER TABLE public.bookings 
ADD COLUMN assigned_unit_id uuid REFERENCES public.vehicle_units(id);

-- Create index for faster lookups
CREATE INDEX idx_bookings_assigned_unit_id ON public.bookings(assigned_unit_id);

-- Add vehicle_unit_id to damage_reports to link damages directly to VIN units
ALTER TABLE public.damage_reports 
ADD COLUMN vehicle_unit_id uuid REFERENCES public.vehicle_units(id);

-- Create index for faster lookups
CREATE INDEX idx_damage_reports_vehicle_unit_id ON public.damage_reports(vehicle_unit_id);