

## Root Cause

The demand forecasting hook (`src/hooks/use-demand-forecasting.ts`) has a broken vehicle-to-category mapping:

1. **Line 78**: It queries a legacy `vehicles` table (`supabase.from("vehicles").select("id, category")`) to build a map of `vehicle_id → category_name`
2. **Line 130**: It then tries to match `vehicleCategoryMap.get(b.vehicle_id) === cat.id` — comparing a text category name against a UUID

But the data shows that **`bookings.vehicle_id` already stores the category UUID directly** (e.g., `vehicle_id: 9a111ea8...` matches `vehicle_units.category_id: 9a111ea8...`). The `vehicles` table is a legacy table with text category names like "Mystery Car" — these never match UUID-based `vehicle_categories.id`.

**Result**: Every `vehicleCategoryMap.get(b.vehicle_id)` returns either `undefined` (if vehicle_id isn't in the legacy table) or a text string that never equals a UUID — so all category booking counts are 0.

## Fix

**In `src/hooks/use-demand-forecasting.ts`**:

1. **Remove the `vehiclesQuery`** — the legacy `vehicles` table lookup is unnecessary
2. **Update the category demand filter** (line 130) to compare `b.vehicle_id === cat.id` directly, since `bookings.vehicle_id` already contains the category UUID
3. Clean up the `useMemo` dependency array to remove `vehiclesQuery.data`

This is a one-file, ~10-line change.

