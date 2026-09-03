CREATE TABLE public.booking_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_user_id UUID,
  label TEXT NOT NULL,
  notes TEXT,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  uploaded_by UUID,
  uploaded_at_location_id UUID REFERENCES public.locations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

CREATE INDEX idx_booking_documents_booking ON public.booking_documents(booking_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_booking_documents_customer ON public.booking_documents(customer_user_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_documents TO authenticated;
GRANT ALL ON public.booking_documents TO service_role;

ALTER TABLE public.booking_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view booking documents in their branch"
ON public.booking_documents FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.is_active_staff(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_documents.booking_id
        AND public.can_access_location(auth.uid(), b.location_id)
    )
  )
);

CREATE POLICY "Staff can add booking documents in their branch"
ON public.booking_documents FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.is_active_staff(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_documents.booking_id
        AND public.can_access_location(auth.uid(), b.location_id)
    )
  )
);

CREATE POLICY "Staff can update booking documents in their branch"
ON public.booking_documents FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.is_active_staff(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_documents.booking_id
        AND public.can_access_location(auth.uid(), b.location_id)
    )
  )
);

CREATE POLICY "Staff can read booking-documents files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'booking-documents'
  AND (public.is_super_admin(auth.uid()) OR public.is_active_staff(auth.uid()))
);

CREATE POLICY "Staff can upload booking-documents files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'booking-documents'
  AND (public.is_super_admin(auth.uid()) OR public.is_active_staff(auth.uid()))
);

CREATE POLICY "Staff can delete booking-documents files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'booking-documents'
  AND (public.is_super_admin(auth.uid()) OR public.is_active_staff(auth.uid()))
);