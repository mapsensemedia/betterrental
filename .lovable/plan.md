

# Add Manual Deposit Hold Option to Terminal Payment Form

## Problem
When staff process a payment on a physical POS terminal, they may also place a deposit hold on the same terminal. Currently there's no way to record that deposit hold — only the rental payment gets logged.

## Solution
Add a checkbox/toggle to the `TerminalPaymentForm` that says "Deposit hold also taken on terminal". When checked, show a deposit receipt number field. On submit, the edge function will also write the deposit hold data to the booking (`wl_deposit_transaction_id`, `wl_deposit_auth_status = "authorized"`, `deposit_status = "authorized"`) and insert a `deposit_ledger` entry.

## Changes

### 1. `src/components/payments/TerminalPaymentForm.tsx`
- Add `includeDeposit` checkbox (default unchecked)
- When checked, show a deposit receipt number input (optional — defaults to rental receipt + `-DEP`)
- Pass `includeDeposit` and `depositReceiptNumber` to the edge function
- Update success message to mention deposit if included

### 2. `supabase/functions/log-terminal-payment/index.ts`
- Accept optional `includeDeposit: boolean` and `depositReceiptNumber: string` in body
- When `includeDeposit` is true:
  - Generate deposit txn ID: `TERM-DEP-{receiptNumber}`
  - Update booking with `wl_deposit_transaction_id`, `wl_deposit_auth_status = "authorized"`, `deposit_status = "authorized"`
  - Insert `deposit_ledger` entry with action `"hold"`, amount = `DEFAULT_DEPOSIT_AMOUNT` (350)
  - Include deposit info in audit log

### 3. `src/components/payments/TerminalPaymentForm.tsx` props
- Add `depositAmount` prop (passed from StepPayment, defaults to 350)

### 4. `src/components/admin/ops/steps/StepPayment.tsx`
- Pass `depositAmount={DEFAULT_DEPOSIT_AMOUNT}` to `TerminalPaymentForm`

