ALTER TABLE public.staff_assignments
  ADD COLUMN IF NOT EXISTS sms_alerts_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.staff_assignments.sms_alerts_enabled IS 'When true, this staff member receives branch SMS alerts for their assigned location.';