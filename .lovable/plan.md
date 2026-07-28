## Goal
Make the return workflow reliable when staff clicks **Capture Deposit**:
- If the Worldline hold is still capturable, capture it and update the booking/payment records.
- If Worldline rejects the capture, show the real gateway reason instead of the generic “Edge Function returned a non-2xx status code”.
- Provide a safe operational fallback so staff can still resolve the return without losing financial audit history.

## What I verified
- The booking visible in your screenshot is `XX9T3V3Z` / booking id `3f1b508a-a71c-4dd7-9795-cfb9a6602ea9`.
- Its deposit is still recorded internally as:
  - `deposit_status = authorized`
  - `wl_deposit_auth_status = authorized`
  - deposit transaction id `10000878`
  - deposit amount `$350.00`
- The return deposit UI calls the `wl-capture` Edge Function, but its capture handlers currently throw the raw SDK error, which is why staff only sees the generic non-2xx message.
- The backend capture function returns a non-2xx response when Worldline rejects `/payments/{depositTxnId}/completions`, but the frontend is not extracting the response body.

## Plan

### 1. Fix the staff-facing error message
Update all deposit capture buttons that call `wl-capture` so they use the existing `extractEdgeFunctionError()` helper, same as the release-hold path already does.

Files to update:
- `src/components/admin/return-ops/steps/StepReturnDeposit.tsx`
- `src/components/admin/ops/steps/StepPayment.tsx`
- `src/components/admin/deposit/AccountCloseoutPanel.tsx`

Result:
- Staff will see the actual Worldline rejection reason, for example expired hold, already completed, transaction not found, invalid state, etc.
- The UI will no longer hide the useful error behind “Edge Function returned a non-2xx status code”.

### 2. Harden the `wl-capture` deposit path
Update `supabase/functions/wl-capture/index.ts` for deposit captures:
- Validate the deposit amount before calling Worldline.
- Prefer the dedicated `wl_deposit_transaction_id` and avoid accidentally using the rental transaction id unless it is clearly a legacy deposit case.
- Include the gateway HTTP status/code/message in server logs.
- Return structured error fields to the frontend, such as:
  - `error`
  - `gatewayStatus`
  - `gatewayCode`
  - `retryable`
  - `requiresManualResolution`

Result:
- Staff gets a clear answer about whether the issue is temporary or whether the hold can no longer be captured.
- Future debugging will not depend on guessing from the generic non-2xx message.

### 3. Add a safe manual resolution fallback for uncapturable holds
If Worldline says the authorization can no longer be captured, add a return-step option such as **Record Terminal Deposit Charge**.

This will require staff to enter:
- amount collected
- terminal/reference/auth number
- reason/note

Then the system will:
- create a completed deposit payment record with the real terminal/reference number
- mark the booking deposit as captured/resolved
- write a deposit ledger entry
- write an audit log showing who resolved it and why
- unblock final return completion

This follows the existing business rule that payment/status writes must go through backend functions and avoids fake/simulated payments.

### 4. Keep release-hold behavior intact
Do not change the existing **Release Hold** flow except for any shared error parsing improvements. If the staff chooses release, it should continue to void/release the Worldline hold and mark it released.

### 5. Verify with the affected booking safely
Because this is payment-related, I will not run test captures or simulate payments in production.
Verification will be code/log based plus non-destructive checks:
- Confirm `XX9T3V3Z` still shows the $350 authorized hold before the fix.
- Confirm the UI now extracts the real backend error.
- Confirm the fallback path records only a real staff-entered terminal/reference number.
- Confirm final return completion is unblocked after the deposit is captured, released, or manually resolved.

## Expected outcome
Staff can either capture an active Worldline deposit hold or clearly resolve an uncapturable hold through a real terminal/reference workflow, and the return page will no longer be blocked by a vague non-2xx error.