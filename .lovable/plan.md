# Fix support ticket links and missing branch text

Two confirmed problems for booking DTHERBBK (still a pending booking, ticket TKT-010022 at Abbotsford Centre).

## 1. "Open" from a ticket lands on "Rental Not Found"

The booking card inside the support dialog and support panel always opens the
active-rental screen, even for bookings that have not started yet. That screen
only loads rentals already picked up, so a pending booking shows the red
"Rental Not Found" message.

Fix: send the person to the screen that matches the booking's stage —
preparation/handover view for pending and confirmed bookings, the active-rental
view once the car is out, and the read-only booking page for finished or
cancelled ones. Same behaviour whether the ticket is opened from the dialog or
from the support panel.

## 2. No branch text when a customer opens a ticket

The branch was texted when this booking was created, but nothing was sent when
the customer raised the ticket. The customer-side ticket form only sends the
confirmation text to the customer; it never triggers the branch alert. (Only the
older staff-side ticket path does.)

Fix: trigger the branch alert as part of customer ticket creation, and include
the customer's phone number in that text alongside the renter name, booking
code and the issue, so the branch can call back directly.

Nothing is resent or backfilled — this only affects tickets created from now on.

## Technical notes

- `src/components/support/TicketBookingSummary.tsx`: replace the hardcoded
  `/ops/rental/${booking.id}` navigation with the existing status-aware helper in
  `src/lib/booking-routes.ts` (ops-context aware, so ops users stay under `/ops`).
- Check the support panel/dialog wrappers for any other hardcoded
  `/ops/rental/...` links opened from a ticket and route them the same way.
- `src/hooks/use-support-v2.ts`: after a customer ticket is inserted, invoke
  `notify-branch-sms` with `{ type: "ticket", ticketId }`, non-blocking but with
  the failure logged (no silent catch).
- `supabase/functions/notify-branch-sms/index.ts`: add the customer phone
  (resolved from profile/customer record, falling back to the pickup contact) to
  the ticket message body. Existing idempotency key per recipient per ticket stays,
  so no duplicates. Redeploy the function.
