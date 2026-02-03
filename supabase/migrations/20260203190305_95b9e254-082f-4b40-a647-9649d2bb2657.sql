-- Create membership_tiers table
CREATE TABLE IF NOT EXISTS public.membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 0,
  benefits JSONB DEFAULT '[]'::jsonb,
  color TEXT DEFAULT '#CD7F32',
  icon TEXT DEFAULT 'medal',
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default tiers
INSERT INTO public.membership_tiers (name, display_name, min_points, benefits, color, icon, sort_order)
VALUES 
  ('bronze', 'Bronze', 0, '["5% bonus points", "Birthday reward"]'::jsonb, '#CD7F32', 'medal', 1),
  ('silver', 'Silver', 5000, '["10% bonus points", "Priority support", "Free GPS on rentals"]'::jsonb, '#C0C0C0', 'award', 2),
  ('gold', 'Gold', 15000, '["15% bonus points", "Free upgrades", "Dedicated support line"]'::jsonb, '#FFD700', 'crown', 3),
  ('platinum', 'Platinum', 30000, '["25% bonus points", "Exclusive offers", "VIP lounge access"]'::jsonb, '#E5E4E2', 'gem', 4)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.membership_tiers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view tiers" 
ON public.membership_tiers 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can modify tiers" 
ON public.membership_tiers 
FOR ALL 
USING (is_admin_or_staff(auth.uid()));

-- Add to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.membership_tiers;