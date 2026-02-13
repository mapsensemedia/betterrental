# Runbook: Manually Add/Remove Add-Ons

## When to Use

- Customer requests add-on after booking creation
- Staff upsells at counter
- Add-on was missed during checkout

## Preconditions

- Staff must have `admin` or `staff` role
- Booking must not be `cancelled`

## Add an Add-On (Upsell)

```
POST /persist-booking-extras
Authorization: Bearer <staff_jwt>
{
  "bookingId": "<booking_id>",
  "action": "upsell-add",
  "addOns": [
    { "addOnId": "<add_on_id>", "quantity": 1 }
  ]
}
```

This will:
1. Compute price server-side from `add_ons` table rates
2. Insert into `booking_add_ons` using service_role (bypasses seatbelt trigger)
3. Write to `audit_logs`
4. Call `reprice-booking` to update booking totals

## Remove an Add-On

```
POST /persist-booking-extras
Authorization: Bearer <staff_jwt>
{
  "bookingId": "<booking_id>",
  "action": "upsell-remove",
  "addOnIds": ["<booking_add_on_id>"]
}
```

## Validation

```sql
SELECT ba.*, ao.name, ao.daily_rate
FROM booking_add_ons ba
JOIN add_ons ao ON ao.id = ba.add_on_id
WHERE ba.booking_id = '<booking_id>';

SELECT total_amount, subtotal FROM bookings WHERE id = '<booking_id>';
```

## Rollback

To undo an add: use `upsell-remove` with the `booking_add_ons.id`.
To undo a remove: use `upsell-add` with the original `add_on_id`.
All operations are audit-logged.
