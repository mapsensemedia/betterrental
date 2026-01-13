-- Create vehicle_units table for individual VINs under vehicle categories
CREATE TABLE public.vehicle_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vin TEXT NOT NULL UNIQUE,
  acquisition_cost NUMERIC NOT NULL DEFAULT 0,
  acquisition_date DATE,
  license_plate TEXT,
  color TEXT,
  mileage_at_acquisition INTEGER,
  current_mileage INTEGER,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicle_expenses table for tracking all costs
CREATE TABLE public.vehicle_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_unit_id UUID NOT NULL REFERENCES public.vehicle_units(id) ON DELETE CASCADE,
  expense_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor TEXT,
  receipt_url TEXT,
  mileage_at_expense INTEGER,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_vehicle_units_vehicle_id ON public.vehicle_units(vehicle_id);
CREATE INDEX idx_vehicle_units_vin ON public.vehicle_units(vin);
CREATE INDEX idx_vehicle_expenses_unit_id ON public.vehicle_expenses(vehicle_unit_id);
CREATE INDEX idx_vehicle_expenses_type ON public.vehicle_expenses(expense_type);
CREATE INDEX idx_vehicle_expenses_date ON public.vehicle_expenses(expense_date);

-- Enable RLS
ALTER TABLE public.vehicle_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicle_units
CREATE POLICY "Admin staff can view all vehicle units"
  ON public.vehicle_units FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can insert vehicle units"
  ON public.vehicle_units FOR INSERT
  WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can update vehicle units"
  ON public.vehicle_units FOR UPDATE
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can delete vehicle units"
  ON public.vehicle_units FOR DELETE
  USING (is_admin_or_staff(auth.uid()));

-- RLS policies for vehicle_expenses
CREATE POLICY "Admin staff can view all expenses"
  ON public.vehicle_expenses FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can insert expenses"
  ON public.vehicle_expenses FOR INSERT
  WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can update expenses"
  ON public.vehicle_expenses FOR UPDATE
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can delete expenses"
  ON public.vehicle_expenses FOR DELETE
  USING (is_admin_or_staff(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_vehicle_units_updated_at
  BEFORE UPDATE ON public.vehicle_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicle_expenses_updated_at
  BEFORE UPDATE ON public.vehicle_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();