CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: alert_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alert_status AS ENUM (
    'pending',
    'acknowledged',
    'resolved'
);


--
-- Name: alert_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alert_type AS ENUM (
    'verification_pending',
    'payment_pending',
    'cleaning_required',
    'damage_reported',
    'late_return',
    'hold_expiring'
);


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'confirmed',
    'active',
    'completed',
    'cancelled'
);


--
-- Name: damage_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.damage_severity AS ENUM (
    'minor',
    'moderate',
    'severe'
);


--
-- Name: hold_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.hold_status AS ENUM (
    'active',
    'expired',
    'converted'
);


--
-- Name: receipt_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.receipt_status AS ENUM (
    'draft',
    'issued',
    'voided'
);


--
-- Name: staff_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.staff_role AS ENUM (
    'admin',
    'staff',
    'cleaner',
    'finance'
);


--
-- Name: ticket_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_status AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'closed'
);


--
-- Name: verification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.verification_status AS ENUM (
    'pending',
    'verified',
    'rejected'
);


--
-- Name: generate_booking_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_booking_code() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: set_booking_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_booking_code() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.booking_code IS NULL OR NEW.booking_code = '' THEN
    NEW.booking_code := generate_booking_code();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: add_ons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.add_ons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    daily_rate numeric(10,2) NOT NULL,
    one_time_fee numeric(10,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    vehicle_id uuid,
    user_id uuid,
    alert_type public.alert_type NOT NULL,
    title text NOT NULL,
    message text,
    status public.alert_status DEFAULT 'pending'::public.alert_status NOT NULL,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: booking_add_ons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_add_ons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    add_on_id uuid NOT NULL,
    quantity integer DEFAULT 1,
    price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_code text NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    location_id uuid NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    actual_return_at timestamp with time zone,
    status public.booking_status DEFAULT 'pending'::public.booking_status NOT NULL,
    daily_rate numeric(10,2) NOT NULL,
    total_days integer NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0,
    deposit_amount numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) NOT NULL,
    pickup_address text,
    pickup_place_id text,
    pickup_lat numeric(10,8),
    pickup_lng numeric(11,8),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: condition_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.condition_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    phase text NOT NULL,
    photo_type text NOT NULL,
    photo_url text NOT NULL,
    captured_by uuid NOT NULL,
    captured_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    CONSTRAINT condition_photos_phase_check CHECK ((phase = ANY (ARRAY['pickup'::text, 'return'::text])))
);


--
-- Name: damage_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.damage_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    reported_by uuid NOT NULL,
    severity public.damage_severity NOT NULL,
    location_on_vehicle text NOT NULL,
    description text NOT NULL,
    photo_urls jsonb DEFAULT '[]'::jsonb,
    estimated_cost numeric(10,2),
    status text DEFAULT 'under_review'::text NOT NULL,
    resolution_notes text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inspection_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspection_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    phase text NOT NULL,
    fuel_level integer,
    odometer integer,
    exterior_notes text,
    interior_notes text,
    recorded_by uuid NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inspection_metrics_phase_check CHECK ((phase = ANY (ARRAY['pickup'::text, 'return'::text])))
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    place_id text,
    lat numeric(10,8),
    lng numeric(11,8),
    phone text,
    email text,
    hours_json jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_type text NOT NULL,
    payment_method text,
    transaction_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    phone text,
    avatar_url text,
    role public.staff_role,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: receipt_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipt_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    receipt_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    action text NOT NULL,
    meta_json jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    receipt_number text NOT NULL,
    status public.receipt_status DEFAULT 'draft'::public.receipt_status NOT NULL,
    currency text DEFAULT 'USD'::text,
    line_items_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    totals_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text,
    issued_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reservation_holds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservation_holds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    status public.hold_status DEFAULT 'active'::public.hold_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ticket_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    is_staff boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    user_id uuid NOT NULL,
    subject text NOT NULL,
    status public.ticket_status DEFAULT 'open'::public.ticket_status NOT NULL,
    priority text DEFAULT 'normal'::text,
    assigned_to uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid,
    make text NOT NULL,
    model text NOT NULL,
    year integer NOT NULL,
    category text NOT NULL,
    daily_rate numeric(10,2) NOT NULL,
    image_url text,
    images_json jsonb DEFAULT '[]'::jsonb,
    features_json jsonb DEFAULT '[]'::jsonb,
    specs_json jsonb DEFAULT '{}'::jsonb,
    seats integer DEFAULT 5,
    fuel_type text DEFAULT 'Petrol'::text,
    transmission text DEFAULT 'Automatic'::text,
    cleaning_buffer_hours integer DEFAULT 2,
    is_available boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: verification_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    booking_id uuid,
    document_type text NOT NULL,
    document_url text NOT NULL,
    status public.verification_status DEFAULT 'pending'::public.verification_status NOT NULL,
    reviewer_notes text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: add_ons add_ons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.add_ons
    ADD CONSTRAINT add_ons_pkey PRIMARY KEY (id);


