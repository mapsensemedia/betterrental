
-- Attach reject triggers to booking_add_ons
DROP TRIGGER IF EXISTS trg_enforce_addon_price ON public.booking_add_ons;
CREATE TRIGGER trg_enforce_addon_price
  BEFORE INSERT OR UPDATE ON public.booking_add_ons
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_addon_price_integrity();

-- Attach reject triggers to booking_additional_drivers
DROP TRIGGER IF EXISTS trg_enforce_driver_fee ON public.booking_additional_drivers;
CREATE TRIGGER trg_enforce_driver_fee
  BEFORE INSERT OR UPDATE ON public.booking_additional_drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_driver_fee_integrity();

-- Force RLS on rate_limits
ALTER TABLE public.rate_limits FORCE ROW LEVEL SECURITY;
