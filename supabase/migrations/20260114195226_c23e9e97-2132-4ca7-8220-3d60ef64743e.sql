-- Add policy for staff to upload licenses for any user
CREATE POLICY "Staff can upload licenses for any user"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-licenses' 
  AND is_admin_or_staff(auth.uid())
);

-- Add policy for staff to update licenses for any user
CREATE POLICY "Staff can update licenses for any user"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'driver-licenses' 
  AND is_admin_or_staff(auth.uid())
);