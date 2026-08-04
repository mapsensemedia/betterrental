# Clean up stale bookings in the Ops / Admin Pickups list

## What's actually happening

The Pickups list shows every booking still sitting in `pending` or `confirmed`, regardless of how far the pickup wizard actually got. There are 8 such bookings with a pickup time already in the past, and they fall into four very different situations:

| Booking | Pickup date | Wizard progress | Real situation |
|---|---|---|---|
| T9WG3Q32 | Jun 30 | nothing (no agreement, no check-in, unpaid) | abandoned, rental window over |
| 2XX9ZAJ2 | Jul 6 | nothing | abandoned |
| KAWF9KV8 | Jul 13 | nothing | abandoned |
| 2B4C46YE | Jul 16 | nothing | abandoned |
| 6F3ZLPAL | Aug 2 | nothing, deposit authorized | no-show / not started |
| TQ4FGDWF | Aug 3 | nothing | no-show / not started |
| UJQCJB8C | Aug 3 | agreement signed, check-in done, walkaround done, paid | stuck mid-wizard — never marked handed over |
| 38RZUZY8 | Aug 3 | fully handed over (`handed_over_at` set) but status left at `confirmed` | activation half-failed — should be an active rental |

So the list is mixing genuinely-needs-processing bookings with abandoned ones and with two bookings that were already worked on.

## What gets built

### 1. Pickup progress signal (shared)
A helper that, for each pickup booking, derives a stage from real records instead of status alone:
- `not_started` — no agreement, no check-in, no walkaround
- `in_progress` — some of those exist but `handed_over_at` is null
- `handed_over` — `handed_over_at` (or `activated_at`) is set

### 2. Pickups list no longer shows finished work
- Both pickup queries exclude bookings that already have `handed_over_at` / `activated_at` set (the Ops query already does this; the Admin query does not — that is why 38RZUZY8 appears).
- Anything whose **return date** has already passed and is still `not_started` drops out of the normal Pickups sections.

### 3. New "Needs attention" section on the Pickups tab
Instead of silently hiding problem bookings, they surface in one clearly-labelled section, grouped by reason, each with actions:
- **In progress — finish handover** (e.g. UJQCJB8C): "Resume pickup wizard" button.
- **Stuck — handed over but not activated** (e.g. 38RZUZY8): "Mark active" button that repairs the status via the existing status edge function.
- **No-show / expired** (past pickup, nothing done): "Mark no-show (cancel)" button, plus the rental window shown so staff can judge.

### 4. Same treatment in the Ops panel
`OpsPickups` gets the same progress badge and the same "Needs attention" grouping so Ops and Admin stay identical, and the sidebar/pickup counts stop counting abandoned bookings.

## Data cleanup (one-off, run after the code lands)
- **38RZUZY8** → set `status = 'active'` (it was genuinely handed over on Aug 3; vehicle already assigned). Audit-logged as a status repair.
- **T9WG3Q32, 2XX9ZAJ2, KAWF9KV8, 2B4C46YE** → set `status = 'cancelled'` with a note `auto-cleanup: expired, pickup never started`. No payments were ever taken on these, so nothing financial changes.
- **UJQCJB8C, 6F3ZLPAL, TQ4FGDWF** → left untouched; they show under "Needs attention" for staff to finish or cancel deliberately (money is involved on UJQCJB8C and 6F3ZLPAL).

## Technical notes
- New helper: `src/lib/pickup-progress.ts` (stage derivation + reason labels), fed by a batched lookup of `rental_agreements`, `checkin_records`, `walkaround_inspections` counts per booking id.
- `src/hooks/use-bookings.ts`: expose `handedOverAt` / `activatedAt` on the mapped booking, and add `.is("handed_over_at", null)`-equivalent filtering for the pickups scope.
- `src/hooks/use-handovers.ts`: attach the progress stage; keep the existing status/date filters.
- `src/pages/admin/Bookings.tsx`: replace the current `pickupsPast` bucket with the three-way "Needs attention" grouping.
- `src/pages/ops/OpsPickups.tsx`: mirror the grouping and badges.
- Status repairs go through the existing `update-booking-status` edge function so monotonic-status rules and audit logging are respected; the one-off cleanup runs as data updates with audit entries.
