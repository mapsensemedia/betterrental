# Incident Playbook: Bookings Created with Missing Extras

## Classification
- **Severity**: High
- **Impact**: Add-ons and additional drivers not persisted, totals may be incorrect
- **SLA**: Investigate within 30 minutes

## Detection
- Booking exists but `booking_add_ons` table has no rows for it
- `booking_additional_drivers` table has no rows despite customer selecting drivers
- Ops Financial Breakdown shows fewer line items than expected
- EXTRAS_PERSIST_FAILED in edge function logs

## Investigation Checklist

### Step 1: Check create-booking Logs
Look for:
```
[create-booking] Extras persistence FAILED for booking <id>
[create-booking] addOnPrices count: X, additionalDriverRecords count: Y
```

### Step 2: Check Database Triggers
The `trg_enforce_addon_price` and `trg_enforce_driver_fee` triggers may be blocking inserts:
```sql
-- Check if triggers exist
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname LIKE '%addon%' OR tgname LIKE '%driver%';
```

### Step 3: Verify persist-booking-extras
If extras were added post-creation:
- Check `persist-booking-extras` edge function logs
- Verify it uses service_role (required to bypass price triggers)

### Step 4: Check Booking Record
```sql
SELECT b.id, b.booking_code,
  (SELECT COUNT(*) FROM booking_add_ons WHERE booking_id = b.id) as addon_count,
  (SELECT COUNT(*) FROM booking_additional_drivers WHERE booking_id = b.id) as driver_count
FROM bookings b WHERE b.booking_code = 'XXXXXXXX';
```

## Resolution

### Re-persist Extras
Call the `persist-booking-extras` edge function with the booking ID:
- It will recalculate and insert add-ons with server-computed prices
- It uses service_role to bypass trigger guards

### Manual Insert (last resort)
```sql
-- Only via service_role / admin SQL
INSERT INTO booking_add_ons (booking_id, add_on_id, price, quantity)
VALUES ('<booking_id>', '<add_on_id>', <server_price>, <qty>);
```

## Prevention
- `create-booking` catches extras errors but doesn't fail the whole booking
- Monitor for EXTRAS_PERSIST_FAILED log events
- Periodic audit: bookings with totals > rental subtotal but no extras rows
