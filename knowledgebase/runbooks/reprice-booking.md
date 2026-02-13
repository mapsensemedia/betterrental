# Runbook: Reprice a Booking

## When to Use

- After adding/removing add-ons via upsell
- After modifying booking dates (extend/shorten)
- After applying/removing a vehicle upgrade
- When financial totals don't match line items

## Preconditions

- Caller must have `admin` or `staff` role
- Booking must not be `cancelled` or `completed`

## Operations

### Modify (Change End Date)

```
POST /reprice-booking
Authorization: Bearer <staff_jwt>
{
  "bookingId": "<booking_id>",
  "operation": "modify",
  "endAt": "2026-03-15T10:00:00Z"
}
```

### Upgrade (Apply Upgrade Fee)

```
POST /reprice-booking
Authorization: Bearer <staff_jwt>
{
  "bookingId": "<booking_id>",
  "operation": "upgrade",
  "upgradeDailyFee": 25.00,
  "assignedUnitId": "<new_unit_id>"  // optional
}
```

### Remove Upgrade

```
POST /reprice-booking
Authorization: Bearer <staff_jwt>
{
  "bookingId": "<booking_id>",
  "operation": "remove_upgrade"
}
```

## What It Does

1. Fetches current booking from DB
2. Calls `computeBookingTotals()` with updated parameters
3. Updates `bookings` financial fields (subtotal, tax_amount, total_amount, total_days, etc.)
4. Writes to `audit_logs` with full old/new data snapshot
5. Optionally updates `vehicle_units` status for upgrades

## Validation

```sql
SELECT total_amount, subtotal, tax_amount, total_days,
       upgrade_daily_fee, different_dropoff_fee
FROM bookings WHERE id = '<booking_id>';

SELECT * FROM audit_logs
WHERE entity_id = '<booking_id>' AND action = 'reprice'
ORDER BY created_at DESC LIMIT 1;
```

## Rollback

No automatic rollback. To revert:
1. Check `audit_logs.old_data` for the previous values
2. Call `reprice-booking` again with the original parameters
3. Or manually update via SQL with service_role (last resort)
