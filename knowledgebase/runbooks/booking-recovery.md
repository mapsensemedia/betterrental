# Runbook: Booking Recovery

## When to Use

- Booking stuck in `draft` after payment succeeded
- Booking status incorrect after webhook failure
- Need to manually transition booking state

## Diagnosis

```sql
SELECT b.id, b.status, b.booking_code, b.total_amount,
       b.created_at, b.updated_at
FROM bookings b WHERE b.id = '<booking_id>';

-- Check payments
SELECT * FROM payments
WHERE booking_id = '<booking_id>'
ORDER BY created_at;

-- Check webhook events
SELECT * FROM stripe_webhook_events
WHERE booking_id = '<booking_id>'
ORDER BY created_at;
```

## Recovery: Status Update

Booking status transitions are guarded by a monotonic rule in `stripe-webhook`. Direct DB updates require service_role.

If payment exists but status is wrong:

```sql
-- Via edge function (preferred): trigger a reprice which re-evaluates
POST /reprice-booking
{ "bookingId": "<id>", "operation": "modify", "endAt": "<current_end_at>" }
```

## Recovery: Void a Broken Booking

```
POST /void-booking
Authorization: Bearer <admin_jwt>
{
  "bookingId": "<booking_id>"
}
```

Preconditions:
- Admin role only
- Cannot void `cancelled` or `completed` bookings (409)

Effects:
- Sets status → `cancelled`
- Releases assigned vehicle unit
- Creates audit log entry
- Creates admin alert

## Validation

```sql
SELECT status, assigned_unit_id FROM bookings WHERE id = '<booking_id>';
SELECT * FROM audit_logs WHERE entity_id = '<booking_id>' ORDER BY created_at DESC LIMIT 5;
```
