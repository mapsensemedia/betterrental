-- Extend vehicle_units with vendor, depreciation, and disposal tracking fields
ALTER TABLE public.vehicle_units 
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS vendor_contact text,
  ADD COLUMN IF NOT EXISTS vendor_notes text,
  ADD COLUMN IF NOT EXISTS depreciation_method text DEFAULT 'straight_line',
  ADD COLUMN IF NOT EXISTS annual_depreciation_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_disposal_date date,
  ADD COLUMN IF NOT EXISTS actual_disposal_date date,
  ADD COLUMN IF NOT EXISTS disposal_value numeric DEFAULT 0;

-- Create competitor pricing table for internal reference
CREATE TABLE IF NOT EXISTS public.competitor_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  competitor_name text NOT NULL,
  daily_rate numeric,
  weekly_rate numeric,
  monthly_rate numeric,
  notes text,
  last_updated date DEFAULT CURRENT_DATE,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitor_pricing ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for competitor pricing
CREATE POLICY "Admins can view competitor pricing"
  ON public.competitor_pricing
  FOR SELECT
  USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admins can insert competitor pricing"
  ON public.competitor_pricing
  FOR INSERT
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admins can update competitor pricing"
  ON public.competitor_pricing
  FOR UPDATE
  USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admins can delete competitor pricing"
  ON public.competitor_pricing
  FOR DELETE
  USING (public.is_admin_or_staff(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_competitor_pricing_updated_at
  BEFORE UPDATE ON public.competitor_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_competitor_pricing_vehicle_id ON public.competitor_pricing(vehicle_id);