# Runbook: Deposit Hold Stuck

## Symptoms
- Booking shows `deposit_status = authorized` but never captured or released
- Customer's card has pending charge that won't clear
- Deposit ledger shows `hold` entry but no `capture` or `release`

## Diagnosis Steps

### 1. Check Booking Record
```sql
SELECT id, booking_code, status, deposit_status, deposit_amount,
       stripe_deposit_pi_id, deposit_authorized_at, deposit_expires_at,
       deposit_released_at, deposit_captured_at
FROM bookings WHERE booking_code = 'XXXXXXXX';
```

### 2. Check Stripe Payment Intent
Using the `stripe_deposit_pi_id`, check in Stripe Dashboard:
- Is the PaymentIntent still `requires_capture`?
- Has it expired (7 days for card payments)?

### 3. Check Deposit Ledger
```sql
SELECT * FROM deposit_ledger 
WHERE booking_id = '<booking_id>' 
ORDER BY created_at;
```

### 4. Check Deposit Jobs
```sql
SELECT * FROM deposit_jobs
WHERE booking_id = '<booking_id>'
ORDER BY created_at;
```

## Resolution Actions

| Cause | Action |
|-------|--------|
| Close-account not called | Complete the return flow to trigger close-account |
| Edge function error | Check close-account logs, fix and retry |
| Stripe PI expired | Deposit auto-releases after 7 days; update status manually |
| Job stuck in queue | Check deposit_jobs status, retry if needed |

## Manual Release
If deposit must be released manually:
1. Cancel the PaymentIntent in Stripe Dashboard
2. Update booking: `deposit_status = 'released'`, `deposit_released_at = now()`
3. Add deposit_ledger entry: `action = 'release'`

## Prevention
- The `close-account` edge function handles deposit release/capture
- Return flow must complete fully to trigger account closure
- Monitor `deposit_expires_at` for approaching expirations
