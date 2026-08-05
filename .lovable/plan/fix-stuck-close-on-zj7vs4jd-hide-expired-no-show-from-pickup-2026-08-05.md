# Fix stuck close on ZJ7VS4JD + hide expired/no-show from Pickups

## 1. Why ZJ7VS4JD can't be closed (confirmed from the database)

The booking is `status = active`, overdue since Aug 2, but it still carries return data from the earlier accidental close:

| Field | Value |
|---|---|
| `return_state` | `closeout_done` |
| `actual_return_at` | 2026-08-02 21:00 |
| `account_closed_at` | 2026-07-25 00:49 |

The return wizard validates every step against `return_state`. Since it already reads `closeout_done`, no transition is legal (`canTransitionTo("closeout_done", ...)` is false), so every step of the return flow rejects with an invalid-transition error and the rental can never be closed again.

When the rental was reopened, only `status` was flipped back to `active` — the return progress fields were left behind.

### Data repair (via edge-function/service-role write, with audit log)
For ZJ7VS4JD only:
- `return_state` → `not_started`
- clear `actual_return_at`, `account_closed_at`, `account_closed_by`
- clear `return_started_at`, `return_intake_*`, `return_evidence_*`, `return_issues_*`, `return_closeout_*`, `return_is_exception`, `return_exception_reason`
- leave the assigned unit on rent and all payment/deposit records untouched
- write an `audit_logs` entry (`action: reopen_return_state_repair`)

After this, the normal return wizard runs from step 1 and the overdue rental closes properly (late fees computed from the real return time).

### Stop it recurring
Reopening a rental must always reset return progress. Change the reopen path so `status → active` also clears the fields above, and add a guard in the return wizard: if a booking is `active` but `return_state` is `closeout_done`/`closed`, treat the state as `not_started` instead of blocking, and show a one-line "stale return state reset" note in the ops timeline.

## 2. Remove Expired / no-show bookings from Pickups

Currently `classifyPickupAttention` returns `expired_no_show` for pending/confirmed bookings whose whole rental window has passed with nothing started, and those still render inside the Pickups tab's "Needs Attention" card.

Changes:
- Pickups tab (`src/pages/admin/Bookings.tsx`): drop the `expired_no_show` group from the Needs Attention card, and exclude those bookings from every pickup list and from the Pickups stat count. Needs Attention keeps only "Handed over — not activated" and "In progress — finish handover"; the card hides itself when both are empty.
- Same exclusion in the Ops pickups panel (`src/pages/ops/OpsPickups.tsx`) and in the sidebar pickup counts.
- These bookings stay fully visible and searchable under the All Bookings tab with their real `pending`/`confirmed` status — nothing is cancelled or hidden from the record.

## Technical notes
- `src/lib/pickup-progress.ts` — keep `expired_no_show` as a classification (used to filter), remove it from the rendered attention groups.
- `src/pages/admin/Bookings.tsx` — filter expired ids out of `cleanPickups`, `allPickups`, `pickupsLate`, `needsAttention`.
- `src/pages/ops/OpsPickups.tsx`, `src/hooks/use-sidebar-counts.ts` — mirror the exclusion.
- `src/hooks/use-return-state.ts` — stale-closeout fallback for `active` bookings.
- Repair runs through a service-role edge function since booking status/return fields are trigger-protected against client writes.
