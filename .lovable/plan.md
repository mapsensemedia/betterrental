

## Problem

Booking **VQX7TWLZ** (status: `active`, end_at: March 16) is not showing in the **Ops Active Rentals** page because of a client-side filter on lines 107-110 of `OpsActiveRentals.tsx` that excludes bookings returning today, tomorrow, or overdue. Since March 16 is tomorrow, it gets filtered out.

The **Returns** page already shows all active bookings without this exclusion filter, so both views use the same data source but Active Rentals artificially hides near-term returns.

Payment record exists and is complete ($427.80, terminal payment, status: completed). The booking detail view fetches payments from the `payments` table via `getBookingDetail`, so it should already display correctly there.

## Plan

### 1. Remove the exclusion filter in OpsActiveRentals (main fix)
**File:** `src/pages/ops/OpsActiveRentals.tsx` (lines 107-111)

Remove the filter that excludes today/tomorrow/overdue bookings. All active rentals should appear here regardless of return date. Replace `activeOnlyBookings` with the full bookings list, keeping search filtering intact.

```text
Before:  filter out isToday/isTomorrow/isPast → use activeOnlyBookings
After:   use all bookings directly (no date exclusion)
```

This also removes unused imports: `isToday`, `isTomorrow`.

### 2. Add payment indicator to rental cards
**File:** `src/pages/ops/OpsActiveRentals.tsx`

Update the `RentalCard` component to display the booking's `totalAmount` so payment information is visible in the active rentals list. The `BookingSummary` type already includes `totalAmount`.

### Technical Details
- The `listBookings({ tab: "active" })` query correctly fetches `status = active` or `confirmed with start_at <= now` — no backend changes needed.
- The `useActiveRentals` hook (admin panel) queries active bookings directly without the date exclusion filter, so the admin view already works correctly.
- Payment data in the `payments` table is already linked and complete — no database changes required.

