## Confirmed cause

Booking **5XKC2GPA** is currently `active`, has no return recorded, and ends on **August 6, 2026**. The Admin Bookings page first fetches only the **100 most recently created non-draft bookings**, then derives the Active tab by filtering that limited result in the browser. There are **195 newer non-draft bookings** than 5XKC2GPA, so it never reaches the Active-tab filter.

The earlier refresh change affected the separate active-rentals hook, but `/admin/bookings?tab=active` currently uses `useAdminBookings`, so refreshing cannot restore a row excluded by that query limit.

## Implementation plan

1. **Add a dedicated admin active-rentals query**
   - Query bookings with `status = active` at the database level.
   - Fetch the same customer, location, category, and payment details required by the Admin Active tab.
   - Do not derive active rentals from the newest-100 general booking result.

2. **Connect the Admin Active tab to the dedicated result**
   - Feed `ActiveRentalsMonitor` from the complete active-rentals query.
   - Use that result for the Active tab badge/count.
   - Preserve the existing location, vehicle, and date filters.
   - Keep the All, Pickups, Returns, and Completed tabs unchanged.

3. **Keep active data current**
   - Refetch on mount and browser focus.
   - Add the existing one-minute refresh safety interval so newly activated bookings appear without a hard reload.
   - Ensure booking-status mutations invalidate this query key.

4. **Verify the regression**
   - Confirm **5XKC2GPA** appears under `/admin/bookings?tab=active`.
   - Confirm all database rows with `status = active` are represented, including older bookings.
   - Verify filters still work and confirmed/pending bookings do not enter the Active tab.