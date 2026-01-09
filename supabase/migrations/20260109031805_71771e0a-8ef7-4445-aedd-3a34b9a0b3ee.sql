-- Create table for abandoned carts
CREATE TABLE public.abandoned_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL, -- May be null if user filled info but not logged in
  session_id TEXT NOT NULL, -- Browser session identifier
  email TEXT NULL,
  phone TEXT NULL,
  first_name TEXT NULL,
  last_name TEXT NULL,
  vehicle_id UUID NULL REFERENCES public.vehicles(id),
  pickup_date TIMESTAMP WITH TIME ZONE NULL,
  return_date TIMESTAMP WITH TIME ZONE NULL,
  location_id UUID NULL REFERENCES public.locations(id),
  delivery_mode TEXT NULL,
  delivery_address TEXT NULL,
  protection TEXT NULL,
  add_on_ids TEXT[] NULL,
  total_amount NUMERIC NULL,
  cart_data JSONB NULL DEFAULT '{}', -- Store full cart state
  abandoned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted_at TIMESTAMP WITH TIME ZONE NULL, -- Filled when booking is completed
  contacted_at TIMESTAMP WITH TIME ZONE NULL, -- For outreach tracking
  contact_notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient querying
CREATE INDEX idx_abandoned_carts_email ON public.abandoned_carts(email);
CREATE INDEX idx_abandoned_carts_phone ON public.abandoned_carts(phone);
CREATE INDEX idx_abandoned_carts_session ON public.abandoned_carts(session_id);
CREATE INDEX idx_abandoned_carts_abandoned_at ON public.abandoned_carts(abandoned_at);

-- Enable RLS
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- Only admin/staff can view and manage abandoned carts
CREATE POLICY "Admin staff can view all abandoned carts"
ON public.abandoned_carts
FOR SELECT
USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can update abandoned carts"
ON public.abandoned_carts
FOR UPDATE
USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can delete abandoned carts"
ON public.abandoned_carts
FOR DELETE
USING (is_admin_or_staff(auth.uid()));

-- Allow service role and any user to insert (for cart tracking)
CREATE POLICY "Anyone can insert abandoned carts"
ON public.abandoned_carts
FOR INSERT
WITH CHECK (true);

-- Create function to update timestamps
CREATE TRIGGER update_abandoned_carts_updated_at
BEFORE UPDATE ON public.abandoned_carts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();