-- Add escalated_at column to tickets table to track escalation history
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS escalated_from TEXT,
ADD COLUMN IF NOT EXISTS escalation_count INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.tickets.escalated_at IS 'Timestamp of last escalation';
COMMENT ON COLUMN public.tickets.escalated_from IS 'Previous priority before escalation';
COMMENT ON COLUMN public.tickets.escalation_count IS 'Number of times this ticket has been escalated';

-- Create a function to be called by pg_cron for ticket escalation
-- This calls the edge function via pg_net extension
CREATE OR REPLACE FUNCTION check_ticket_escalation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  escalation_hours_normal INTEGER := 24;
  escalation_hours_high INTEGER := 12;
  alert_hours_urgent INTEGER := 4;
  tickets_escalated INTEGER := 0;
  current_ticket RECORD;
BEGIN
  -- Escalate normal -> high (after 24 hours)
  FOR current_ticket IN 
    SELECT id, subject, booking_id, user_id
    FROM tickets
    WHERE status IN ('open', 'in_progress')
    AND priority = 'normal'
    AND updated_at < NOW() - INTERVAL '24 hours'
    AND (escalated_at IS NULL OR escalated_at < NOW() - INTERVAL '24 hours')
  LOOP
    UPDATE tickets SET
      priority = 'high',
      escalated_at = NOW(),
      escalated_from = 'normal',
      escalation_count = COALESCE(escalation_count, 0) + 1,
      updated_at = NOW()
    WHERE id = current_ticket.id;
    
    tickets_escalated := tickets_escalated + 1;
  END LOOP;
  
  -- Escalate high -> urgent (after 12 hours)
  FOR current_ticket IN 
    SELECT id, subject, booking_id, user_id
    FROM tickets
    WHERE status IN ('open', 'in_progress')
    AND priority = 'high'
    AND updated_at < NOW() - INTERVAL '12 hours'
    AND (escalated_at IS NULL OR escalated_at < NOW() - INTERVAL '12 hours')
  LOOP
    UPDATE tickets SET
      priority = 'urgent',
      escalated_at = NOW(),
      escalated_from = 'high',
      escalation_count = COALESCE(escalation_count, 0) + 1,
      updated_at = NOW()
    WHERE id = current_ticket.id;
    
    tickets_escalated := tickets_escalated + 1;
  END LOOP;
  
  -- Create alerts for urgent tickets unresolved > 4 hours
  INSERT INTO admin_alerts (alert_type, title, message, booking_id, user_id, status)
  SELECT 
    'verification_pending'::alert_type,
    '⚠️ Urgent ticket needs attention: ' || LEFT(t.subject, 40),
    'Ticket has been urgent priority for over 4 hours without resolution.',
    t.booking_id,
    t.user_id,
    'pending'::alert_status
  FROM tickets t
  WHERE t.status IN ('open', 'in_progress')
  AND t.priority = 'urgent'
  AND t.updated_at < NOW() - INTERVAL '4 hours'
  AND NOT EXISTS (
    SELECT 1 FROM admin_alerts a 
    WHERE a.booking_id = t.booking_id 
    AND a.alert_type = 'verification_pending'
    AND a.title ILIKE '%urgent ticket%'
    AND a.created_at > NOW() - INTERVAL '24 hours'
  );

  RAISE NOTICE 'Ticket escalation complete. Tickets escalated: %', tickets_escalated;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_ticket_escalation() TO service_role;