--
-- Name: admin_alerts admin_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_alerts
    ADD CONSTRAINT admin_alerts_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: booking_add_ons booking_add_ons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_add_ons
    ADD CONSTRAINT booking_add_ons_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_booking_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_booking_code_key UNIQUE (booking_code);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: condition_photos condition_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_photos
    ADD CONSTRAINT condition_photos_pkey PRIMARY KEY (id);


--
-- Name: damage_reports damage_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.damage_reports
    ADD CONSTRAINT damage_reports_pkey PRIMARY KEY (id);


--
-- Name: inspection_metrics inspection_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_metrics
    ADD CONSTRAINT inspection_metrics_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: receipt_events receipt_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_events
    ADD CONSTRAINT receipt_events_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_receipt_number_key UNIQUE (receipt_number);


--
-- Name: reservation_holds reservation_holds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_holds
    ADD CONSTRAINT reservation_holds_pkey PRIMARY KEY (id);


--
-- Name: ticket_messages ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: verification_requests verification_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_requests
    ADD CONSTRAINT verification_requests_pkey PRIMARY KEY (id);


--
-- Name: idx_alerts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerts_status ON public.admin_alerts USING btree (status);


--
-- Name: idx_bookings_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_code ON public.bookings USING btree (booking_code);


--
-- Name: idx_bookings_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_dates ON public.bookings USING btree (start_at, end_at);


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_bookings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_user ON public.bookings USING btree (user_id);


--
-- Name: idx_bookings_vehicle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_vehicle ON public.bookings USING btree (vehicle_id);


--
-- Name: idx_holds_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holds_dates ON public.reservation_holds USING btree (start_at, end_at);


--
-- Name: idx_holds_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holds_status ON public.reservation_holds USING btree (status);


--
-- Name: idx_holds_vehicle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holds_vehicle ON public.reservation_holds USING btree (vehicle_id);


--
-- Name: idx_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_status ON public.tickets USING btree (status);


--
-- Name: idx_tickets_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_user ON public.tickets USING btree (user_id);


--
-- Name: idx_vehicles_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_available ON public.vehicles USING btree (is_available);


--
-- Name: idx_vehicles_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_category ON public.vehicles USING btree (category);


--
-- Name: idx_vehicles_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_location ON public.vehicles USING btree (location_id);


--
-- Name: bookings trigger_set_booking_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_booking_code BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_booking_code();


--
-- Name: bookings update_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: locations update_locations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: receipts update_receipts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tickets update_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vehicles update_vehicles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_alerts admin_alerts_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_alerts
    ADD CONSTRAINT admin_alerts_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: admin_alerts admin_alerts_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_alerts
    ADD CONSTRAINT admin_alerts_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: booking_add_ons booking_add_ons_add_on_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_add_ons
    ADD CONSTRAINT booking_add_ons_add_on_id_fkey FOREIGN KEY (add_on_id) REFERENCES public.add_ons(id);


--
-- Name: booking_add_ons booking_add_ons_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_add_ons
    ADD CONSTRAINT booking_add_ons_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: bookings bookings_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: condition_photos condition_photos_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_photos
    ADD CONSTRAINT condition_photos_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: damage_reports damage_reports_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.damage_reports
    ADD CONSTRAINT damage_reports_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: damage_reports damage_reports_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.damage_reports
    ADD CONSTRAINT damage_reports_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: inspection_metrics inspection_metrics_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_metrics
    ADD CONSTRAINT inspection_metrics_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: payments payments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: receipt_events receipt_events_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_events
    ADD CONSTRAINT receipt_events_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE CASCADE;


