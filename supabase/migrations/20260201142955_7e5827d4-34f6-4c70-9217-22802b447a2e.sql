-- Create storage bucket for category images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view category images
CREATE POLICY "Category images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

-- Allow admin/staff to upload category images
CREATE POLICY "Admin staff can upload category images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'category-images' AND is_admin_or_staff(auth.uid()));

-- Allow admin/staff to update category images
CREATE POLICY "Admin staff can update category images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'category-images' AND is_admin_or_staff(auth.uid()));

-- Allow admin/staff to delete category images
CREATE POLICY "Admin staff can delete category images"
ON storage.objects FOR DELETE
USING (bucket_id = 'category-images' AND is_admin_or_staff(auth.uid()));