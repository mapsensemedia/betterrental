
## Unified Vehicle and Category Management Component

### Current Problems
1. The vehicle change and category upgrade features are separate, fragmented components -- `VehicleAssignment` handles individual vehicles (from the old `vehicles` table) while `CategoryUpgradeDialog` handles category changes (from `vehicle_categories`).
2. The `VehicleAssignment` component uses the legacy `vehicles` table for available vehicles, but the real fleet is managed through `vehicle_units` linked to `vehicle_categories`.
3. The UX has too many buttons ("Change Vehicle", "Remove", "Change Vehicle Category") scattered across the card, making it confusing.
4. After changing a category, there's no way to immediately pick which specific unit (VIN) from that category to assign.

### Solution: Build a Unified "Vehicle Management" Component

Replace the current fragmented approach with a single, clean component that provides a two-step flow:

**Step 1: Choose Category** -- Shows all active categories with daily rates. The current category is pre-selected. Changing the category triggers pricing recalculation.

**Step 2: Choose Specific Vehicle (VIN)** -- After selecting a category, show available units from `vehicle_units` at the booking's location. Staff can pick a specific car (showing VIN, license plate, color, mileage).

```text
+-----------------------------------------------+
|  Vehicle & Category Management                |
|  [Current: Mid Size SUV - RAV4 or Similar]    |
|  Assigned: 2024 Toyota RAV4 (MSU-401)         |
|                                               |
|  [ Change Vehicle / Category ]   [ Remove ]   |
+-----------------------------------------------+

     Dialog opens:
+-----------------------------------------------+
|  Change Vehicle / Category                    |
|                                               |
|  Category:  [Mid Size SUV - $65/day   v]      |
|                                               |
|  Available Units at Surrey:                   |
|  ( ) MSU-401 - 2T3P1...456 - 12,340 km       |
|  ( ) MSU-402 - 2T3P1...321 - 8,200 km        |
|                                               |
|  Price Impact (if category changed):          |
|  Original: $455.00 -> New: $525.00 (+$70.00)  |
|                                               |
|  Reason: [________________________]           |
|                                               |
|            [Cancel]  [Confirm & Assign]       |
+-----------------------------------------------+
```

---

### Technical Details

#### 1. New Component: `src/components/admin/UnifiedVehicleManager.tsx`

A single dialog component that replaces both `VehicleAssignment` card + `CategoryUpgradeDialog`:

- **Props**: `bookingId`, `booking` (with vehicle_id, location_id, start_at, end_at, pricing fields, status)
- **Card display**: Shows current category name, assigned unit (VIN/plate), status badge (Assigned/Unassigned)
- **Two buttons**: "Change Vehicle / Category" (opens the unified dialog) and "Remove" (unassigns current unit)
- **Dialog content**:
  - Category dropdown (fetches from `vehicle_categories` where `is_active = true`, ordered by `daily_rate`)
  - Available units list (fetches from `vehicle_units` where `category_id` matches selected category, `location_id` matches booking location, `status = 'available'`)
  - Price comparison section (shown when category differs from booking's current `vehicle_id`)
  - Reason text field
- **On confirm**:
  - If category changed: update booking's `vehicle_id`, `daily_rate`, recalculate `subtotal`, `tax_amount`, `total_amount` using `calculateBookingPricing`, set `original_vehicle_id`, `upgraded_at`, `upgraded_by`, `upgrade_reason`
  - If unit selected: call `assign_vin_to_booking` RPC (or directly update `assigned_unit_id` and unit status)
  - If unit was previously assigned and is being changed: call `release_vin_from_booking` first
  - Log to `audit_logs`
  - Invalidate query keys: `booking`, `bookings`, `fleet-categories`, `category-vins`, `available-categories`, `fleet-vehicles`, `vehicle-units`, `vehicle-availability`, `available-vehicles`, `booking-activity-timeline`

#### 2. Update `src/components/admin/ops/OpsStepContent.tsx`

- Replace `VehicleAssignment` + `CategoryUpgradeDialog` imports/usage with `UnifiedVehicleManager`
- Remove `showCategoryUpgrade` state
- Render `UnifiedVehicleManager` in the checkin and handover step sections (for `pending`/`confirmed` bookings)

#### 3. Update `src/pages/admin/BookingOps.tsx`

- Replace the vehicle dialog (lines 579-617) and category upgrade dialog (lines 619-626) with a single `UnifiedVehicleManager` dialog
- Remove `categoryUpgradeOpen` state
- The 3-dot menu "Change / Upgrade Vehicle" opens the unified dialog directly

#### 4. Data Flow

The component will query `vehicle_units` (not the legacy `vehicles` table) for available units:

```sql
SELECT vu.id, vu.vin, vu.license_plate, vu.color, vu.current_mileage
FROM vehicle_units vu
WHERE vu.category_id = :selectedCategoryId
  AND vu.location_id = :bookingLocationId
  AND vu.status = 'available'
ORDER BY vu.created_at
```

For pricing, it uses `calculateBookingPricing` from `src/lib/pricing.ts` with the new category's `daily_rate`.

#### 5. Files Changed

| File | Change |
|------|--------|
| `src/components/admin/UnifiedVehicleManager.tsx` | **New** - Unified card + dialog component |
| `src/components/admin/ops/OpsStepContent.tsx` | Replace `VehicleAssignment` and `CategoryUpgradeDialog` with `UnifiedVehicleManager` |
| `src/pages/admin/BookingOps.tsx` | Simplify vehicle/category dialogs to use `UnifiedVehicleManager` |

The old `VehicleAssignment.tsx` and `CategoryUpgradeDialog.tsx` files will remain in the codebase (they may be used elsewhere) but will no longer be imported in the ops workflow.
