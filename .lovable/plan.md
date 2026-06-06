## Goal

Turn `/abbotsford` into a true landing page for the Abbotsford location — same visual structure and polish as the homepage (`/`), but every piece of copy, imagery, schema, and the booking widget is localized to Abbotsford. Booking flow downstream stays identical; only the pickup location is pre-selected and locked to Abbotsford Centre.

## Scope

In scope:
- `src/pages/Abbotsford.tsx` — full rewrite to match the `Index.tsx` landing structure.
- Minor: pass `defaultLocationId` (Abbotsford UUID `a1b2c3d4-3333-4000-8000-000000000003`) into the search card.

Out of scope:
- No changes to `RentalSearchCard`, `create-booking`, pricing, or any downstream booking step. The existing `defaultLocationId` prop already handles pre-selection.
- No changes to `/surrey` or `/langley`.
- No DB / edge function changes.

## Page structure (mirrors Index.tsx)

1. **Hero** — Abbotsford eyebrow ("C2C Rental · Abbotsford"), H1 "Car Rental in Abbotsford, BC", supporting copy referencing YXX / Sumas / Hwy 1, hero image, scroll cue. Replace the city shortcut row with a "Other locations" link row (Surrey / Langley) so the page stays Abbotsford-anchored.
2. **Booking / Search module** — `<RentalSearchCard defaultLocationId="a1b2c3d4-3333-4000-8000-000000000003" />`. Pickup is pre-filled with Abbotsford Centre; user can still change dates/vehicle/return location. Booking flow itself is untouched.
3. **Why Choose C2C in Abbotsford** — Abbotsford-specific bullets (YXX proximity, cross-border docs, Hwy 1/11/Sumas knowledge, UFV, ag/farm worker support).
4. **Cleaning banner** — reuse `<CleaningBanner />`.
5. **Browse fleet** — reuse the homepage fleet category grid (`useFleetCategories` + `CategoryDisplayCard`), with all "Book Now" links pointing to `/search?location=abbotsford` style query so the search prefilters (existing search already reads pickup from context — links can simply go to `/search`).
6. **Popular Abbotsford trips & use cases** — existing list (YXX, Bellingham, Kelowna corridor, Whistler, UFV, ag worker).
7. **Pickup, delivery & service area** — Abbotsford address (32835 South Fraser Way), neighbourhoods covered, delivery note.
8. **Simple booking process** — existing 5-step list.
9. **Insurance, deposits & requirements** — existing content.
10. **FAQ accordion** — existing 5 Abbotsford FAQs.
11. **Final CTA** — "Book your Abbotsford rental" button → scrolls back to the search card (anchor link `#book`).
12. Reuse `<LocationsSection />` footer-style block if useful, otherwise omit to keep Abbotsford focus.

## SEO

- Keep the existing `<title>`, meta description, canonical (`/abbotsford`), OG tags, LocalBusiness+CarRental JSON-LD (Abbotsford address), and FAQPage JSON-LD that the current page already injects — port them into the new layout verbatim.
- Add a `WebPage` schema with `about` referencing the Abbotsford location.
- Single H1 ("Car Rental in Abbotsford, BC ..."). Section H2s as listed above.

## Technical detail

- File touched: `src/pages/Abbotsford.tsx` (rewrite using the same building blocks as `Index.tsx`: `CustomerLayout`, `container-page` hero, `RentalSearchCard`, `WhyChooseSection` *(optionally swapped for Abbotsford-specific inline copy to avoid Surrey-flavoured text)*, `CleaningBanner`, `SectionHeader`, fleet grid with `useFleetCategories`).
- The Abbotsford location UUID is the canonical one from `src/constants/rentalLocations.ts`: `a1b2c3d4-3333-4000-8000-000000000003`. Passed as `defaultLocationId` to `RentalSearchCard`. The search card already syncs this into `RentalBookingContext.searchData.pickupLocationId`, which `create-booking` consumes — so the entire downstream flow continues to operate identically, just with Abbotsford pre-selected.
- Booking widget remains fully interactive; user can override the location if they want. (If you'd rather hard-lock it to Abbotsford with no override on this page, say the word and I'll hide the location selector — but default behaviour matches your "booking flow completely same" requirement.)
- Cleanup: remove the unused `PageContainer`-only narrow layout; new page uses full-width sections like the homepage.

## Risk / verification

- No backend or routing changes; `/abbotsford` route already exists in `App.tsx`.
- Verify in preview that:
  1. `/abbotsford` renders the hero + search card with Abbotsford pre-selected.
  2. Submitting search proceeds through the normal booking flow.
  3. `/` (home) is unchanged.
  4. SEO tags (title, canonical, JSON-LD) reflect Abbotsford.
