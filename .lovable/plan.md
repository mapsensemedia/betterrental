

## Fix 4 Data Calculation Bugs

### Analysis

After inspecting the codebase:
- **FIX 1 (Cancelled exclusion)**: `use-collected-revenue.ts` Source C and `use-revenue-analytics.ts` already filter `.in("status", ["confirmed", "active", "completed"])` — cancelled is already excluded. The Finance payments query (Source A) fetches from the `payments` table directly without status filter — need to add booking status fetch + filter. The Bookings.tsx summary bar sums all `allTabData` without excluding cancelled.
- **FIX 2 (Fleet label)**: Already fixed — Reports.tsx line 803 uses `Fleet Revenue ({periodLabel})` which is dynamic.
- **FIX 3 (Payments table)**: Finance.tsx Source A fetches bookings but doesn't select `status` — need to add it and filter out cancelled.
- **FIX 4 (Summary bar)**: `allTabTotalValue` on line 332 sums all bookings without excluding cancelled.

### Changes

**File: `src/pages/admin/Bookings.tsx`** (lines 332, 465-469)
- Change `allTabTotalValue` memo to exclude cancelled: filter `allTabData` where `status !== 'cancelled'` before summing
- Update summary bar to show active count, total value (excluding cancelled), and a separate muted cancelled count

**File: `src/pages/admin/Finance.tsx`** (lines 300-329)
- In Source A payments query, add `status` to the bookings select: `.select("id, booking_code, user_id, customer_id, status")`
- Add `status` field to the returned payment records
- After building the final payments array, filter out records where `booking.status === 'cancelled'` from both the display list and metric totals
- Also filter cancelled from the WL supplement queries (lines 421-434): add `.neq("status", "cancelled")` to the WL bookings queries

**No changes needed:**
- `use-collected-revenue.ts` — already correctly filters by status
- `use-revenue-analytics.ts` — already correctly filters by status
- Reports.tsx fleet label — already dynamic

### Files
| File | Change |
|------|--------|
| `src/pages/admin/Bookings.tsx` | Exclude cancelled from summary bar total + show cancelled count |
| `src/pages/admin/Finance.tsx` | Fetch booking status in payments query, filter out cancelled from display + metrics |

### No backend changes needed

