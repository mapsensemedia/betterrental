

## Root Cause Analysis

### Issue 1: Total Units = 44 (should be 15)
The `useFleetAnalytics` hook queries **both** `vehicle_units` (15 real records) **and** the legacy `vehicles` table (44 records) as a "fallback." Since most legacy vehicle IDs aren't linked to units, 29 phantom entries get appended, inflating the count to 44.

**Fix**: Remove the legacy `vehicles` table fallback entirely. All real fleet vehicles exist in `vehicle_units`.

### Issue 2: Revenue = $1,893.09 (should be $3,244.08)
Two problems:
- The query filters for `status = 'completed'` only, **excluding the active booking** 26HDD44Y ($831.25)
- Two completed bookings (FZH86F8W = $411.56, 4HL5K9QV = $109.18) have **no `assigned_unit_id`**. The fallback tries to match `booking.vehicle_id === unit.vehicle_id`, but `booking.vehicle_id` is a **category UUID** while `unit.vehicle_id` is a **legacy vehicle UUID** — so they never match. Revenue lost: $520.74

Math: $2,413.83 (all completed) - $520.74 (unmatched) = $1,893.09 (displayed)

**Fix**: 
1. Include both `completed` AND `active` bookings in revenue
2. For bookings without `assigned_unit_id`, match via `booking.vehicle_id === unit.category_id` (both are category UUIDs)

### Issue 3: KIA SELTOS shows 2 rentals
This is **actually correct** — unit KNDERCAA8P7407618 (plate A826JZ) has two completed bookings: 69M6RYX9 ($232.37) and F2PRBG3P ($101.63). Both are real records.

### Issue 4: Underperformers with 0 rentals
These come from the 29 phantom entries from the legacy `vehicles` table. Removing the fallback (Issue 1 fix) eliminates them.

### Issue 5: Fleet Value & Depreciation = $0
All 15 `vehicle_units` records have `acquisition_cost = 0` and `annual_depreciation_amount = 0`. This is a **data entry issue** — no purchase prices have been entered. The code is correct; the data is missing.

---

## Plan

### File: `src/hooks/use-fleet-analytics.ts`

1. **Remove legacy `vehicles` table query and fallback loop** (lines 82–231) — only process `vehicle_units`

2. **Include active bookings in revenue** — change the bookings query filter from `.eq("status", "completed")` to `.in("status", ["completed", "active"])`

3. **Fix unassigned booking matching** — for bookings without `assigned_unit_id`, match `booking.vehicle_id === unit.category_id` instead of `booking.vehicle_id === unit.vehicle_id`, since `bookings.vehicle_id` stores the category UUID

4. **Update `totalVehicles` in summary** — since we no longer have legacy vehicles, `totalVehicles` should equal the count of units

### File: `src/hooks/use-fleet-analytics-enhanced.ts`

Apply the same three fixes:
1. Remove legacy `vehicles` fallback
2. Include active bookings
3. Fix unassigned booking matching via `category_id`

### No database changes needed
- The 44 legacy `vehicles` records don't need deletion — they're just excluded from the analytics query
- Fleet Value/Depreciation = $0 is a data entry gap, not a code bug — will note this to the user

