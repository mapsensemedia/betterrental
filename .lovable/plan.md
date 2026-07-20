## Problem

Booking SEE8QAKY (Naqib Noor) — return workflow finished, deposit released, but "Close Rental" fails.

## Root cause (verified)

Current DB state:
- `status = active`
- `return_state = closeout_done`
- `account_closed_at = 2026-07-14 18:35:46+00` ← leftover from the original (mistaken) close
- `final_invoices` for this booking: **none**
- No assigned vehicle unit

When the reopen migration reverted status back to `active` and cleared `actual_return_at`, it did **not** clear `account_closed_at` or `account_closed_by`. The `close-account` edge function guards on this field:

```ts
if (booking.account_closed_at && !backfillMode) {
  return 400 "Account already closed"
}
```

So every attempt to close now returns 400 immediately — nothing else is wrong with the return flow or deposit.

## Fix (data-only, one migration)

Clear the stale closure fields on SEE8QAKY so the standard Close Rental button works:

- `account_closed_at → NULL`
- `account_closed_by → NULL`
- `final_invoice_generated → false`
- `final_invoice_id → NULL`

Write an `audit_logs` entry (`action = 'reopen_cleanup_account_close_fields'`) recording the before/after values and referencing the earlier reopen.

Leave `return_state = closeout_done` alone — the user has already walked the return steps and wants to press Close now.

## After the migration

You click **Close Rental** on the booking as normal. `close-account` will then:
1. Build the final invoice (line items + tax + PVRT/ACSRCH).
2. Flip `status → completed`, set fresh `account_closed_at`.
3. Promote any authorized rental payments to completed.
4. Emit the return receipt.

## Preventive follow-up (recommended, separate small change)

Update the reopen path (and document it in `knowledgebase/runbooks/booking-recovery.md`) so any future manual reopen also clears `account_closed_at`, `account_closed_by`, `final_invoice_generated`, and `final_invoice_id`. Otherwise this same trap will re-appear the next time a booking is reopened after a premature close.

## Out of scope

- No edge-function logic changes.
- No UI changes.
- No changes to deposit/payment records (deposit is correctly released; rental payment of $625.30 is already completed and fully covers the $625.30 total).