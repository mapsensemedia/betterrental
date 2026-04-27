## Plan: make rental payments end as captured even if Bambora forces Pre-Auth

I will not change the customer card form. The fix belongs in the backend payment flow: after the rental payment is approved by Bambora, the backend will immediately attempt a Completion/Capture against the returned transaction ID. Deposits will remain pre-auth only.

## What will change

### 1. Merchant configuration check
Before changing the payment behavior, I will perform a read-only Bambora configuration check using the existing backend Worldline/Bambora credentials:

- Try `GET /configuration`
- If unavailable or unsupported, try `GET /merchant`
- Show you the returned payload or the exact Bambora error response

No payment, capture, refund, or booking mutation will be performed for this check.

If Bambora does not expose merchant/account capture mode through those endpoints, I will report that exact API response and still proceed with the capture guarantee below.

### 2. Rental payment flow: force completion after approval
For `wl-pay` rental payments only:

1. Create the initial Bambora payment exactly as today.
2. Read the returned transaction ID and returned transaction type, if present.
3. Immediately call Bambora Completion/Capture:

```text
POST /payments/{transaction_id}/completions
body: { amount: booking.total_amount }
```

4. Treat the rental as completed only if:
   - the completion call succeeds, or
   - Bambora explicitly says the transaction is already completed/captured.

5. Only then update:

```text
payments.status = 'completed'
bookings.wl_auth_status = 'completed'
bookings.status = 'confirmed'
```

If the completion fails, the payment will not be counted as collected revenue.

### 3. Deposit path remains protected
For `wl-authorize` deposit holds:

- Keep `complete: false`
- Keep `payment_type = 'deposit'`
- Do not call Completion/Capture from the deposit authorization flow
- Add a safety assertion around the returned Bambora transaction type so a deposit cannot be silently recorded as a normal completed rental payment

Manual admin deposit capture will continue to use the existing deposit-specific capture function.

### 4. Capture failure alert in Finance
If rental auto-capture fails, the backend will create/update a visible admin alert tied to the booking.

The Finance Overview page will show a red “Rental Capture Failed” panel listing:

- booking code
- customer/booking link if available
- amount
- transaction ID
- Bambora error message

This prevents silent failures and gives staff an immediate manual follow-up queue.

### 5. Webhook/callback sync hardening
The webhook handler will also recognize rental capture callbacks:

```text
P   = rental purchase confirmed
PA  = rental pre-auth observed; not collected yet
PAC = rental completion/capture confirmed
VP  = void/reversal
```

For rental `PAC`, it will update the matching payment row to `completed` and the booking to `confirmed` immediately.

## Exact files to change

### `supabase/functions/_shared/worldline.ts`
Add shared helpers for:

- Completion/Capture response typing
- detecting Bambora “already completed/captured” responses
- optional merchant/configuration read calls if needed for the API check

Likely area:

```text
lines 80-103: existing Worldline error parsing helpers
```

### `supabase/functions/wl-pay/index.ts`
Main rental fix.

Current relevant areas:

```text
lines 64-72: initial POST /payments request with complete: true
lines 90-108: booking update + payment insert currently mark rental completed immediately
```

Planned replacement behavior:

```text
approved initial payment
  -> attempt POST /payments/{txn.id}/completions
  -> if capture success/already captured:
       update booking confirmed/completed auth status
       insert/update rental payment as completed
     else:
       insert/update rental payment as authorized or capture_failed/pending_capture
       create Finance/admin alert
       return a clear payment capture failure response
```

### `supabase/functions/wl-authorize/index.ts`
Deposit safety only.

Current relevant area:

```text
lines 95-103: deposit POST /payments with complete: false
lines 114-124: deposit authorization persisted as status authorized
```

Planned change:

```text
keep complete: false
add returned transaction type validation before persistDepositAuthorization(...)
never call /completions here
```

### `supabase/functions/wl-webhook/index.ts`
Webhook sync hardening.

Current relevant area:

```text
lines 108-121: rental callbacks currently handle P and VP only
```

Planned change:

```text
add rental PA handling as authorized / not collected
add rental PAC handling as completed + confirmed
update matching payments row status after P/PAC/VP where applicable
```

### `src/pages/admin/Finance.tsx`
Finance alert visibility.

Current relevant areas:

```text
lines 585-612: overview metrics/query-derived state area
lines 802-840: existing action-required panel area
```

Planned change:

```text
query pending admin alerts for rental capture failures
render a red capture-failure panel above/near the existing Expected Revenue panel
```

## What I will not do

- I will not auto-capture deposits.
- I will not run test card payments or create live charges.
- I will not count uncaptured pre-auths as collected revenue.
- I will not change the customer-facing card entry component unless a compile error forces a minor type adjustment.

## Verification after implementation

I will verify by code/type checks and by inspecting the changed logic, not by running real payment transactions. The expected result is:

```text
Rental payment approved by Bambora
  -> immediate completion attempted
  -> completed DB status only after capture succeeds or gateway confirms already completed
  -> failure creates visible Finance alert

Deposit authorization approved by Bambora
  -> remains authorized/pre-auth
  -> no automatic completion call
```