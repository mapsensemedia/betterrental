

## Fix Two Bugs in Finance Page Date Filter

### Bug 1 — Method click ignores date range

**Root cause**: `dateRange` state lives inside `OverviewTab` (line 274). When a method is clicked, `handleMethodClick` in `Finance` only sets `methodFilter` and switches to the transactions tab. The `TransactionsTab` fetches ALL payments (`queryKey: ["admin-payments"]`, line 1068) with no date filter, so it shows everything.

**Fix**: Lift the `dateRange` (and `customStart`/`customEnd`) state from `OverviewTab` up to the `Finance` component. Pass it down to both tabs. In `TransactionsTab`, use the date range to filter the payments query (add `.gte`/`.lte` on `created_at`). Also pass the date range to `OverviewTab` as props instead of local state.

### Bug 2 — Date range resets on navigation

**Root cause**: `dateRange` is `useState("month")` — lost on unmount.

**Fix**: Store `dateRange` in URL search params (e.g. `?range=month`). Since `Finance` already uses `useSearchParams` for `tab`, add `range` to the same params.

### Changes — `src/pages/admin/Finance.tsx`

**1. Lift dateRange to Finance component (line 214-230)**
- Read `range` from `searchParams` (default `"month"`)
- Add `setDateRange` that updates the URL param
- Compute `start`/`end` dates at this level
- Pass `dateRange`, `setDateRange`, `start`, `end` as props to `OverviewTab`
- Pass `start`, `end` as props to `TransactionsTab`

**2. Update OverviewTab (line 273-276)**
- Remove local `dateRange` useState
- Accept `dateRange`, `setDateRange`, `start`, `end` as props
- Remove local `useMemo` for start/end (use props)
- Keep `customStart`/`customEnd` local (only relevant within overview)

**3. Update TransactionsTab (line 920, 1066-1074)**
- Accept `dateStart` and `dateEnd` props
- Add `.gte("created_at", dateStart.toISOString())` and `.lte("created_at", dateEnd.toISOString())` to the payments query (line 1071-1074)
- Also apply date filter to the WL bookings queries (lines 1077-1088)
- Update `queryKey` to include the date range: `["admin-payments", dateStart.toISOString(), dateEnd.toISOString()]`

**4. Update handleMethodClick (line 227-230)**
- No change needed — date range is already in URL and shared

### Files
| File | Change |
|------|--------|
| `src/pages/admin/Finance.tsx` | Lift dateRange to URL params, pass to both tabs, add date filter to TransactionsTab queries |

