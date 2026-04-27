## Problem

On `/admin/bookings`, the **All** tab shows oldest bookings on top and newly created bookings at the bottom.

**Root cause** — `src/pages/admin/Bookings.tsx`, line 336:

```ts
const allTabData = useMemo(() => {
  return applyOpsFilters(bookings).sort(
    (a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime()
  );
}, [bookings, opsFilters]);
```

It sorts by **pickup date ascending**, so a booking made today for a pickup next month sinks to the bottom while old bookings with imminent pickups float to the top.

The underlying domain query (`src/domain/bookings/queries.ts:25`) already returns `ORDER BY created_at DESC`, so removing this override is enough.

## Fix

Change the All tab sort to **`createdAt` descending** (newest booking first). One-line change:

```ts
const allTabData = useMemo(() => {
  return applyOpsFilters(bookings).sort(
    (a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()
  );
}, [bookings, opsFilters]);
```

## Scope — what stays the same

Only the **All** tab order changes. The operationally-driven tabs keep their pickup/return-time ordering because that's what staff need to work the day:

- **Pickups** tab — still sorted by pickup time ascending (next pickup first)
- **Active** tab — still sorted by return time ascending (next return first)
- **Returns** tab — still sorted by return time ascending
- **Completed** tab — still sorted by return time descending (most recently completed first)

## Files

- `src/pages/admin/Bookings.tsx` — single line change at line 336

## Out of scope

- `/ops/bookings` (separate page, different concerns)
- Customer-facing booking lists
- Adding a sort selector / column-header sorting (can be done later if you want users to toggle)
