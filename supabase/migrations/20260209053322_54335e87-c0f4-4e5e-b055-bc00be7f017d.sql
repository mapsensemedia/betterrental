-- Add missing RLS policies for admin/staff on booking_add_ons

-- Allow admin/staff to INSERT add-ons on any booking
CREATE POLICY "Admin staff can add booking add-ons"
ON public.booking_add_ons
FOR INSERT
WITH CHECK (is_admin_or_staff(auth.uid()));

-- Allow admin/staff to DELETE add-ons from any booking
CREATE POLICY "Admin staff can delete booking add-ons"
ON public.booking_add_ons
FOR DELETE
USING (is_admin_or_staff(auth.uid()));

-- Allow admin/staff to UPDATE booking add-ons
CREATE POLICY "Admin staff can update booking add-ons"
ON public.booking_add_ons
FOR UPDATE
USING (is_admin_or_staff(auth.uid()));

-- Also allow the booking owner to DELETE their own add-ons
CREATE POLICY "Users can delete their own booking add-ons"
ON public.booking_add_ons
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM bookings
  WHERE bookings.id = booking_add_ons.booking_id
  AND bookings.user_id = auth.uid()
));