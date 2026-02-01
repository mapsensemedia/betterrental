-- Task A: Create vehicle_categories table and extend data model

-- Create vehicle categories table
CREATE TABLE public.vehicle_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicle_categories
CREATE POLICY "Admin staff can manage categories"
  ON public.vehicle_categories FOR ALL
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can view categories"
  ON public.vehicle_categories FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

-- Add category_id to vehicle_units
ALTER TABLE public.vehicle_units 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.vehicle_categories(id) ON DELETE SET NULL;

-- Create fleet_cost_cache table for storing pre-calculated metrics
CREATE TABLE public.fleet_cost_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_unit_id UUID REFERENCES public.vehicle_units(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.vehicle_categories(id) ON DELETE CASCADE,
  cache_type TEXT NOT NULL CHECK (cache_type IN ('unit', 'category')),
  total_rental_revenue NUMERIC DEFAULT 0,
  total_damage_cost NUMERIC DEFAULT 0,
  total_maintenance_cost NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  rental_count INTEGER DEFAULT 0,
  total_rental_days INTEGER DEFAULT 0,
  total_miles_driven INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  calculation_period_start DATE,
  calculation_period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vehicle_unit_id, cache_type, calculation_period_start, calculation_period_end),
  UNIQUE(category_id, cache_type, calculation_period_start, calculation_period_end)
);

-- Enable RLS on cache
ALTER TABLE public.fleet_cost_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin staff can manage cost cache"
  ON public.fleet_cost_cache FOR ALL
  USING (is_admin_or_staff(auth.uid()));

-- Add maintenance_logs table for tracking scheduled services, repairs, inspections
CREATE TABLE public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_unit_id UUID NOT NULL REFERENCES public.vehicle_units(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('scheduled_service', 'repair', 'inspection', 'tire_replacement', 'oil_change', 'brake_service', 'other')),
  description TEXT,
  cost NUMERIC NOT NULL DEFAULT 0,
  mileage_at_service INTEGER,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_name TEXT,
  invoice_number TEXT,
  notes TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin staff can manage maintenance logs"
  ON public.maintenance_logs FOR ALL
  USING (is_admin_or_staff(auth.uid()));

-- Create indexes for performance (Task E)
CREATE INDEX IF NOT EXISTS idx_vehicle_units_vin ON public.vehicle_units(vin);
CREATE INDEX IF NOT EXISTS idx_vehicle_units_category_id ON public.vehicle_units(category_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_units_status ON public.vehicle_units(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_vehicle_unit_id ON public.maintenance_logs(vehicle_unit_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_service_date ON public.maintenance_logs(service_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_vehicle_unit_id ON public.vehicle_expenses(vehicle_unit_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_expense_date ON public.vehicle_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_damage_reports_vehicle_unit_id ON public.damage_reports(vehicle_unit_id);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_unit_id ON public.bookings(assigned_unit_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_at ON public.bookings(start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_end_at ON public.bookings(end_at);
CREATE INDEX IF NOT EXISTS idx_fleet_cost_cache_unit ON public.fleet_cost_cache(vehicle_unit_id);
CREATE INDEX IF NOT EXISTS idx_fleet_cost_cache_category ON public.fleet_cost_cache(category_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_vehicle_categories_updated_at
  BEFORE UPDATE ON public.vehicle_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fleet_cost_cache_updated_at
  BEFORE UPDATE ON public.fleet_cost_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_logs_updated_at
  BEFORE UPDATE ON public.maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();