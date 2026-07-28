## Goal

Every customer message ("Questions? Call ...") shows the phone number for that booking's location instead of one hard-coded number.

| Location | Number |
|---|---|
| Abbotsford Centre | (604) 306-1029 |
| Langley Centre | (604) 763-4242 |
| Surrey Newton | (604) 763-4242 |

## Current state (verified)

- `supabase/functions/_shared/sms-format.ts` exports a single constant `EMERGENCY_PHONE = "(604) 763-4242"`, used by 4 messaging functions in 12 SMS templates plus 3 hard-coded spots in email HTML inside `send-booking-notification`.
- The `locations` table already has a `phone` column, but all three rows currently hold `+1 (604) 763-4242` — Abbotsford's is wrong in the database.
- Each messaging function already joins the booking's pickup location, so the location is available at send time.

## Changes

**1. Database (single migration)**
Set Abbotsford Centre's `phone` to `+1 (604) 306-1029`; leave Surrey and Langley as-is. This makes the database the source of truth so future number changes need no code edit.

**2. Shared helper — `supabase/functions/_shared/sms-format.ts`**
- Keep `EMERGENCY_PHONE` as the fallback (used when a message has no booking/location context, e.g. support or OTP messages).
- Add `formatPhoneForMessage(raw)` → normalises any stored format to `(604) 306-1029`.
- Add `getBookingContactPhone(supabase, booking)` → returns the pickup location's phone, falling back to the return location, then to `EMERGENCY_PHONE`.

**3. Messaging functions — replace the constant with the resolved per-booking number**
- `send-booking-sms` — confirmation, update, cancellation, reminder.
- `send-booking-notification` — all lifecycle SMS stages *and* the three email HTML/text spots that print the number.
- `send-agreement-notification` — agreement ready, license verified, payment received, vehicle ready.
- `send-payment-confirmation` — payment confirmed.

Cancellation-type messages have no location join today; they will fetch the booking's `location_id` phone the same way so they stay location-correct.

**4. Non-booking messages** (support tickets, OTP codes, account setup) keep the default `(604) 763-4242`, since no location applies.

## Testing (no SMS to real people)

- Unit-test the phone resolution and formatting logic locally — no network, no Twilio.
- Render each template against Surrey / Langley / Abbotsford bookings in a local harness and assert the correct number appears, without sending.
- One real end-to-end send only to **+1 604-735-1917**, via a temporary send function hard-coded to that single destination, then delete the function. No other number can receive anything.

## Out of scope

Website/footer/contact-page numbers, pricing, design, and unrelated features stay untouched.
