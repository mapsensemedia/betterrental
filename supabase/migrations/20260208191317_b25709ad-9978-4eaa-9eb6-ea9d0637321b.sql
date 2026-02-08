
-- Drop the existing admin policy that lacks WITH CHECK
DROP POLICY IF EXISTS "Admins can manage settings" ON public.system_settings;

-- Recreate with proper USING + WITH CHECK using the security definer function
CREATE POLICY "Admins can manage settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
