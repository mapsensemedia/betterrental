-- Create expense-receipts storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('expense-receipts', 'expense-receipts', false);

-- Create storage policies for expense receipts
CREATE POLICY "Admin staff can upload receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'expense-receipts' AND is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can view receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'expense-receipts' AND is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin staff can delete receipts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'expense-receipts' AND is_admin_or_staff(auth.uid()));