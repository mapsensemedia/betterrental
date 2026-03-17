

## Root Cause: `total_days` Not Persisted in Most Reprice Operations

### Investigation Summary

**DB state for E6MA7C5T** (`cb721f90-6100-4369-a206-1407ee19067c`):

| Field | Value |
|-------|-------|
| daily_rate | 55.00 |
| total_days | **8** (wrong) |
| subtotal | 967.18 (correct, computed for 9 days) |
| tax_amount | 116.06 |
| total_amount | 1083.24 |
| protection_plan | basic |
| vehicle category | STANDARD SUV (Group 2 → basic = $52.99/day) |

**What happened** (from audit logs):
1. Walk-in created with 8 days, total_days=8
2. End time adjusted via `update_time_only` (Mar 24 → Mar 25) — no financial recalc by design, `total_days` stays 8
3. Upgrade operation called → `computeBookingTotals` computed **9 days** from the new dates and wrote correct `subtotal`/`tax_amount`/`total_amount` — but **did NOT write `total_days`** to the DB

**The bug** is in `supabase/functions/reprice-booking/index.ts`. Only the `modify` operation (line 153) persists `total_days: serverTotals.days`. Three other operations that also call `computeBookingTotals` do NOT:

- **`upgrade`** (line 217-228) — missing `total_days`
- **`remove_upgrade`** (line 270-278) — missing `total_days`
- **`change_protection`** (line 351-358) — missing `total_days`

**How this causes the mismatch**: Both portals use the shared `FinancialBreakdown` component which computes line items using `booking.total_days` (8) but shows the DB-stored subtotal/total (computed for 9 days). Protection ($52.99 × 8d vs 9d = $52.99 difference), PVRT ($1.50 difference), ACSRCH ($1.00 difference) — these per-day items computed with the wrong day count don't sum to the DB subtotal.

### Fix

#### 1. Add `total_days` to all reprice operations in `supabase/functions/reprice-booking/index.ts`

Add `total_days: serverTotals.days` to the `updateData` object in three places:

- **Line ~218** (upgrade operation `updateData`): Add `total_days: serverTotals.days`
- **Line ~271** (remove_upgrade operation `updateData`): Add `total_days: serverTotals.days`
- **Line ~352** (change_protection operation `updateData`): Add `total_days: serverTotals.days`

#### 2. Fix booking E6MA7C5T data

Update `total_days` from 8 to 9 via database update:
```sql
UPDATE bookings SET total_days = 9, updated_at = now()
WHERE id = 'cb721f90-6100-4369-a206-1407ee19067c';
```

#### 3. Deploy the fixed edge function

No other files need changes — both portals already use the same `FinancialBreakdown` component which reads `total_days` from the DB. Once the DB value is correct, both portals will show matching numbers.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/reprice-booking/index.ts` | Add `total_days: serverTotals.days` to upgrade, remove_upgrade, change_protection updateData |
| Database (data update) | Set total_days=9 for E6MA7C5T |

