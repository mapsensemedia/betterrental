

## Plan: Multi-RRN Terminal Payment Form

### Problem
The terminal payment form accepts a single receipt number (RRN) and always records `booking.total_amount` as the payment amount. When a payment is split across multiple terminal transactions (e.g. $250 + $250 + $161.86), only one can be recorded.

### Changes

#### 1. Terminal Payment Form (`src/components/payments/TerminalPaymentForm.tsx`)

Replace the single-entry form with a multi-row form:
- Each row has: **Amount** (editable, numeric) + **RRN** (receipt number)
- Start with one row pre-filled with the outstanding balance
- "Add Transaction" button adds another row (pre-fills remaining balance)
- Card Last 4 and Auth Code remain shared fields (same card for all transactions)
- Deposit checkbox stays as-is
- On submit, send all rows to the edge function in a single call
- After success, show a summary of all recorded transactions instead of locking the form
- Accept new prop `outstandingBalance` (falls back to `amount` for backward compatibility)

Validation: each row must have a valid RRN and a positive amount. Total of all rows must not exceed the outstanding balance.

#### 2. Edge Function (`supabase/functions/log-terminal-payment/index.ts`)

Accept a new `transactions` array field alongside the existing single-entry fields for backward compatibility:
```
transactions: [{ receiptNumber: string, amount: number }]
```

Processing:
- If `transactions` array is present, iterate and insert one `payments` row per entry
- Validate each receipt for uniqueness (no duplicate `TERM-{receipt}` in payments table)
- Validate that the sum of all transaction amounts does not exceed the remaining balance (`total_amount - sum of existing completed payments`)
- Use the first transaction's receipt as the `wl_transaction_id` on the booking
- Only set booking status to `confirmed` if cumulative payments now cover `total_amount`
- Write a single audit log entry with all transactions listed

If `transactions` is absent, fall back to the existing single-entry logic (backward compatible).

#### 3. Payment Step (`src/components/admin/ops/steps/StepPayment.tsx`)

- Change `canShowPayForm`: show the form whenever `paymentStatus.balance > 0`, regardless of whether `wlTransactionId` is already set
- Pass `outstandingBalance={paymentStatus.balance}` to `TerminalPaymentForm`
- The existing payment summary (Total Due / Paid / Balance) and individual payment records already display correctly from `usePaymentDepositStatus` — each inserted row will show as its own line item automatically

#### 4. Payment History Display

The `usePaymentDepositStatus` hook already fetches all payment rows per booking and returns them in `payments[]`. Each terminal transaction will have its own `transaction_id` (`TERM-{RRN}`) and amount, so they'll appear as separate line items in any UI that renders the payments array. No changes needed to the hook.

### No Database Changes
The `payments` table already supports multiple rows per booking with individual amounts and transaction IDs.

