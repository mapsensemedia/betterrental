# Drop-off Fee System

## Overview

The drop-off fee is charged when a customer returns a vehicle to a different location than the pickup location. The fee is determined by the `fee_group` column on the `locations` table, not by hardcoded location UUIDs.

## Architecture

### Database Schema

```sql
-- locations table
fee_group TEXT  -- e.g., "surrey", "langley", "abbotsford"
```

Each location is assigned to a fee group. The fee is determined by the pair of pickup and return fee groups.

### Fee Matrix

| Pickup Group | Return Group | Fee |
|-------------|-------------|-----|
| Same group | Same group | $0 |
| Surrey | Langley | $50 |
| Langley | Surrey | $50 |
| Abbotsford | Surrey | $75 |
| Surrey | Abbotsford | $75 |
| Abbotsford | Langley | $75 |
| Langley | Abbotsford | $75 |
| Unknown pair | Any | $0 |

### Why fee_group Instead of Location UUIDs

The legacy system used a flat `$25` drop-off fee with hardcoded location UUIDs. This was replaced with `fee_group` for two reasons:

1. **Scalability**: New locations can be added to existing groups without code changes. Just set `fee_group` in the DB.
2. **Maintenance**: No need to update edge function code when locations are added/removed. The fee logic is purely data-driven.

## Implementation

### Server-Side (Canonical)

**File**: `supabase/functions/_shared/booking-core.ts`

Two functions:

#### `feeFromGroups(pickupGroup, returnGroup)` — Pure Logic
```typescript
function feeFromGroups(pickupGroup, returnGroup): number {
  if (!pickupGroup || !returnGroup || pickupGroup === returnGroup) return 0;
  const pair = [pickupGroup, returnGroup].sort().join("|");
  switch (pair) {
    case "langley|surrey": return 50;
    case "abbotsford|langley":
    case "abbotsford|surrey": return 75;
    default: return 0;
  }
}
```

The `.sort().join("|")` trick makes the comparison order-independent (Surrey→Langley = Langley→Surrey).

#### `computeDropoffFee(pickupLocationId, returnLocationId)` — DB Lookup
```typescript
async function computeDropoffFee(pickupLocationId, returnLocationId): Promise<number> {
  // 1. Same location or missing IDs → $0
  // 2. Query locations table for fee_group of both IDs
  // 3. Call feeFromGroups(pickupGroup, returnGroup)
}
```

This is called by:
- `computeBookingTotals()` during booking creation
- `reprice-booking` during duration modification/repricing

### Client-Side (Display Only)

**File**: `src/lib/pricing.ts`

```typescript
export function computeDropoffFeeFromGroups(
  pickupFeeGroup: string | null | undefined,
  returnFeeGroup: string | null | undefined,
): number {
  // Identical logic to server feeFromGroups()
}
```

Used in:
- `NewCheckout.tsx` — checkout price preview
- `BookingSummaryPanel.tsx` — booking summary display
- `RentalSearchCard.tsx` — search results fee indicator

**Important**: The client function receives `fee_group` strings that were fetched via the `useLocations()` hook. It does NOT do a DB lookup — the hook already loaded location data including `fee_group`.

## Migration from Legacy $25

**Migration file**: `supabase/migrations/20260213031838_729135a3-9e63-4f99-a1b7-12c8d2ed36cf.sql`

The migration:
1. Temporarily disabled `trg_block_sensitive_booking_updates` (the seatbelt trigger)
2. Backfilled existing bookings with correct tiered drop-off fees based on their pickup/return location fee_groups
3. Re-enabled the trigger

This was necessary because the seatbelt trigger blocks all non-service_role updates to `different_dropoff_fee`. The migration ran as a schema migration (superuser), so it needed to explicitly disable/re-enable the trigger.

## Edge Cases

- **No return location**: Drop-off fee is $0
- **Same location ID**: Drop-off fee is $0 (fast path, no DB query)
- **Unknown fee_group**: Drop-off fee is $0 (default case in switch)
- **Null fee_group on location**: Drop-off fee is $0
- **Location not found**: If fewer than 2 rows returned from locations query, fee is $0
