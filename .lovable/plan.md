
# Fix: sedans shown available when only SUVs exist

## Chain 1 — Current flow, as traced (no code changed)

| Step | Where | What actually happens |
|---|---|---|
| Location + dates | `RentalSearchCard` → `RentalBookingContext` | Location and full ISO pickup/return timestamps stored |
| Category search | `src/pages/Search.tsx` | With a location: `useAvailableCategories(locationId)`. **Without** a location: `useFleetCategories()` — every active category |
| Availability query | `get_available_categories(p_location_id)` in Postgres | `LEFT JOIN vehicle_units`, groups by category, returns **all** active categories with an `available_count` column |
| Fallback path | `use-fleet-categories.ts`, `domain/fleet/queries.ts` | On RPC error, reads `vehicle_units` directly from the browser |
| Walk-in / other | `use-browse-categories.ts` | Client-side unit + booking math |
| Selection → protection → add-ons → checkout | `Protection.tsx`, `AddOns.tsx`, `NewCheckout.tsx` | Category id carried in context/URL; **no availability re-check** |
| Booking creation | `create-booking`, `create-guest-booking` edge functions | Pricing validated server-side; **no availability check** |
| Payment | `wl-authorize` / deposit flow | No availability check |

## Chain 2/3 — Evidence found

1. **Availability checking was deliberately deleted.** Both `create-booking/index.ts` and `create-guest-booking/index.ts` contain the literal comment: `NOTE: Availability check removed — overbooking is allowed. Staff will assign specific VIN units manually.` There is no availability gate at any commit point in the funnel.
2. **The search RPC ignores dates entirely.** `get_available_categories` accepts only `p_location_id`. No `start_at` / `end_at` parameter exists, so an overlapping booking can never be detected. Its `LEFT JOIN` also emits categories with `available_count = 0`, and no caller filters those out — a sedan category with zero free cars renders identically to one with five.
3. **Guests cannot read the fleet at all.** `vehicle_units` has SELECT policies only for `is_admin_or_staff` and drivers; `bookings` only for staff / owner / driver. The preview network log confirms the consequence: `GET /vehicle_units?select=id,category_id,status` returned `[]` and `GET /bookings?status=eq.active` returned `[]`. Every client-side fallback therefore computes availability against an empty result set and concludes everything is free — a failed/blocked request being read as available inventory.
4. **`use-browse-categories.ts` is broken three ways**: filters `.eq("status","active")` although real unit statuses are `available` / `on_rent` / `maintenance` / `retired`; applies **no location filter**; and its overlap test `.or(start_at.lte.END, end_at.gte.START)` is an OR where interval overlap requires an AND.
5. **Real inventory vs. what is advertised**: `vehicle_units` currently holds 33 `on_rent`, 7 `available`, 2 `maintenance`, 2 `retired`. Eight sedan/SUV categories are listed publicly regardless.

## Chain 4 — Root cause

Both symptoms share one cause: **there is no date-and-location-aware availability computation anywhere in the customer funnel, and the only public availability RPC is location-only and never filtered on its own count.** Sedans appear because a category is rendered whenever it exists and is active. The booking errors are the downstream consequence: the customer picks a category with no physical unit, the funnel accepts it, and the failure surfaces later as a generic error or as staff discovering only SUVs are physically present. No existing booking or payment record was corrupted by this — the defect is one of omission, not of bad writes.

## Decisions confirmed with you

- **Strict availability for the public funnel — no overbooking.**
- **30-minute turnaround buffer** on both ends of every booking.
- Unit statuses excluded: `maintenance`, `damage`, `retired`, `inactive`.
- Bookings that block (my recommendation, included below): `confirmed`, `active`, **and `pending`** — plus unexpired `reservation_holds`, otherwise two customers in checkout can both take the last sedan. `draft`, `cancelled`, `completed` never block.

## Chain 5 — The fix

### 1. One authoritative availability function in the database

New security-definer RPC `get_category_availability(p_location_id uuid, p_start_at timestamptz, p_end_at timestamptz, p_exclude_hold uuid default null)`, granted to `anon` and `authenticated`, returning one row per active category with a truthful `available_count`. A unit counts only when **all** hold:

