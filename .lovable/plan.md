# Ticket confirmation text, pickup/delivery switch, and pending-ticket alerts

Three separate changes. Nothing already sent is re-sent or backfilled — every new
message applies to tickets created from now on.

## 1. Confirmation text to the customer when they submit a ticket

Today the branch gets a text the moment a ticket lands, and the customer gets
nothing until staff reply.

New behaviour: as soon as a customer submits a ticket, they receive one text:

```text
C2C Rental Support: We've received your request TKT-010031.
Re: <subject, shortened>
Our team is reviewing it. Need to talk to us now? Call +1 (604) 306-1029.
You can also reply from your dashboard: c2crental.ca/dashboard
```

- Callback number: Abbotsford bookings show +1 (604) 306-1029; every other
  booking (Surrey Newton, Langley, or no booking attached) shows +1 (604) 763-4242.
- Sent once per ticket only. If the same ticket is saved twice or the page is
  refreshed, no second text goes out.
- Text only for now — no ticket email until the sending domain is verified.
- If the customer has no phone number on file, nothing is sent and a "failed"
  row is recorded so it is visible instead of silently vanishing.
- The text is fired from the database the same way the branch alert already is,
  so it works no matter which screen the ticket came from, and a failure can
  never block or break ticket creation.

## 2. Switch between "Pick up at location" and "Bring car to me" while browsing

On the browse-cars page the pickup/delivery choice is only reachable inside the
"Modify Search" pop-up, and the summary bar always says "Pick-up" even for a
delivery booking. Customers can't tell they're in delivery mode, nor switch back.

Changes, all on that summary bar (no changes to pricing, availability, or booking logic):

- A small two-button switch: "Pick up at location" / "Bring car to me", with the
  current choice highlighted.
- Choosing "Bring car to me" opens the existing search pop-up so the address can
  be entered; choosing "Pick up at location" drops the delivery address and fee
  and asks for a branch if none is selected.
- The bar's labels follow the mode: delivery shows the delivery address and
  "Delivery" wording instead of "Pick-up / Drop-off" branch labels.
- Dates, times and the selected car stay exactly as they were.

## 3. Pending support tickets visible the moment an admin opens the panel

- On opening the admin or ops panel, a single pop-up appears when tickets are
  waiting: "2 support tickets need attention", with an Open button that goes to
  the support queue. Shown once per sign-in session, not on every page change.
- The Alerts page gets a highlighted line at the top listing the waiting
  tickets, so they can't get buried among other notices.
- The live pop-up for a brand-new incoming ticket and the Support count badge in
  the side panel stay as they are.

## Technical notes

**Ticket confirmation text**
- Extend `supabase/functions/send-support-sms/index.ts` with `kind: "created" | "reply"`
  (default `reply`, so the existing first-reply text is untouched). For `created`:
  idempotency key `support_ticket_created_<ticketId>`, `notification_type`
  `support_ticket_created`, phone resolved through the existing
  `_shared/notify-log.ts` contact resolution (customer record → profile →
  guest_phone), normalised with `_shared/phone.ts`.
- Callback number resolved from the ticket's booking → `locations.phone`,
  falling back to `+1 (604) 763-4242`.
- Every outcome writes one `notification_logs` row (`sent` or `failed`), including
  the no-phone case.
- Add the invocation to the existing `notify_branch_on_new_ticket` trigger
  function via a second `net.http_post` for `created_by_type = 'customer'` only,
  wrapped in its own `BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE WARNING` block so
  ticket inserts can never fail. Remove no existing behaviour.
- Deploy `send-support-sms`.

**Pickup/delivery switch**
- `src/components/search/SearchModifyBar.tsx`: add the mode switch calling
  `setDeliveryMode` from `useRentalBooking()` (which already clears delivery
  address/fee/distance on switch to pickup), open the existing modify dialog when
  the newly chosen mode lacks its required field, and make the location labels
  mode-aware. No changes to `RentalSearchCard`, availability queries, or pricing.

**Pending-ticket notice**
- New `src/hooks/use-pending-ticket-notice.ts`: counts `support_tickets_v2` rows
  with status in `new`/`escalated` (branch-scoped through the existing
  `filterTicketsByBranch` helper), and raises one sonner toast per session using a
  `sessionStorage` guard so it doesn't repeat on navigation.
- Called from `AdminShell` and `OpsShell` next to `useGlobalRealtime()`.
- `src/pages/admin/Alerts.tsx`: banner above the alert lists driven by the same
  hook's data, linking to `/support`.
- Typecheck and build after the changes; verify the toast, banner and switch in
  the preview.
