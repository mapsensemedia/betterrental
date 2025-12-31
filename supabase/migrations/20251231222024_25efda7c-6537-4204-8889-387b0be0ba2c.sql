-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'cleaner', 'finance');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is any admin/staff role
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'staff', 'cleaner', 'finance')
  )
$$;

-- RLS: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- RLS: Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update admin_alerts RLS to allow admin/staff access
DROP POLICY IF EXISTS "Users can view alerts for their bookings" ON public.admin_alerts;

CREATE POLICY "Admin staff can view all alerts"
ON public.admin_alerts
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can update alerts"
ON public.admin_alerts
FOR UPDATE
USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can insert alerts"
ON public.admin_alerts
FOR INSERT
WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Update bookings RLS for admin access
CREATE POLICY "Admin staff can view all bookings"
ON public.bookings
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can update all bookings"
ON public.bookings
FOR UPDATE
USING (public.is_admin_or_staff(auth.uid()));

-- Update vehicles RLS for admin
CREATE POLICY "Admin staff can update vehicles"
ON public.vehicles
FOR UPDATE
USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can insert vehicles"
ON public.vehicles
FOR INSERT
WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Update damage_reports RLS for admin
CREATE POLICY "Admin staff can view all damages"
ON public.damage_reports
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can manage damages"
ON public.damage_reports
FOR ALL
USING (public.is_admin_or_staff(auth.uid()));

-- Update tickets RLS for admin
CREATE POLICY "Admin staff can view all tickets"
ON public.tickets
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can update all tickets"
ON public.tickets
FOR UPDATE
USING (public.is_admin_or_staff(auth.uid()));

-- Update ticket_messages RLS for admin
CREATE POLICY "Admin staff can view all messages"
ON public.ticket_messages
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can add messages"
ON public.ticket_messages
FOR INSERT
WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Update receipts RLS for admin
CREATE POLICY "Admin staff can view all receipts"
ON public.receipts
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can manage receipts"
ON public.receipts
FOR ALL
USING (public.is_admin_or_staff(auth.uid()));

-- Update receipt_events RLS for admin
CREATE POLICY "Admin staff can view all receipt events"
ON public.receipt_events
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can insert receipt events"
ON public.receipt_events
FOR INSERT
WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Update audit_logs RLS for admin
CREATE POLICY "Admin staff can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Update payments RLS for admin
CREATE POLICY "Admin staff can view all payments"
ON public.payments
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can manage payments"
ON public.payments
FOR ALL
USING (public.is_admin_or_staff(auth.uid()));

-- Update profiles RLS for admin (view all)
CREATE POLICY "Admin staff can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

-- Update verification_requests RLS for admin
CREATE POLICY "Admin staff can view all verifications"
ON public.verification_requests
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can update verifications"
ON public.verification_requests
FOR UPDATE
USING (public.is_admin_or_staff(auth.uid()));

-- Update condition_photos RLS for admin
CREATE POLICY "Admin staff can view all condition photos"
ON public.condition_photos
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

-- Update inspection_metrics RLS for admin
CREATE POLICY "Admin staff can view all inspections"
ON public.inspection_metrics
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can manage inspections"
ON public.inspection_metrics
FOR ALL
USING (public.is_admin_or_staff(auth.uid()));

-- Update reservation_holds RLS for admin
CREATE POLICY "Admin staff can view all holds"
ON public.reservation_holds
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

-- Update add_ons RLS for admin management
CREATE POLICY "Admin staff can manage add-ons"
ON public.add_ons
FOR ALL
USING (public.is_admin_or_staff(auth.uid()));

-- Update booking_add_ons RLS for admin
CREATE POLICY "Admin staff can view all booking add-ons"
ON public.booking_add_ons
FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

-- Update locations RLS for admin management
CREATE POLICY "Admin staff can manage locations"
ON public.locations
FOR ALL
USING (public.is_admin_or_staff(auth.uid()));