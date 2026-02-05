
## Plan: Stripe-Only Payment Flow

### Overview
The current system offers multiple manual payment methods (Cash, Card Terminal, E-Transfer, Online Card, Other) in the admin panel. This needs to be replaced with a Stripe-only authorization hold system where:

1. **At Checkout**: Customer provides credit card → Stripe places authorization hold on both deposit AND rental total
2. **During Rental**: Funds are held but not charged
3. **At Closeout**: System automatically captures rental total and releases remaining deposit (or captures damage charges from deposit)

### Current State Analysis

**Files with manual payment options to remove:**
- `src/components/admin/PaymentDepositPanel.tsx` - Contains "Record Payment" dialog with Cash/Card Terminal/E-Transfer/Other options
- `src/components/admin/BookingOpsDrawer.tsx` - Contains payment method dropdown with same options
- `src/hooks/use-payment-deposit.ts` - Defines `PaymentMethod` type including manual options
- `src/hooks/use-payments.ts` - Defines `PaymentMethod` type with manual options

**Existing Stripe infrastructure to leverage:**
- `supabase/functions/create-checkout-hold/index.ts` - Creates authorization hold
- `supabase/functions/capture-deposit/index.ts` - Captures from hold
- `supabase/functions/release-deposit-hold/index.ts` - Releases hold
- `supabase/functions/close-account/index.ts` - Already handles automatic capture/release at closeout

---

### Implementation Steps

#### Step 1: Update Customer Checkout Flow
**File:** `src/pages/NewCheckout.tsx`

**Changes:**
- Replace `create-checkout-session` (which creates a payment) with a unified hold that covers **both** the rental total and deposit
- Use Stripe Elements (already created in `StripePaymentForm.tsx`) to collect card details
- Create a single authorization hold for the full amount (rental + deposit)
- Store the PaymentIntent ID for later capture

#### Step 2: Remove Manual Payment Recording
**File:** `src/components/admin/PaymentDepositPanel.tsx`

**Changes:**
- Remove the "Record Payment" button and dialog
- Remove the payment method dropdown (Cash, Card Terminal, etc.)
- Keep only the Stripe deposit hold visualization
- Show read-only payment status based on Stripe holds
- Remove legacy manual deposit tracking

#### Step 3: Clean Up BookingOpsDrawer
**File:** `src/components/admin/BookingOpsDrawer.tsx`

**Changes:**
- Remove payment method selection dropdown (lines 690-702)
- Remove the "Record Payment" dialog entirely
- Show read-only Stripe hold status instead

#### Step 4: Simplify Payment Hooks
**File:** `src/hooks/use-payment-deposit.ts`

**Changes:**
- Remove `PaymentMethod` type or limit to `'stripe'` only
- Remove `useRecordPaymentDeposit` mutation (no more manual recording)
- Keep `useSendPaymentRequest` for payment link functionality (optional)
- Keep `useReleaseDeposit` but update to use Stripe release

**File:** `src/hooks/use-payments.ts`

**Changes:**
- Remove `PaymentMethod` type exports
- Update `useRecordPayment` to be internal/Stripe-only

#### Step 5: Update StepPayment Component
**File:** `src/components/admin/ops/steps/StepPayment.tsx`

**Changes:**
- Show only Stripe authorization hold status
- Remove any manual payment recording UI
- Display "Authorization collected at checkout" when hold is active
- Show "Waiting for customer checkout" if no hold yet

#### Step 6: Update Edge Function for Unified Hold
**File:** `supabase/functions/create-checkout-hold/index.ts`

**Changes:**
- Accept both `depositAmount` and `rentalAmount` parameters
- Create a single authorization hold for the total
- Store metadata distinguishing the rental portion from deposit portion
- Return client secret for Stripe Elements confirmation

#### Step 7: Update Close Account for Automatic Capture
**File:** `supabase/functions/close-account/index.ts` (already handles this)

**Current behavior is correct:**
- If no damage → capture rental total, release remaining deposit
- If damage → capture rental + damage from deposit, release remainder
- Generates final invoice with Stripe IDs

---

### Technical Details

**New Checkout Flow:**
```text
Customer fills form → Create booking (pending)
                    → Create Stripe PaymentIntent (manual capture)
                    → Customer confirms card via Stripe Elements
                    → Authorization placed → Booking becomes "confirmed"
                    → Deposit status = "authorized"
```

**Closeout Flow (unchanged):**
```text
Return complete → Staff clicks "Complete Return"
              → close-account edge function called
              → Calculates final charges
              → Captures rental total from hold
              → If damage: captures damage amount too
              → Releases remaining authorization
              → Generates final invoice
              → Sends receipt email
```

**Database Changes:** None required - existing schema supports this

---

### UI Changes Summary

| Component | Before | After |
|-----------|--------|-------|
| PaymentDepositPanel | "Record Payment" button + method dropdown | Read-only Stripe status |
| BookingOpsDrawer | Payment dialog with Cash/Card/E-Transfer options | Removed |
| StepPayment | Payment tab with manual options | "Authorization held" status display |
| Customer Checkout | Stripe Checkout redirect | Embedded Stripe Elements form |

---

### Files to Modify

1. `src/pages/NewCheckout.tsx` - Integrate Stripe Elements for authorization hold
2. `src/components/admin/PaymentDepositPanel.tsx` - Remove manual payment UI
3. `src/components/admin/BookingOpsDrawer.tsx` - Remove payment dialog
4. `src/components/admin/ops/steps/StepPayment.tsx` - Simplify to show Stripe status only
5. `src/hooks/use-payment-deposit.ts` - Remove manual payment mutation
6. `src/hooks/use-payments.ts` - Clean up PaymentMethod type
7. `supabase/functions/create-checkout-hold/index.ts` - Update to handle full rental + deposit amount
