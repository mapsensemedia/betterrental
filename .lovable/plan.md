

## Plan: Fix Fleet "On Rent" Stale Status

### FIX 1 — Immediate data fix
Update the vehicle unit for booking 26HDD44Y from `available` to `on_rent`:
```sql
UPDATE vehicle_units SET status = 'on_rent' WHERE id = 'fef17285-f9da-490a-966c-ca36e1079c5f'
```

### FIX 2 — Derive "On Rent" count from active bookings

The `useFleetCategories` hook (lines 81-97) counts available/on_rent purely from `vehicle_units.status`. This is stale when status isn't synced.

**File: `src/hooks/use-fleet-categories.ts`** — In `useFleetCategories()`:
- After fetching units, also fetch active bookings with assigned units:
  ```sql
  SELECT assigned_unit_id FROM bookings 
  WHERE status = 'active' AND assigned_unit_id IS NOT NULL
  ```
- Build a `Set<string>` of unit IDs that are actively rented
- When computing counts, a unit is "on_rent" if its ID is in the active bookings set (regardless of `vehicle_units.status`)
- `available_count` = total - on_rent_from_bookings - maintenance_count

**File: `src/pages/ops/OpsFleet.tsx`** — Same pattern for the ops fleet page:
- Fetch active bookings alongside units
- Override unit status display: if a unit's ID appears in active bookings, show it as `on_rent` regardless of the `vehicle_units.status` field
- Status counts use the same booking-derived logic

**File: `src/hooks/use-fleet-analytics.ts`** — The `useFleetSummary` also has an `activeRentals` field. Ensure it's derived from active bookings count, not unit status.

### FIX 3 — Edge function already handles status sync (lines 177-183 of update-booking-status)

The edge function correctly updates unit status when `booking.assigned_unit_id` exists. The gap: walk-in bookings are created as `draft` via `create-walk-in-booking` and then separately activated via `update-booking-status`. The unit assignment happens via `assign_vin_to_booking` RPC (which sets status to `on_rent`) before activation. So the flow is correct for new bookings.

The stale data for 26HDD44Y likely happened from a manual status correction or edge case. **Add a warning log** in `update-booking-status` when activating a booking that has no `assigned_unit_id`:

```typescript
if (!booking.assigned_unit_id) {
  console.warn(`[update-booking-status] Booking ${bookingId} activated without assigned_unit_id`);
}
```

### Files to modify

| File | Change |
|------|--------|
| `src/hooks/use-fleet-categories.ts` | `useFleetCategories`: fetch active bookings, derive on_rent count from bookings instead of unit status |
| `src/pages/ops/OpsFleet.tsx` | Override unit status display using active bookings set |
| `src/hooks/use-fleet-analytics.ts` | Derive `activeRentals` from bookings |
| `supabase/functions/update-booking-status/index.ts` | Add warning log for missing assigned_unit_id on activation |
| DB data fix | Set unit `fef17285-f9da-490a-966c-ca36e1079c5f` to `on_rent` |

