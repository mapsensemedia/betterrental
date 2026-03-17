
-- Add unique partial index on profiles.email to prevent duplicate email profiles
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique 
ON public.profiles (email) 
WHERE email IS NOT NULL;
