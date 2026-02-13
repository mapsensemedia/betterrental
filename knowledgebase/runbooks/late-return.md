# Runbook: Late Return Handling

## When to Use

- Vehicle not returned by `end_at`
- Need to apply late return fees
- Need to override late fee

## Detection

```sql
SELECT id, booking_code, end_at, actual_return_at, status,
       late_return_fee, late_return_fee_override,
       late_return_override_reason
FROM bookings
WHERE status = 'active'
  AND end_at < NOW()
ORDER BY end_at;
```

## Automated Detection

`check-rental-alerts` (cron-invoked) scans for overdue bookings and triggers admin alerts.

## Apply Late Fee via Reprice

Extend the booking end date to actual return, which recalculates totals including additional days:

```
POST /reprice-booking
Authorization: Bearer <staff_jwt>
{
  "bookingId": "<booking_id>",
  "operation": "modify",
  "endAt": "<actual_return_timestamp>"
}
```

## Override Late Fee

If the late fee should be waived or adjusted, update via the admin panel which sets:
- `late_return_fee_override`
- `late_return_override_by`
- `late_return_override_at`
- `late_return_override_reason`

## Deposit Capture for Late Fee

If late fee exceeds rental payment, capture from deposit:

```
POST /capture-deposit
Authorization: Bearer <staff_jwt>
{
  "bookingId": "<booking_id>",
  "amount": <late_fee_amount>,
  "reason": "Late return fee"
}
```

## Validation

```sql
SELECT total_amount, late_return_fee, late_return_fee_override,
       end_at, actual_return_at, total_days
FROM bookings WHERE id = '<booking_id>';

SELECT * FROM audit_logs
WHERE entity_id = '<booking_id>'
ORDER BY created_at DESC LIMIT 5;
```
