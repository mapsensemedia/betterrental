-- Step 1: Drop the restrictive SELECT/UPDATE policies on abandoned_carts
DROP POLICY IF EXISTS "Admin and staff can view abandoned carts" ON public.abandoned_carts;
DROP POLICY IF EXISTS "Admin and staff can update abandoned carts" ON public.abandoned_carts;

-- Step 2: Create new permissive policies for session-based cart tracking
-- Allow anyone to read carts (for session-based lookup)
CREATE POLICY "Anyone can read carts for session tracking"
ON public.abandoned_carts FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anyone to update carts (for saving checkout progress)
CREATE POLICY "Anyone can update carts for session tracking"
ON public.abandoned_carts FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);