

# TD Worldline (Bambora) Integration -- Implementation Plan

## Step 1: Add Secrets

Store your Worldline/Bambora credentials securely in Lovable Cloud:

- **WORLDLINE_MERCHANT_ID** -- Your Bambora merchant ID
- **WORLDLINE_API_PASSCODE** -- Your Payments API passcode
- **WORLDLINE_ENVIRONMENT** -- `sandbox` or `production`

## Step 2: Build Shared Backend Helper

Create `supabase/functions/_shared/worldline.ts` with:
- Base URL resolution (Bambora NAM API)
- Authenticated HTTP client (Basic auth: base64 of `merchantId:passcode`)
- Error response parsing

## Step 3: Build Edge Functions

Create new payment edge functions replacing Stripe:

| Function | Replaces | Purpose |
|----------|----------|---------|
| `wl-pay` | `create-checkout-session` | Full payment (complete: true) using token nonce |
| `wl-authorize` | `create-checkout-hold` | Pre-auth deposit hold (complete: false) |
| `wl-capture` | `capture-deposit` | Capture a held authorization |
| `wl-cancel-auth` | `release-deposit-hold` | Void/release a hold |
| `wl-create-profile` | -- | Tokenize card for returning users |
| `wl-get-profile` | -- | Fetch saved payment methods |
| `wl-webhook` | `stripe-webhook` | Handle Worldline status callbacks |

All functions follow existing security patterns: `requireBookingOwnerOrToken` for customer endpoints, `requireRoleOrThrow` for admin endpoints, server-derived amounts only.

## Step 4: Database Changes

- Add columns to `bookings`: `wl_transaction_id`, `wl_auth_status`, `wl_profile_customer_code`
- Create `payment_profiles` table (user_id, worldline_customer_code, card_last_four, card_type, expiry)
- Create `webhook_events` table for idempotency (replaces stripe_webhook_events for new flow)
- RLS: users see own profiles only; service_role manages all

## Step 5: Frontend -- Custom Checkout Component

- Create `WorldlineCheckout.tsx` that loads the Bambora Custom Checkout JS SDK (`customcheckout.js`)
- SDK renders PCI-compliant iframe inputs for card number, CVV, expiry
- On submit: `createToken()` returns a single-use nonce passed to the backend
- Create `SavedCardsSelector.tsx` for returning users with tokenized cards

## Step 6: Wire Checkout Flows

- Update `NewCheckout.tsx` to render inline `WorldlineCheckout` instead of Stripe redirect
- Pay-now flow calls `wl-pay` with nonce
- Deposit hold flow calls `wl-authorize` with nonce
- Admin capture/void calls `wl-capture` / `wl-cancel-auth`

## Step 7: Update Admin Panels

- Replace `stripe_deposit_pi_id` references with `wl_transaction_id` in ops/dispatch/deposit UI
- Update transaction history displays

## Step 8: Remove Stripe (after verification)

- Delete Stripe edge functions and frontend components
- Remove `@stripe/react-stripe-js` and `@stripe/stripe-js` packages
- Clean up `use-stripe-config.ts`

