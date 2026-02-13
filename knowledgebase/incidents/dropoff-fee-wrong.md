# Incident: Drop-off Fee Missing or Wrong

## Symptoms

- Customer returned to a different location but `different_dropoff_fee` is $0
- Fee is $25 (legacy value) instead of $50/$75

## Detection

```sql
SELECT b.location_id, b.return_location_id, b.different_dropoff_fee,
       pl.name AS pickup_name, pl.fee_group AS pickup_group,
       rl.name AS return_name, rl.fee_group AS return_group
FROM bookings b
LEFT JOIN locations pl ON pl.id = b.location_id
LEFT JOIN locations rl ON rl.id = b.return_location_id
WHERE b.id = '<booking_id>';
```

## Root Causes

| Cause | Detection | Fix |
|-------|-----------|-----|
| `return_location_id` is NULL or equals `location_id` | Query above | Expected — same location = $0 |
| `fee_group` is NULL on one or both locations | `fee_group IS NULL` | Set fee_group on location record |
| Fee group pair not in supported matrix | Groups don't match surrey/langley/abbotsford | Add pair to `computeDropoffFee` |
| Legacy booking pre-migration | `different_dropoff_fee = 25` | Reprice via `reprice-booking` |

## Fee Matrix

| Pickup Group | Return Group | Fee |
|-------------|-------------|-----|
| surrey | langley | $50 |
| langley | surrey | $50 |
| abbotsford | langley | $75 |
| langley | abbotsford | $75 |
| abbotsford | surrey | $75 |
| surrey | abbotsford | $75 |
| Same group | Same group | $0 |
| Any | NULL | $0 |

## Recovery

```
POST /reprice-booking
{ "bookingId": "<id>", "operation": "modify", "endAt": "<current_end_at>" }
```

This recomputes `computeDropoffFee()` from current DB values.

## Escalation

If a new location is added without `fee_group`, all bookings returning to/from that location will have $0 drop-off fee. Ensure `fee_group` is set on location creation.
