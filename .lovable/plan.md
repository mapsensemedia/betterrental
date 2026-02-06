
# Inline Stripe Payment with Authorization Hold

## Overview
Replace the current Stripe Hosted Checkout redirect flow with an inline Stripe Elements payment form that processes authorization holds directly on the checkout page.

## Current Behavior
When you click "Pay and Book":
1. A booking is created in the database
2. The system calls `create-checkout-session` edge function
3. You are redirected to an external Stripe-hosted payment page
4. After payment, you're redirected back to the booking confirmation

## Proposed Behavior
When you click "Pay and Book":
1. A booking is created in the database
2. The system calls `create-checkout-hold` (already exists) to create a PaymentIntent with manual capture
3. A Stripe Elements payment form appears inline on the page
4. You enter your card details in the secure Stripe form
5. The card is authorized (no redirect) and a hold is placed
6. You see a success message and are navigated to the confirmation page

---

## Implementation Steps

### 1. Add Missing Secret
The `STRIPE_PUBLISHABLE_KEY` secret needs to be configured for the inline payment form to work. This is required for client-side Stripe initialization.

### 2. Modify Checkout Page State Management
Add new state variables to track:
- Whether the inline payment form should be shown
- The client secret from the PaymentIntent
- The booking ID for the current transaction

### 3. Update the Submit Flow
Change `handleSubmit` in `NewCheckout.tsx`:
- After creating the booking, call `create-checkout-hold` instead of `create-checkout-session`
- Store the returned `clientSecret` in state
- Display the `StripeCheckoutWrapper` component instead of redirecting

### 4. Add Success Handler
Create a handler for when the Stripe Elements form successfully authorizes the card:
- Update the booking's deposit status to "authorized"
- Navigate to the confirmation page
- Show success toast

### 5. Replace CreditCardInput with Stripe Elements
The current custom `CreditCardInput` component collects card info that isn't actually used for processing (for reference only). In the new flow:
- Show `CreditCardInput` initially for validation/display purposes
- After booking creation, replace it with the secure `StripeCheckoutWrapper` that uses Stripe's own card input

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/NewCheckout.tsx` | Add state for inline payment flow; modify `handleSubmit` to use `create-checkout-hold`; render `StripeCheckoutWrapper` conditionally |
| `supabase/functions/create-checkout-hold/index.ts` | Minor updates to support customer checkout (not just admin) |
| `supabase/config.toml` | Add `verify_jwt = false` for `create-checkout-hold` |

## Files to Use (Already Exist)
- `src/components/checkout/StripeCheckoutWrapper.tsx` - Already built for inline Stripe Elements
- `src/components/checkout/StripePaymentForm.tsx` - Already handles authorization holds
- `src/hooks/use-stripe-config.ts` - Already fetches publishable key
- `supabase/functions/get-stripe-config/index.ts` - Already returns publishable key

---

## Technical Details

### Checkout Flow Diagram

```text
User Fills Form
       |
       v
[Pay and Book Button]
       |
       v
Create Booking (DB)
       |
       v
Call create-checkout-hold
       |
       v
Return clientSecret
       |
       v
Show StripeCheckoutWrapper
(Stripe Elements Card Form)
       |
       v
User Enters Card Details
       |
       v
stripe.confirmPayment()
       |
       v
Authorization Hold Created
(requires_capture status)
       |
       v
Navigate to Confirmation
```

### Key State Changes in NewCheckout.tsx
```typescript
// New state
const [showStripePayment, setShowStripePayment] = useState(false);
const [clientSecret, setClientSecret] = useState<string | null>(null);
const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

// In handleSubmit (after booking creation):
// Replace create-checkout-session with:
const holdResponse = await supabase.functions.invoke("create-checkout-hold", {
  body: { 
    bookingId: booking.id, 
    depositAmount: DEFAULT_DEPOSIT_AMOUNT,
    rentalAmount: pricing.total 
  },
});

setClientSecret(holdResponse.data.clientSecret);
setPendingBookingId(booking.id);
setShowStripePayment(true);
```

### Success Handler
```typescript
const handlePaymentSuccess = async (paymentIntentId: string) => {
  // Update booking status
  await supabase.from("bookings").update({ 
    deposit_status: "authorized",
    stripe_deposit_pi_id: paymentIntentId 
  }).eq("id", pendingBookingId);
  
  navigate(`/booking/${pendingBookingId}?payment=success`);
};
```

---

## Security Considerations
- Raw card data never touches application servers (PCI compliant)
- Stripe Elements handles all sensitive card input
- Authorization uses manual capture - funds are held but not charged
- The existing CVV field in `CreditCardInput` is for display/validation only

---

## Required Secret
You'll need to add `STRIPE_PUBLISHABLE_KEY` (starts with `pk_`) to your backend secrets before this will work. This is different from the secret key - it's safe to expose on the client side and is required for Stripe Elements initialization.
