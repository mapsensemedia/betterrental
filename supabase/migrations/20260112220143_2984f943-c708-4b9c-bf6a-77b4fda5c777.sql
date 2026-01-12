-- Ticket Resolution Flow Enhancement

-- Add new status values to ticket_status enum
-- First, rename current to backup, create new, migrate, drop old
DO $$ 
BEGIN
  -- Check if we need to add new values
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'ticket_status'::regtype 
    AND enumlabel = 'assigned'
  ) THEN
    ALTER TYPE ticket_status ADD VALUE 'assigned';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'ticket_status'::regtype 
    AND enumlabel = 'waiting_customer'
  ) THEN
    ALTER TYPE ticket_status ADD VALUE 'waiting_customer';
  END IF;
END $$;

-- Add resolution fields to tickets table
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS resolution_summary TEXT,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by UUID;

-- Create ticket_timeline table for audit trail
CREATE TABLE IF NOT EXISTS public.ticket_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket_attachments table for proof/evidence
CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.ticket_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for ticket_timeline
CREATE POLICY "Admin staff can view all timeline entries"
  ON public.ticket_timeline FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can insert timeline entries"
  ON public.ticket_timeline FOR INSERT
  WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Users can view timeline for their tickets"
  ON public.ticket_timeline FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_timeline.ticket_id 
    AND tickets.user_id = auth.uid()
  ));

-- RLS policies for ticket_attachments
CREATE POLICY "Admin staff can view all attachments"
  ON public.ticket_attachments FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can insert attachments"
  ON public.ticket_attachments FOR INSERT
  WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Users can view non-internal attachments for their tickets"
  ON public.ticket_attachments FOR SELECT
  USING (
    is_internal = false AND
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_attachments.ticket_id 
      AND tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add attachments to their tickets"
  ON public.ticket_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_attachments.ticket_id 
      AND tickets.user_id = auth.uid()
    )
  );

-- Add deposit_ledger table for Phase 3
CREATE TABLE IF NOT EXISTS public.deposit_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id),
  action TEXT NOT NULL, -- 'hold', 'deduct', 'release'
  amount NUMERIC NOT NULL,
  reason TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deposit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin staff can view all deposit ledger entries"
  ON public.deposit_ledger FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can manage deposit ledger"
  ON public.deposit_ledger FOR ALL
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Users can view their booking deposit ledger"
  ON public.deposit_ledger FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bookings 
    WHERE bookings.id = deposit_ledger.booking_id 
    AND bookings.user_id = auth.uid()
  ));

-- Add vehicle_status enum and column for Phase 4
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status') THEN
    CREATE TYPE vehicle_status AS ENUM ('available', 'booked', 'active_rental', 'maintenance', 'inactive');
  END IF;
END $$;

ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available',
ADD COLUMN IF NOT EXISTS maintenance_reason TEXT,
ADD COLUMN IF NOT EXISTS maintenance_until DATE;

-- Damage reports enhancement - add damage_status enum values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'damage_status') THEN
    CREATE TYPE damage_status AS ENUM ('reported', 'reviewing', 'approved', 'repaired', 'closed');
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ticket_timeline_ticket_id ON public.ticket_timeline(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON public.ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_deposit_ledger_booking_id ON public.deposit_ledger(booking_id);

COMMENT ON TABLE public.ticket_timeline IS 'Audit trail for ticket status changes and actions';
COMMENT ON TABLE public.ticket_attachments IS 'Files/photos attached to tickets as proof or evidence';
COMMENT ON TABLE public.deposit_ledger IS 'Deposit hold, release, and deduction history';