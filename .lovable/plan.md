

## Fix Conversion Funnel — Use Bookings as Single Source of Truth

### Problem
The funnel mixes analytics_events (browser tracking) with bookings table counts, producing impossible numbers (e.g., 35 completions from 15 checkout starts, >100% conversion rates, negative drop-offs).

### Approach
Rewrite the `ConversionFunnel` component to accept pre-computed stage counts derived entirely from the bookings/booking_add_ons/payments tables. Move all data fetching to `Reports.tsx` and pass clean numbers down.

### Changes

**1. `src/pages/admin/Reports.tsx` — Replace funnel data source**

- Add a new query (`funnel-bookings-data`) that fetches all bookings in the date range (excluding cancelled for stage 1, but including cancelled for checkout stage):
  ```sql
  SELECT id, status, protection_plan FROM bookings
  WHERE created_at >= start AND created_at <= end
  ```
- Add a query for booking_add_ons: count distinct booking_ids that have at least one add-on row
- Add a query for payments: count distinct booking_ids that have at least one payment row
- Compute 8 stage counts in a `useMemo`:
  - Stage 1-3 (Search/Viewed/Selected): all non-cancelled bookings
  - Stage 4 (Protection): bookings where `protection_plan != 'none'`
  - Stage 5 (Add-ons): bookings with ≥1 booking_add_on row
  - Stage 6 (Checkout): bookings with status in confirmed/active/completed/cancelled
  - Stage 7 (Payment Attempted): bookings with ≥1 payment row
  - Stage 8 (Completed): bookings with status in confirmed/active/completed
- Enforce monotonic decreasing after calculation
- Pass the computed stages array to `ConversionFunnel` instead of raw events
- Remove `realBookingsCount` query (no longer needed separately)
- Keep `analyticsEventsRaw` / `useAnalyticsEvents` if used elsewhere (Event Distribution chart still needs it)

**2. `src/components/admin/ConversionFunnel.tsx` — Simplify props and fix math**

- Change props from `events + bookingsCount` to a single `stages` array: `{ label, count, icon }[]`
- Remove all internal event filtering logic
- Fix bar width: `width = (stage.count / stages[0].count) * 100`
- Clamp conversion rate to 0-100%: `Math.min(100, Math.max(0, rate))`
- Clamp drop-off rate to 0-100%
- Empty state: show when `stages[0].count === 0` instead of `events.length === 0`

### Files
| File | Change |
|------|--------|
| `src/pages/admin/Reports.tsx` | Add bookings-based funnel queries, compute stages, pass to component |
| `src/components/admin/ConversionFunnel.tsx` | Accept pre-computed stages, fix bar width and rate calculations |

