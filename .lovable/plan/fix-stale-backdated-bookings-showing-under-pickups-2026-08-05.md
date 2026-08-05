# Fix stale/backdated bookings showing under Pickups

## Confirmed state of the 8 backdated pickups

| Booking | Customer | DB evidence | Your note | Outcome |
|---|---|---|---|---|
| 38RZUZY8 | Tarmandeep Singh | handed over Aug 3, 2 payments, txn `TERM-0010690140`, deposit released | paid and active | repair → `active` |
| UJQCJB8C | Samara | agreement + check-in + walkaround done, 2 payments, marked paid offline, txn `10001118` | paid and returned | complete the rental → `completed` |
| 2B4C46YE | Jagdish Shankar | no payments, no agreement, no gateway txn, no verification | nothing on file | cancel |
| KAWF9KV8 | Ratesh Prasad | no payments, no agreement, no gateway txn (2 verification rows only) | nothing on file | cancel |
| 2XX9ZAJ2 | Mandeep Grewal | no payments, no agreement, no gateway txn, no verification | nothing on file | cancel |
| T9WG3Q32 | Mohammed Khan | no payments, no agreement, no gateway txn (2 verification rows only) | nothing on file | cancel |
| 6F3ZLPAL | — | 2 payment rows, deposit authorized, txn `10001111`, no handover | not mentioned | leave — needs staff decision |
| TQ4FGDWF | — | no payments, no agreement | not mentioned | leave — pickup was yesterday |

## Bambora cross-check before cancelling

The gateway search route (`wl-search-by-order`, Bambora Reports API) currently returns **401 Authentication failed** — the Reports API uses a separate passcode from the Payments API passcode we have stored, so it cannot be queried today.

Two ways to satisfy the check, in this order:
1. **Preferred:** add a `WORLDLINE_REPORTS_PASSCODE` secret and have `wl-search-by-order` use it, then run an order-number search for each of the four bookings and only cancel those returning zero transactions. This also permanently fixes gateway reconciliation lookups.
2. **Fallback if no Reports passcode is available:** rely on the local evidence — none of the four has a `wl_transaction_id`, a `payments` row, a `deposit_ledger` entry, or a `webhook_events` row, meaning no charge attempt ever reached Bambora from this system — plus a manual spot-check of the four booking codes in the Bambora member portal before the cancellations run.

No cancellation happens until one of those two checks clears.

## Code changes so this stops recurring

### 1. Derive real pickup progress
New `src/lib/pickup-progress.ts` classifies each pending/confirmed booking from actual records, not status alone:
- `not_started` — no agreement, no check-in record, no walkaround, no payment
- `in_progress` — some of those exist but `handed_over_at` is null
- `handed_over` — `handed_over_at` / `activated_at` set (should never be in Pickups)

Backed by one batched count query over `rental_agreements`, `checkin_records`, `walkaround_inspections`, `payments` for the listed booking ids.

### 2. Pickups stops showing finished or dead bookings
- Admin pickups query gains the `handed_over_at is null` filter the Ops query already has — that alone removes 38RZUZY8-type rows.
- Bookings whose **return date** has already passed and are still `not_started` leave the normal Today/Tomorrow/Upcoming sections.

### 3. One "Needs attention" section instead of a silent Past bucket
Replaces the current `pickupsPast` list on the Pickups tab, grouped by reason with an action per group:
- **Handed over but not activated** → "Mark active" (repairs status via `update-booking-status`).
- **In progress — finish handover** → "Resume pickup wizard".
- **Expired / no-show** (past window, nothing done) → "Mark no-show (cancel)", with payment/agreement/licence status shown inline so staff can see there is nothing to lose.

### 4. Ops panel mirrors it
`OpsPickups` gets the same progress badges and the same grouping; pickup counts in the sidebar stop counting expired no-shows.

## Data cleanup (after the Bambora check clears)
- `38RZUZY8` → `active`
- `UJQCJB8C` → `completed`, with the assigned unit released back to available if it is still `on_rent`
- `2B4C46YE`, `KAWF9KV8`, `2XX9ZAJ2`, `T9WG3Q32` → `cancelled`, note `admin cleanup: no payment, no agreement, no pickup started`
- `6F3ZLPAL`, `TQ4FGDWF` → untouched; they surface under "Needs attention"

Every one of these gets an `audit_logs` entry, and status changes go through `update-booking-status` so monotonic-status rules are respected.

## Technical notes
- `src/hooks/use-bookings.ts` — expose `handedOverAt` / `activatedAt`; add the handed-over filter to the pickups scope.
- `src/hooks/use-handovers.ts` — attach the derived stage.
- `src/pages/admin/Bookings.tsx` — swap `pickupsPast` for the three-way grouping.
- `src/pages/ops/OpsPickups.tsx` — mirror grouping and badges.
- `supabase/functions/wl-search-by-order/index.ts` — use the Reports passcode when present so gateway order lookups work (option 1 above).
