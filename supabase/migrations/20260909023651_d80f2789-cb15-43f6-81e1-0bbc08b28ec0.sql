-- 1) Safe, collision-proof ticket numbering
SELECT setval('public.support_ticket_seq', GREATEST(
  (SELECT COALESCE(MAX(NULLIF(regexp_replace(ticket_id, '\D', '', 'g'), '')::bigint), 0) FROM public.support_tickets_v2),
  (SELECT last_value FROM public.support_ticket_seq)
));

CREATE OR REPLACE FUNCTION public.generate_ticket_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_candidate text;
  v_tries int := 0;
BEGIN
  LOOP
    v_candidate := 'TKT-' || LPAD(nextval('public.support_ticket_seq')::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.support_tickets_v2 WHERE ticket_id = v_candidate);
    v_tries := v_tries + 1;
    IF v_tries > 10000 THEN
      RAISE EXCEPTION 'Unable to allocate a unique ticket number';
    END IF;
  END LOOP;
  NEW.ticket_id := v_candidate;
  RETURN NEW;
END;
$function$;

-- 2) Alerts can point at a support ticket
ALTER TABLE public.admin_alerts
  ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES public.support_tickets_v2(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS admin_alerts_ticket_id_idx ON public.admin_alerts(ticket_id);

-- 3) Every new support ticket raises an alert, whoever created it
CREATE OR REPLACE FUNCTION public.create_alert_for_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
  v_name text;
BEGIN
  IF NEW.created_by_type <> 'customer' THEN
    RETURN NEW;
  END IF;

  SELECT b.booking_code INTO v_code FROM public.bookings b WHERE b.id = NEW.booking_id;
  SELECT p.full_name INTO v_name FROM public.profiles p WHERE p.id = NEW.customer_id;

  INSERT INTO public.admin_alerts (
    alert_type, title, message, booking_id, ticket_id, user_id, status, expires_at
  ) VALUES (
    CASE WHEN NEW.is_urgent OR NEW.priority = 'high' THEN 'emergency'::alert_type
         ELSE 'customer_issue'::alert_type END,
    'Support ticket ' || NEW.ticket_id || ': ' || LEFT(NEW.subject, 60),
    COALESCE(v_name, COALESCE(NEW.guest_name, 'Customer'))
      || COALESCE(' · Booking ' || v_code, '')
      || ' · ' || LEFT(COALESCE(NEW.description, ''), 200),
    NEW.booking_id,
    NEW.id,
    NEW.customer_id,
    'pending'::alert_status,
    NULL
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_alert_on_new_ticket ON public.support_tickets_v2;
CREATE TRIGGER trg_alert_on_new_ticket
AFTER INSERT ON public.support_tickets_v2
FOR EACH ROW EXECUTE FUNCTION public.create_alert_for_new_ticket();

-- 4) Customers may remove their own licence while it is still pending
DROP POLICY IF EXISTS "Users can delete their own pending verifications" ON public.verification_requests;
CREATE POLICY "Users can delete their own pending verifications"
ON public.verification_requests
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending'::verification_status);

GRANT DELETE ON public.verification_requests TO authenticated;

-- Storage: owners may delete their own verification/licence files
DROP POLICY IF EXISTS "Users can delete own verification documents" ON storage.objects;
CREATE POLICY "Users can delete own verification documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN ('verification-documents', 'driver-licenses')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5) Branch SMS recipients
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'branch_sms_recipients',
  '{"Abbotsford Centre":"+16043061029"}',
  'Phone numbers texted for new bookings and new support tickets, keyed by branch name'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();