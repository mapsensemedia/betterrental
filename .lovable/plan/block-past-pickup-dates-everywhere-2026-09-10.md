# Block past pickup dates everywhere

Goal: no booking — online or walk-in — can start before today. Today itself stays fully selectable at any time. No exceptions for staff or super admins.

## What changes for people using the site

- Customer search and date pickers: dates before today are greyed out and cannot be typed or pasted in. If an old date is still remembered from a previous visit or a shared link, it is quietly moved forward to today.
- Return date can never be earlier than the pickup date.
- Walk-in booking form (staff): the start date calendar now blocks past days, same as the customer side.
- If a past date somehow reaches the server, the booking is refused with a clear message: "Pickup date cannot be in the past."

## Where the work happens

Current state confirmed by reading the code:

- `GlassSearchBar.tsx` and `RentalSearchCard.tsx` already set `min={today}` on the date inputs, but a typed or pasted value still passes, and nothing re-validates on submit.
- `TripContextBar.tsx` and `TripContextPrompt.tsx` disable dates with `date < new Date()`, which also blocks today (it compares against the current time, not the start of the day).
- `WalkInBookingDialog.tsx` start-date calendar has no past-date restriction at all; only the end date is constrained (`date <= startDate`).
- `create-guest-booking` and `create-walk-in-booking` have no past-start-date check.

### Technical steps

1. Add helpers in a shared date util (e.g. `src/lib/dateBounds.ts`): `todayLocalISO()` (America/Vancouver `YYYY-MM-DD`), `startOfLocalToday()`, and `isPastLocalDate(value)`.
2. `RentalSearchCard.tsx`, `GlassSearchBar.tsx`: keep `min`, and clamp on change/blur plus a submit guard — past pickup snaps to today, return snaps to at least pickup.
3. `TripContextBar.tsx`, `TripContextPrompt.tsx`: change `disabled` to compare against `startOfLocalToday()` so today remains selectable; return calendar disallows dates before pickup.
4. Rental context / persisted state: when hydrating stored or URL dates, drop pickup dates earlier than today (advance to today and keep the same duration) so stale links do not restore a past trip.
5. `WalkInBookingDialog.tsx`: add `disabled={(date) => date < startOfLocalToday()}` to the start calendar; keep the existing end-date rule.
6. Server guard in `create-guest-booking` and `create-walk-in-booking`: reject when the start date's local Vancouver day is before today, returning a 400 with the plain message above. Any time on today is accepted.

## Explicitly unchanged

Pricing, availability, overbooking behaviour, extension/return date editing on existing bookings, reporting and back-dated document generation are untouched — this only limits the pickup date when a new booking is created.
