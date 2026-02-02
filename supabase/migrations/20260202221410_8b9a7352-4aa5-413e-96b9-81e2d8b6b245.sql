-- Create system_settings table for admin-configurable settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for fuel pricing calculations)
CREATE POLICY "Settings are viewable by everyone" 
ON public.system_settings 
FOR SELECT 
USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings" 
ON public.system_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Insert default fuel pricing
INSERT INTO public.system_settings (key, value, description) VALUES
  ('fuel_market_rate', '1.85', 'Market fuel price per liter in CAD'),
  ('fuel_discount_cents', '5', 'Our discount below market rate in cents per liter')
ON CONFLICT (key) DO NOTHING;