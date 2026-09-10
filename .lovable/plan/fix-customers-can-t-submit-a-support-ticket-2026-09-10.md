# Fix: customers can't submit a support ticket

## What's happening

When a customer submits a ticket from their dashboard, saving fails with "Failed to create ticket".

## Cause (confirmed)

The customer ticket form builds the ticket number itself before saving. It asks the database for the most recent ticket but reads the wrong field, so it always calculates the very first number, `TKT-000001`. That number was used long ago (tickets are already up to `TKT-010021`), and ticket numbers must be unique, so the save is rejected every time.

The database already has its own reliable numbering that runs automatically whenever a ticket arrives without a number. The customer form is the only place that bypasses it.

## The fix

- Stop calculating the ticket number in the customer form; let the database assign it. This makes every customer ticket get the next free number, with no chance of collision.
- Show the real reason in the error message if a save still fails, instead of a generic "Failed to create ticket".
- Add the missing accessible description on the ticket dialog to clear the console warning seen alongside the error.

## Technical notes

- `src/hooks/use-support-v2.ts`, `useCreateCustomerTicketV2`: remove the `existingTickets` lookup and the `ticket_id: ticketNumber` field from the insert. The `set_ticket_id` BEFORE INSERT trigger fires when `ticket_id` is null and allocates a collision-checked value from `support_ticket_seq`, satisfying the NOT NULL column.
- Keep the follow-up inserts (`ticket_messages_v2`, `ticket_audit_log`) as they are; they use the returned ticket UUID.
- `onError`: include `error.message` in the toast.
- `src/pages/BookingDetail.tsx`: add a `DialogDescription` to the create-ticket dialog.

No database migration is needed; no other ticket path is affected.

## Verification

Create a ticket as a customer, confirm it appears with a new `TKT-` number, that an alert is raised for staff, and that the console shows no 409 error.
