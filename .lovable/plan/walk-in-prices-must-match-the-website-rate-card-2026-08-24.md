# Walk-in prices must match the website rate card

## What is wrong

Walk-in booking shows $85/day for the MINIVAN while the website shows $139.99/day.

The two screens read the rate from different places:

- Website (search/availability) reads the rate from the **vehicle category** rate card (`vehicle_categories.daily_rate`), e.g. MINIVAN = $139.99.
- Walk-in booking (admin dialog and the driver walk-in page) reads the **lowest rate of the legacy per-car records** attached to that category. For MINIVAN those legacy rows hold 85.00 / 99.00 / 139.00 / 149.99, so it picks $85.

Verified in the database — every category has stale legacy per-car rates, so this affects more than the minivan:

| Category | Website rate | Walk-in rate today |
|---|---|---|
| MINIVAN | 139.99 | 85.00 |
| MID SIZE SUV (Rav4) | 89.99 | 55.00 |
| MID SIZE SEDAN (Corolla) | 79.99 | 40.00 |
| FULL SIZE SEDAN (Camry) | 84.99 | 69.00 |
| LARGE SUV (Durango) | 149.99 | 149.00 |
| COMPACT (Versa) | 69.99 | 44.00 |
| Mystery Car | 64.99 | 30.00 |

## The fix

Make the category rate card the single source of truth for the displayed daily rate everywhere, so walk-in defaults equal the website price.

1. In the shared category-browsing data layer, stop deriving the daily rate from the legacy per-car records; always return the category's own rate card value. Keep using the per-car records only for what they are still needed for: unit counts, availability, and the fallback image/seats/fuel/transmission attributes.
2. Result: the walk-in dialog's category list and the auto-filled "Daily Rate ($)" field show $139.99 for a minivan, matching the website. Staff can still override the rate manually for a negotiated walk-in price — that behaviour is unchanged.
3. Server-side pricing is unaffected: `create-walk-in-booking` already recomputes every line from the submitted daily rate, so the corrected default flows straight into the subtotal, weekend surcharge, taxes and agreement.

Existing bookings are not touched.

## Technical notes

- `src/hooks/use-browse-categories.ts` — `buildCategoryData` currently tracks `lowestRate` from `unit.vehicle.daily_rate` and prefers it over `cat.daily_rate`. Change so `dailyRate` is always `Number(cat.daily_rate)`; keep the lowest-rate walk only for choosing the representative image/attributes (or switch that to the category's own fields with a unit fallback).
- Consumers affected: `src/components/admin/WalkInBookingDialog.tsx`, `src/features/delivery/pages/WalkIn.tsx`, `src/lib/availability.ts`, `src/hooks/use-vehicles.ts`. All of them want the customer-facing rate, so no per-consumer branching is needed.
- Website path (`useAvailableCategories` / `get_category_availability`) already returns `vehicle_categories.daily_rate`; no database migration required.
