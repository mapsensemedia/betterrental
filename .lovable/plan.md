

## Fix Booking Date Sorting (Soonest First)

### Problem
Bookings are sorted by `created_at` (when the booking was made) rather than by actual pickup/return dates. This means a booking for Apr 16 could appear after one for Jun 30 if it was created later.

### Fix

**File: `src/pages/admin/Bookings.tsx`** — lines 342-376 (`categorizedBookings` useMemo)

After each filtered array is created, add `.sort()` by the relevant date field:

- **Pickup arrays** (`allPickups`, `pickupsToday`, `pickupsTomorrow`, `pickupsUpcoming`, `pickupsPast`): Sort by `startAt` ascending (soonest first)
- **Active/return arrays** (`active`, `returnsToday`, `returnsTomorrow`, `overdue`): Sort by `endAt` ascending (soonest return first)
- **Completed**: Sort by `endAt` descending (most recently completed first)

Sort helper:
```ts
const byStartAsc = (a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime();
const byEndAsc = (a, b) => parseISO(a.endAt).getTime() - parseISO(b.endAt).getTime();
```

Apply to every categorized array so all tabs display in correct chronological order.

### Files
| File | Change |
|------|--------|
| `src/pages/admin/Bookings.tsx` | Add `.sort()` calls to all categorized booking arrays in the `categorizedBookings` useMemo |

### No other changes
- No backend or database changes
- No new files
- Sorting is purely client-side within existing data

