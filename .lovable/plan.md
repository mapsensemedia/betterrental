
# Enhanced Stripe Security Deposit Hold System - Complete Implementation Plan

## Executive Summary

This updated plan incorporates all additional requirements:
1. **Visual feedback** showing deposits are being held (animated indicators, progress states)
2. **Clear release options** with confirmation dialogs
3. **Account closeout flow** where Ops can finalize all charges + release deposits
4. **Automated billing/receipts** with full transaction ID visibility throughout

---

## Part 1: Database Schema Changes

### A. New Columns for `bookings` Table

| Column | Type | Purpose |
|--------|------|---------|
| `deposit_status` | TEXT | Tracks: `none`, `requires_payment`, `authorizing`, `authorized`, `capturing`, `captured`, `releasing`, `released`, `failed`, `expired`, `canceled` |
| `stripe_deposit_pi_id` | TEXT | PaymentIntent ID (pi_xxx) |
| `stripe_deposit_pm_id` | TEXT | PaymentMethod ID (pm_xxx) |
| `stripe_deposit_charge_id` | TEXT | Charge ID after capture (ch_xxx) |
| `stripe_deposit_client_secret` | TEXT | For frontend confirmation |
| `stripe_deposit_refund_id` | TEXT | Refund ID if released (re_xxx) |
| `deposit_authorized_at` | TIMESTAMPTZ | When auth hold was placed |
| `deposit_captured_at` | TIMESTAMPTZ | When funds were captured |
| `deposit_released_at` | TIMESTAMPTZ | When hold was released |
| `deposit_expires_at` | TIMESTAMPTZ | 7-day Stripe limit |
| `deposit_captured_amount` | INTEGER | Amount in cents captured |
| `deposit_capture_reason` | TEXT | Reason for capture |
| `final_invoice_generated` | BOOLEAN | Closeout invoice created |
| `final_invoice_id` | TEXT | Receipt ID for final invoice |
| `account_closed_at` | TIMESTAMPTZ | When account was closed |
| `account_closed_by` | UUID | Staff who closed account |

### B. Enhanced `deposit_ledger` Table

Add columns:
- `stripe_refund_id` TEXT
- `stripe_charge_id` TEXT
- `stripe_balance_txn_id` TEXT
- `action` extended with: `authorize`, `partial_capture`, `expire`, `stripe_hold`, `stripe_release`

### C. New `final_invoices` Table

```sql
CREATE TABLE final_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  invoice_number TEXT NOT NULL,
  
  -- Rental charges
  rental_subtotal NUMERIC NOT NULL,
  addons_total NUMERIC DEFAULT 0,
  taxes_total NUMERIC NOT NULL,
  fees_total NUMERIC DEFAULT 0,
  late_fees NUMERIC DEFAULT 0,
  damage_charges NUMERIC DEFAULT 0,
  
  -- Deposit reconciliation
  deposit_held NUMERIC DEFAULT 0,
  deposit_captured NUMERIC DEFAULT 0,
  deposit_released NUMERIC DEFAULT 0,
  
  -- Payments received
  payments_received NUMERIC DEFAULT 0,
  
  -- Final amounts
  grand_total NUMERIC NOT NULL,
  amount_due NUMERIC DEFAULT 0,
  amount_refunded NUMERIC DEFAULT 0,
  
  -- Stripe references
  stripe_payment_ids JSONB DEFAULT '[]',
  stripe_refund_ids JSONB DEFAULT '[]',
  stripe_charge_ids JSONB DEFAULT '[]',
  
  -- Metadata
  line_items_json JSONB NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'voided')),
  issued_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Part 2: Visual Feedback System

### A. New Component: `DepositHoldVisualizer.tsx`

Animated visual showing deposit hold status:

```text
┌─────────────────────────────────────────────────────────────┐
│                   SECURITY DEPOSIT                          │
│                                                             │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐    │
│  │ ○ Init  │──▶│ ● AUTH  │──▶│ ○ Held  │──▶│ ○ Close │    │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘    │
│                     ↓                                       │
│  ╔═══════════════════════════════════════════════════════╗ │
│  ║  💳 Authorization Hold Active                          ║ │
│  ║                                                        ║ │
│  ║  Amount: $350.00 CAD                                   ║ │
│  ║  Card: •••• 4242 (Visa)                               ║ │
│  ║  Authorized: Feb 5, 2026 at 2:30 PM                   ║ │
│  ║  Expires: Feb 12, 2026 (7 days)                       ║ │
│  ║                                                        ║ │
│  ║  Stripe PI: pi_3Nq...abc  [Copy]                      ║ │
│  ╚═══════════════════════════════════════════════════════╝ │
│                                                             │
│  ⏳ 6 days, 14 hours until expiration                      │
│  [━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░] 92%                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Animated progress bar showing time until expiration
- Pulsing indicator for "authorizing" state
- Color-coded status (blue = held, green = released, red = captured)
- Stripe IDs with copy buttons
- Card last 4 digits display

