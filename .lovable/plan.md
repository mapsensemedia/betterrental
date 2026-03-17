

## Plan: Fix 6 Issues Across Admin Panels

### FIX 1 — Analytics/Reports Route & Filters

**Problem:** Both sidebar items ("Analytics" and "Reports") point to `/admin/reports`. The `/admin/analytics` route redirects to `/admin/reports`. `Reports.tsx` date filter only filters client-side — `useAdminBookings({})` has no date params. Weekly revenue trend uses `createdAt` instead of `start_at`.

**Changes:**
- **`AdminShell.tsx` (line 176):** Change Analytics sidebar href to `/admin/analytics`
- **`App.tsx` (line 250):** Replace the redirect with a proper route: `<Route path="/admin/analytics" element={<AdminProtectedRoute><AdminAnalytics /></AdminProtectedRoute>} />`
- Add the `AdminAnalytics` lazy import (it already exists as `Analytics.tsx`)
- **`Reports.tsx` (line 180):** Pass date filter range to `useAdminBookings` so the query re-fetches when the filter changes. Add the date range to `useMemo` dependencies.
- **`Reports.tsx` (lines 328-330):** Change `b.createdAt` to `b.startAt` in the weekly revenue trend so bookings appear in the week the rental occurred.
- **`use-revenue-analytics.ts`:** Already has all filter values in queryKey (fixed previously). Verify `pay_now`/`pay_later` logic is correct after last fix pass.

### FIX 2 — Revenue Labels (Billed vs Collected)

**Problem:** Reports shows $3,208.01 (sum of `total_amount` = billed). Finance Overview shows $3,104.96 (sum of `payments.amount` = collected). The $103.05 gap is RE44EN2U's outstanding balance. Both are correct numbers — they just need clear labels.

**Changes:**
- **`Reports.tsx` (line 525):** Change "Revenue Summary" to "Billed Revenue" and add tooltip/subtitle: "Total invoiced amount"
- **`Finance.tsx` (line 543):** Change "Collected" label to "Collected Revenue" with subtitle
- **`Reports.tsx`:** Add an "Outstanding" metric card showing `billedRevenue - collectedRevenue` (query payments to get collected, then subtract). Or simpler: compute from `amount_due` on invoices.

### FIX 3 — Calendar Not Showing Bookings

**Problem:** Calendar query (line 69) excludes `completed` status. Customer names come from `profiles` instead of `customers` table.

**Changes in `use-calendar.ts`:**
- **Line 69:** Add `"completed"` to the status filter: `.in("status", ["pending", "confirmed", "active", "completed"])`
- **Line 66:** Add `customer_id` to the bookings select
- After fetching profiles, also batch-fetch from `customers` table for bookings with `customer_id`
- Prefer `customers.full_name` over `profiles.full_name` when building `CalendarBooking` objects

### FIX 4 — Invoices Showing All Rentals

**Verification needed:** The `final_invoices` query in `Finance.tsx` (line 757) fetches all invoices without status filtering — this is correct. The issue is whether all 12 bookings have had `close-account` called to generate their invoice records. This is a data issue, not a code issue. Will verify via DB query during implementation.

### FIX 5 — Customer Names in Calendar (Malkeet Fix)

Covered by FIX 3 above — adding `customers` table preference pattern to `use-calendar.ts`.

### FIX 6 — Two Lovepreets Display

Already split into separate customer records in prior action. The Finance invoices query (line 770-774) and receipts query (line 816-820) both use the `customers` table preference pattern. No code change needed — just verify the two distinct records render correctly.

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/AdminShell.tsx` | Analytics sidebar → `/admin/analytics` |
| `src/App.tsx` | Add `/admin/analytics` route, remove redirect |
| `src/pages/admin/Reports.tsx` | Add "Billed Revenue" labels, "Outstanding" metric, use `startAt` for weekly trend, pass date filter to bookings query |
| `src/hooks/use-calendar.ts` | Add `completed` status, add `customers` table preference for names |
| `src/pages/admin/Finance.tsx` | Label "Collected" card as "Collected Revenue" |

### Technical Details

- Reports `useAdminBookings` needs date params added to its query. Will check the hook signature to see if it supports date filtering, otherwise filter client-side but ensure the filtered set is used consistently.
- Calendar customers pattern: fetch `customer_id` from bookings, batch-fetch `customers` table, build a `customersMap`, prefer over `profilesMap`.
- Outstanding metric: sum `amount_due` from `final_invoices` where `amount_due > 0`.

