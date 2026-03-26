

## Fix: Unified Revenue Source of Truth

### Problem

Reports and Finance show different "total revenue" numbers because they use **two different data sources**:

| Page | Source | What It Counts |
|------|--------|----------------|
| **Finance** | `payments` table + WL supplement | Actual collected money ($6,229.76) |
| **Reports** | `bookings.total_amount` | Billed/invoiced amount ($5,962.38) |

These will always diverge because:
- Some bookings have payments not yet recorded (unrecorded revenue)
- Some payments include deposit captures that aren't in `total_amount`
- Partial payments mean collected != billed
- The WL supplement in Finance catches payments that `bookings.total_amount` doesn't reflect

### Solution

Make the **Finance module's payment-based calculation** the single source of truth for "collected revenue" across the entire platform. The Reports page should query the same `payments` table (with the same dedup logic) instead of summing `bookings.total_amount`.

### Changes

**1. Create a shared revenue hook** — `src/hooks/use-collected-revenue.ts`

Extract the Finance page's payment-fetching + dedup + WL supplement logic into a reusable hook that returns:
- `collected` (total completed payments, deduplicated)
- `pending`, `failed` counts
- `typeBreakdown` (rental/deposit/other)
- `isLoading`

This hook will accept date range filters and apply the same dedup logic currently in Finance.tsx (lines 527-549).

**2. Update Finance.tsx**

Replace the inline `metrics` calculation with the new shared hook. No change to the numbers — just refactoring the logic out.

**3. Update Reports.tsx + `useRevenueAnalytics`**

- Add a `collectedRevenue` field to the Reports page by calling the new shared hook
- The top-level metric card labeled with the dollar sign should show collected revenue from the shared hook, not `totalRentalBaseRevenue`
- Keep `totalRentalBaseRevenue` available as "Billed Revenue" for the Overview tab's "Billed Revenue" card (it's a valid metric — just different from collected)
- Label clearly: "Collected Revenue" vs "Billed Revenue" so there's no confusion

**4. Update RevenueAnalyticsTab**

The Revenue & Add-Ons tab's summary cards should also use the shared hook for the primary revenue number, with a clear "Collected" label.

### What Does NOT Change
- The `useRevenueAnalytics` hook itself (still useful for booking-level analytics like avg days, add-on attach rates, channel comparison)
- Finance page numbers (just refactored into shared hook)
- Any payment recording, dedup, or WL supplement logic
- Late fee, deposit, or pricing calculations

### Files Modified
1. `src/hooks/use-collected-revenue.ts` — **new** shared hook
2. `src/pages/admin/Finance.tsx` — refactor to use shared hook
3. `src/pages/admin/Reports.tsx` — use shared hook for top metric card
4. `src/components/admin/analytics/RevenueAnalyticsTab.tsx` — use shared hook for primary revenue display