### B. Status Indicator States

| State | Visual | Animation | Color |
|-------|--------|-----------|-------|
| `requires_payment` | Empty circle | None | Gray |
| `authorizing` | Loading spinner | Pulse | Blue |
| `authorized` | Checkmark circle | Glow | Blue |
| `capturing` | Loading | Pulse | Amber |
| `captured` | Filled circle | None | Red |
| `releasing` | Loading | Pulse | Green |
| `released` | Checkmark | Confetti | Green |
| `failed` | X circle | Shake | Red |
| `expired` | Warning | Flash | Amber |

### C. Real-time Updates

- Subscribe to `bookings` table for deposit status changes
- Show toast notifications on status transitions
- Update visual state without page refresh

---

## Part 3: Release Hold Options

### A. Release Confirmation Dialog

```text
┌─────────────────────────────────────────────────────────────┐
│                  Release Authorization Hold                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚠️  This will cancel the Stripe authorization hold.        │
│      The customer's card will NOT be charged.               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Hold Details                                           │ │
│  │ Amount: $350.00 CAD                                    │ │
│  │ Card: •••• 4242                                        │ │
│  │ Stripe PI: pi_3Nq...abc                               │ │
│  │ Held Since: Feb 5, 2026                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  📝 Release Reason (required):                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Vehicle returned in good condition - no damages        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ⚠️  Requirements before release:                           │
│     ✓ Rental status: completed                             │
│     ✓ All damages reviewed                                 │
│     ✓ Final inspection complete                            │
│                                                              │
│  ┌──────────────┐  ┌────────────────────────────────────┐  │
│  │    Cancel    │  │  ✓ Confirm Release ($0 charged)   │  │
│  └──────────────┘  └────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### B. Capture Options Dialog

```text
┌─────────────────────────────────────────────────────────────┐
│                    Capture Deposit                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  💰 This will charge the customer's card.                   │
│                                                              │
│  Authorization Amount: $350.00 CAD                          │
│                                                              │
│  ○ Capture Full Amount ($350.00)                            │
│     └ Customer will be charged $350.00                      │
│                                                              │
│  ● Capture Partial Amount                                   │
│     Amount: $________  (max: $350.00)                       │
│                                                              │
│  📝 Capture Reason (required):                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Damage repair: Front bumper scratch                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Summary:                                                    │
│  • Capture: $150.00                                         │
│  • Release: $200.00 (remaining authorization)               │
│                                                              │
│  ┌──────────────┐  ┌────────────────────────────────────┐  │
│  │    Cancel    │  │  💳 Capture $150.00                │  │
│  └──────────────┘  └────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 4: Account Closeout Flow

### A. New Component: `AccountCloseoutPanel.tsx`

Complete account closing workflow for Ops:

