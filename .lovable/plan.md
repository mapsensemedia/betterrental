# Card on File: expiry + Active Rentals panel

Booking 3STR9EL7 currently stores MC •••• 7252, cardholder Ken Mackenzie, and no expiry. Two changes:

## 1. Show card expiry

- Add a `card_expiry` field on bookings (`MM/YY`). No full card number is ever stored.
- The payment gateway already returns the card's expiry month/year on each authorization/purchase — both online payment paths will save it alongside the last four.
- The Card on File panel already has an expiry slot (currently always empty); once stored, expiry shows after the admin password unlock.
- Manually logged terminal payments get an optional expiry field so walk-ins stay consistent.
- Backfill 3STR9EL7 from its existing gateway authorization so it can be verified right away. Other past bookings stay blank unless you want a wider backfill.

## 2. Add the Card on File panel to Active Rentals

The password-gated card panel used in the handover booking summary will also appear on the Active Rental detail view, in the customer/payment area, with identical behaviour: masked by default, full details (brand, last four, cardholder, expiry) revealed after the admin password, auto-hiding after 30 seconds.

## Verification

- Open 3STR9EL7 in Active Rentals, unlock the card panel, confirm MC •••• 7252, Ken Mackenzie and the expiry appear.
- Confirm the panel stays masked before password entry and re-masks automatically.

## Technical notes

- Migration: `alter table public.bookings add column card_expiry text` (nullable; existing bookings grants/policies cover it).
- `supabase/functions/wl-pay/index.ts` and `wl-authorize/index.ts`: extend the gateway `card` type with `expiry_month` / `expiry_year` and write `card_expiry` in the same update that sets `card_last_four`.
- `supabase/functions/log-terminal-payment/index.ts`: accept and persist an optional `cardExpiry`.
- Reuse `src/components/admin/ops/sections/CardInfoSection.tsx` (already has a `cardExpiry` prop) inside `src/pages/admin/ActiveRentalDetail.tsx`; `use-active-rental-detail.ts` already selects `bookings.*`, so no query change is needed.
- Also pass `card_expiry` through in `OpsBookingSummary.tsx`.
- Backfill: read expiry from gateway transaction `10001429`, then a single-row update.
