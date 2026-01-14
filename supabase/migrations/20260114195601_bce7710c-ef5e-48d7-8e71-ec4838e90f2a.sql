-- Add policy for staff to update any profile (for license uploads, etc.)
CREATE POLICY "Admin staff can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_admin_or_staff(auth.uid()))
WITH CHECK (is_admin_or_staff(auth.uid()));