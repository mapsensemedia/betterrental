# Incident Playbook: Drop-off Fee Mismatch

## Classification
- **Severity**: Medium
- **Impact**: Customer charged wrong amount for different return location
- **SLA**: Investigate within 1 hour

## Detection
- Customer disputes drop-off fee amount
- Ops panel shows different fee than checkout showed
- Rental agreement PDF has wrong drop-off fee
- `different_dropoff_fee` on booking doesn't match expected tier

## Fee Tiers (Source of Truth: rental-rules.ts)
| Route | Fee |
|-------|-----|
| Same location | $0 |
| Within fee group (e.g., Surrey ↔ Langley) | $50 |
| Cross fee group (e.g., Surrey → Abbotsford) | $75 |

## Investigation

### Step 1: Check Booking Record
```sql
SELECT booking_code, location_id, return_location_id, different_dropoff_fee
FROM bookings WHERE booking_code = 'XXXXXXXX';
```

### Step 2: Check Location Fee Groups
```sql
SELECT id, name, city, fee_group
FROM locations 
WHERE id IN ('<pickup_location_id>', '<return_location_id>');
```

### Step 3: Verify Pricing Computation
The fee is computed in `validateClientPricing()` (booking-core.ts):
- If `locationId === returnLocationId` → $0
- If locations are in the same `fee_group` → $50
- If locations are in different `fee_groups` → $75

### Step 4: Check Server vs Client
- Server computation happens in `create-booking` via `validateClientPricing()`
- Client preview happens in `pricing.ts` `calculateBookingPricing()`
- Both should use the same fee tier logic

## Resolution

### If Fee Was Wrong at Creation
The fee was baked into `different_dropoff_fee` and included in `subtotal`/`total_amount`.
Use `reprice-booking` edge function to recalculate with correct locations.

### If Fee Group is Wrong
Update the location's `fee_group` in the database:
```sql
UPDATE locations SET fee_group = 'correct_group' WHERE id = '<location_id>';
```

## Prevention
- Location fee_group must be set correctly when adding new locations
- Server-side pricing validates and overrides client fees
- ESLint guard prevents client-side booking financial writes
