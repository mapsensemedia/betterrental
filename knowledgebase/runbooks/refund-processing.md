# Runbook: Refund Processing

## When to Use

- Customer cancellation requiring refund
- Overcharge correction
- Deposit release after return

## Deposit Release

```
POST /release-deposit-hold
Authorization: Bearer <staff_jwt>
{
  "bookingId": "<booking_id>"
}
```

Preconditions:
- `deposit_status` must be `authorized`
- `stripe_deposit_pi_id` must exist

## Deposit Capture (Damage/Late Fee)

```
POST /capture-deposit
Authorization: Bearer <staff_jwt>
{
  "bookingId": "<booking_id>",
  "amount": 150.00,
  "reason": "Late return fee"
}
```

## Validation

```sql
SELECT deposit_status, deposit_amount, deposit_captured_amount,
       deposit_captured_at, deposit_released_at,
       stripe_deposit_pi_id
FROM bookings WHERE id = '<booking_id>';

SELECT * FROM deposit_ledger
WHERE booking_id = '<booking_id>'
ORDER BY created_at;

SELECT * FROM payments
WHERE booking_id = '<booking_id>' AND amount < 0
ORDER BY created_at;
```

## Stripe Refund (via Webhook)

Stripe `charge.refunded` events are handled by `stripe-webhook`:
- Inserts a negative-amount payment record
- Idempotent via `stripe_webhook_events`

## Rollback

Refunds are irreversible in Stripe. If a refund was issued in error, a new charge must be created.
