ALTER TABLE public.rental_agreements ADD COLUMN agreement_type text NOT NULL DEFAULT 'initial';

COMMENT ON COLUMN public.rental_agreements.agreement_type IS 'Type of agreement: initial or extension';