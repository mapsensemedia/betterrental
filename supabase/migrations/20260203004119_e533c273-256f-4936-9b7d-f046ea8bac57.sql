
-- =============================================================================
-- SUPPORT v2 DATABASE MIGRATION
-- =============================================================================

-- 1. Create support_macros table for canned responses
CREATE TABLE public.support_macros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- billing, booking, ops, damage, general
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- [{name: "customer_name", label: "Customer Name"}]
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on support_macros
ALTER TABLE public.support_macros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage macros" ON public.support_macros
  FOR ALL USING (is_admin_or_staff(auth.uid()));

-- 2. Create support_tickets_v2 table with enhanced schema
CREATE TABLE public.support_tickets_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT NOT NULL UNIQUE, -- Human readable: TKT-XXXXXX
  
  -- Status and categorization
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'waiting_customer', 'escalated', 'closed')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('billing', 'booking', 'ops', 'damage', 'website_bug', 'general')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  
  -- Assignment
  assigned_to UUID,
  
  -- Links
  customer_id UUID, -- User who owns the ticket
  booking_id UUID,
  incident_id UUID, -- Link to damage/incident cases
  
  -- Contact info (for guests without account)
  guest_email TEXT,
  guest_phone TEXT,
  guest_name TEXT,
  
  -- Content
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Resolution
  resolution_note TEXT,
  escalation_note TEXT,
  escalated_at TIMESTAMPTZ,
  escalated_by UUID,
  
  -- Timestamps
  first_response_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_by UUID NOT NULL, -- Who created (customer, admin, or support)
  created_by_type TEXT NOT NULL DEFAULT 'customer' CHECK (created_by_type IN ('customer', 'admin', 'support', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique ticket ID sequence
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 10000;

-- Function to generate ticket ID
CREATE OR REPLACE FUNCTION generate_ticket_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_id := 'TKT-' || LPAD(nextval('support_ticket_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_ticket_id
  BEFORE INSERT ON public.support_tickets_v2
  FOR EACH ROW
  WHEN (NEW.ticket_id IS NULL)
  EXECUTE FUNCTION generate_ticket_id();

-- Indexes for fast search
CREATE INDEX idx_tickets_v2_status ON public.support_tickets_v2(status);
CREATE INDEX idx_tickets_v2_category ON public.support_tickets_v2(category);
CREATE INDEX idx_tickets_v2_priority ON public.support_tickets_v2(priority);
CREATE INDEX idx_tickets_v2_urgent ON public.support_tickets_v2(is_urgent) WHERE is_urgent = true;
CREATE INDEX idx_tickets_v2_assigned ON public.support_tickets_v2(assigned_to);
CREATE INDEX idx_tickets_v2_customer ON public.support_tickets_v2(customer_id);
CREATE INDEX idx_tickets_v2_booking ON public.support_tickets_v2(booking_id);
CREATE INDEX idx_tickets_v2_incident ON public.support_tickets_v2(incident_id);
CREATE INDEX idx_tickets_v2_created ON public.support_tickets_v2(created_at DESC);
CREATE INDEX idx_tickets_v2_ticket_id ON public.support_tickets_v2(ticket_id);

-- Enable RLS on support_tickets_v2
ALTER TABLE public.support_tickets_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all tickets" ON public.support_tickets_v2
  FOR SELECT USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can manage tickets" ON public.support_tickets_v2
  FOR ALL USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Customers can view their tickets" ON public.support_tickets_v2
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create tickets" ON public.support_tickets_v2
  FOR INSERT WITH CHECK (auth.uid() = customer_id OR auth.uid() = created_by);

CREATE POLICY "Customers can update their tickets" ON public.support_tickets_v2
  FOR UPDATE USING (auth.uid() = customer_id);

-- 3. Create ticket_messages_v2 with internal/customer separation
CREATE TABLE public.ticket_messages_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets_v2(id) ON DELETE CASCADE,
  
  -- Message content
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'customer_visible' CHECK (message_type IN ('customer_visible', 'internal_note')),
  
  -- Sender info
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'customer' CHECK (sender_type IN ('customer', 'staff', 'system')),
  
  -- Macro tracking
  macro_id UUID REFERENCES public.support_macros(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_v2_ticket ON public.ticket_messages_v2(ticket_id);
CREATE INDEX idx_ticket_messages_v2_type ON public.ticket_messages_v2(message_type);

-- Enable RLS on ticket_messages_v2
ALTER TABLE public.ticket_messages_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all messages" ON public.ticket_messages_v2
  FOR SELECT USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can manage messages" ON public.ticket_messages_v2
  FOR ALL USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Customers can view their customer-visible messages" ON public.ticket_messages_v2
  FOR SELECT USING (
    message_type = 'customer_visible' AND
    EXISTS (
      SELECT 1 FROM public.support_tickets_v2 t
      WHERE t.id = ticket_messages_v2.ticket_id AND t.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can add messages to their tickets" ON public.ticket_messages_v2
  FOR INSERT WITH CHECK (
    message_type = 'customer_visible' AND
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.support_tickets_v2 t
      WHERE t.id = ticket_messages_v2.ticket_id AND t.customer_id = auth.uid()
    )
  );

-- 4. Create ticket_audit_log for full audit trail
CREATE TABLE public.ticket_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets_v2(id) ON DELETE CASCADE,
  
  -- Audit info
  action TEXT NOT NULL, -- created, status_changed, assigned, reassigned, escalated, closed, reply_sent, internal_note_added
  performed_by UUID NOT NULL,
  
  -- Change details
  old_value JSONB,
  new_value JSONB,
  note TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_audit_ticket ON public.ticket_audit_log(ticket_id);
CREATE INDEX idx_ticket_audit_action ON public.ticket_audit_log(action);
CREATE INDEX idx_ticket_audit_created ON public.ticket_audit_log(created_at DESC);

-- Enable RLS on ticket_audit_log
ALTER TABLE public.ticket_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view ticket audit logs" ON public.ticket_audit_log
  FOR SELECT USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can insert audit logs" ON public.ticket_audit_log
  FOR INSERT WITH CHECK (is_admin_or_staff(auth.uid()) OR auth.uid() = performed_by);

-- 5. Trigger to auto-reopen closed tickets on customer reply
CREATE OR REPLACE FUNCTION auto_reopen_ticket_on_reply()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_type = 'customer' AND NEW.message_type = 'customer_visible' THEN
    UPDATE public.support_tickets_v2
    SET status = 'in_progress', updated_at = now()
    WHERE id = NEW.ticket_id AND status = 'closed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER reopen_on_customer_reply
  AFTER INSERT ON public.ticket_messages_v2
  FOR EACH ROW
  WHEN (NEW.sender_type = 'customer')
  EXECUTE FUNCTION auto_reopen_ticket_on_reply();

-- 6. Trigger to track first response time
CREATE OR REPLACE FUNCTION set_first_response_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_type = 'staff' AND NEW.message_type = 'customer_visible' THEN
    UPDATE public.support_tickets_v2
    SET first_response_at = COALESCE(first_response_at, now()),
        updated_at = now()
    WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER track_first_response
  AFTER INSERT ON public.ticket_messages_v2
  FOR EACH ROW
  WHEN (NEW.sender_type = 'staff')
  EXECUTE FUNCTION set_first_response_time();

-- 7. Seed default macros
INSERT INTO public.support_macros (name, category, content, variables) VALUES
  ('ID Verification Required', 'general', 'Hi {customer_name},

To complete your booking verification, please upload a clear photo of your valid driver''s license. Make sure:
- The entire ID is visible
- All text is legible
- The photo is well-lit

You can upload this through your booking portal. Thank you!', '[{"name": "customer_name", "label": "Customer Name"}]'::jsonb),

  ('Security Deposit Info', 'billing', 'Hi {customer_name},

Regarding your security deposit for booking {booking_code}:

- Deposit amount: $500 (standard)
- This is a hold, not a charge
- Released within 5-7 business days after return
- Damage/violation charges may be deducted if applicable

Let me know if you have any questions!', '[{"name": "customer_name", "label": "Customer Name"}, {"name": "booking_code", "label": "Booking Code"}]'::jsonb),

  ('Extension Request', 'booking', 'Hi {customer_name},

I''ve received your extension request for booking {booking_code}.

Current return: {return_time}
Requested extension: [SPECIFY DURATION]

Availability and additional charges:
- Daily rate: [RATE]
- Extended total: [AMOUNT]

Please confirm if you''d like to proceed.', '[{"name": "customer_name", "label": "Customer Name"}, {"name": "booking_code", "label": "Booking Code"}, {"name": "return_time", "label": "Return Time"}]'::jsonb),

  ('Fuel Policy', 'ops', 'Hi {customer_name},

Our fuel policy for your rental at {location}:

- Vehicle will be provided with a full tank
- Please return with a full tank
- If returned less than full, refueling fee applies:
  - Current rate: $[X]/gallon + $25 service fee

Nearest gas stations are located [DIRECTIONS].', '[{"name": "customer_name", "label": "Customer Name"}, {"name": "location", "label": "Location"}]'::jsonb),

  ('Late Return Notice', 'ops', 'Hi {customer_name},

We noticed your return for booking {booking_code} is running late.

Scheduled return: {return_time}
Late fee structure:
- 0-30 min grace period
- 30min - 2hr: $25
- 2hr - 4hr: $50
- 4hr+: Additional day charged

Please contact us ASAP if you need an extension.', '[{"name": "customer_name", "label": "Customer Name"}, {"name": "booking_code", "label": "Booking Code"}, {"name": "return_time", "label": "Return Time"}]'::jsonb),

  ('Damage Claim Info', 'damage', 'Hi {customer_name},

This message is regarding damage reported on booking {booking_code}.

Incident details:
- Type: [DAMAGE TYPE]
- Location on vehicle: [LOCATION]
- Estimated repair: $[AMOUNT]

Next steps:
1. Review the damage photos in your portal
2. Contact your insurance if applicable
3. Respond with any questions within 48 hours

Our damage specialist will follow up shortly.', '[{"name": "customer_name", "label": "Customer Name"}, {"name": "booking_code", "label": "Booking Code"}]'::jsonb);

-- 8. Add incident_id to link incidents with tickets (for auto-creation)
-- Already included in support_tickets_v2

-- Enable realtime for support tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets_v2;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages_v2;
