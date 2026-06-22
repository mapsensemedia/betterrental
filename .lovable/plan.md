## Why booking YRR9X55Y isn't visible in Pickups

Two underlying issues in `src/hooks/use-handovers.ts` (and the date-range filter in both `OpsPickups.tsx` / `Pickups.tsx`).

### Issue 1 — Date range too narrow (the actual reason it's hidden)

- Booking `YRR9X55Y` starts **2026-07-02** (10 days from today, 2026-06-22).
- `useHandovers` supports only three windows: `today`, `next24h`, `week` (7 days).
- Even the widest option (`week`) ends at day +7, so a pickup 10 days out is filtered out by `.gte/.lte("start_at", ...)`.
- The Admin Bookings page shows it because `useAdminBookings` has no date filter — that's why it appears there but not in `/pickups`.

### Issue 2 — Vehicle table mismatch (would break display even if it passed the date filter)

- `bookings.vehicle_id` now points at **`vehicle_categories`** (confirmed: id `7d2c0f8a…` exists in `vehicle_categories` as "LARGE SUV - Dodge Durango or Similar", but not in `vehicles`).
- `useHandovers` still fetches from `.from("vehicles")` by that id, so `vehicle` is always `null` for category-based bookings. Readiness checks `vehicle.is_available` and `cleaning_buffer_hours` silently fall back to defaults, and the row renders without a vehicle name/image.
- `useAdminBookings` already handles this correctly by querying `vehicle_categories`.

### Fix plan

1. **Extend date filter options** in `useHandovers` and the two pickups pages:
   - Add `"month"` (next 30 days) and `"all"` (no upper bound, e.g. next 365 days) options.
   - Change the default in `OpsPickups.tsx` and admin `Pickups.tsx` to `"month"` so all real upcoming pickups (including YRR9X55Y) appear by default. Keep `today` / `next24h` / `week` selectable.

2. **Fix vehicle lookup** in `useHandovers`:
   - Replace the `vehicles` batch fetch with `vehicle_categories` (`id, name, image_url`), mirroring `useAdminBookings`.
   - Map into the existing `vehicle` shape: `make: ""`, `model: category.name`, `year: new Date().getFullYear()`, `imageUrl: category.image_url`.
   - Drop `is_available` / `cleaning_buffer_hours` reliance on the vehicles row — default `vehicleReady = true` and `bufferHours = 2` (current fallback). Keep the recent-returns buffer check unchanged.

No DB, RLS, edge function, or business-logic changes. Frontend only.

### Files to edit

- `src/hooks/use-handovers.ts` — swap vehicles → vehicle_categories; extend `DateFilter` type with `"month" | "all"` and compute their ranges.
- `src/pages/ops/OpsPickups.tsx` — add new filter options to the dropdown; default to `"month"`.
- `src/pages/admin/Pickups.tsx` — same dropdown additions; default to `"month"`.

### Verification

- After changes, YRR9X55Y should appear in `/ops/pickups` and `/admin/bookings?tab=pickups` under the default view, with the "LARGE SUV - Dodge Durango or Similar" name and image.
