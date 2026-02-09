

# Simplify Stripe Payment System

## Summary

Replace the complex authorization hold / deposit management system with a straightforward Stripe payment flow. The current system uses `capture_method: manual` PaymentIntents to create authorization holds combining rental + deposit, with a full lifecycle of hold/capture/release/sync operations. This will be replaced with simple, standard Stripe payments where users pay the rental amount directly, and any deposits or damage charges can be sent as separate payment links later.

## What Changes

### Current System (Being Removed)
- Unified authorization hold (rental + deposit combined into one `manual capture` PaymentIntent)
- Complex deposit lifecycle: hold -> authorize -> capture/release
- Admin UI for managing holds (DepositHoldVisualizer, CaptureDepositDialog, ReleaseHoldDialog)
- Multiple edge functions for deposit operations (create-deposit-hold, capture-deposit, release-deposit-hold, sync-deposit-status, process-deposit-jobs, process-deposit-refund)
- Deposit ledger tracking
- Account closeout with automatic deposit settlement

### New System
- Standard Stripe payment at checkout (immediate charge, no manual capture)
- Simple "Pay Now" or "Pay at Pickup" options remain
- Admin can send payment links (already exists via `send-payment-request`) for deposits, damages, or any additional charges
- Terms updated with customer liability clause for damages

---

## Technical Plan

### Phase 1: Simplify Checkout Flow

**1.1 Rewrite `create-checkout-hold` edge function -> `create-payment`**

Replace the manual-capture PaymentIntent with a standard auto-capture PaymentIntent that charges the rental amount immediately:

- Remove `capture_method: manual`
- Only charge the rental total (no deposit bundled in)
- Keep customer creation and metadata logic
- Keep idempotency check
- Simplify booking status updates (draft -> pending on payment success)

**1.2 Update `src/pages/NewCheckout.tsx`**

- Remove `holdAmounts` state and deposit-related UI
- Change the "Pay Now" flow to call the simplified payment function
- Remove authorization hold language from the UI ("An authorization hold will be placed...")
- Update `handlePaymentSuccess` to simply mark booking as confirmed (no deposit_status updates)
- Remove the deposit line from price details
- Keep the "Pay at Pickup" flow as-is (no Stripe call)

**1.3 Update `src/components/checkout/StripePaymentForm.tsx`**

- Remove `depositAmount` and `rentalAmount` props -- simplify to just `amount`
- Remove "Authorization Hold Notice" section
- Change button text from "Authorize $X & Complete Booking" to "Pay $X & Complete Booking"
- Handle `paymentIntent.status === "succeeded"` as the primary success case (not `requires_capture`)
- Remove `requires_capture` handling

**1.4 Update `src/components/checkout/StripeCheckoutWrapper.tsx`**

- Simplify props: replace `depositAmount` + `rentalAmount` with single `amount`
- Pass through to updated StripePaymentForm

### Phase 2: Simplify Admin Panel

**2.1 Rewrite `src/components/admin/PaymentDepositPanel.tsx`**

Replace the complex deposit hold management panel with a simple payments view:
- Show list of payments received for the booking
- Show payment status and Stripe IDs
- Add a "Send Payment Request" button (uses existing `send-payment-request` edge function) for collecting additional payments (deposits, damages, etc.)
- Remove hold visualizer, capture/release dialogs

**2.2 Simplify Account Closeout (`close-account` edge function)**

- Remove Stripe capture/release logic
- Keep invoice generation
- Keep line item calculation (rental, add-ons, taxes, late fees, damages)
- Calculate amount due vs payments received
- If balance > 0, note it in the invoice (admin sends payment link separately)
- Keep notification and audit logging

**2.3 Remove deposit-specific admin components**

These components will be removed as they are no longer needed:
- `src/components/admin/deposit/DepositHoldVisualizer.tsx`
- `src/components/admin/deposit/CaptureDepositDialog.tsx`
- `src/components/admin/deposit/ReleaseHoldDialog.tsx`
- `src/components/admin/deposit/TransactionHistoryCard.tsx` (keep if it shows general payment history)
- `src/components/admin/deposit/AccountCloseoutPanel.tsx` (simplify)
- `src/components/admin/deposit/index.ts` (update exports)

### Phase 3: Clean Up Edge Functions

**3.1 Edge functions to delete:**
- `create-deposit-hold` -- no longer needed (authorization holds removed)
- `capture-deposit` -- no longer needed
- `release-deposit-hold` -- no longer needed
- `sync-deposit-status` -- no longer needed
- `process-deposit-jobs` -- no longer needed
- `process-deposit-refund` -- no longer needed (refunds can be done through Stripe dashboard)
- `send-deposit-notification` -- no longer needed

