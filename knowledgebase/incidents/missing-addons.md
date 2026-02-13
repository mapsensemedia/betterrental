# Incident: Missing Add-Ons After Booking

## Symptoms

- Customer booked with add-ons selected but `booking_add_ons` has no rows
- Financial breakdown shows $0 for add-ons on a booking that should have them

## Detection

```sql
SELECT ba.*, ao.name
FROM booking_add_ons ba
JOIN add_ons ao ON ao.id = ba.add_on_id
WHERE ba.booking_id = '<booking_id>';
```

```sql
-- Check for zero-price rows (seatbelt trigger fired on non-service_role insert)
SELECT * FROM booking_add_ons
WHERE booking_id = '<booking_id>' AND price = 0;
```

## Root Causes

| Cause | Detection | Fix |
|-------|-----------|-----|
| Client sent empty `addOns` array | Check edge function request logs | Customer re-books or staff upsells |
| `trg_enforce_addon_price` zeroed price (non-service_role insert) | Rows exist with `price = 0` | Code regression — extras must route through `persist-booking-extras` |
| Premium protection filtered out roadside add-ons | Log: `[booking-core] Filtering Premium Roadside` | Expected behavior — inform customer |
| `persist-booking-extras` failed silently | Check edge function error logs | Re-invoke via Counter Upsell Panel |

## Recovery

Staff adds missing add-ons via **Counter Upsell Panel** → calls `persist-booking-extras` with `action: "upsell-add"` → triggers `reprice-booking` to update totals.

## SQL Diagnostics

```sql
-- Full booking financial state
SELECT total_amount, subtotal, tax_amount, protection_plan,
       daily_rate, total_days, young_driver_fee,
       different_dropoff_fee, delivery_fee, upgrade_daily_fee
FROM bookings WHERE id = '<booking_id>';

-- Audit trail
SELECT * FROM audit_logs
WHERE entity_id = '<booking_id>'
ORDER BY created_at DESC LIMIT 20;
```

## Escalation

If `price = 0` rows appear in production → seatbelt trigger is working correctly but something bypassed the `persist-booking-extras` edge function. Investigate the code path that wrote directly to `booking_add_ons`.
