-- Add missing RLS policies for admin_alerts, audit_logs, receipt_events

-- Admin alerts - users can view alerts related to their bookings
CREATE POLICY "Users can view alerts for their bookings" ON public.admin_alerts FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = admin_alerts.booking_id AND bookings.user_id = auth.uid())
);

-- Audit logs - users can view their own audit logs
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT USING (user_id = auth.uid());

-- Receipt events - users can view events for their receipts
CREATE POLICY "Users can view events for their receipts" ON public.receipt_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.receipts r
    JOIN public.bookings b ON b.id = r.booking_id
    WHERE r.id = receipt_events.receipt_id AND b.user_id = auth.uid() AND r.status = 'issued'
  )
);