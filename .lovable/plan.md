# Add second location: Langley – 20178 96 Avenue

## Goal

Bring the existing (currently inactive) **Langley Centre** location back online with the new address **20178 96 Ave Langley Twp, BC V1M 0B2**, alongside Surrey Newton. Cars share the same categories/pricing, but vehicle units are physically assigned to one branch in admin (separate inventory per location). Cross-location pickup/return uses the existing $50 Surrey↔Langley drop-off fee.

## How the system already supports this

The codebase is largely location-aware via the `locations` table and the `useLocations()` hook:

- Customer location pickers (`LocationSelector`, `LocationsSection`, `Locations` page, `OpsLocationFilter`) all read from DB.
- Availability filters by `vehicles.location_id` (or `null` = all).
- Drop-off fee uses `locations.fee_group` (`surrey`, `langley`, `abbotsford`) — Langley row already has `fee_group = 'langley'`, so the $50 tier in `src/lib/pricing.ts` and the server function in `supabase/functions/_shared/booking-core.ts` work without code changes.
- Admin inventory (`UnifiedVehicleManager`, `VehicleEditDialog`, `VinFormDialog`) already lets staff pick a location per vehicle unit.

So most of the work is **data/config**, not code. The remaining code edits are mostly cosmetic (hardcoded mirrors, marketing pages, SEO).

## Changes

### 1. Database (1 migration)

Update the existing Langley row — keep its UUID so historical data stays intact:

- `name`: `Langley Centre` → keep, .
- `address`: 20178 96 Ave Langley Twp, BC V1M 0B2.
- `lat` / `lng`: update to new coordinates 
- `phone`, `email`, `hours_json`: copy/adjust from Surrey or provide values.
- `is_active`: `true`.
- `fee_group`: keep `langley` (preserves the $50 tier).

No schema changes needed. No table creation.

### 2. Hardcoded mirror — `src/constants/rentalLocations.ts`

- Flip Langley entry's `isActive: false` → `true`.
- Update its `address`, `lat`, `lng` to the new branch.
- Used by delivery-distance / closest-location calc, so coordinates matter.

### 3. Marketing / SEO surfaces (small text edits)

- `src/components/landing/LocationsSection.tsx` and `src/pages/Locations.tsx` — add the new Google Maps share link to the `LOCATION_MAPS_LINKS` map (keyed by location name).
- `src/pages/Langley.tsx` — existing city landing page; refresh hero copy/address to the new branch.
- `src/components/layout/Footer.tsx`, `src/components/layout/TopNav.tsx` — surface Langley link if it's currently hidden behind the active filter (likely auto-shows once `is_active=true`, but verify).
- `public/sitemap.xml` — ensure `/langley` and `/location/<langley-id>` are listed.
- Update the **memory** entry "Only Surrey Newton location is active" to reflect two active branches.

### 4. Inventory in admin (no code change, just data)

Once Langley is active, the existing **Inventory** admin screen lets you create/move `vehicle_units` with `location_id = <Langley UUID>`. Vehicles themselves (categories/models) stay shared — only the physical units are split per branch.

### 5. Verification checklist

- Customer search/checkout: Langley appears in pickup & return dropdowns.
- Picking Surrey→Langley shows a **$50** different-drop-off fee.
- Admin Ops queues filter correctly when "Langley" is selected.
- Adding a new vehicle unit to Langley shows up only under that location's inventory.
- `/langley` page renders the new address and map.

## Files touched (estimated)


| Type            | Count | Files                                                                                                                                                       |
| --------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB migration    | 1     | update `locations` row                                                                                                                                      |
| Code edits      | ~5    | `src/constants/rentalLocations.ts`, `src/components/landing/LocationsSection.tsx`, `src/pages/Locations.tsx`, `src/pages/Langley.tsx`, `public/sitemap.xml` |
| Optional polish | ~2    | Footer/TopNav copy, memory file                                                                                                                             |


## Things I still need from you (before implementing)

1. **Phone & email** for the Langley branch (or reuse Surrey's `+1 (604) 763-4242`?).
2. **Operating hours** for Langley (or copy Surrey's).
3. **Exact display name**: keep "Langley Centre" or rename (e.g. "Langley – 96 Ave")?
4. **Google Maps share link** for the new address (optional — I can derive coords from the address otherwise).
5. Confirm postal code for `20178 96 Avenue, Langley, BC`.