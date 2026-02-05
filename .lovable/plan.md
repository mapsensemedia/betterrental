# Stripe-Only Payment Flow

## Status: ✅ COMPLETED

### Summary
Replaced manual payment methods (Cash, Card Terminal, E-Transfer, Online Card, Other) with a Stripe-only authorization hold system.

### Flow
1. **At Checkout**: Customer provides credit card → Stripe places unified authorization hold covering rental + deposit
2. **During Rental**: Funds are held on card but not charged
3. **At Closeout**: System automatically captures rental total and releases remaining deposit (or captures for damages)

---

### Changes Made

#### ✅ Edge Function: `create-checkout-hold`
- Updated to create a UNIFIED authorization hold for both rental amount AND deposit
- Stores metadata with `rental_amount_cents` and `deposit_amount_cents` for later processing
- Returns `totalHoldAmount`, `depositAmount`, `rentalAmount` in response

#### ✅ Admin Components
- **PaymentDepositPanel.tsx**: Removed all manual payment recording UI. Now shows read-only Stripe authorization status.
- **BookingOpsDrawer.tsx**: Removed payment dialog with Cash/Card Terminal/E-Transfer/Other options.
- **StepPayment.tsx**: Simplified to show Stripe authorization status only.

#### ✅ Hooks
- **use-payment-deposit.ts**: Removed `PaymentMethod` type and `useRecordPaymentDeposit` mutation. Now only provides read-only status.
- **use-payments.ts**: Cleaned up to remove manual payment recording. Only keeps `useBookingByCode` for lookup.

#### ✅ Return Operations
- **StepReturnDeposit.tsx**: Updated to use `useReleaseDepositHold` from Stripe hooks instead of legacy manual release.

---

### Existing Infrastructure (Unchanged)
- `close-account` edge function: Already handles automatic capture/release at closeout
- `capture-deposit` edge function: Used for damage captures
- `release-deposit-hold` edge function: Used for releasing authorization holds
- Stripe webhook handling: Confirms authorization status

---

### Customer Checkout Flow
```
Customer fills form → Create booking (pending)
                    → Create Stripe PaymentIntent (manual capture, unified amount)
                    → Customer confirms card via Stripe Elements
                    → Authorization placed → Booking becomes "confirmed"
                    → Deposit status = "authorized"
```

### Closeout Flow
```
Return complete → Staff clicks "Complete Return"
              → close-account edge function called
              → Calculates final charges
              → Captures rental total from hold
              → If damage: captures damage amount too
              → Releases remaining authorization
              → Generates final invoice
              → Sends receipt email
```
