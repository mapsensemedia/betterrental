# Incident: Stripe Payment Failed

## Symptoms

- Payment Intent created but no webhook received
- Booking stuck in `draft` or `pending` after payment
- Duplicate payment records
- Deposit hold not captured/released

## Detection

### No Webhook Received

```sql
SELECT * FROM stripe_webhook_events
WHERE booking_id = '<booking_id>'
ORDER BY created_at DESC;
```

If empty → webhook never arrived. Check Stripe dashboard for delivery failures.

### Duplicate Payments

```sql
SELECT id, amount, payment_type, status, transaction_id, created_at
FROM payments
WHERE booking_id = '<booking_id>'
ORDER BY created_at;
```

Duplicate `transaction_id` values should be prevented by partial unique index.

### Status Not Updating

```sql
SELECT status FROM bookings WHERE id = '<booking_id>';
```

Monotonic guard: `confirmed` → won't downgrade to `pending`. Check logs for `[stripe-webhook] Skipping status downgrade`.

### Deposit Issues

```sql
SELECT stripe_deposit_pi_id, stripe_deposit_client_secret,
       deposit_status, deposit_amount,
       deposit_authorized_at, deposit_captured_at, deposit_released_at
FROM bookings WHERE id = '<booking_id>';

SELECT * FROM deposit_ledger
WHERE booking_id = '<booking_id>'
ORDER BY created_at;
```

## Root Causes

| Cause | Fix |
|-------|-----|
| `STRIPE_WEBHOOK_SECRET` misconfigured | Update secret |
| Stripe endpoint URL changed | Reconfigure webhook endpoint |
| Idempotency dedup rejected replay | Expected — check `stripe_webhook_events` |
| PaymentIntent amount mismatch (integer cents) | Check `create-payment-intent` logs |

## Recovery

1. If webhook missed: manually insert payment record and update booking status
2. If duplicate: the idempotency layer should prevent this; investigate if partial unique index is missing
3. If deposit stuck: check Stripe dashboard for PaymentIntent state, manually invoke `capture-deposit` or `release-deposit-hold`

## Escalation

Stripe webhook failures affecting multiple bookings → check Stripe status page and edge function deployment status.
