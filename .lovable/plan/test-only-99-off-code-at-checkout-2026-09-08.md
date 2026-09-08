# Test-only 99% off code at checkout

A single secret code the testing team can type at checkout to bring a whole booking (including the refundable hold) down to about 1% of its value. It is never listed, advertised, or hinted at anywhere on the site.

## How it will work for the tester

1. On the checkout page there is a small "Have a code?" field (same field customers see — it looks ordinary and shows nothing until a code is entered).
2. Tester types the code and presses Apply.
3. If the code matches, the summary shows a "Test discount" line, every charge drops by 99%, and the deposit hold drops from $350 to $3.50.
4. Booking, payment and deposit hold all run for real, just with tiny amounts, so the full flow can be tested end to end.
5. A wrong code shows "This code isn't valid" and nothing changes.

## Safety rules

- The code itself lives only on the server (stored as a backend secret), never in the website code, so nobody can find it by inspecting the page.
- Nothing in the customer interface names or hints at the code. No banner, no list of offers.
- Bookings made with it are stamped so they are easy to identify and exclude from revenue reporting later.
- It can be switched off instantly by clearing the secret, and it carries an expiry date so it dies on its own if forgotten.

## What gets discounted

Rental days, weekend surcharge, protection, add-ons, driver fees, drop-off/delivery fees, taxes, and the card processing fee are all reduced by 99%. The refundable deposit hold is reduced by the same 99% so test cards are not tied up.

## Technical detail

**Secret**: `TEST_PROMO_CODE` (created via the secrets tool so the value never appears in code) plus `TEST_PROMO_EXPIRES_AT`.

**New edge function `validate-promo-code`**: accepts `{ code }`, compares against the secret with a constant-time-ish equality check, and returns `{ valid, percentOff: 99, label: "Test discount" }`. Never echoes the correct code. Rate limited per IP via the existing `check_rate_limit` RPC to stop guessing.

**Pricing engine (server, `supabase/functions/_shared/booking-core.ts`)**:
- `computeBookingTotals` / `validateClientPricing` accept an optional `promoCode`.
- When the code matches the secret and is unexpired, apply the 99% cut in integer cents at the end of the existing computation: discount = `total - round(total * 0.01)`, and the same treatment for `depositAmount`. Existing line items keep their real values; the reduction is a single discount amount so the breakdown stays auditable.
- Returns `promoDiscount` and `promoCodeApplied` in the totals object; an invalid/expired code is ignored (never blocks the booking) and no discount is applied, so the client/server mismatch check still catches tampering.

**Booking writes (`create-booking`, `create-guest-booking`)**: pass `promoCode` through to `validateClientPricing`; persist `total_amount`, `deposit_amount` from server totals as today. Store the marker on the booking (`notes` append plus a new nullable `promo_code` column on `bookings`, with the reduction amount in `duration_discount`-independent field `promo_discount`) so finance can filter test bookings out. Migration adds `promo_code text` and `promo_discount numeric default 0` to `bookings`.

**Client (`src/pages/NewCheckout.tsx`, `src/lib/pricing.ts`)**:
- Small code input + Apply button, wired to `validate-promo-code`. The website never knows the code — it only learns "valid, 99%" from the server.
- On success, store `promoPercent` in checkout state and apply the same integer-cents 99% reduction to the displayed total and to the deposit amount used by the payment/hold components, so the amount shown equals the amount the server computes.
- Send `promoCode` in the `create-booking` / `create-guest-booking` bodies.

**Payments**: `wl-authorize` and the deposit-hold function already take their amounts from the booking row, so no change is needed there — they will charge the reduced amounts automatically.

**Not touched**: the points-offer system, walk-in/ops pricing, and any customer-facing promotional UI.
