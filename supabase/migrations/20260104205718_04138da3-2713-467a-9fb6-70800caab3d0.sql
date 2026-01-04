-- Create check-in records table to track customer arrival validation
CREATE TABLE public.checkin_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  
  -- Identity verification
  identity_verified BOOLEAN DEFAULT FALSE,
  identity_notes TEXT,
  
  -- Driver's license checks
  license_verified BOOLEAN DEFAULT FALSE,
  license_name_matches BOOLEAN DEFAULT FALSE,
  license_valid BOOLEAN DEFAULT FALSE,
  license_expiry_date DATE,
  license_notes TEXT,
  
  -- Age requirement
  age_verified BOOLEAN DEFAULT FALSE,
  customer_dob DATE,
  age_notes TEXT,
  
  -- Timing window
  arrival_time TIMESTAMP WITH TIME ZONE,
  timing_status TEXT CHECK (timing_status IN ('on_time', 'early', 'late', 'no_show')),
  timing_notes TEXT,
  
  -- Overall outcome
  check_in_status TEXT NOT NULL DEFAULT 'pending' CHECK (check_in_status IN ('pending', 'passed', 'needs_review', 'blocked')),
  blocked_reason TEXT,
  
  -- Staff who performed check-in
  checked_in_by UUID,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(booking_id)
);

-- Enable RLS
ALTER TABLE public.checkin_records ENABLE ROW LEVEL SECURITY;

-- RLS policies: only admin/staff can manage check-in records
CREATE POLICY "Staff can view all check-in records"
  ON public.checkin_records FOR SELECT
  USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can insert check-in records"
  ON public.checkin_records FOR INSERT
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can update check-in records"
  ON public.checkin_records FOR UPDATE
  USING (public.is_admin_or_staff(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_checkin_records_updated_at
  BEFORE UPDATE ON public.checkin_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();