**3.2 Edge functions to keep and update:**
- `create-checkout-hold` -> rename/rewrite as standard payment creator (or replace with `create-payment-intent` which already exists)
- `create-checkout-session` -- keep as-is (used by `send-payment-request`)
- `create-payment-intent` -- keep as-is (already creates standard PaymentIntents)
- `get-stripe-config` -- keep as-is
- `send-payment-request` -- keep as-is (this is the "send payment link" functionality)
- `send-payment-confirmation` -- keep as-is
- `stripe-webhook` -- simplify (remove deposit hold event handlers, keep payment success/failure handlers)
- `close-account` -- simplify (remove Stripe capture/release, keep invoice logic)

**3.3 Edge functions to keep unchanged:**
- All non-Stripe functions (send-booking-email, generate-agreement, etc.)

### Phase 4: Clean Up Frontend Hooks

**4.1 Hooks to delete:**
- `src/hooks/use-deposit-hold.ts` -- deposit hold lifecycle
- `src/hooks/use-checkout-hold.ts` -- checkout hold creation
- `src/hooks/use-sync-deposit.ts` -- Stripe sync
- `src/hooks/use-deposit-ledger.ts` -- deposit ledger tracking

**4.2 Hooks to simplify:**
- `src/hooks/use-payment-deposit.ts` -- simplify to just track payment status (remove deposit logic)

**4.3 Hooks to keep:**
- `src/hooks/use-stripe-config.ts` -- needed for Stripe Elements
- `src/hooks/use-payments.ts` -- still used for payment queries
- `src/hooks/use-hold.ts` -- this is for reservation holds (time-based hold on vehicle), NOT deposit holds

### Phase 5: Update Policies and Terms

**5.1 Update `src/lib/checkout-policies.ts`**

- Remove `CREDIT_CARD_AUTHORIZATION_POLICY` (no more auth holds)
- Remove `AUTHORIZATION_AMOUNTS` (no more deposit holds at checkout)
- Keep `CANCELLATION_POLICY`
- Keep `PICKUP_REQUIREMENTS` but update to remove "same credit card" requirement
- Add new `DAMAGE_LIABILITY_POLICY` with the legal clause:
  > "The customer is legally bound to pay for any damages to the rented vehicle, provided it is proven that such damages were caused by the customer during the rental period."

**5.2 Update checkout terms text**

- Remove "Authorization hold of up to $350 CAD will be placed on your card" from the checkout page
- Add damage liability acknowledgment to the terms checkbox area

### Phase 6: Update Related Components

**6.1 `src/components/admin/BookingOpsDrawer.tsx`**
- Update the Payment section to use the simplified PaymentDepositPanel

**6.2 `src/components/admin/return-ops/steps/StepReturnDeposit.tsx`**
- Simplify or remove deposit hold release logic
- Keep general "close return" functionality

**6.3 `src/components/admin/DepositLedgerPanel.tsx`**
- Remove or simplify (ledger tracking is less relevant without holds)

**6.4 `src/lib/schemas/payment.ts`**
- Keep as-is (deposit types still valid for ledger entries, just won't be hold-based)

**6.5 `src/lib/pricing.ts`**
- Keep `DEFAULT_DEPOSIT_AMOUNT` and `MINIMUM_DEPOSIT_AMOUNT` as reference values (may still be shown as "security deposit requirement" in policies)

---

## Database Considerations

No schema migrations are strictly required. The existing deposit-related columns on the `bookings` table (`deposit_status`, `stripe_deposit_pi_id`, etc.) can remain but will simply not be used for new bookings. The `deposit_ledger` and `deposit_jobs` tables can remain dormant.

---

## Impact Summary

| Area | Before | After |
|------|--------|-------|
| Checkout | Auth hold (rental + deposit), manual capture | Standard payment (rental only) |
| Deposit | $350 hold at checkout, complex lifecycle | Sent as payment link if/when needed |
| Damage charges | Captured from deposit hold | Sent as payment link |
| Admin panel | Hold visualizer, capture/release buttons | Payment list + "Send Payment Link" button |
| Closeout | Auto-capture/release deposit | Generate invoice, send payment link for balance |
| Edge functions | 7 deposit-specific functions | Removed (keep standard payment functions) |
| Terms | Auth hold language | Damage liability clause |

