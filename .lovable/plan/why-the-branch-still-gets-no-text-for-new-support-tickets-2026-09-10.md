# Why the branch still gets no text for new support tickets

Two test tickets were raised this evening on booking DTHERBBK (Abbotsford):
TKT-010023 at 20:23 and TKT-010024 at 20:24 — both after the last fix.

What the records show:

- No branch text record exists for either ticket. The notification history has
  no row of any kind for them, not even a failed one.
- Every failure path inside the branch-alert service writes a failed row before
  it stops (ticket not found, no recipient, bad number, texting service down).
  So the absence of any row means the service was never actually reached — it
  did not run and stop, it never started.
- The branch phone numbers themselves are fine: the same booking got a branch
  booking text at 20:07, and Abbotsford is configured as +1 604-306-1029.

Why it is never reached: the branch alert is triggered from the customer's
browser right after the ticket is saved. That call is fragile in two ways —
the branch-alert service is not on the list of services allowed to be called
from a signed-in browser session, and a customer on the live site can still be
running an older copy of the page, in which case nothing is triggered at all.

Booking texts work because they are triggered from the server, not the browser.

## The fix: trigger the branch text on the server

1. Make the branch alert fire from the database the moment a ticket row is
   created, exactly like booking texts do. This works no matter which screen or
   which copy of the site the customer is using, and covers staff-created and
   damage/incident tickets too.
2. Allow the branch-alert service to be called with a signed-in customer
   session as well, so the existing browser call is no longer silently refused.
3. Keep the alert once-per-ticket-per-recipient, so no duplicate text if both
   paths fire.
4. If a ticket has no booking attached, route it to the branch of the customer's
   most relevant booking if one exists; otherwise log it as skipped instead of
   disappearing.

Nothing historical is resent. TKT-010022, 10023 and 10024 stay untexted; only
tickets created after this change trigger a text.

## Verification after the change

Raise one new test ticket on an Abbotsford booking and one on a Surrey Newton
booking, then confirm a "branch new ticket" record shows as sent for each, with
renter name, phone, booking code and the issue in the message.

## Technical notes

- New migration: `AFTER INSERT` trigger on `public.support_tickets_v2` calling
  `notify-branch-sms` through `pg_net` (`net.http_post`, fire-and-forget),
  with the service-role key read from Vault rather than hardcoded; `pg_net` and
  `supabase_vault` are already installed.
- `supabase/config.toml`: add `[functions.notify-branch-sms] verify_jwt = false`
  (it has no entry today, so it defaults to requiring a verified JWT and browser
  calls are rejected before the handler runs — which is why no log row exists).
- `supabase/functions/notify-branch-sms/index.ts`: keep the existing
  `branch_sms_ticket_<id>_<phone>` idempotency key so the trigger and the
  browser call cannot both send; add a skipped/failed log row when a ticket has
  no resolvable booking.
- `src/hooks/use-support-v2.ts`: keep the invoke as a backstop; it becomes
  harmless once idempotency covers both paths.
- Redeploy `notify-branch-sms` after the config change.
