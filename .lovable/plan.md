
## Root cause (confirmed)

The intended pricing rule is **`Math.ceil(hours ÷ 24)`** — 24h = 1 day, 25h = 2 days, 48h = 2 days, 49h = 3 days. The client already does this. The server does it too, **but only when it hits the timestamp branch** in `computeBookingTotals` (`booking-core.ts` line 476–485).

Both `create-booking` (line 110) and `create-guest-booking` (line 148) call `validateClientPricing` with:

```ts
startAt: pickupDate || startAt,   // "YYYY-MM-DD" — length 10
endAt:   dropoffDate || endAt,    // "YYYY-MM-DD" — length 10
```

Because those strings are length 10, `computeBookingTotals` takes the **date-only branch** and uses `Math.round((endDate − startDate) / 86400000)` — pure calendar-day diff, ignoring hours. That's why:

- 48h rental spanning Jun 18 → Jun 20 → server gets `round(2.0) = 2` days. In this case the client got 2 days too, so the ratio should have been 1×… **but the current live mismatch (`$103.58` vs `$207.18`, exact 2×)** means the server is actually seeing **1 day** — most likely because on this delivery attempt `pickupDate` and `dropoffDate` collapsed to the same calendar day after `formatLocalDate` (a delivery flow can shift them by tz), producing `round(0) → max(1, …) = 1`. Either way, the date-only branch is the wrong tool for a rule that must count hours.

The fix has to make **both** flows (delivery **and** normal pickup) use the hour-based ceil, on both the client and the server.

## Plan

### 1. Server — always use hour-based ceil for the customer funnel
- `supabase/functions/_shared/booking-core.ts`: remove the date-only branch in `computeBookingTotals` (lines 476–485). Always compute `days = Math.max(1, Math.ceil((new Date(endAt) − new Date(startAt)) / 86400000))`. If either input isn't a valid ISO timestamp, throw so we fail closed instead of silently under-charging.
- Weekend-day counting (`countWeekendDaysInRange`) still needs a start date — keep it, but derive it from the parsed `startAt` timestamp (UTC date components) so it works whether the caller sends an ISO or a date-only string.

### 2. Server callers — send full ISO timestamps only
- `supabase/functions/create-booking/index.ts` (line 110): drop `pickupDate || startAt` / `dropoffDate || endAt`; pass `startAt` and `endAt` directly. Add a 400 guard if either isn't parseable.
- `supabase/functions/create-guest-booking/index.ts` (line 148): same change.
- `persist-booking-extras/index.ts` and `reprice-booking/index.ts`: audit each `computeBookingTotals` call site — they already read `start_at` / `end_at` from the DB (full timestamps), so they'll pick up the stricter behavior automatically, but verify no code path is feeding date-only strings.

### 3. Client — remove now-unused date-only fields
- `src/pages/NewCheckout.tsx`: stop sending `pickupDate` / `dropoffDate` in the `create-booking` and `create-guest-booking` payloads (they're only used for pricing and are now ignored server-side). Keep `startAt` / `endAt`.
- `RentalBookingContext.tsx`: already uses `Math.ceil(ms / 86400000)` on the combined `pickupDate + pickupTime` and `returnDate + returnTime` — leave it alone. This is what the server will now match.

### 4. Diagnostic + UX (small, permanent)
- In `booking-core.ts` `validateClientPricing`, when the check fails, log a single JSON line with `{ days, dailyRate, vehicleTotal, protectionTotal, addOnsTotal, deliveryFee, differentDropoffFee, subtotal, tax, total }` (server) plus the received `clientTotal` and `startAt`/`endAt`. Makes the next incident 30 seconds instead of an hour.
- In `NewCheckout.tsx`, when the toast fires for `PRICE_MISMATCH`, also `console.error` the outgoing payload and the client `pricing` breakdown.

### 5. Tests — lock the rule in
- `src/lib/pricing.test.ts`: add cases asserting `rentalDays` from `RentalBookingContext`-style inputs for the boundary cases the user called out — 24h → 1, 24h 30m → 2, 25h → 2, 48h → 2, 49h → 3.
- Add a Deno test under `supabase/functions/_shared/` (or a small `computeBookingTotals` test) covering the same boundaries plus one delivery scenario (48h, premium protection, `deliveryFee: 49`) and assert `days === 2` and the total matches the client's `calculateBookingPricing` output within $0.50.

## Files touched

- `supabase/functions/_shared/booking-core.ts` — remove date-only branch, add mismatch logging
- `supabase/functions/create-booking/index.ts` — send `startAt`/`endAt` only
- `supabase/functions/create-guest-booking/index.ts` — send `startAt`/`endAt` only
- `supabase/functions/persist-booking-extras/index.ts`, `reprice-booking/index.ts` — audit only, expected no changes
- `src/pages/NewCheckout.tsx` — drop `pickupDate`/`dropoffDate` from both payloads, add mismatch logging
- `src/lib/pricing.test.ts` — boundary tests
- New Deno test for `computeBookingTotals` — parity + boundaries

## Explicitly NOT changed

- Client-side `rentalDays` computation (already correct)
- Pricing constants, protection rates, delivery-fee logic, drop-off fee logic
- Booking creation, hold, availability, payment, or notification flows
- The $0.50 mismatch tolerance
