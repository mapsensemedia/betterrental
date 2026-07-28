## Goal

Clean up every customer-facing SMS: consistent "C2C Rental" branding, real emergency number, correct return date/time, booking reference in every message, no walkaround sign-in link, and the same messages for walk-in bookings. No real SMS sent during testing.

## What's wrong today (verified in code)

- `supabase/functions/send-booking-notification/index.ts` uses **"C2C Exotic"** in all 13 SMS stages plus the email wrapper.
- Same file, `rental_active` stage: `Emergency: 1-888-XXX-XXXX` placeholder.
- Same file, `fmtDate()` / `fmtDateTime()` call `toLocaleDateString`/`toLocaleString` with **no `timeZone` option** — the edge function runtime is UTC, so a 6:00 PM Vancouver return prints as the next day 1:00/2:00 AM. This is the return-time bug.
- `src/components/admin/ops/WalkaroundSendDialog.tsx` sends an SMS containing `/walkaround/{id}` to the customer (it also posts a `phone`/`message` body that `send-booking-sms` doesn't accept, so the call is broken today). The `agreement_ready` stage also pushes a `signLink`.
- Several stages (`license_approved`… mostly fine) — but `walkaround_complete`, `checkin_complete`, `deposit_released` etc. will be checked so every SMS carries the booking code.
- `supabase/functions/create-walk-in-booking/index.ts` sends **no notification at all** — walk-in customers get nothing.

## Changes

**1. Shared SMS helpers** — new `supabase/functions/_shared/sms-format.ts`

- `BRAND = "C2C Rental"`, `EMERGENCY_PHONE = "(604) 763-4242"`.
- `fmtDateVan(iso)` / `fmtDateTimeVan(iso)` formatting with `timeZone: "America/Vancouver"` (matches existing project-wide Vancouver rule).

**2. `send-booking-notification/index.ts**`

- Replace every "C2C Exotic" with "C2C Rental" (SMS + email header/footer).
- Use the Vancouver formatters for all pickup/return dates.
- Replace the placeholder emergency number with (604) 763-4242 on `rental_active`, and append it to the messages where a customer may need help mid-rental.
- Ensure every SMS template contains `booking ${code}`.
- Remove the walkaround/sign link from SMS: `agreement_ready` SMS will say the agreement is ready and to check email / see staff, with no URL.

**3. `send-booking-sms/index.ts`, `send-agreement-notification/index.ts`, `send-payment-confirmation/index.ts**`

- Same brand string, Vancouver date formatting, booking code present in every template.

**4. Walkaround link removal** — `src/components/admin/ops/WalkaroundSendDialog.tsx`

- Drop the SMS and Email tabs (which sent the link); keep the QR code + copy/open link for in-person use only. No customer SMS carries the walkaround URL anymore.

**5. Walk-in bookings** — `supabase/functions/create-walk-in-booking/index.ts`

- After the booking is created, fire the same confirmation notification (booking code, pickup date/time in Vancouver, location, emergency number) to the walk-in customer's phone, reusing the existing dispatcher with idempotency logging. Failure to notify never fails the booking.

## Testing (no real sends)

- Unit-test the formatters: a booking ending `2026-07-24T18:00:00-07:00` must print "Fri, Jul 24, 2026, 6:00 PM", not the UTC-shifted value.
- Snapshot-check each stage template for: contains "C2C Rental", contains booking code, contains no `walkaround` URL, no "C2C Exotic", no `1-888-XXX-XXXX`.
- Twilio calls are exercised only via a mocked/omitted credential path (the senders already skip cleanly when Twilio env vars are absent), so no message leaves the system. No live SMS will be sent; if you later want one real end-to-end check, it goes only to +1 604-735-1917.  


## Not touched

Pricing, taxes, booking logic, OTP/support SMS content beyond brand string, UI design elsewhere.