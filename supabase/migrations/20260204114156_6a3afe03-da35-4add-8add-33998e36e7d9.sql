-- Add driver license number and address fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS driver_license_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;