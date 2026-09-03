# Show card expiry on bookings

Today a booking stores only the card brand, last four digits, and cardholder name. For 3STR9EL7 that is: MC •••• 7252, Ken Mackenzie. Staff have no expiry date to verify against the physical card, so we will start capturing and displaying it.

## What changes

1. **Store expiry** — add a `card_expiry` field on bookings (format `MM/YY`). No full card number is ever stored.
2. **Capture it automatically** — the payment gateway already returns the card's expiry month/year with each authorization/purchase. Both online payment paths will save it alongside the last four.
3. **Show it to staff** — the Card on File panel already has a slot for expiry (currently always empty). Once stored, expiry appears when a staff member unlocks the full card view with the admin password. Booking Details and the Ops booking summary show the same value.
4. **Manual entry for terminal / walk-in payments** — when a payment is logged manually (in-store terminal), staff can optionally type the expiry (`MM/YY`) so those bookings are consistent too.
5. **Backfill 3STR9EL7** — read the expiry from the gateway record for its existing authorization and save it, so this booking can be verified immediately. Other historical bookings stay blank unless you want a wider backfill.

## Verification

- Confirm 3STR9EL7 shows MC •••• 7252, Ken Mackenzie, and an expiry after unlocking the card panel.
- Make a small authorized test-free check on an existing booking record (read-only) to confirm new payments persist expiry going forward.

## Technical notes

- Migration: `alter table public.bookings add column card_expiry text` (nullable, no grants change needed — existing booking grants/policies cover it).
- `supabase/functions/wl-pay/index.ts` and `wl-authorize/index.ts`: extend the `card` shape with `expiry_month` / `expiry_year` and write `card_expiry: MM/YY` in the same update that sets `card_last_four`.
- `supabase/functions/log-terminal-payment/index.ts`: accept an optional `cardExpiry` and persist it.
- Frontend: pass `booking.card_expiry` into `CardInfoSection` (`cardExpiry` prop already exists) from `src/pages/admin/BookingDetail.tsx` and `src/components/admin/ops/OpsBookingSummary.tsx`; expiry remains hidden until the password reveal, consistent with the existing PII gate.
- Backfill uses a gateway lookup of transaction `10001429` for 3STR9EL7 — read-only against the gateway, single row update in the database.