```text
┌─────────────────────────────────────────────────────────────┐
│                    CLOSE ACCOUNT                            │
│              Booking: ABC123XY                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📋 FINAL CHARGES SUMMARY                                   │
│  ═══════════════════════════════════════════════════════   │
│                                                              │
│  Base Rental (3 days @ $89/day)              $267.00       │
│  Add-ons                                                    │
│    • GPS Navigation                           $45.00       │
│    • Child Seat                               $25.00       │
│  Regulatory Fees                                            │
│    • PVRT (3 × $1.50)                          $4.50       │
│    • ACSRCH (3 × $1.00)                        $3.00       │
│  ─────────────────────────────────────────────────────     │
│  Subtotal                                    $344.50       │
│  GST (5%)                                     $17.23       │
│  PST (7%)                                     $24.12       │
│  ─────────────────────────────────────────────────────     │
│  RENTAL TOTAL                                $385.85       │
│                                                              │
│  Additional Charges:                                        │
│    • Late Return (2 hours × $22.25/hr)        $44.50       │
│    • Damage: Scratched bumper                $150.00       │
│  ─────────────────────────────────────────────────────     │
│  TOTAL CHARGES                               $580.35       │
│                                                              │
│  ═══════════════════════════════════════════════════════   │
│                                                              │
│  💳 PAYMENTS RECEIVED                                       │
│  ─────────────────────────────────────────────────────     │
│  Feb 3 - Card Payment (pi_abc123)            $385.85       │
│                                                              │
│  🔒 SECURITY DEPOSIT                                        │
│  ─────────────────────────────────────────────────────     │
│  Authorization Hold (pi_def456)              $350.00       │
│  Status: Authorized ✓                                       │
│  Expires: Feb 12, 2026                                      │
│                                                              │
│  ═══════════════════════════════════════════════════════   │
│                                                              │
│  📊 SETTLEMENT                                              │
│  ─────────────────────────────────────────────────────     │
│  Total Charges                               $580.35       │
│  Payments Received                          -$385.85       │
│  ─────────────────────────────────────────────────────     │
│  Amount Due                                  $194.50       │
│                                                              │
│  💡 Deposit will cover: $194.50 (capture from hold)         │
│     Remaining deposit: $155.50 (will be released)           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  [✓] Confirm all charges reviewed                      │ │
│  │  [✓] Confirm vehicle inspection complete               │ │
│  │  [✓] Generate final invoice                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │     💰 CLOSE ACCOUNT & PROCESS SETTLEMENT              │ │
│  │                                                         │ │
│  │     • Capture $194.50 from deposit hold                │ │
│  │     • Release $155.50 authorization                    │ │
│  │     • Generate final invoice                           │ │
│  │     • Email receipt to customer                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### B. Closeout Logic

```typescript
async function closeAccount(bookingId: string) {
  // 1. Calculate all charges
  const charges = await calculateFinalCharges(bookingId);
  
  // 2. Calculate settlement
  const settlement = {
    totalCharges: charges.total,
    paymentsReceived: charges.paid,
    amountDue: charges.total - charges.paid,
  };
  
  // 3. Handle deposit
  if (settlement.amountDue > 0 && depositHold > 0) {
    // Capture from deposit to cover remaining charges
    const captureAmount = Math.min(settlement.amountDue, depositHold);
    await captureDeposit(bookingId, captureAmount, "Final charges settlement");
    
    // Release remaining hold
    const releaseAmount = depositHold - captureAmount;
    if (releaseAmount > 0) {
      await releaseDepositHold(bookingId, "Remaining deposit - no additional charges");
    }
  } else if (settlement.amountDue <= 0) {
    // No amount due - release full deposit
    await releaseDepositHold(bookingId, "Rental completed - full deposit released");
  }
  
  // 4. Generate final invoice with all Stripe IDs
  const invoice = await generateFinalInvoice(bookingId, {
    stripePaymentIds: [...],
    stripeChargeIds: [...],
    stripeRefundIds: [...],
  });
  
  // 5. Send receipt to customer
  await sendFinalReceipt(bookingId, invoice.id);
  
  // 6. Mark account as closed
  await supabase.from('bookings').update({
    account_closed_at: new Date().toISOString(),
    final_invoice_id: invoice.id,
    status: 'completed',
  });
}
```

---

## Part 5: Automated Billing & Receipts

### A. Final Invoice Component: `FinalInvoicePanel.tsx`

Shows complete transaction history with all IDs:

```text
┌─────────────────────────────────────────────────────────────┐
│  FINAL INVOICE                            INV-2026-0142    │
│  ═══════════════════════════════════════════════════════   │
│                                                              │
│  Booking: ABC123XY                                          │
│  Customer: John Smith                                       │
│  Period: Feb 3-6, 2026                                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  💳 TRANSACTION HISTORY                                │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                         │ │
│  │  Feb 3 14:32 - Initial Payment                         │ │
│  │  ├ Amount: $385.85                                     │ │
│  │  ├ Card: •••• 4242 (Visa)                             │ │
│  │  ├ PI: pi_3Nq2abc123456789 [Copy]                     │ │
│  │  ├ Charge: ch_3Nq2def987654321 [Copy]                 │ │
│  │  └ Status: ✓ Succeeded                                │ │
│  │                                                         │ │
│  │  Feb 3 14:33 - Deposit Authorization                   │ │
│  │  ├ Amount: $350.00 (hold)                             │ │
│  │  ├ Card: •••• 4242 (Visa)                             │ │
│  │  ├ PI: pi_3Nq2ghi111222333 [Copy]                     │ │
│  │  └ Status: ✓ Authorized                               │ │
│  │                                                         │ │
│  │  Feb 6 10:15 - Deposit Partial Capture                 │ │
│  │  ├ Amount: $194.50                                     │ │
│  │  ├ Reason: Final charges settlement                   │ │
│  │  ├ Charge: ch_3Nq5xyz444555666 [Copy]                 │ │
│  │  └ Status: ✓ Captured                                 │ │
│  │                                                         │ │
│  │  Feb 6 10:15 - Deposit Authorization Released          │ │
│  │  ├ Amount: $155.50                                     │ │
│  │  ├ Reason: Remaining deposit - no additional charges  │ │
│  │  └ Status: ✓ Canceled                                 │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  📄 DOWNLOAD OPTIONS                                   │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │ │
│  │  │  📥 PDF      │  │  ✉️ Email    │  │  🖨 Print   │  │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### B. Billing Dashboard Enhancements

