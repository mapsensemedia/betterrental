

## Fix Conversion Funnel Showing Wrong Data

### Root Cause

The conversion funnel counts `booking_completed` events from the `analytics_events` table. There are **zero** `booking_completed` events in the last 7 days — despite 3 active rentals, 14 completed bookings, and 5 ready for pickup. This happens because:

1. `booking_completed` is only fired client-side on the `BookingConfirmed` page
2. Admin-created, walk-in, and delivery bookings never trigger this event
3. If a customer closes the browser before the confirmation page loads, no event is recorded

The database confirms: 0 `booking_completed` events in last 7 days, yet 9 bookings were created in that period (1 pending, 2 confirmed, 2 active, 3 completed, 1 cancelled).

### Fix — Two changes, no disruption to existing flows

#### 1. Hybrid funnel: use real bookings count for the "Bookings" step

**Files**: `src/components/admin/AnalyticsPanel.tsx` and `src/components/admin/ConversionFunnel.tsx`

Instead of relying solely on `booking_completed` analytics events, query the actual `bookings` table for bookings created in the date range with status `confirmed`, `active`, or `completed`. This gives an accurate count regardless of how the booking was created.

- **AnalyticsPanel**: Add a query to count bookings from the `bookings` table where `status IN ('confirmed', 'active', 'completed')` and `created_at` within the date range. Use this count for the "Bookings" funnel step instead of filtering analytics events.
- **ConversionFunnel**: Accept an optional `bookingsCount` prop that overrides the `booking_completed` event count. The Reports page will pass actual booking counts the same way.

#### 2. Add server-side `booking_completed` event tracking (future-proofing)

**File**: `supabase/functions/update-booking-status/index.ts`

When a booking status transitions to `confirmed`, insert a `booking_completed` event into `analytics_events`. This ensures future funnel data is accurate from the analytics table alone, while the hybrid approach provides immediate accuracy.

- Fire-and-forget insert — does not affect the status update response
- Properties include `booking_id`, `source: "server"`, `total_amount`

### What does NOT change
- No changes to any business logic, edge functions, or payment flows
- The existing client-side tracking in `BookingConfirmed.tsx` stays as supplementary data
- ConversionFunnel component logic for all other steps (search, views, selections, checkout) remains unchanged
- No database schema changes needed

### Files modified
1. `src/components/admin/AnalyticsPanel.tsx` — query bookings table for accurate count
2. `src/components/admin/ConversionFunnel.tsx` — accept optional `bookingsCount` override prop
3. `src/pages/admin/Reports.tsx` — pass bookings count to ConversionFunnel
4. `supabase/functions/update-booking-status/index.ts` — add analytics insert on confirmation

