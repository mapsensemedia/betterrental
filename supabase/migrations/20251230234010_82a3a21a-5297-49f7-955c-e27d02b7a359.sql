-- Create enums
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE hold_status AS ENUM ('active', 'expired', 'converted');
CREATE TYPE damage_severity AS ENUM ('minor', 'moderate', 'severe');
CREATE TYPE alert_type AS ENUM ('verification_pending', 'payment_pending', 'cleaning_required', 'damage_reported', 'late_return', 'hold_expiring');
CREATE TYPE alert_status AS ENUM ('pending', 'acknowledged', 'resolved');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE receipt_status AS ENUM ('draft', 'issued', 'voided');
CREATE TYPE staff_role AS ENUM ('admin', 'staff', 'cleaner', 'finance');

-- Locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  place_id TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  phone TEXT,
  email TEXT,
  hours_json JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES public.locations(id),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  category TEXT NOT NULL,
  daily_rate DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  images_json JSONB DEFAULT '[]',
  features_json JSONB DEFAULT '[]',
  specs_json JSONB DEFAULT '{}',
  seats INTEGER DEFAULT 5,
  fuel_type TEXT DEFAULT 'Petrol',
  transmission TEXT DEFAULT 'Automatic',
  cleaning_buffer_hours INTEGER DEFAULT 2,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add-ons table
CREATE TABLE public.add_ons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  daily_rate DECIMAL(10, 2) NOT NULL,
  one_time_fee DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  location_id UUID REFERENCES public.locations(id) NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_return_at TIMESTAMP WITH TIME ZONE,
  status booking_status NOT NULL DEFAULT 'pending',
  daily_rate DECIMAL(10, 2) NOT NULL,
  total_days INTEGER NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  deposit_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  pickup_address TEXT,
  pickup_place_id TEXT,
  pickup_lat DECIMAL(10, 8),
  pickup_lng DECIMAL(11, 8),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Booking add-ons junction table
CREATE TABLE public.booking_add_ons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  add_on_id UUID REFERENCES public.add_ons(id) NOT NULL,
  quantity INTEGER DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reservation holds table
CREATE TABLE public.reservation_holds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status hold_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Verification requests table
CREATE TABLE public.verification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status verification_status NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) NOT NULL,
  user_id UUID NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_type TEXT NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Condition photos table
CREATE TABLE public.condition_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('pickup', 'return')),
  photo_type TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  captured_by UUID NOT NULL,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Inspection metrics table
CREATE TABLE public.inspection_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('pickup', 'return')),
  fuel_level INTEGER,
  odometer INTEGER,
  exterior_notes TEXT,
  interior_notes TEXT,
  recorded_by UUID NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Damage reports table
CREATE TABLE public.damage_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  reported_by UUID NOT NULL,
  severity damage_severity NOT NULL,
  location_on_vehicle TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_urls JSONB DEFAULT '[]',
  estimated_cost DECIMAL(10, 2),
  status TEXT NOT NULL DEFAULT 'under_review',
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Admin alerts table
CREATE TABLE public.admin_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  user_id UUID,
  alert_type alert_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  status alert_status NOT NULL DEFAULT 'pending',
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ticket messages table
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_staff BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Receipts table
CREATE TABLE public.receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) NOT NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  status receipt_status NOT NULL DEFAULT 'draft',
  currency TEXT DEFAULT 'USD',
  line_items_json JSONB NOT NULL DEFAULT '[]',
  totals_json JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  issued_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Receipt events table
CREATE TABLE public.receipt_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE CASCADE NOT NULL,
  actor_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  meta_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role staff_role,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_vehicles_location ON public.vehicles(location_id);
CREATE INDEX idx_vehicles_category ON public.vehicles(category);
CREATE INDEX idx_vehicles_available ON public.vehicles(is_available);
CREATE INDEX idx_bookings_user ON public.bookings(user_id);
CREATE INDEX idx_bookings_vehicle ON public.bookings(vehicle_id);
CREATE INDEX idx_bookings_dates ON public.bookings(start_at, end_at);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_code ON public.bookings(booking_code);
CREATE INDEX idx_holds_vehicle ON public.reservation_holds(vehicle_id);
CREATE INDEX idx_holds_dates ON public.reservation_holds(start_at, end_at);
CREATE INDEX idx_holds_status ON public.reservation_holds(status);
CREATE INDEX idx_alerts_status ON public.admin_alerts(status);
CREATE INDEX idx_tickets_user ON public.tickets(user_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);

-- Enable RLS on all tables
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Public read policies for locations, vehicles, add-ons
CREATE POLICY "Locations are publicly readable" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Vehicles are publicly readable" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Add-ons are publicly readable" ON public.add_ons FOR SELECT USING (true);

-- User policies for bookings
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);

-- User policies for holds
CREATE POLICY "Users can view their own holds" ON public.reservation_holds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own holds" ON public.reservation_holds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own holds" ON public.reservation_holds FOR UPDATE USING (auth.uid() = user_id);

-- User policies for verification
CREATE POLICY "Users can view their own verifications" ON public.verification_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own verifications" ON public.verification_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User policies for payments
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User policies for condition photos
CREATE POLICY "Users can view their booking photos" ON public.condition_photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = condition_photos.booking_id AND bookings.user_id = auth.uid())
);
CREATE POLICY "Users can add photos to their bookings" ON public.condition_photos FOR INSERT WITH CHECK (auth.uid() = captured_by);

-- User policies for inspection metrics
CREATE POLICY "Users can view their booking inspections" ON public.inspection_metrics FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = inspection_metrics.booking_id AND bookings.user_id = auth.uid())
);

-- User policies for damage reports (read-only for customers)
CREATE POLICY "Users can view their booking damages" ON public.damage_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = damage_reports.booking_id AND bookings.user_id = auth.uid())
);

-- User policies for tickets
CREATE POLICY "Users can view their own tickets" ON public.tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tickets" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tickets" ON public.tickets FOR UPDATE USING (auth.uid() = user_id);

-- User policies for ticket messages
CREATE POLICY "Users can view messages on their tickets" ON public.ticket_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.user_id = auth.uid())
);
CREATE POLICY "Users can add messages to their tickets" ON public.ticket_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.user_id = auth.uid())
);

-- User policies for receipts (view issued only)
CREATE POLICY "Users can view their issued receipts" ON public.receipts FOR SELECT USING (
  status = 'issued' AND EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = receipts.booking_id AND bookings.user_id = auth.uid())
);

-- User policies for booking add-ons
CREATE POLICY "Users can view their booking add-ons" ON public.booking_add_ons FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_add_ons.booking_id AND bookings.user_id = auth.uid())
);
CREATE POLICY "Users can add add-ons to their bookings" ON public.booking_add_ons FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_add_ons.booking_id AND bookings.user_id = auth.uid())
);

-- Profile policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to generate booking codes
CREATE OR REPLACE FUNCTION generate_booking_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-generate booking code
CREATE OR REPLACE FUNCTION set_booking_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_code IS NULL OR NEW.booking_code = '' THEN
    NEW.booking_code := generate_booking_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_set_booking_code
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION set_booking_code();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();