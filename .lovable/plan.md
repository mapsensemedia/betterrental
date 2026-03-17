

## Plan: Clean Up Alerts & Improve Alerts UI

### Current State
21 alerts in `admin_alerts`, ALL status "pending":
- 11 `customer_issue` alerts — 10 are for cancelled bookings (void/cancel duplicates)
- 9 `verification_pending` alerts — 5 are for completed/cancelled bookings
- 1 resolved `customer_issue`

### Step 1 — Delete stale alerts (data operations)

Delete alerts for cancelled/completed bookings that aren't critical:
- All `customer_issue` alerts for cancelled bookings (10 alerts)
- All `verification_pending` alerts for completed/cancelled bookings (5 alerts)
- Duplicate alerts for same booking+type (keep most recent only)
- The 1 resolved alert

Expected: ~6 alerts remaining (active/pending bookings only).

### Step 2 — Add `expires_at` column (migration)

```sql
ALTER TABLE admin_alerts ADD COLUMN IF NOT EXISTS expires_at timestamptz;
```

### Step 3 — Update `useAdminAlerts` hook (`src/hooks/use-alerts.ts`)

- Default filter to `pending` and `acknowledged` only (exclude `resolved`)
- Add `.or('expires_at.is.null,expires_at.gt.now()')` to exclude expired alerts
- Add `useBulkResolveAlerts` mutation for "Clear All Resolved" button

### Step 4 — Update Alerts page (`src/pages/admin/Alerts.tsx`)

1. **Default status filter**: Initialize to show pending+acknowledged, not all
2. **Priority grouping**: Sort alerts into 3 tiers:
   - Critical (red): `damage_reported`, `emergency`, `payment_pending`
   - Action needed (amber): `verification_pending`, `overdue`, `late_return`, `return_due_soon`
   - Informational (green): `customer_issue`, `cleaning_required`, `hold_expiring`
   - Render with section headers, critical first, informational collapsed by default
3. **"Clear All Resolved" button**: Bulk-resolve all resolved alerts in one click
4. **Show resolved toggle**: Add a "Show resolved" checkbox instead of showing them by default

### Step 5 — Auto-resolve on booking completion

In the edge function or hook that transitions bookings to `completed` status, auto-resolve non-critical alerts (`verification_pending`, `return_due_soon`, `overdue`, `customer_issue`) for that booking. This goes in `use-alerts.ts` as a new `useAutoResolveBookingAlerts` function called from booking status change flows.

### Step 6 — Set expiry on alert creation

Update `useCreateAlert` in `use-alerts.ts` and the `check-rental-alerts` edge function to set `expires_at` based on type:
- `verification_pending`: 7 days
- `return_due_soon`: 2 days
- `overdue`: 7 days
- `customer_issue`: 3 days
- `damage_reported` / `emergency`: null (never expires)

### Summary

| Change | File |
|--------|------|
| Delete ~15 stale alerts | Data operation |
| Add `expires_at` column | Migration |
| Default to pending/acknowledged, exclude expired, bulk resolve | `src/hooks/use-alerts.ts` |
| Priority grouping, collapsed sections, clear button, hide resolved | `src/pages/admin/Alerts.tsx` |
| Auto-resolve alerts on booking completion | `src/hooks/use-alerts.ts` + booking status hooks |
| Set expiry on creation | `src/hooks/use-alerts.ts` + `check-rental-alerts/index.ts` |