--
-- Name: receipts receipts_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: reservation_holds reservation_holds_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_holds
    ADD CONSTRAINT reservation_holds_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: ticket_messages ticket_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: vehicles vehicles_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: verification_requests verification_requests_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_requests
    ADD CONSTRAINT verification_requests_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: add_ons Add-ons are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Add-ons are publicly readable" ON public.add_ons FOR SELECT USING (true);


--
-- Name: locations Locations are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Locations are publicly readable" ON public.locations FOR SELECT USING (true);


--
-- Name: booking_add_ons Users can add add-ons to their bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add add-ons to their bookings" ON public.booking_add_ons FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.bookings
  WHERE ((bookings.id = booking_add_ons.booking_id) AND (bookings.user_id = auth.uid())))));


--
-- Name: ticket_messages Users can add messages to their tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add messages to their tickets" ON public.ticket_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.tickets
  WHERE ((tickets.id = ticket_messages.ticket_id) AND (tickets.user_id = auth.uid())))));


--
-- Name: condition_photos Users can add photos to their bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add photos to their bookings" ON public.condition_photos FOR INSERT WITH CHECK ((auth.uid() = captured_by));


--
-- Name: bookings Users can create their own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own bookings" ON public.bookings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: reservation_holds Users can create their own holds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own holds" ON public.reservation_holds FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: payments Users can create their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own payments" ON public.payments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tickets Users can create their own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own tickets" ON public.tickets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: verification_requests Users can create their own verifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own verifications" ON public.verification_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: bookings Users can update their own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bookings" ON public.bookings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: reservation_holds Users can update their own holds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own holds" ON public.reservation_holds FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: tickets Users can update their own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own tickets" ON public.tickets FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: admin_alerts Users can view alerts for their bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view alerts for their bookings" ON public.admin_alerts FOR SELECT USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.bookings
  WHERE ((bookings.id = admin_alerts.booking_id) AND (bookings.user_id = auth.uid()))))));


--
-- Name: receipt_events Users can view events for their receipts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view events for their receipts" ON public.receipt_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.receipts r
     JOIN public.bookings b ON ((b.id = r.booking_id)))
  WHERE ((r.id = receipt_events.receipt_id) AND (b.user_id = auth.uid()) AND (r.status = 'issued'::public.receipt_status)))));


--
-- Name: ticket_messages Users can view messages on their tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages on their tickets" ON public.ticket_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.tickets
  WHERE ((tickets.id = ticket_messages.ticket_id) AND (tickets.user_id = auth.uid())))));


--
-- Name: booking_add_ons Users can view their booking add-ons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their booking add-ons" ON public.booking_add_ons FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.bookings
  WHERE ((bookings.id = booking_add_ons.booking_id) AND (bookings.user_id = auth.uid())))));


--
-- Name: damage_reports Users can view their booking damages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their booking damages" ON public.damage_reports FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.bookings
  WHERE ((bookings.id = damage_reports.booking_id) AND (bookings.user_id = auth.uid())))));


--
-- Name: inspection_metrics Users can view their booking inspections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their booking inspections" ON public.inspection_metrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.bookings
  WHERE ((bookings.id = inspection_metrics.booking_id) AND (bookings.user_id = auth.uid())))));


--
-- Name: condition_photos Users can view their booking photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their booking photos" ON public.condition_photos FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.bookings
  WHERE ((bookings.id = condition_photos.booking_id) AND (bookings.user_id = auth.uid())))));


--
-- Name: receipts Users can view their issued receipts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their issued receipts" ON public.receipts FOR SELECT USING (((status = 'issued'::public.receipt_status) AND (EXISTS ( SELECT 1
   FROM public.bookings
  WHERE ((bookings.id = receipts.booking_id) AND (bookings.user_id = auth.uid()))))));


--
-- Name: audit_logs Users can view their own audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: bookings Users can view their own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: reservation_holds Users can view their own holds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own holds" ON public.reservation_holds FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: payments Users can view their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: tickets Users can view their own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own tickets" ON public.tickets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: verification_requests Users can view their own verifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own verifications" ON public.verification_requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: vehicles Vehicles are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Vehicles are publicly readable" ON public.vehicles FOR SELECT USING (true);


--
-- Name: add_ons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.add_ons ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_add_ons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_add_ons ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: condition_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.condition_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: damage_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: inspection_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inspection_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: receipt_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.receipt_events ENABLE ROW LEVEL SECURITY;

--
-- Name: receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: reservation_holds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reservation_holds ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;