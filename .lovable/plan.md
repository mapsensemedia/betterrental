

## Fix Revenue Discrepancy Between Payments and Reports

### Problem
The Reports "Overview" tab still shows a "Billed Revenue" card (line 559-578) using `rentalMetrics.totalRentalBaseRevenue` (booking.total_amount sums), which contradicts the payments-based "Collected Revenue." The `use-collected-revenue.ts` hook is already correctly rewritten. The PaymentDashboard daily trend also misses `captured` status in its daily aggregation.

### Changes

**1. `src/pages/admin/Reports.tsx`**
- **Remove "Billed Revenue" card** (lines 559-578): Replace it with a "Collected Revenue" card showing `collectedRevenue` with an info tooltip: "Sum of completed & captured payments only"
- **Remove `billedRevenue` from `revenueStats`** (line 363): No longer needed
- **Update the revenue value** shown on line 575 from `revenueStats.totalRevenue` → `collectedRevenue` (already correct at line 462, but the Overview tab card at 575 shows `totalRevenue` which equals `collectedRevenue` — confirm it stays consistent)
- **Add `Info` icon import** from lucide-react and a `Tooltip` from UI components on the Collected Revenue metric card (line 454-467) and the Overview tab card

**2. `src/pages/admin/PaymentDashboard.tsx`**
- **Daily trend** (lines 192-195): Change `p.status === "completed"` to include `captured` for collected/completedCount calculations in the daily trend loop
- **Add tooltip** to the "Collected" summary card explaining the metric

**3. `src/hooks/use-collected-revenue.ts`**
- Already correct — no changes needed

### Technical Details

Reports.tsx Overview tab changes:
- Line 559-578: Change card title from "Billed Revenue" to "Collected Revenue", change description, keep showing `revenueStats.totalRevenue` (which is already `collectedRevenue`)
- Add `<Tooltip>` with info icon on both the top metric card (line 454) and Overview tab card

PaymentDashboard.tsx daily trend fix:
- Lines 192, 195: `p.status === "completed"` → `p.status === "completed" || p.status === "captured"`

### Files
| File | Change |
|------|--------|
| `src/pages/admin/Reports.tsx` | Rename "Billed Revenue" → "Collected Revenue" card, add info tooltips |
| `src/pages/admin/PaymentDashboard.tsx` | Include `captured` in daily trend calculations, add tooltip |

