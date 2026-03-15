

# Terminal Payment Logging — Implementation Plan

## What We're Building

A "Log Terminal Payment" option in the ops payment panel that lets staff record payments processed on a physical POS terminal (Desjardins/Moneris), immediately marking the booking as paid and activatable.

## Architecture

No schema changes needed. Uses existing `payments` table columns (`payment_method`, `payment_type`, `status`, `transaction_id`) and existing `bookings` columns (`wl_transaction_id`, `card_last_four`, `status`).

```text
Ops fills form (receipt #, amount, card last 4)
  → calls supabase.functions.invoke("log-terminal-payment")
    → validates staff role
    → validates amount matches booking total
    → inserts into payments (payment_method: "terminal", status: "completed")
    → updates bookings (status: "confirmed", wl_transaction_id: receipt#)
    → writes audit_logs entry
  → UI refreshes payment status → booking now shows "Paid"
```

## Files to Create/Modify

### 1. Create Edge Function: `supabase/functions/log-terminal-payment/index.ts`

- Accepts: `bookingId`, `receiptNumber`, `cardLastFour`, `authCode` (optional)
- Auth: `getUserOrThrow` + `requireRoleOrThrow(userId, ["admin", "staff"])`
- Validates receipt number format (alphanumeric, 3-50 chars), card last 4 (exactly 4 digits), amount matches `booking.total_amount`
- Checks for duplicate receipt via existing payments with same `transaction_id`
- Uses `getAdminClient()` (service_role) to:
  - Insert `payments` record: `payment_type: "rental"`, `payment_method: "terminal"`, `status: "completed"`, `transaction_id: receiptNumber`
  - Update `bookings`: `status: "confirmed"`, `wl_transaction_id: "TERM-" + receiptNumber`, `card_last_four`
  - Insert `audit_logs` entry with action `"terminal_payment_logged"`
- Returns success with booking status

### 2. Update `supabase/config.toml`

Add `[functions.log-terminal-payment]` with `verify_jwt = false` (auth validated in code per project pattern).

### 3. Create UI Component: `src/components/payments/TerminalPaymentForm.tsx`

Simple form with:
- Receipt Number (required, text input)
- Card Last 4 Digits (required, 4-char input)
- Auth Code (optional)
- Amount display (locked to booking total, read-only)
- Submit button: "Log Terminal Payment & Activate"
- Loading/success/error states
- Calls `supabase.functions.invoke("log-terminal-payment")` on submit
- On success: calls `onUpdated()` callback to refresh payment status

### 4. Update `src/components/admin/ops/steps/StepPayment.tsx`

When `canShowPayForm` is true (booking unpaid), show a tab or toggle between:
- **Card Payment** (existing `OpsPaymentAndDeposit`)
- **Terminal Payment** (new `TerminalPaymentForm`)

Uses simple button toggle, not a complex tab system. The terminal form appears inline in the same card.

