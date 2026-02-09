
-- =====================================================================
-- DELIVERY TASKS TABLE
-- Tracks delivery tasks linked to bookings with lifecycle status
-- =====================================================================

CREATE TABLE public.delivery_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_driver_id UUID REFERENCES auth.users(id),
  
  -- Ops pipeline stages
  intake_completed_at TIMESTAMPTZ,
  intake_completed_by UUID,
  payment_verified_at TIMESTAMPTZ,
  payment_verified_by UUID,
  ready_line_completed_at TIMESTAMPTZ,
  ready_line_completed_by UUID,
  dispatched_at TIMESTAMPTZ,
  dispatched_by UUID,
  dispatch_window_start TIMESTAMPTZ,
  dispatch_window_end TIMESTAMPTZ,
  
  -- Delivery execution stages  
  driver_picked_up_at TIMESTAMPTZ,
  driver_en_route_at TIMESTAMPTZ,
  driver_arrived_at TIMESTAMPTZ,
  handover_completed_at TIMESTAMPTZ,
  handover_completed_by UUID,
  
  -- Evidence tracking
  handover_photos_count INT DEFAULT 0,
  fuel_level_recorded BOOLEAN DEFAULT false,
  odometer_recorded BOOLEAN DEFAULT false,
  id_check_result TEXT, -- 'passed', 'failed', 'skipped', NULL
  id_check_required BOOLEAN DEFAULT true,
  
  -- Activation (who activated and why - supports dual activation)
  activated_at TIMESTAMPTZ,
  activated_by UUID,
  activation_source TEXT, -- 'delivery_portal' or 'ops_backup'
  activation_reason TEXT, -- mandatory for ops_backup
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(booking_id)
);

-- Enable RLS
ALTER TABLE public.delivery_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff and admin can view delivery tasks"
  ON public.delivery_tasks FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff') OR
    public.has_role(auth.uid(), 'driver')
  );

CREATE POLICY "Staff and admin can insert delivery tasks"
  ON public.delivery_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Staff, admin, and drivers can update delivery tasks"
  ON public.delivery_tasks FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff') OR
    (public.has_role(auth.uid(), 'driver') AND assigned_driver_id = auth.uid())
  );

-- =====================================================================
-- PRICING SNAPSHOT on bookings (lock pricing so it can't drift)
-- =====================================================================

ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS pricing_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pricing_locked_by UUID;

-- =====================================================================
-- ACTIVATION AUDIT FIELDS on bookings (for dual activation tracking)
-- =====================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_by UUID,
  ADD COLUMN IF NOT EXISTS activation_source TEXT,
  ADD COLUMN IF NOT EXISTS activation_reason TEXT;

-- =====================================================================
-- INDEX for fast lookups
-- =====================================================================

CREATE INDEX idx_delivery_tasks_booking_id ON public.delivery_tasks(booking_id);
CREATE INDEX idx_delivery_tasks_driver ON public.delivery_tasks(assigned_driver_id) WHERE assigned_driver_id IS NOT NULL;
CREATE INDEX idx_delivery_tasks_status ON public.delivery_tasks(status);

-- =====================================================================
-- TRIGGER: auto-update updated_at
-- =====================================================================

CREATE TRIGGER update_delivery_tasks_updated_at
  BEFORE UPDATE ON public.delivery_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for delivery_tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_tasks;
