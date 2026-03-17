

## Plan: Fix 9 Analytics Data Issues (Issues 14–22)

### Root Causes

1. **`use-revenue-analytics.ts`** queries by `created_at` instead of `start_at`, doesn't fetch `total_amount` or `start_at`, and calculates revenue as `daily_rate × total_days` (excludes protection, fees, tax)
2. **`Reports.tsx`** uses two separate data sources — `useRevenueAnalytics(filters)` for metric cards and `useAdminBookings({})` for Overview/charts — the latter ignores all filters
3. Pay Now/Pay Later logic checks for `payments.payment_type = "rental"` but all bookings in the DB have completed rental payments, making the filter meaningless. The actual distinction is `booking_source` based: online bookings with `wl_transaction_id` = pay now, walk-ins without = pay later
4. Revenue trend charts bucket bookings by `created_at` instead of `start_at`

### Changes

#### File 1: `src/hooks/use-revenue-analytics.ts`

**A. Fix date field and add `total_amount` + `start_at` to query (Issue 15, 21)**
- Line 104: Add `total_amount, start_at` to select
- Lines 105-106: Change `.gte("created_at", ...)` → `.gte("start_at", ...)` and same for `.lte`
- Update `BookingRow` interface to include `total_amount: number` and `start_at: string`

**B. Use `total_amount` for revenue (Issue 15)**
- Line 220: Change `b.daily_rate * b.total_days` → `b.total_amount` for `rentalBases`
- Lines 289-290, 334: Same change in channel comparison and trend calculations

**C. Fix trend bucketing to use `start_at` (Issue 21)**
- Lines 331, 348: Change `new Date(b.created_at)` → `new Date(b.start_at)` in weekly and daily trend filters
- Line 261: Change `new Date(booking.created_at)` → `new Date(booking.start_at)` in add-on trend

**D. Fix Pay Now/Pay Later logic (Issue 16)**
- Lines 202-206: Replace payment table lookup with `booking_source` + `wl_transaction_id` check:
  - `pay_now`: booking has `wl_transaction_id` (paid via gateway)
  - `pay_later`: no `wl_transaction_id` (pay at counter)
- Add `wl_transaction_id` to the select and `BookingRow`
- Remove the `paymentsQuery` entirely (no longer needed for this filter)

**E. Add `total_days` average to returned metrics**
- Add `averageDays` to `RentalPriceMetrics` computed from `filteredBookings`

#### File 2: `src/pages/admin/Reports.tsx`

**F. Remove redundant `useAdminBookings` / `revenueStats` (Issues 14, 18, 22)**
- Remove `useAdminBookings({})` call (line 225) and `revenueStats` useMemo (lines 303-323)
- Remove `useAdminVehicles()` call (line 226) — fleet utilization is a real-time snapshot that doesn't belong in filtered analytics
- Update the 4 metric cards to use only `useRevenueAnalytics(filters)`:
  - Revenue: `rentalMetrics.totalRentalBaseRevenue` (already correct after fix B)
  - Conversion: keep `overallConversion` from `filteredEvents`
  - Utilization: remove from top cards (it's a real-time snapshot, not filterable) — replace with "Total Bookings" count from `rentalMetrics.totalBookings`
  - Avg Days: use `rentalMetrics.averageDays` (new field from fix E)

**G. Fix Daily Bookings chart (Issue 22)**
- Replace `dailyBookingTrend` (lines 326-344) which used unfiltered `bookings` with data from `useRevenueAnalytics` — use `revenueTrend` from the hook which already computes daily/weekly booking counts and revenue

**H. Fix Overview tab to use filtered data (Issue 14)**
- Replace `revenueStats.totalRevenue` / `revenueStats.totalBookings` / `revenueStats.avgBookingValue` / `revenueStats.avgDuration` with `rentalMetrics` equivalents
- Weekly Revenue Trend chart: replace `weeklyRevenueTrend` useMemo with `revenueTrend` from the hook (already correctly computed after fix C)

**I. Fleet tab — label as "Current Snapshot" (Issue 18)**
- Keep fleet utilization as-is but clearly label "Current Fleet Status (live)" so users understand it's not date-filtered

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/use-revenue-analytics.ts` | Fix date field to `start_at`, add `total_amount`/`wl_transaction_id`, use `total_amount` for revenue, fix pay now/later logic, fix trend bucketing, add `averageDays` |
| `src/pages/admin/Reports.tsx` | Remove `useAdminBookings`/`useAdminVehicles`, consolidate all metrics through `useRevenueAnalytics`, replace stale chart data with hook data, fix Overview tab |

### Issue Coverage

| Issue | Fix |
|-------|-----|
| 14. Non-date filters don't refresh | Remove separate `useAdminBookings` — all data flows through `useRevenueAnalytics(filters)` |
| 15. Revenue mismatch | Use `total_amount` consistently |
| 16. Pay Now/Pay Later inverted | Use `wl_transaction_id` presence instead of payments table |
| 17. Category filter broken | Already correct — `bookings.vehicle_id` = category ID. Was a phantom issue. |
| 18. Top metrics ignore filters | All 4 cards read from `useRevenueAnalytics(filters)` |
| 19. "This Week" hardcoded | Already fixed — `periodLabel` is dynamic. Confirmed working. |
| 20. Events/Errors ignore date | Already fixed — `filteredEvents` applies `dateRange`. No separate Events/Errors tabs exist. |
| 21. Wrong week bucketing | Change `created_at` → `start_at` in trend calculations |
| 22. Daily Bookings empty | Use `revenueTrend` from hook instead of stale `useAdminBookings` data |