- `location_id` = requested pickup location;
- `status` not in maintenance / damage / retired / inactive;
- no booking in `confirmed` / `active` / `pending` on that unit overlaps `[start − 30 min, end + 30 min)`;
- no unexpired `reservation_holds` row overlaps the same window (excluding the caller's own hold).

Overlap uses the half-open test `existing.start < requested_end AND existing.end > requested_start` on `timestamptz` throughout — no date-only or local-string comparison, which eliminates the inclusive/exclusive boundary, midnight and UTC-vs-Vancouver classes of error in one move.

A companion `check_category_availability(p_category_id, p_location_id, p_start_at, p_end_at, p_exclude_booking_id)` returns a boolean using the *identical* predicate, so search, checkout, booking creation and payment cannot drift apart.

Keeping this behind an RPC rather than opening RLS means guests get correct counts without gaining read access to `vehicle_units` or `bookings`.

### 2. Frontend consumes only that function

- `useAvailableCategories` becomes date-aware and calls the new RPC; query key = location + both ISO timestamps.
- Categories with `available_count = 0` are filtered out and are not selectable.
- Search requires location + dates before listing anything; the current "show all active categories" fallback is removed, since availability is undefined without them.
- The client-side fallback paths in `use-fleet-categories.ts` and `domain/fleet/queries.ts` that read `vehicle_units` directly are deleted — on RPC failure the UI shows the retry error state, never an optimistic list.
- `use-browse-categories.ts` is repointed at the same RPC, removing its bogus status filter, missing location filter and OR-overlap.
- Ops / walk-in booking keeps its current behaviour and may still overbook deliberately; only the public funnel is strict.
- Availability `staleTime` drops to ~30 s with refetch-on-focus so a tab left open doesn't show a stale sedan.

### 3. Revalidate at every commit point

- **On category selection** (entering protection): re-check; if gone, bounce back to search with the message below.
- **Before payment**: check at the top of `wl-authorize` / the deposit-authorization path, so a stale booking is stopped *before* the card is touched — the customer is never charged for a vehicle that vanished.
- **Immediately before booking creation**: restore the deleted check in `create-booking` and `create-guest-booking`. Zero available → HTTP 409 `CATEGORY_UNAVAILABLE`, no row written.

### 4. Race safety

A short-lived `reservation_holds` row (category + location + window) is created when the customer moves from category selection into checkout, is counted by the availability predicate, converts on booking creation and expires otherwise. The final check inside `create-booking` runs under service role against committed rows and is performed in the same statement path as the insert, so two concurrent attempts on the last unit cannot both succeed — one gets the 409.

### 5. Chain 6 — Error handling

A mapper in `src/lib/edge-function-error.ts` converts codes to copy:

- `CATEGORY_UNAVAILABLE` → *"This vehicle is no longer available for the selected dates. Please choose another available vehicle or adjust your rental dates."* with a button back to search, dates preserved.
- Availability RPC/network failure → *"We couldn't complete the availability check. Please try again. You have not been charged."*

No stack traces, IDs or DB messages reach the customer. Each edge function logs a single structured `console.error` line carrying timestamp, booking step, category id, location id, pickup/return timestamps, booking status, function name, error code, technical message and request id — no card data or PII. These land in the function logs.

## Chain 7 — Test plan

Playwright against the live preview plus direct RPC assertions:

1–4. Available and unavailable sedan and SUV — unavailable ones absent from search.
5–7. Category whose only units have an overlapping confirmed / active / started booking → hidden.
8. Category whose only unit is in maintenance → hidden.
9. Unit blocked for specific dates → hidden for those dates, visible outside them.
10. Units only at another location → category hidden for the selected location.
11. Adjacent bookings 30 min apart → blocked; 90 min apart → available.
12–13. Pickups and returns spanning midnight and a DST boundary in America/Vancouver → counts match hand-written SQL.
14. Vehicle taken by another customer between search and checkout → clear message, no booking, no charge.
15. Availability RPC forced to fail → retry message, nothing bookable.
16. Full happy path search → confirmation.

Plus regressions: every RPC `available_count` cross-checked against a manual SQL count per category per location; two parallel `create-booking` calls for the last unit → exactly one succeeds; existing pricing tests (`src/lib/pricing.test.ts`, agreement PDF tests) unchanged and passing; ops walk-in and vehicle assignment unaffected.

## Technical notes

- New DB objects only: `get_category_availability`, `check_category_availability` — both `SECURITY DEFINER`, `SET search_path = public`, granted to `anon` + `authenticated`. No new tables, no schema changes to existing tables, no RLS relaxation.
- Files touched: `src/hooks/use-fleet-categories.ts`, `src/hooks/use-browse-categories.ts`, `src/domain/fleet/queries.ts`, `src/pages/Search.tsx`, `src/pages/Protection.tsx` (re-check on entry only), `src/hooks/use-hold.ts`, `src/lib/edge-function-error.ts`, and edge functions `create-booking`, `create-guest-booking`, `wl-authorize`.
- `src/lib/availability.ts` (already deprecated, still queries the legacy `vehicles` table) is left untouched and stays out of every customer path.
- No pricing, rate, surcharge, discount, tax, add-on or protection logic is touched; no layout, styling or copy changes beyond the two new error states.