Update `Billing.tsx` deposits tab to show:

1. **All Stripe IDs visible:**
   - PaymentIntent ID (pi_xxx)
   - Charge ID (ch_xxx) 
   - Refund ID (re_xxx)
   - Balance Transaction ID (txn_xxx)

2. **Status with visual indicators:**
   - Animated "authorizing" spinner
   - Pulsing "held" badge
   - Green checkmark for "released"

3. **Quick actions:**
   - View hold details
   - Capture now
   - Release now
   - View linked booking

### C. Receipt Generation Enhancement

Update `generate-return-receipt` to include:
- All Stripe transaction IDs
- Deposit authorization/capture/release history
- Line-by-line Stripe references
- PDF generation with all IDs

---

## Part 6: Edge Functions

### A. `create-deposit-hold/index.ts` (NEW)

```typescript
// Creates a Stripe PaymentIntent with capture_method: manual
// Returns clientSecret for frontend confirmation

Input: { bookingId, amount, customerId }
Output: { 
  success: true,
  paymentIntentId: "pi_xxx",
  clientSecret: "pi_xxx_secret_xxx",
  expiresAt: "2026-02-12T..."
}
```

### B. `capture-deposit/index.ts` (NEW)

```typescript
// Captures authorized deposit (full or partial)
// Remaining authorization is automatically released by Stripe

Input: { bookingId, amount?, reason }
Output: {
  success: true,
  chargeId: "ch_xxx",
  capturedAmount: 194.50,
  releasedAmount: 155.50  // Remaining auth released
}
```

### C. `release-deposit-hold/index.ts` (NEW)

```typescript
// Cancels authorization hold without charging
// Business rule: Only if booking status is completed/voided

Input: { bookingId, reason }
Output: {
  success: true,
  canceled: true,
  paymentIntentId: "pi_xxx"
}
```

### D. `close-account/index.ts` (NEW)

```typescript
// Complete account closeout with settlement
// Handles: additional charges, deposit capture/release, invoice generation

Input: { bookingId, additionalCharges?: [], damageCharges?: number }
Output: {
  success: true,
  settlement: { 
    totalCharged: 580.35,
    depositCaptured: 194.50,
    depositReleased: 155.50 
  },
  invoiceId: "inv_xxx",
  receiptSent: true,
  stripeOperations: [
    { type: "capture", id: "ch_xxx", amount: 194.50 },
    { type: "cancel", id: "pi_xxx", amount: 155.50 }
  ]
}
```

### E. Update `stripe-webhook/index.ts`

Add handlers:
- `payment_intent.amount_capturable_updated` → Authorization confirmed
- `payment_intent.canceled` → Hold released/expired
- `charge.captured` → Deposit captured
- `charge.refunded` → Deposit refunded

