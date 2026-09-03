DROP POLICY IF EXISTS "Active staff can view staff identities" ON public.staff_assignments;
CREATE POLICY "Active staff can view staff identities"
ON public.staff_assignments FOR SELECT TO authenticated
USING (public.is_active_staff(auth.uid()));