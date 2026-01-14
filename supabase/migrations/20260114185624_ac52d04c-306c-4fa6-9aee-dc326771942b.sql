-- Create driver-licenses storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-licenses', 'driver-licenses', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload to their own folder
CREATE POLICY "Users can upload their own license"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-licenses' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own license
CREATE POLICY "Users can view their own license"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'driver-licenses' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update/replace their own license
CREATE POLICY "Users can update their own license"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'driver-licenses' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Admin/staff can view all licenses
CREATE POLICY "Staff can view all licenses"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'driver-licenses' 
  AND public.is_admin_or_staff(auth.uid())
);