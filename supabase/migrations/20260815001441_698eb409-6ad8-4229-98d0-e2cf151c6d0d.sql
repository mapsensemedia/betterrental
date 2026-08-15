UPDATE public.bookings
SET pickup_address = '8251 Dewdney Trunk Rd, Mission, BC V2V 6S8',
    delivery_fee = 50,
    subtotal = 227.48,
    tax_amount = 27.29,
    total_amount = 254.77,
    updated_at = now()
WHERE booking_code = 'AT7TMUYD';

INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, new_data)
SELECT 'manual_delivery_fee_added', 'booking', id,
       jsonb_build_object('delivery_fee', 0, 'subtotal', 177.48, 'tax_amount', 21.29, 'total_amount', 198.77, 'pickup_address', ''),
       jsonb_build_object('delivery_fee', 50, 'subtotal', 227.48, 'tax_amount', 27.29, 'total_amount', 254.77, 'pickup_address', '8251 Dewdney Trunk Rd, Mission, BC V2V 6S8')
FROM public.bookings WHERE booking_code = 'AT7TMUYD';