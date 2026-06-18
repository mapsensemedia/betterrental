## Three fixes

### 1. Pro-rata pricing for mid-rental upsells (additional driver, add-ons)

**Problem:** When staff add an extra (additional driver, GPS, etc.) on day 3 of a 5-day active rental, the system charges the full 5-day fee instead of the remaining 3 days.

**Root cause:** `supabase/functions/persist-booking-extras/index.ts` calls `computeBookingTotals({ startAt: booking.start_at, endAt: booking.end_at, … })` using the original booking window. The pricing engine then bills `dailyRate × fullRentalDays`.

**Fix:** When the booking is already `active` and the extra is being added after pickup, anchor the daily-billed portion of the new extra to the **remaining days** from `now()` to `end_at`, while keeping the original line items untouched.

Approach (least invasive):
- In `persist-booking-extras` `handleUpsellAdd` and `handleUpsellDriverAdd`:
  - Detect mid-rental: `booking.status === 'active'` AND `now() > booking.start_at`.
  - Compute `remainingDays = max(1, ceil((end_at - now()) / 24h))` using the same rule already in `booking-core.ts`.
  - Compute the new item's price **directly** with `remainingDays` (don't re-run the full engine for it). Persist that price into `booking_add_ons.price` / `booking_additional_drivers.young_driver_fee`.
  - Still call `reprice-booking` afterwards, but pass a flag (or new param) telling it to leave existing rows' `price` alone and only recompute the booking-level totals by summing rows. Cleanest: add an `engineMode: 'sum_existing_extras'` branch in `reprice-booking` that skips re-pricing add-ons / drivers and just sums them for tax/total.
- Add an audit-log note `{ mode: "mid-rental", remainingDays, fullRentalDays }` for traceability.
- No change to pre-pickup upsells — they keep full-rental pricing.

Files: `supabase/functions/persist-booking-extras/index.ts`, `supabase/functions/reprice-booking/index.ts`, `supabase/functions/_shared/booking-core.ts` (small helper `computeRemainingDays`).

### 2. Misleading "vehicle on rent" error when deleting a sold/retired vehicle

**Problem:** Delete fails with "vehicle is on rent" even when no active booking holds the unit.

**Root cause:** Postgres FK violation (`23503`) from `bookings.assigned_unit_id → vehicle_units.id` (historical bookings reference the unit). The catch in `src/domain/fleet/mutations.ts` and `src/hooks/use-vehicle-units.ts` translates *any* `23503` into a generic "associated with bookings" message that users read as "on rent".

**Fix — soft delete + clearer error:**
1. Pre-check before delete:
   - Query `bookings` where `assigned_unit_id = unitId AND status IN ('active','pending','confirmed')`.
   - If found → block with explicit message naming the booking codes.
   - If none → attempt hard delete.
2. On FK failure (only historical bookings reference it), automatically fall back to **soft-archive**:
   - Set `status = 'retired'`, `location_id = null`, append note `"Archived <date> – sold/removed from fleet"`.
   - Return success with a toast: *"Vehicle archived (kept for historical records). It will no longer appear in active fleet."*
3. Hide `retired` units from default fleet views (`OpsFleet`, `FleetManagement` listings) behind an "Include archived" toggle. They're already filtered out in availability queries.

Files: `src/domain/fleet/mutations.ts`, `src/hooks/use-vehicle-units.ts`, `src/pages/admin/FleetManagement.tsx`, `src/pages/ops/OpsFleet.tsx`.

### 3. Cannot edit VIN / plate / details — "car is on rent"

**Problem:** Updating any vehicle_unit field from the admin edit dialog is rejected with an on-rent message.

**Investigation needed before coding** (will do at build time):
- Confirm whether the rejection comes from (a) a Postgres RLS policy on `vehicle_units` that blocks updates when `status='on_rent'`, (b) a trigger, or (c) a client-side guard. The DB-functions list shows no such trigger, so most likely RLS.
- Fetch the current `vehicle_units` policies via `supabase--read_query` on `pg_policies`.

**Fix plan:**
- Loosen the RLS UPDATE policy for admins/staff so that **identity fields** (`vin`, `license_plate`, `color`, `notes`, `current_mileage`, `acquisition_*`, `tank_capacity_liters`, `category_id`, `location_id`) can be edited regardless of `status`.
- Keep `status` field transitions guarded — only allow client edits when not `on_rent`, or only via the assignment/release RPCs (`assign_vin_to_booking`, `release_vin_from_booking`). Status changes for on-rent units should still go through ops flows.
- If the block is in `useUpdateVehicleUnit`, remove the guard and rely on the RLS rule above.
- Show a precise error if the policy still blocks (`"Status cannot be changed while vehicle is on an active rental — return the vehicle first."`).

Files: new migration to replace the `vehicle_units` UPDATE policy, plus a small adjustment in `src/hooks/use-vehicle-units.ts` to surface the precise error.

### Out of scope
- No changes to historical bookings' financials.
- No change to pre-rental upsell pricing (still full-rental).
- No deletion of legacy data; archived units remain queryable.

### Verification
- Manual: create active booking, add additional driver mid-rental, confirm charge = `fee × remainingDays`.
- Manual: delete a unit referenced by past completed bookings → expect archive success; delete one with active booking → expect blocked with booking code.
- Manual: edit VIN/plate on a unit currently `on_rent` → expect success; try to flip its status → expect blocked.
