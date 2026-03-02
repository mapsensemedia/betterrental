
# Frontend Worldline Integration Plan

## Overview

Replace the Stripe checkout flow with inline Bambora Custom Checkout SDK card fields. Build 2 new components, update the checkout page, and update the admin payment panel. No backend or database changes.

## 1. Create `src/components/payments/WorldlineCheckout.tsx`

A React component that integrates the Bambora Custom Checkout JS SDK.

**How it works (per the official setup docs):**

1. Load the SDK script: `https://libs.na.bambora.com/customcheckout/1/customcheckout.js`
2. Call `window.customcheckout()` to initialize
3. Create 3 hosted input fields: `card-number`, `cvv`, `expiry` via `customCheckout.create()`
4. Mount each into a container div via `.mount('#selector')`
5. Listen to `error`, `complete`, and `brand` events for validation state
6. On form submit, call `customCheckout.createToken(callback)` to get a single-use nonce
7. Pass the nonce + card info to the parent via callback prop

**Props interface:**
```text
mode: "pay" | "authorize"   -- determines which edge function to call
bookingId: string            -- booking to process payment for
amount: number               -- display amount (server-derived actual amount)
accessToken?: string         -- for guest checkout
onSuccess: (result) => void
onError: (error: string) => void
disabled?: boolean
buttonLabel?: string
```

**On submit flow:**
- `createToken()` returns `{ token, last4, expiryMonth, expiryYear }`
- Component calls `supabase.functions.invoke("wl-pay" | "wl-authorize")` with `{ bookingId, token, name, accessToken }`
- Shows loading, error, and success states
- Styled to match existing card UI (border rounded-lg, Lock icon, debit card warning)

**Script loading:** Use a `useEffect` that appends the script tag to `document.head` if not already present, with an `onload` callback to initialize. Track `sdkReady` state.

## 2. Create `src/components/payments/SavedCardsSelector.tsx`

Shows saved payment profiles for authenticated users.

**Behavior:**
- Calls `supabase.functions.invoke("wl-get-profile")` on mount
- Displays cards as radio-selectable items (card brand icon, last 4, expiry)
- "Add new card" option toggles to showing the WorldlineCheckout form
- Selected card's `customerCode` is passed to the payment edge function
- If no saved cards, renders nothing (falls through to new card form)

## 3. Update `src/pages/NewCheckout.tsx`

**Key changes to the `handleSubmit` function (lines 532-598):**

Replace the Stripe Checkout Session redirect block with:
1. Instead of calling `create-checkout-session` and redirecting to `stripeUrl`, set a state flag like `showPaymentForm: true`
2. Render `WorldlineCheckout` inline below the submit area (or in the same card) when `showPaymentForm` is true and `paymentMethod === "pay-now"`
3. The WorldlineCheckout `onSuccess` callback navigates to the confirmation page (same destinations as the current Stripe flow)
4. The WorldlineCheckout `onError` callback shows a toast and cleans up the draft booking (same cleanup logic as current lines 581-588)

**Flow change summary:**
- Old: Click "Pay and Book" -> create booking -> call `create-checkout-session` -> redirect to Stripe hosted page -> return to success URL
- New: Click "Pay and Book" -> create booking -> show inline WorldlineCheckout -> user enters card -> tokenize -> call `wl-pay` -> navigate to confirmation

**For pay-later flow:** No card form needed. The existing flow (create booking -> navigate to confirmation) stays the same.

**Minor text updates:**
- Line 847: Change "Secure payment via Stripe" to "Secure payment"
- Remove Stripe references from comments

**For authenticated users with saved cards:** Show `SavedCardsSelector` above the WorldlineCheckout form in the payment section.

## 4. Update `src/components/admin/ops/steps/StepPayment.tsx`

**Changes:**
- Add a new section showing `wl_auth_status` and `wl_transaction_id` from the booking record (query these fields alongside existing payment data)
- Add "Capture Deposit" button that calls `supabase.functions.invoke("wl-capture", { body: { bookingId } })`
- Add "Release Hold" button that calls `supabase.functions.invoke("wl-cancel-auth", { body: { bookingId } })`
- Show these buttons conditionally: Capture when `wl_auth_status === "authorized"`, Release when `wl_auth_status === "authorized"`
- Remove the Stripe dashboard external link for Worldline transaction IDs (no equivalent external dashboard link)
- Update the `usePaymentDepositStatus` hook query to also fetch `wl_transaction_id` and `wl_auth_status` from bookings

## 5. Update `src/lib/dispatch-readiness.ts`

**Change line 24 and 57:**
- Add `wlTransactionId?: string | null` to `BookingForDispatchCheck` interface
- Update the `paymentHoldAuthorized` check to: `AUTHORIZED_DEPOSIT_STATUSES.includes(...) || !!booking.stripeDepositPiId || !!booking.wlTransactionId`

## 6. Update `src/hooks/use-dispatch-readiness.ts`

- Add `wl_transaction_id` to the select query (line 39, 90)
- Map it to `wlTransactionId` in the BookingForDispatchCheck object (line 66, 114)

## Files Created
- `src/components/payments/WorldlineCheckout.tsx`
- `src/components/payments/SavedCardsSelector.tsx`

## Files Modified
- `src/pages/NewCheckout.tsx` -- replace Stripe redirect with inline WorldlineCheckout
- `src/components/admin/ops/steps/StepPayment.tsx` -- add auth status display, capture/release buttons
- `src/lib/dispatch-readiness.ts` -- add wlTransactionId to readiness check
- `src/hooks/use-dispatch-readiness.ts` -- query wl_transaction_id
- `src/hooks/use-payment-deposit.ts` -- fetch wl fields from bookings

## Files NOT Modified
- `src/components/checkout/StripeCheckoutWrapper.tsx` -- not touched (not imported by any modified file)
- `src/components/checkout/StripePaymentForm.tsx` -- not touched
- `package.json` -- Stripe packages stay per rules
- Any edge function or migration file

## Implementation Order
1. WorldlineCheckout.tsx (new)
2. SavedCardsSelector.tsx (new)
3. NewCheckout.tsx (update payment flow)
4. StepPayment.tsx (admin capture/release)
5. dispatch-readiness.ts + use-dispatch-readiness.ts (readiness check)
6. use-payment-deposit.ts (fetch wl fields)
