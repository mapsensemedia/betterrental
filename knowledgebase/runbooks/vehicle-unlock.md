# Runbook: Vehicle Unit Unlock (Release from Booking)

## When to Use

- Vehicle unit stuck in `reserved` or `rented` status after booking cancellation
- Need to free a unit for a new booking
- Void didn't properly release the unit

## Diagnosis

```sql
SELECT vu.id, vu.unit_number, vu.status, vu.current_booking_id,
       vc.name AS category
FROM vehicle_units vu
JOIN vehicle_categories vc ON vc.id = vu.category_id
WHERE vu.id = '<unit_id>';
```

```sql
-- Check if the linked booking is still active
SELECT id, status, assigned_unit_id
FROM bookings
WHERE assigned_unit_id = '<unit_id>'
  AND status NOT IN ('cancelled', 'completed');
```

## Recovery

If the booking is cancelled/completed but the unit is still reserved:

```sql
-- This should be done via void-booking or close-account edge functions
-- Direct SQL only as last resort with service_role:
UPDATE vehicle_units
SET status = 'available', current_booking_id = NULL
WHERE id = '<unit_id>';
```

## Preferred Path

1. If booking exists and should be cancelled → use `void-booking`
2. If booking is completed → use `close-account`
3. Both of these release the vehicle unit as a side effect

## Validation

```sql
SELECT id, status, current_booking_id FROM vehicle_units WHERE id = '<unit_id>';
```
