-- Create a dedicated function for support access check
CREATE OR REPLACE FUNCTION public.is_support_or_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'staff', 'support')
  )
$function$;

-- Update the is_admin_or_staff function to include support role
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'staff', 'cleaner', 'finance', 'support')
  )
$function$;