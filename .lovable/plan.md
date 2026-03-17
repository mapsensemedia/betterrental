

## Plan: Unify Analytics Filter System

### Problem
The Reports/Analytics page (`Reports.tsx`) has two disconnected filter systems:
1. **Top-right dropdown** (Today/This Week/This Month/All Time) — controls `dateFilter` state but the 4 metric cards ignore it (hardcoded to "This Week" revenue)
2. **Revenue tab internal filters** (date preset, channel, location, category, booking type, payment type) — managed entirely inside `RevenueAnalyticsTab` with no effect on other tabs or metric cards

### Solution

**Lift the Revenue tab's filter state up to `Reports.tsx` (the parent page)** so all tabs and metric cards share the same filters.

#### Step 1: Modify `RevenueAnalyticsTab` to accept filters as props

- Remove all internal filter state (datePreset, channel, locationId, categoryId, bookingType, paymentType, showFilters)
- Accept a new props interface: `{ filters: RevenueFilters; onFiltersChange: (f: RevenueFilters) => void; datePreset: DatePreset; onDatePresetChange: (p: DatePreset) => void; }`
- The filter UI (date picker, channel, location, category selects) stays rendered inside this component but reads/writes via props
- Export the `DatePreset` type from `RevenueAnalyticsTab` or the hook

#### Step 2: Manage unified filter state in `Reports.tsx`

- Remove the top-right date dropdown entirely (Today/This Week/This Month/All Time)
- Add page-level state for: `datePreset`, `channel`, `locationId`, `categoryId`, `bookingType`, `paymentType`, `customStartDate`, `customEndDate`
- Compute `dateRange` from `datePreset` (same logic currently in `RevenueAnalyticsTab`)
- Build a `RevenueFilters` object and pass it to `RevenueAnalyticsTab`
- Also pass the filters to `useRevenueAnalytics` at the page level to power the 4 metric cards

#### Step 3: Update the 4 metric cards to use filtered data

Replace hardcoded values:
- **Revenue card**: Use `rentalMetrics.totalRentalBaseRevenue` from `useRevenueAnalytics` with the page-level filters. Label dynamically based on `datePreset` (e.g., "Last 7 Days", "Month to Date", "Last 30 Days")
- **Conversion card**: Already uses `overallConversion` from `filteredEvents` — wire `filteredEvents` to match the same date range
- **Utilization card**: Filter active bookings within the selected date range
- **Avg Days card**: Use `rentalMetrics` average from the filtered hook data (or compute from filtered bookings)

Remove `revenueStats` computed separately from `useAdminBookings` — the `useRevenueAnalytics` hook already provides these numbers correctly.

#### Step 4: Wire other tabs to shared filters

- **Overview tab**: Use `filteredBookings` from the shared `useRevenueAnalytics` result (or pass date range to its queries). Currently shows hardcoded "This Week" / "This Month" / "All Time" labels.
- **Fleet tab**: Filter `fleetStats` by the selected date range — active rentals within period, utilization for period
- **Funnel tab**: Already uses `filteredEvents` — sync the date cutoff with the shared `dateRange`
- **Activity tab**: Audit logs have their own filters — these stay independent (they're a different data type)
- **Demand tab**: Has its own `months` selector — leave independent (historical forecasting)

#### Step 5: Ensure queryKeys include all filters

Already done in `use-revenue-analytics.ts` from prior fix. The page-level call will naturally include filter changes in the key since the filters object changes.

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/Reports.tsx` | Remove top-right date dropdown, add page-level filter state, call `useRevenueAnalytics` at page level, update 4 metric cards to use filtered data, pass filters to `RevenueAnalyticsTab` |
| `src/components/admin/analytics/RevenueAnalyticsTab.tsx` | Accept filters/callbacks as props instead of internal state, keep filter UI rendering |

### Date Label Mapping
```text
datePreset → label
"7d"      → "Last 7 Days"
"30d"     → "Last 30 Days"  
"90d"     → "Last 90 Days"
"mtd"     → "This Month"
"custom"  → "Custom Range"
```

