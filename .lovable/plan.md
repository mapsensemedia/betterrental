

# Delete Legacy Stripe Files

Remove three unused legacy Stripe files that are confirmed dead code (per architecture memory and user confirmation):

1. `src/components/checkout/StripeCheckoutWrapper.tsx` — delete
2. `src/components/checkout/StripePaymentForm.tsx` — delete
3. `src/hooks/use-stripe-config.ts` — delete

No other files will be modified.

