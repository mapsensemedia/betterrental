# Fix the pass QR code on staff devices + cancellation texts

Two separate problems, both confirmed by reading the code and the database.

## 1. The QR code fails when staff scan it

What the QR contains: a link to the check-in page with the booking code, e.g. `/check-in?code=ABCD1234`.

What the check-in page does today: it looks the booking up **directly from the browser**, using whoever is signed in on that device.

Why staff devices see "Invalid or expired booking code":

- The database only lets a person read a booking if they are the customer who made it, an assigned driver, or a signed-in staff account. A phone that scanned the code from the camera app usually has **no one signed in** — so the lookup returns nothing and the page shows the "Booking Not Found" message even though the booking exists and is perfectly valid.
- The same happens if the staff member is signed in on a different browser than the one the camera opens, or is signed out after a while.
- Secondary issue: when a signed-in staff member does scan it, the page sends them to the bookings list filtered by that code, not straight into the booking. That is one extra tap and looks like the code "did nothing".

### The fix

- Look the booking up through a small server-side lookup (a new function) that takes the booking code only and returns just what the check-in screen needs: code, pickup/return date and time, status, branch name and address. No prices, no customer contact details, no card data. Rate limited by the existing rate-limit helper so the code cannot be guessed in bulk.
- The check-in page uses that lookup for everyone, so it works whether or not anyone is signed in — which is the whole point of a pass you show at the counter.
- If the person who scans is signed-in staff, send them straight to the booking's own page (choosing the right screen based on whether the rental is upcoming or already out), instead of to a filtered list.
- If nobody is signed in, keep showing today's clean customer-safe check-in card, plus a "Staff sign in" link that returns to the same booking after signing in.
- Cancelled bookings will say clearly "This booking was cancelled" rather than "not found", so staff can tell the difference.

Nothing in booking creation, pricing, availability, triggers or payments is touched.

## 2. No text when a booking is cancelled or voided

Confirmed today:

- Staff voiding a booking runs a server action that updates the booking, releases the vehicle, writes an audit entry and creates an alert — but sends **no message at all** to the customer.
- The status-change action sends messages for activated and completed rentals only; cancelled is not in the list.
- The customer's own "Cancel Booking" button tries to change the booking status straight from the browser. The database blocks that for safety, so the customer's cancel button currently **fails** rather than cancelling.

### The fix

- Route the customer's cancel button through the same protected server action used elsewhere, so it actually works and follows the same rules (only upcoming bookings, reason recorded).
- Whenever a booking becomes cancelled — customer cancelling, staff voiding, or a status change — send the customer one cancellation text using the existing text template, with the branch phone number for questions.
- One log row per attempt, success or failure, and one message per cancellation only (no repeats). Nothing is sent for bookings cancelled in the past; this applies to future cancellations only.

## Verification

- Scan a pass QR on a signed-out phone: the check-in card appears with correct branch and times.
- Scan on a signed-in staff phone: it opens that booking directly.
- Scan a made-up code: "Booking not found" as expected.
- Cancel one test booking as the customer and void another as staff: both cancel successfully and one text arrives each time, with a log row visible.
- Confirm a normal booking, activation and return still behave exactly as before.

## Technical notes

- New edge function `lookup-booking-pass` (service role, `verify_jwt = false`, code-only input, whitelisted fields, `check_rate_limit` on the caller IP). No new tables, no schema change.
- `src/pages/CheckIn.tsx` switches from a direct `bookings` select to the new function; staff redirect uses status-aware routing (`/admin/active-rentals/:id` for active, `/admin/bookings/:id` handover route otherwise), matching the routing already used in `TicketBookingSummary.tsx`.
- `src/components/booking/CancelBookingDialog.tsx` stops writing `bookings` directly and invokes `void-booking`/`update-booking-status` with `status: cancelled` and the customer reason.
- Add a `booking_cancelled` stage to `send-booking-notification` (text only) and invoke it from `void-booking` and from the cancelled branch of `update-booking-status`, using `resolveBookingContact` and `writeNotificationLog` from `_shared/notify-log.ts` with an idempotency key so a repeat cancel cannot double-send.
- No changes to pricing, availability, deposit, invoice, trigger or RLS logic.
