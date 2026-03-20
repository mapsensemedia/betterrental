-- Add 'arrived' to delivery_statuses check constraint
ALTER TABLE public.delivery_statuses DROP CONSTRAINT delivery_status_check;
ALTER TABLE public.delivery_statuses ADD CONSTRAINT delivery_status_check 
  CHECK (status = ANY (ARRAY['unassigned', 'assigned', 'picked_up', 'en_route', 'arrived', 'delivered', 'issue', 'cancelled']));
