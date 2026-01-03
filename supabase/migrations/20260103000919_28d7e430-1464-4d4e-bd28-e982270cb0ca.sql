-- Create storage buckets for verification documents and condition photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('condition-photos', 'condition-photos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for verification-documents bucket
CREATE POLICY "Users can upload their own verification documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own verification documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admin can view all verification documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-documents' 
  AND is_admin_or_staff(auth.uid())
);

-- RLS policies for condition-photos bucket
CREATE POLICY "Users can upload their own condition photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'condition-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own condition photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'condition-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admin can view all condition photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'condition-photos' 
  AND is_admin_or_staff(auth.uid())
);