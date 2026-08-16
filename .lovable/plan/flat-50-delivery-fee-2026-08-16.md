# Flat $50 Delivery Fee

Replace the distance-based delivery pricing (free under 10 km, $49 up to 50 km) with a single flat **$50 delivery fee** for every delivery booking, regardless of distance.

## What changes for customers

- Any booking with delivery selected is charged $50, no exceptions.
- All "Free delivery" / "Free (≤10km)" / "$49 (11-50km)" wording is removed from the search card, delivery breakdown box, and marketing copy.
- Distance and ETA still show on the delivery box; only the fee wording changes.
- The 50 km service-area limit stays as it is today (deliveries beyond 50 km remain unavailable).

## Technical changes

Frontend
- `src/lib/rental-rules.ts` — collapse `DELIVERY_TIERS` into a single `DELIVERY_FEE = 50`; `calculateDeliveryFee()` returns 50 for any distance within range; `getDeliveryPricingSummary()` returns "Flat $50 delivery fee (within 50 km)".
- `src/constants/rentalLocations.ts` — `calculateDeliveryFee()` returns `{ fee: 50, bracket: "Flat $50" }` for distances ≤ 50 km; update the tier comment block.
- `src/components/rental/DeliveryPricingDisplay.tsx` — drop the `fee === 0 ? "Free"` branch, always render `$50`.
- `src/components/rental/RentalSearchCard.tsx` — fallback `setDeliveryDetails(49, …)` becomes 50; remove the "Free delivery" label branch.
- `src/contexts/RentalBookingContext.tsx` — keeps using `calculateDeliveryFee`, so it picks up the flat fee automatically; verify the reset-to-0 path only fires when delivery mode is off or out of range.

Backend (server-side is the source of truth for the charged amount)
- `supabase/functions/_shared/delivery-pricing.ts` — replace the tier table with `DELIVERY_FEE = 50`; `feeForDistanceKm()` returns 50; `deriveDeliveryFee()` keeps returning `null` when the booking is not a delivery or coordinates are missing, so non-delivery bookings are untouched.
- No change needed in `booking-core.ts` / `reprice-booking` — they already read the derived fee and will correct any stale client value to $50.

Existing bookings
- No retroactive repricing. Already-created bookings keep their recorded delivery fee unless you ask for specific ones to be corrected.

## Verification

- Run the pricing unit tests.
- Walk the online booking funnel with a delivery address under 10 km and confirm $50 appears on search, protection, add-ons, and checkout, and that the created booking stores `delivery_fee = 50`.
