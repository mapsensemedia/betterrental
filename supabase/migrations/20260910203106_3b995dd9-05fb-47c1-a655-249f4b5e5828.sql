CREATE OR REPLACE FUNCTION public.notify_branch_on_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := 'https://bsvsveoaihtbsteqikvp.supabase.co/functions/v1/notify-branch-sms';
  v_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzdnN2ZW9haWh0YnN0ZXFpa3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzU4NzgsImV4cCI6MjA4MjcxMTg3OH0._xvISKl-E5Sv4V_al_QTncuGoSJ9WrRuYNwWu4UzKOY';
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := jsonb_build_object('type', 'ticket', 'ticketId', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_branch_on_new_ticket failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_branch_sms_on_new_ticket ON public.support_tickets_v2;

CREATE TRIGGER trg_branch_sms_on_new_ticket
AFTER INSERT ON public.support_tickets_v2
FOR EACH ROW
EXECUTE FUNCTION public.notify_branch_on_new_ticket();