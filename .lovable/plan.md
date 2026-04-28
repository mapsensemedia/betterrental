# Add missing `<h1>` to the Locations page

## Problem
The SEO audit flagged a page with no `<h1>` tag. An audit of all public pages shows every page already has exactly one `<h1>` **except** `/locations` (`src/pages/Locations.tsx`), which only renders an `<h2>` via the shared `SectionHeader` component.

## Fix
In `src/pages/Locations.tsx`, replace the `SectionHeader` usage with an SEO-friendly heading block:

- Add a proper `<h1>` containing the primary keywords already used in the page's `<title>` and meta description.
- Keep visual styling consistent with other location/landing pages (uses the same `heading-2` / hero typography Tailwind classes already in the codebase).
- Add a short supporting paragraph below the h1 for context (helps both users and search engines).

Proposed h1 copy (keyword-aligned with the page title and brand, well under 150 chars):

> **Car Rental Locations in Surrey, Langley & Abbotsford BC**

Optional sub-line (rendered as a `<p>`, not a heading):

> Find your nearest C2C Rental branch across the Lower Mainland — pickup, delivery, and 24/7 support.

## Files changed
- `src/pages/Locations.tsx` — swap the `SectionHeader title="Our Locations"` call for an inline `<h1>` + supporting paragraph block. No other behavior, data fetching, or layout changes.

## Out of scope
- All other public pages already have a single valid `<h1>` and need no changes.
- Authenticated/admin/ops pages are excluded from SEO indexing via `robots.txt` and don't require h1 enforcement.

## Verification
After the change:
- `/locations` renders exactly one `<h1>` containing the primary keywords.
- `rg -c "<h1" src/pages/Locations.tsx` returns `1`.
- Visual layout on desktop (1136px) and mobile remains balanced with the map and location cards below.
