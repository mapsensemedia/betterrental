

## Plan: Remove Verification Alerts & Keep Only Critical Alerts

### Problem
The alerts system creates noise with non-critical alerts like "Booking Active", "Booking Completed", "Verification Pending", etc. The user wants only truly critical alerts (damage, emergency, late return, overdue, payment issues).

### Changes

**1. Stop creating non-critical alerts in `src/domain/bookings/mutations.ts`** (lines 104-115)
- Remove the block that creates alerts for every booking status change (active→`return_due_soon`, completed→`verification_pending`, cancelled→`customer_issue`). These are informational, not critical.

**2. Stop creating verification_pending alerts in `src/hooks/use-checkin.ts`** (line 246-251)
- Remove the `admin_alerts` insert for check-in "needs_review" — this is a verification alert.

**3. Stop creating verification_pending alerts in `src/hooks/use-assign-driver.ts`** (lines 82-86)
- Remove the "Dispatch bypass used" alert that incorrectly uses `verification_pending` type.

**4. Remove `PendingVerificationsCard` from Alerts page** (`src/pages/admin/Alerts.tsx`, line 320)
- Remove the import and `<PendingVerificationsCard />` render.

**5. Remove verification references from Overview** (`src/pages/admin/Overview.tsx`)
- Remove the `verification_requests` query (lines 232-236)
- Remove `pendingVerifications` variable and all its UI references (lines 572-588)
- Simplify the "no alerts" check to only use `pendingAlerts`
- Remove verification count from the Alerts quick-action badge

**6. Remove `verification_pending` from RealtimeAlertsPanel config** (`src/components/admin/RealtimeAlertsPanel.tsx`)
- Remove the `verification_pending` entry from `ALERT_TYPE_CONFIG`

**7. Clean up Alerts page** (`src/pages/admin/Alerts.tsx`)
- Remove `verification_pending` from `alertTypeLabels` and `alertTypeIcons`

### Files

| File | Action |
|------|--------|
| `src/domain/bookings/mutations.ts` | Remove lines 104-115 (status change alert creation) |
| `src/hooks/use-checkin.ts` | Remove verification alert insert |
| `src/hooks/use-assign-driver.ts` | Remove dispatch bypass alert insert |
| `src/pages/admin/Alerts.tsx` | Remove PendingVerificationsCard import/render, remove verification_pending from config maps |
| `src/pages/admin/Overview.tsx` | Remove verification_requests query, pendingVerifications variable and UI |
| `src/components/admin/RealtimeAlertsPanel.tsx` | Remove verification_pending from ALERT_TYPE_CONFIG |

### What Stays (Critical Alerts)
- `damage_reported` — from `use-damages.ts`
- `emergency` — via `useCreateAlert`
- `late_return` / `overdue` — from return ops
- `payment_pending` — from deposit automation
- `customer_issue` — from support ticket escalation (this is legitimate)

### What Does NOT Change
- No backend, edge function, or database changes
- Alert table schema unchanged
- `useCreateAlert` hook stays (used for legitimate critical alerts)
- Existing critical alert creation paths untouched

