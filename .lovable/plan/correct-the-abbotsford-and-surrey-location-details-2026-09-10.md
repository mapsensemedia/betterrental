# Correct the Abbotsford and Surrey location details

## The issue

Two branches are pinned at slightly wrong points, so map markers and directions land off the real stores. Surrey's street number is also recorded as 6786 instead of 6768, with a different postal code.

Current records:
- Abbotsford Centre — 32835 South Fraser Way, Abbotsford, BC — 49.0504, -122.3045
- Surrey Newton — 6786 King George Blvd, Surrey, BC V3W 4Z5 — 49.1280, -122.8465

Correct values:
- Abbotsford Centre — 32835 South Fraser Way, Abbotsford, BC V2S 2A6 — 49.05139306973528, -122.31399711672451
- Surrey Newton — 6768 King George Blvd, Surrey, BC V3W 4Z9 — 49.12574938852741, -122.84436761052604

## What will change

1. Both branch records get the corrected address and coordinates, so every map, pin and "Get Directions" link across the site and booking flow points at the right spot.
2. The Abbotsford and Surrey pages' search-engine listing data get the same corrected points and addresses.
3. Any other place on the site showing these addresses is updated to match, so the address is identical everywhere.

Langley is untouched. Existing bookings, pricing and drop-off fees are unaffected.

## Technical notes

- Data update on `locations`:
  - `a1b2c3d4-3333-4000-8000-000000000003`: `lat = 49.05139307`, `lng = -122.31399712`, `address = '32835 South Fraser Way, Abbotsford, BC V2S 2A6'`
  - `a1b2c3d4-1111-4000-8000-000000000001`: `lat = 49.12574939`, `lng = -122.84436761`, `address = '6768 King George Blvd, Surrey, BC V3W 4Z9'`
- `src/constants/rentalLocations.ts`: same lat/lng and address strings for the Abbotsford and Surrey entries.
- `src/pages/Abbotsford.tsx` JSON-LD `geo`: 49.0513931 / -122.3139971; `src/pages/Surrey.tsx` JSON-LD `geo`: 49.1257494 / -122.8443676, plus their `address` blocks.
- Sweep for any remaining hardcoded "6786 King George" strings and the OpenStreetMap embed coordinates in `src/components/landing/LocationsSection.tsx`, updating them to the corrected Surrey point.
- Update the stored project rule that records the Surrey address so future work uses 6768.
