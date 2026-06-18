## Plan: fix hourly billable-day pricing across the full booking flow

### Goal
Make the customer-facing booking flow consistently charge and display billable days by actual pickup/return date + time:

- 24 hours = 1 billable day
- 25 or 26 hours = 2 billable days
- Same logic visible on search input, available categories, protection, add-ons, and checkout
- Server-side booking totals stay authoritative and aligned with the client preview

### Root cause to fix
The previous backend/shared helper uses `ceil(hours / 24)` correctly for timestamp inputs, but the customer flow still drops the selected time in several places:

- `RentalBookingContext` calculates `rentalDays` from `pickupDate` and `returnDate` only, often stored as local midnight dates.
- `RentalSearchCard.handleSearch()` persists dates with `parseLocalDate(...)`, which removes the selected pickup/return time.
- Protection/add-ons URLs use `formatLocalDate(...)`, so time is lost when moving pages or refreshing.
- Search, protection, add-ons, checkout, and summary components depend on this context `rentalDays`, so prices remain based on date-only days.

### Implementation steps

1. **Create one client-side source of truth for billable timestamps**
   - Add or reuse helpers in `src/lib/rental-rules.ts` / `src/lib/date-utils.ts` to combine:
     - `pickupDate + pickupTime`
     - `returnDate + returnTime`
   - Calculate billable days using `computeBillableDays(startDateTime, endDateTime)`.
   - Keep the rule explicit: `Math.ceil(durationMs / 24h)`, minimum 1 day.

2. **Fix `RentalBookingContext` day calculation**
   - Update `rentalDays` and duration validation to use combined date + time, not date-only midnight values.
   - Ensure 10:00 AM Apr 10 → 10:00 AM Apr 11 = 1 day.
   - Ensure 10:00 AM Apr 10 → 11:00 AM Apr 11 = 2 days.

3. **Stop dropping times from the search form**
   - In `RentalSearchCard`, persist date/time together when the customer searches.
   - Keep selected times intact when dates change.
   - Use the same helper for pickup and delivery modes.
   - Show the calculated billable day count directly near the pickup/return fields so customers see the pricing impact immediately.

4. **Preserve time in booking-flow URLs**
   - Update navigation from:
     - search → protection
     - protection → add-ons
     - add-ons → checkout
     - checkout back → add-ons
   - Use timestamp params with time (`localDateTimeToISO(...)`) instead of date-only values.
   - Keep existing hydration support so old date-only URLs still work, defaulting to stored/default times.

5. **Make pricing visibly clear on available categories**
   - Use the context billable days for each category total.
   - Add clearer text such as:
     - `1 billable day`
     - `2 billable days`
     - `$20.00/day × 2 days`
   - Keep the existing taxes/fees disclaimer.

6. **Make protection page totals clear**
   - Add the billable-day count in the sticky total/header or summary area.
   - Protection package cards should still show `/ day`, while total preview uses the correct billable days.

7. **Make add-ons page totals clear**
   - Add billable-day count near the total.
   - Ensure daily add-ons and additional drivers multiply by the corrected `rentalDays`.

8. **Make checkout price details clear**
   - Ensure checkout uses corrected `rentalDays` everywhere:
     - vehicle base rental line
     - protection total
     - add-ons
     - additional drivers
     - PVRT / ACSRCH
     - final total sent to booking function
   - Add concise wording in the price details that the day count is based on pickup/return time.

9. **Server alignment check**
   - Keep backend `computeBookingTotals()` as source of truth.
   - Verify checkout sends timestamped `startAt` and `endAt` with selected times so server total matches the corrected client total.
   - Keep backwards compatibility for date-only inputs.

10. **Verification**
   - Test these scenarios in the booking flow:
     - 24 hours: $20/day category shows one day.
     - 25 hours: same category shows two days.
     - Protection page total changes when return time crosses 24h.
     - Add-ons page daily extras use the corrected day count.
     - Checkout price details and submitted total match the same corrected count.

### Files likely touched
- `src/lib/rental-rules.ts`
- `src/lib/date-utils.ts`
- `src/contexts/RentalBookingContext.tsx`
- `src/components/rental/RentalSearchCard.tsx`
- `src/pages/Search.tsx`
- `src/pages/Protection.tsx`
- `src/pages/AddOns.tsx`
- `src/pages/NewCheckout.tsx`
- `src/components/rental/BookingSummaryPanel.tsx`

### Expected result
Customers will see and be charged consistently by actual rental duration everywhere: exactly 24 hours stays 1 day, anything over 24 hours becomes 2 days, and that same calculation is visible from search through checkout.