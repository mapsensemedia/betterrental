# Add a fourth branch: C2C Rental Langley 200th Street

## What gets added

A new bookable branch, live alongside Surrey Newton, Langley Centre and Abbotsford Centre.

- Name: C2C Rental Langley 200th Street
- Address: 5933 200 St, Langley, BC V3A 1N2
- Map point: 49.11014733, -122.66884669
- Phone: +1 (604) 763-4242
- Email: langley@c2crental.ca
- Hours: Monday to Saturday 9:00 AM - 6:00 PM, Sunday 11:00 AM - 6:00 PM
- Cars: none assigned yet. The page and booking flow work immediately; customers can still request any category (the existing "book even when nothing is free" behaviour covers this), and cars can be moved over later from the fleet screens.

One-way drop-off fees behave exactly like Langley Centre: no fee between the two Langley branches, $50 to or from Surrey, $75 to or from Abbotsford. No fee rules or pricing code change.

## Where customers will see it

- Pickup and delivery pickers on the home page, browse/search page and checkout
- Locations page: a fourth card with map pin and Get Directions
- Its own detail page at the raw location link, as the other branches have
- New city page at `/langley-200-street`, matching the look and sections of the existing Langley page: hero, search card, vehicle line-up, how it works, requirements, nearby areas, FAQ
- Top navigation and footer location lists

## Search and AI-answer coverage

- Page title, description and self-referencing canonical for `/langley-200-street`
- Social sharing tags via the existing shared SEO component
- `LocalBusiness` / `CarRental` structured data with the exact address, map point, phone, opening hours and price range, plus `BreadcrumbList` and an `FAQPage`-free FAQ section consistent with the other city pages
- Added to `public/sitemap.xml`
- Nearby-area and cross-links between the two Langley pages so they don't compete for the same term: this page targets "car rental Langley 200th Street / Brookswood / 200 St" wording, the existing page keeps the general Langley terms
- `public/llms.txt` updated with the new branch so AI answer engines list all four

## Technical notes

- Data insert into `locations` with a fixed UUID `a1b2c3d4-4444-4000-8000-000000000004`, `city = 'Langley'`, `fee_group = 'langley'`, `is_active = true`, `hours_json` per the hours above. No schema change, no migration.
- `src/constants/rentalLocations.ts`: fourth entry with the same id, address and coordinates, `isActive: true` — this also makes it a valid delivery origin for the nearest-branch/haversine logic and the flat $50 delivery fee.
- `src/constants/gbpLinks.ts`: add a `langley200` key. Until a Google Business Profile link exists for it, Get Directions falls back to the coordinates (already handled), so no placeholder link is baked in.
- New `src/pages/Langley200Street.tsx` built from `src/pages/Langley.tsx` (`CustomerLayout`, `PageHero`, `RentalSearchCard` seeded with the new location id, `CitySections`, `CityFaq`), reusing existing Langley imagery.
- Route registered lazily in `src/App.tsx`; links added in `TopNav.tsx`, `Footer.tsx`, `LocationChips.tsx`.
- Location-scope aware admin/ops screens read locations from the database, so the new branch appears in branch pickers, alerts scoping and branch SMS automatically; branch texts use +1 (604) 763-4242 as its recipient, matching the other Langley/Surrey branches.
- No changes to booking creation, pricing, availability, deposits, triggers or RLS. No notification is sent, retried or backfilled.
- Head/meta changes reach the live site on the next publish.
