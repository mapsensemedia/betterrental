# Fix the customer and admin issues found in end-to-end testing

Confirmed causes for each reported problem, and what will change.

## 1. Emails never reach customers (booking confirmation + account setup)

All outgoing mail is currently sent from a Resend test address (`onboarding@resend.dev`). That address only ever delivers to the account owner's own inbox — every customer email is silently dropped, which explains both the missing booking confirmation and the missing "set up your account" email.

Fix:
- Set up c2crental.ca as the verified sending domain (a one-time setup step you complete in a dialog I'll show).
- Switch booking confirmation, account setup and admin notification emails to send from that domain.
- After a booking is created online: send the confirmation email to the customer, and for guests also send the account setup link so they can sign in and see their rental.
- Show a clear message if sending fails, and record it, so a silent failure never happens again.

## 2. "Category not available" blocks a booking

The booking is refused when the chosen car class has no usable vehicles at the pickup branch. Per your decision, availability must never block a booking.

Fix: remove the refusal from both the online booking and guest booking paths. Bookings always go through; the reservation is flagged as an overbooking for staff to assign a vehicle later. The customer-facing warning text is removed too.

## 3. Text message to +1 (604) 306-1029 for every Abbotsford booking

Fix: when a booking is created at Abbotsford Centre (online, guest or walk-in), send a text to that number in this exact shape:

```text
New C2C Abbotsford booking
Renter: <full name>
Pickup: <date>
Pickup time: <time>
Booking: <code>
Paid: Online / At pick-up
Return: <date>
Return time: <time>
```

Times shown in Vancouver time. "Paid" reads Online when payment was taken at booking, otherwise At pick-up.

## 4. "Failed to create a ticket" under Contact Support

The ticket number is generated in the browser by looking up the newest ticket — but it reads the wrong field, so every customer ticket is numbered `TKT-000001`. That number already exists, so the save is rejected. It has failed for every customer ticket since the first one.

Fix: generate the ticket number on the server (database side) so it is always unique and never guessable from the browser. Customer ticket creation then works, including for guests attached to a booking.

## 5. Customer cannot delete their driver's licence

Fix: add a Remove button next to the licence on the customer dashboard. It deletes the photo and the pending record while the licence is still awaiting review. Once staff have verified it, the button is replaced by a note asking the customer to contact support — verified documents stay on file.

## 6. Admin alerts full of noise, and genuine tickets missing

Two separate causes:
- Lifecycle notices (booking created, activated, completed) are still being written as alerts.
- The customer "Report an issue" flow tries to write the alert from the customer's browser, which is not permitted, so the alert is never created at all. That is why real tickets never appear.

Fix:
- Stop writing lifecycle notices as alerts; they remain in booking history only.
- Create the ticket alert on the server when a ticket is created, so it always appears, tagged as a customer ticket with the ticket number.
- Alerts list stays branch-scoped (manager sees own branch, super admin sees all).

## 7. Clicking a ticket alert opens the wrong page

Ticket alerts currently link to the booking handover page because that is the only link the alert dialog knows.

Fix: store the ticket reference on the alert and link ticket alerts straight to the support ticket. The related booking is offered as a second link, and the booking details page gains a Support tickets line listing that booking's tickets.

## 8. Support text alerts for Abbotsford

Fix: when a ticket is created for an Abbotsford booking, send a text to +1 (604) 306-1029 with the ticket number, renter name, booking code and a one-line summary.

## Technical notes

- Emails: replace `onboarding@resend.dev` in `send-booking-email`, `send-account-setup-link`, `notify-admin` with a `bookings@c2crental.ca` sender after domain verification; return non-2xx on Resend failure and log to `notification_logs`.
- Availability: drop the `!capacity.offered` refusal in `create-booking` and `create-guest-booking`; keep `overbooked` flagging. Remove `CATEGORY_NOT_OFFERED` mapping in `NewCheckout.tsx` and the message in `availability-check.ts`.
- Ticket numbering: `support_tickets_v2.ticket_id` gets a sequence-backed default plus a BEFORE INSERT trigger; `useCreateCustomerTicketV2` and `useCreateTicketV2` stop computing it client-side.
- Alerts: add `ticket_id` (nullable FK) to `admin_alerts`; create the alert inside a `AFTER INSERT` trigger on `support_tickets_v2` (security definer) so customer inserts succeed; remove `admin_alerts` writes from `ReportIssueDialog.tsx` and lifecycle alert writes.
- Abbotsford SMS: new `notify-branch-sms` edge function (Twilio secrets already present) invoked from the booking-create paths and the ticket trigger via `pg_net`-free server invoke in `create-*` functions plus `send-support-sms` extension; recipient number kept in `system_settings` keyed by location so it can be changed without a code edit.
- Licence delete: `verification_requests` delete policy for `auth.uid() = user_id AND status = 'pending'`, storage object delete policy on `verification-documents` for own folder; new Remove action in `use-license-upload.ts` and the Dashboard licence card.
