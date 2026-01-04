-- Storage policies for verification-documents bucket (driver's license uploads)
-- Users can upload their own verification documents
CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own verification documents
CREATE POLICY "Users can view own verification documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own verification documents
CREATE POLICY "Users can update own verification documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Staff/Admin can view all verification documents
CREATE POLICY "Staff can view all verification documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-documents' 
  AND public.is_admin_or_staff(auth.uid())
);

-- Storage policies for condition-photos bucket (vehicle condition photos)
-- Staff can upload condition photos
CREATE POLICY "Staff can upload condition photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'condition-photos' 
  AND public.is_admin_or_staff(auth.uid())
);

-- Staff can view all condition photos
CREATE POLICY "Staff can view condition photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'condition-photos' 
  AND public.is_admin_or_staff(auth.uid())
);

-- Staff can update condition photos
CREATE POLICY "Staff can update condition photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'condition-photos' 
  AND public.is_admin_or_staff(auth.uid())
);

-- Staff can delete condition photos
CREATE POLICY "Staff can delete condition photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'condition-photos' 
  AND public.is_admin_or_staff(auth.uid())
);

-- Customers can view condition photos for their own bookings (via signed URLs in code)