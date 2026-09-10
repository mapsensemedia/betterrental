CREATE OR REPLACE FUNCTION public.notify_branch_on_new_ticket()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base text := 'https://bsvsveoaihtbsteqikvp.supabase.co/functions/v1/';
  v_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzdnN2ZW9haWh0YnN0ZXFpa3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzU4NzgsImV4cCI6MjA4MjcxMTg3OH0._xvISKl-E5Sv4V_al_QTncuGoSJ9WrRuYNwWu4UzKOY';
  v_headers jsonb;
BEGIN
  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_key
  );

  -- Branch alert (existing behaviour, unchanged)
  BEGIN
    PERFORM net.http_post(
      url := v_base || 'notify-branch-sms',
      headers := v_headers,
      body := jsonb_build_object('type', 'ticket', 'ticketId', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_branch_on_new_ticket branch alert failed for %: %', NEW.id, SQLERRM;
  END;

  -- Customer confirmation, customer-raised tickets only. Independent block so a
  -- failure here can never affect the branch alert or the ticket insert.
  IF NEW.created_by_type = 'customer' THEN
    BEGIN
      PERFORM net.http_post(
        url := v_base || 'send-support-sms',
        headers := v_headers,
        body := jsonb_build_object('ticketId', NEW.id, 'kind', 'created')
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_branch_on_new_ticket customer confirmation failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;