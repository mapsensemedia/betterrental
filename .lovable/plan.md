

## Root Cause

The funnel is reading from the `analytics_events` table, which was just created and is nearly empty (only 3 error events). The data shown in the screenshot (22 searches, 11 selections) comes from events fired during the admin's own browsing session or recent test sessions — but several critical funnel events are **never fired anywhere in the codebase**:

| Funnel Stage | Event Key | Fired? | Where |
|---|---|---|---|
| Search | `search_performed` | Yes | `Search.tsx` on mount |
| Vehicle Viewed | `vehicle_viewed` | **No** | Never called — `funnelEvents.vehicleViewed()` has zero usages |
| Vehicle Selected | `vehicle_selected` | Yes | `Protection.tsx` on mount |
| Protection Added | `protection_selected` | Yes | `Protection.tsx` on continue |
| Add-ons Selected | `addons_selected` | Yes | `AddOns.tsx` on continue |
| Checkout Started | `checkout_started` | **No** | Never called — `funnelEvents.checkoutStarted()` has zero usages |
| Payment Method | `checkout_payment_method_selected` | **No** | Never called |
| Booking Completed | `booking_completed` | **No** | Never called — not in `NewCheckout.tsx` or `BookingConfirmed.tsx` |

The funnel shows 0 for vehicle views, checkout, payment, and bookings because those events are simply never fired. The inconsistency (11 selections but 0 views) exists because "vehicle selected" fires on the Protection page, while "vehicle viewed" is never fired at all.

## Plan

### 1. Add missing `vehicle_viewed` event to Search page
When a user clicks on a vehicle category card (`handleCategorySelect` in `Search.tsx`), fire `funnelEvents.vehicleViewed()` before navigating to the Protection page. This represents the user viewing/engaging with a specific vehicle.

### 2. Add `checkout_started` event to NewCheckout page
Fire `funnelEvents.checkoutStarted()` when the checkout page mounts in `NewCheckout.tsx`. This captures the user entering the checkout flow.

### 3. Add `payment_method_selected` event to NewCheckout page
Fire `funnelEvents.paymentMethodSelected()` when the user selects Pay Now or Pay Later in `NewCheckout.tsx`.

### 4. Add `booking_completed` event to BookingConfirmed page
Fire `funnelEvents.bookingCompleted()` when the booking confirmation page loads with a valid booking in `BookingConfirmed.tsx`.

### 5. Backfill historical funnel data from bookings table
Since existing confirmed bookings represent real completed funnels but have no analytics events, insert synthetic events into `analytics_events` for each confirmed/active/completed booking. This gives the funnel accurate historical data. Events to backfill per booking:
- `search_performed`, `vehicle_selected`, `checkout_started`, `booking_completed`
- Use the booking's `created_at` as the timestamp

### Files to modify
- `src/pages/Search.tsx` — add `vehicleViewed` call
- `src/pages/NewCheckout.tsx` — add `checkoutStarted` and `paymentMethodSelected` calls
- `src/pages/booking/BookingConfirmed.tsx` — add `bookingCompleted` call
- Database migration — backfill historical events from existing bookings

