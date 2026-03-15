

# Fix: Time-only detection using local dates instead of UTC

## Problem
`isTimeOnlyChange` on line 83-92 compares `.substring(0, 10)` of UTC ISO strings. A local-time-only change (e.g. 10:00 AM → 11:00 PM PDT) can shift the UTC date (e.g. `2026-03-15T17:00Z` → `2026-03-16T06:00Z`), causing the check to fail. The system then treats it as a date change and runs a full reprice with duration discounts.

## Fix
**File**: `src/components/admin/ops/BookingEditPanel.tsx`

Replace the UTC-based date comparison with local-date comparison using `format(date, "yyyy-MM-dd")` (which uses the browser's local timezone):

```typescript
const isTimeOnlyChange = useMemo(() => {
  if (!hasChanges || locationChanged || rateChanged) return false;
  const localDate = (iso: string) => format(new Date(iso), "yyyy-MM-dd");
  const startDateSame = startAt === booking.start_at || localDate(startAt) === localDate(booking.start_at);
  const endDateSame = endAt === booking.end_at || localDate(endAt) === localDate(booking.end_at);
  return startDateSame && endDateSame;
}, [hasChanges, startAt, endAt, booking.start_at, booking.end_at, locationChanged, rateChanged]);
```

This ensures that if the user only adjusts the time portion (same local calendar date), the system correctly identifies it as a time-only change and skips repricing.

**Single file, ~5 lines changed. No backend changes needed.**

