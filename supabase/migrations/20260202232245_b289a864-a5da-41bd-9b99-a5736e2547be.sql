-- Add signature asset columns to rental_agreements
ALTER TABLE public.rental_agreements
ADD COLUMN IF NOT EXISTS signature_png_url TEXT,
ADD COLUMN IF NOT EXISTS signature_vector_json JSONB,
ADD COLUMN IF NOT EXISTS signature_method TEXT,
ADD COLUMN IF NOT EXISTS signature_device_info JSONB,
ADD COLUMN IF NOT EXISTS signature_workstation_id TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.rental_agreements.signature_method IS 'webhid_pad, onscreen_pen_touch, onscreen_mouse, typed';
COMMENT ON COLUMN public.rental_agreements.signature_vector_json IS 'Stores strokes as array of {points: [{x,y,t,pressure?,pointerType?}]}';
COMMENT ON COLUMN public.rental_agreements.signature_device_info IS 'Browser UA, OS, platform info for audit';
COMMENT ON COLUMN public.rental_agreements.signature_workstation_id IS 'Unique local workstation identifier';

-- Create storage bucket for signature assets if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for signatures bucket - staff only (using is_admin_or_staff function)
CREATE POLICY "Staff can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'signatures' AND
  is_admin_or_staff(auth.uid())
);

CREATE POLICY "Staff can view signatures"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'signatures' AND
  is_admin_or_staff(auth.uid())
);

CREATE POLICY "Staff can delete signatures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'signatures' AND
  is_admin_or_staff(auth.uid())
);