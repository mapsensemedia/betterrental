-- 1. Staff assignment table -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  display_name text,
  employee_code text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_assignments TO authenticated;
GRANT ALL ON public.staff_assignments TO service_role;

ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Helper functions -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.staff_location(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT location_id FROM public.staff_assignments
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin(_user_id)
     OR EXISTS (
       SELECT 1 FROM public.staff_assignments
       WHERE user_id = _user_id AND is_active = true
     )
$$;

CREATE OR REPLACE FUNCTION public.can_access_location(_user_id uuid, _location_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN public.is_super_admin(_user_id) THEN true
    WHEN _location_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.staff_assignments
      WHERE user_id = _user_id
        AND is_active = true
        AND location_id = _location_id
    )
  END
$$;

REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.staff_location(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_active_staff(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_location(uuid, uuid) FROM anon;

-- keep the legacy gate working for the two new roles
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'manager', 'admin', 'staff', 'cleaner', 'finance', 'support')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_support_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'manager', 'admin', 'staff', 'support')
  )
$$;

-- 3. Policies on staff_assignments -----------------------------------------
DROP POLICY IF EXISTS "Super admins manage staff assignments" ON public.staff_assignments;
CREATE POLICY "Super admins manage staff assignments"
ON public.staff_assignments FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can view their own assignment" ON public.staff_assignments;
CREATE POLICY "Staff can view their own assignment"
ON public.staff_assignments FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_staff_assignments_updated_at ON public.staff_assignments;
CREATE TRIGGER update_staff_assignments_updated_at
BEFORE UPDATE ON public.staff_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Accountability columns on bookings ------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS processed_by uuid,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS processed_at_location_id uuid,
  ADD COLUMN IF NOT EXISTS closed_by uuid,
  ADD COLUMN IF NOT EXISTS last_modified_by uuid;

-- 5. Audit log location context -------------------------------------------
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS location_id uuid,
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS actor_location_id uuid;

-- 6. Backfills -------------------------------------------------------------
UPDATE public.bookings
SET processed_by = COALESCE(handed_over_by, activated_by, created_by),
    processed_at_location_id = location_id
WHERE processed_by IS NULL
  AND COALESCE(handed_over_by, activated_by, created_by) IS NOT NULL;

UPDATE public.payments p
SET location_id = b.location_id
FROM public.bookings b
WHERE p.booking_id = b.id AND p.location_id IS NULL;

UPDATE public.audit_logs a
SET location_id = b.location_id
FROM public.bookings b
WHERE a.entity_type = 'booking'
  AND a.entity_id = b.id
  AND a.location_id IS NULL;

-- Existing admins become Super Admins with company-wide scope.
INSERT INTO public.staff_assignments (user_id, location_id, is_active)
SELECT DISTINCT ur.user_id, NULL::uuid, true
FROM public.user_roles ur
WHERE ur.role IN ('admin', 'super_admin')
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.user_roles SET role = 'super_admin' WHERE role = 'admin';

-- 7. Indexes ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_location_id ON public.bookings(location_id);
CREATE INDEX IF NOT EXISTS idx_bookings_return_location_id ON public.bookings(return_location_id);
CREATE INDEX IF NOT EXISTS idx_bookings_processed_by ON public.bookings(processed_by);
CREATE INDEX IF NOT EXISTS idx_vehicle_units_location_id ON public.vehicle_units(location_id);
CREATE INDEX IF NOT EXISTS idx_payments_location_id ON public.payments(location_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_location_id ON public.audit_logs(location_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_location ON public.staff_assignments(location_id) WHERE is_active = true;