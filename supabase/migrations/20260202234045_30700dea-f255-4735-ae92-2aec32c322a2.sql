-- Membership tiers enum
CREATE TYPE public.membership_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- Membership status enum
CREATE TYPE public.membership_status AS ENUM ('active', 'suspended', 'inactive');

-- Points transaction type enum
CREATE TYPE public.points_transaction_type AS ENUM ('earn', 'redeem', 'adjust', 'expire', 'reverse');

-- Offer type enum
CREATE TYPE public.offer_type AS ENUM ('percent_off', 'dollar_off', 'free_addon', 'free_upgrade');

-- Add membership fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS member_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS points_balance INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS membership_tier membership_tier DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS membership_joined_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS membership_status membership_status DEFAULT 'active';

-- Create index on member_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_member_id ON public.profiles(member_id);

-- Points ledger table (immutable transaction log)
CREATE TABLE public.points_ledger (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    transaction_type points_transaction_type NOT NULL,
    points INTEGER NOT NULL,
    money_value NUMERIC(10,2),
    balance_after INTEGER NOT NULL,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for points ledger
CREATE INDEX idx_points_ledger_user_id ON public.points_ledger(user_id);
CREATE INDEX idx_points_ledger_booking_id ON public.points_ledger(booking_id);
CREATE INDEX idx_points_ledger_created_at ON public.points_ledger(created_at DESC);
CREATE INDEX idx_points_ledger_expires_at ON public.points_ledger(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS on points ledger
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;

-- Users can view their own points history
CREATE POLICY "Users can view own points"
ON public.points_ledger FOR SELECT
USING (auth.uid() = user_id);

-- Staff can view all points
CREATE POLICY "Staff can view all points"
ON public.points_ledger FOR SELECT
USING (public.is_admin_or_staff(auth.uid()));

-- Staff can insert points entries
CREATE POLICY "Staff can insert points"
ON public.points_ledger FOR INSERT
WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Points settings table (configurable by admin)
CREATE TABLE public.points_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID
);

-- Enable RLS
ALTER TABLE public.points_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read points settings"
ON public.points_settings FOR SELECT
USING (true);

-- Only staff can modify
CREATE POLICY "Staff can modify points settings"
ON public.points_settings FOR ALL
USING (public.is_admin_or_staff(auth.uid()));

-- Insert default settings
INSERT INTO public.points_settings (setting_key, setting_value, description) VALUES
('earn_rate', '{"points_per_dollar": 10}', 'Points earned per dollar spent'),
('earn_base', '{"include_addons": true, "exclude_taxes": true}', 'What to include in points calculation'),
('redeem_rate', '{"points_per_dollar": 100}', 'Points required to get $1 discount'),
('redeem_rules', '{"min_points": 100, "max_percent_of_total": 50}', 'Redemption limits'),
('expiration', '{"enabled": false, "months": 12}', 'Points expiration settings');

-- Offers table
CREATE TABLE public.points_offers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    offer_type offer_type NOT NULL,
    offer_value NUMERIC(10,2) NOT NULL,
    points_required INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    min_rental_days INTEGER,
    eligible_categories UUID[],
    eligible_locations UUID[],
    max_uses_total INTEGER,
    max_uses_per_user INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID
);

-- Indexes for offers
CREATE INDEX idx_points_offers_active ON public.points_offers(is_active) WHERE is_active = true;
CREATE INDEX idx_points_offers_valid ON public.points_offers(valid_from, valid_until);

-- Enable RLS
ALTER TABLE public.points_offers ENABLE ROW LEVEL SECURITY;

-- Anyone can view active offers
CREATE POLICY "Anyone can view active offers"
ON public.points_offers FOR SELECT
USING (is_active = true OR public.is_admin_or_staff(auth.uid()));

-- Staff can manage offers
CREATE POLICY "Staff can manage offers"
ON public.points_offers FOR ALL
USING (public.is_admin_or_staff(auth.uid()));

-- Offer redemptions tracking
CREATE TABLE public.offer_redemptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    offer_id UUID NOT NULL REFERENCES public.points_offers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    points_spent INTEGER NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(offer_id, booking_id)
);

-- Indexes
CREATE INDEX idx_offer_redemptions_user ON public.offer_redemptions(user_id);
CREATE INDEX idx_offer_redemptions_offer ON public.offer_redemptions(offer_id);

-- Enable RLS
ALTER TABLE public.offer_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own redemptions
CREATE POLICY "Users can view own redemptions"
ON public.offer_redemptions FOR SELECT
USING (auth.uid() = user_id);

-- Staff can view/manage all
CREATE POLICY "Staff can manage redemptions"
ON public.offer_redemptions FOR ALL
USING (public.is_admin_or_staff(auth.uid()));

-- Function to safely add/subtract points with concurrency protection
CREATE OR REPLACE FUNCTION public.update_points_balance(
    p_user_id UUID,
    p_points INTEGER,
    p_booking_id UUID DEFAULT NULL,
    p_transaction_type points_transaction_type DEFAULT 'earn',
    p_money_value NUMERIC DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(new_balance INTEGER, ledger_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_ledger_id UUID;
BEGIN
    -- Lock the row for update to prevent race conditions
    SELECT points_balance INTO v_current_balance
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;
    
    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    v_new_balance := v_current_balance + p_points;
    
    -- Prevent negative balance
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient points balance';
    END IF;
    
    -- Update balance
    UPDATE profiles
    SET points_balance = v_new_balance,
        updated_at = now()
    WHERE id = p_user_id;
    
    -- Insert ledger entry
    INSERT INTO points_ledger (
        user_id, booking_id, transaction_type, points, 
        money_value, balance_after, notes, created_by, expires_at
    )
    VALUES (
        p_user_id, p_booking_id, p_transaction_type, p_points,
        p_money_value, v_new_balance, p_notes, p_created_by, p_expires_at
    )
    RETURNING id INTO v_ledger_id;
    
    RETURN QUERY SELECT v_new_balance, v_ledger_id;
END;
$$;

-- Function to generate member ID
CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.member_id IS NULL THEN
        NEW.member_id := 'MBR-' || UPPER(SUBSTRING(MD5(NEW.id::TEXT || now()::TEXT) FROM 1 FOR 8));
        NEW.membership_joined_at := now();
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger to auto-generate member ID on profile creation
DROP TRIGGER IF EXISTS trigger_generate_member_id ON public.profiles;
CREATE TRIGGER trigger_generate_member_id
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    WHEN (NEW.member_id IS NULL)
    EXECUTE FUNCTION public.generate_member_id();

-- Update existing profiles with member IDs
UPDATE public.profiles
SET member_id = 'MBR-' || UPPER(SUBSTRING(MD5(id::TEXT || created_at::TEXT) FROM 1 FOR 8)),
    membership_joined_at = created_at
WHERE member_id IS NULL;