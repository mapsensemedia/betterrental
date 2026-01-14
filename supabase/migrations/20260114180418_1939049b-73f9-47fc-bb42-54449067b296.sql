-- Add return state machine fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS return_state text DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS return_started_at timestamptz,
ADD COLUMN IF NOT EXISTS return_intake_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS return_intake_completed_by uuid,
ADD COLUMN IF NOT EXISTS return_evidence_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS return_evidence_completed_by uuid,
ADD COLUMN IF NOT EXISTS return_issues_reviewed_at timestamptz,
ADD COLUMN IF NOT EXISTS return_issues_reviewed_by uuid,
ADD COLUMN IF NOT EXISTS return_is_exception boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS return_exception_reason text;

-- Add constraint for valid return states
ALTER TABLE public.bookings 
ADD CONSTRAINT check_return_state 
CHECK (return_state IN ('not_started', 'initiated', 'intake_done', 'evidence_done', 'issues_reviewed', 'closeout_done', 'deposit_processed'));

-- Create index for return state queries
CREATE INDEX IF NOT EXISTS idx_bookings_return_state ON public.bookings(return_state) WHERE status = 'active';

-- Create return step completion audit log function
CREATE OR REPLACE FUNCTION public.log_return_step_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when return state changes
  IF OLD.return_state IS DISTINCT FROM NEW.return_state THEN
    INSERT INTO public.audit_logs (
      action,
      entity_type,
      entity_id,
      user_id,
      old_data,
      new_data
    ) VALUES (
      'return_step_change',
      'booking',
      NEW.id,
      COALESCE(NEW.return_intake_completed_by, NEW.return_evidence_completed_by, NEW.return_issues_reviewed_by, auth.uid()),
      jsonb_build_object('return_state', OLD.return_state),
      jsonb_build_object('return_state', NEW.return_state)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for return step logging
DROP TRIGGER IF EXISTS trigger_log_return_step ON public.bookings;
CREATE TRIGGER trigger_log_return_step
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (OLD.return_state IS DISTINCT FROM NEW.return_state)
  EXECUTE FUNCTION public.log_return_step_completion();