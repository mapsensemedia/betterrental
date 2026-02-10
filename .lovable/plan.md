

# Fix: Location Detail Page Showing Ghost Vehicles from Deprecated Data

## Problem
The Location Detail page (`/location/:id`) displays vehicles from the old `vehicles` table, which contains outdated entries with incorrect prices (e.g., $0.10/day "Mystery Vehicle", wrong year numbers). The rest of the site (Browse Cars, Homepage) already uses the new category-based system (`vehicle_categories` + `vehicle_units`), but the Location Detail page was never migrated.

## Root Cause
`LocationDetail.tsx` imports `useVehiclesByLocation` from the deprecated `use-availability` hook, which queries the legacy `vehicles` table directly. This table has stale/test data that no longer reflects the actual fleet.

## Solution
Replace the deprecated vehicle listing on the Location Detail page with category cards from the new system, matching how the Search page and Homepage already work.

### Changes

**1. Update `src/pages/LocationDetail.tsx`**
- Remove import of `useVehiclesByLocation` from `use-availability`
- Replace with `useBrowseCategories` from `use-browse-categories`, passing the location ID
- Replace `VehicleCard` rendering with category-based cards (reuse the same card pattern used on the Search page)
- Update the "View All" link to navigate to `/search?locationId={id}` (already correct)
- Change section title from "Available Vehicles" to "Available Cars" for consistency

**2. Clean up `src/lib/availability.ts`**
- Remove the `getVehiclesByLocation` function (no longer used anywhere after the LocationDetail fix)
- Keep `getAvailableVehicles` and `isVehicleAvailable` since they may still be referenced by admin tools

**3. Clean up `src/hooks/use-availability.ts`**
- Remove the `useVehiclesByLocation` export (only consumer was LocationDetail)
- Keep `useAvailableVehicles` and `useVehicleAvailability` if still referenced

## What This Does NOT Touch
- Admin panel pages that use `useVehicles()` for fleet management, reporting, and walk-in bookings -- these are internal tools and legitimately need the vehicles table
- The booking flow (`useCategory`, `useVehicle`) -- these are used for checkout and work correctly
- Edge functions or database schema -- no changes needed

## Technical Details

The `useBrowseCategories` hook already supports an optional `locationId` parameter and returns categories with `availableCount`, `dailyRate`, `imageUrl`, `seats`, `fuelType`, and `transmission` -- all the data needed for the card display. The location detail page will show only categories that have at least one available unit, with correct pricing from `vehicle_categories.daily_rate`.

