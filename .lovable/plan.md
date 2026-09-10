# Correct the Abbotsford location coordinates

## The issue

The Abbotsford branch is pinned at 49.0504, -122.3045 in three places, which drops the map marker roughly a block off from the real store. The correct point for 32835 South Fraser Way, Abbotsford, BC V2S 2A6 is 49.05139306973528, -122.31399711672451.

## What will change

1. The branch record used by the booking flow, the branch page and the maps gets the correct coordinates, so every map and "Get Directions" link points at the right spot.
2. The Abbotsford page's search-engine listing data gets the same corrected point.
3. The Abbotsford address shown on the site includes the postal code V2S 2A6 for consistency with the other branches.

Surrey and Langley are untouched.

## Technical notes

- Migration: update `locations` row `a1b2c3d4-3333-4000-8000-000000000003` — `lat = 49.05139307`, `lng = -122.31399712`, `address = '32835 South Fraser Way, Abbotsford, BC V2S 2A6'`.
- `src/constants/rentalLocations.ts` (Abbotsford entry): same lat/lng and address string.
- `src/pages/Abbotsford.tsx` LocalBusiness JSON-LD `geo`: latitude 49.0513931, longitude -122.3139971.
- No pricing, booking, or drop-off-fee logic changes; existing bookings are unaffected.