---

## Part 7: Frontend Hooks

### New Hooks

| Hook | Purpose |
|------|---------|
| `use-deposit-hold.ts` | Create, confirm, status of auth holds |
| `use-capture-deposit.ts` | Capture full/partial deposits |
| `use-release-deposit.ts` | Release authorization holds |
| `use-close-account.ts` | Complete account closeout flow |
| `use-final-invoice.ts` | Generate/view final invoices |
| `use-transaction-history.ts` | View all Stripe transactions |

---

## Part 8: Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/create-deposit-hold/index.ts` | Create Stripe auth hold |
| `supabase/functions/capture-deposit/index.ts` | Capture from hold |
| `supabase/functions/release-deposit-hold/index.ts` | Release hold |
| `supabase/functions/close-account/index.ts` | Complete closeout |
| `src/hooks/use-deposit-hold.ts` | Deposit hold hooks |
| `src/hooks/use-close-account.ts` | Account closeout hook |
| `src/hooks/use-transaction-history.ts` | Stripe transactions hook |
| `src/components/admin/DepositHoldVisualizer.tsx` | Animated deposit status |
| `src/components/admin/AccountCloseoutPanel.tsx` | Closeout workflow |
| `src/components/admin/FinalInvoicePanel.tsx` | Final invoice display |
| `src/components/admin/TransactionHistoryCard.tsx` | Transaction list |
| `src/components/admin/ReleaseHoldDialog.tsx` | Release confirmation |
| `src/components/admin/CaptureDepositDialog.tsx` | Capture options |
| `src/components/checkout/DepositAuthCard.tsx` | Customer auth card |

## Part 9: Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/stripe-webhook/index.ts` | Add new event handlers |
| `src/pages/admin/Billing.tsx` | Enhanced deposits tab with Stripe IDs |
| `src/pages/admin/ReturnOps.tsx` | Add closeout step |
| `src/components/admin/return-ops/steps/StepReturnDeposit.tsx` | Use new hold system |
| `src/components/admin/PaymentDepositPanel.tsx` | Show hold status & actions |
| `src/components/admin/DepositLedgerPanel.tsx` | Show Stripe IDs |
| `supabase/functions/generate-return-receipt/index.ts` | Include all Stripe IDs |

---

## Part 10: Implementation Phases

### Phase 1: Database & Edge Functions (Core)
1. Database migration with all new columns
2. Create `create-deposit-hold` edge function
3. Create `capture-deposit` edge function
4. Create `release-deposit-hold` edge function
5. Update `stripe-webhook` with new handlers

### Phase 2: Visual Feedback Components
6. Create `DepositHoldVisualizer.tsx` with animations
7. Create `ReleaseHoldDialog.tsx` with validation
8. Create `CaptureDepositDialog.tsx` with partial capture
9. Create `TransactionHistoryCard.tsx`

### Phase 3: Account Closeout Flow
10. Create `close-account` edge function
11. Create `AccountCloseoutPanel.tsx`
12. Create `FinalInvoicePanel.tsx`
13. Update return ops flow integration

### Phase 4: Billing Integration
14. Create `use-deposit-hold.ts` hook
15. Create `use-close-account.ts` hook
16. Update Billing page deposits tab
17. Update `PaymentDepositPanel.tsx`

### Phase 5: Automated Receipts
18. Update `generate-return-receipt` with all IDs
19. Create PDF invoice generation
20. Add email with full transaction history

---

## Expected Outcomes

1. ✅ **True authorization holds** - Customer funds held but not charged
2. ✅ **Visual feedback** - Animated status indicators, progress bars, expiration countdowns
3. ✅ **Clear release options** - Confirmation dialogs with validation
4. ✅ **Account closeout** - Ops can finalize charges, capture/release deposits
5. ✅ **Automated billing** - Final invoices generated with all charges
6. ✅ **Full transaction visibility** - All Stripe IDs visible and copyable
7. ✅ **Complete audit trail** - Every operation logged with Stripe references
8. ✅ **Business rule enforcement** - Can't release until rental complete
9. ✅ **Expiration handling** - Warnings before 7-day hold expires
10. ✅ **Automated receipts** - Customer receives detailed receipt with all transactions
