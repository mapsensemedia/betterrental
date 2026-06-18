ALTER TABLE public.vehicle_units
  ADD COLUMN IF NOT EXISTS is_temporary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS temp_source text,
  ADD COLUMN IF NOT EXISTS temp_start_date date,
  ADD COLUMN IF NOT EXISTS temp_end_date date,
  ADD COLUMN IF NOT EXISTS temp_daily_cost numeric;

CREATE INDEX IF NOT EXISTS idx_vehicle_units_is_temporary
  ON public.vehicle_units(is_temporary) WHERE is_temporary = true;