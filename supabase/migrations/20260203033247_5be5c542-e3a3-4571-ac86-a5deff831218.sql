-- First, add the support value to enum (standalone)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'support' 
    AND enumtypid = 'app_role'::regtype
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'support';
  END IF;
END $$;