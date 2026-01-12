-- Create ticket-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create policies for ticket-attachments bucket
CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "Authenticated users can view ticket attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Admins and staff can delete ticket attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'ticket-attachments' AND public.is_admin_or_staff(auth.uid()));