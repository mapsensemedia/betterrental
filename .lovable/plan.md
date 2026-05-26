
## What's there now

4 rental payments are currently in `status = 'authorized'` (likely the "+5 unreconciled" you're seeing — the dashboard may also count a 5th from a slightly older row):

| Booking | Txn ID | Amount | Authorized at |
|---|---|---|---|
| DE34SXME | 10000418 | $152.86 | 2026-05-26 22:24 UTC |
| LX29TWG7 | 10000416 | $1,517.49 | 2026-05-26 21:56 UTC |
| 6JKVEKHL | 10000413 | $148.37 | 2026-05-26 21:18 UTC |
| 8578V787 | 10000409 | $226.76 | 2026-05-26 17:49 UTC |

All four are real online Bambora auths (numeric IDs, not TERM- terminal receipts), so the reconciler **can** match them.

## What I'll do

Invoke the existing `wl-reconcile-authorized` edge function on demand (the same one pg_cron runs every 6 hours — there isn't a 3-hour schedule today; see note below).

For each authorized payment from the last 60 days, the function will:
1. `GET /v1/payments/{txnId}` from Bambora (read-only).
2. If a **PAC** (pre-auth completion) exists and `total_completions ≥ amount` and `total_refunds = 0` → promote `payments.status` to `completed` and `bookings.wl_auth_status` to `completed`, write an `audit_logs` row tagged `rental_payment_auto_completed`.
3. If still partial / no PAC → leave alone, report as `unchanged`.
4. Any Bambora error → reported in `errors[]`, no DB change.

No charges, no captures, no voids — it's strictly a read-then-promote against what Bambora already shows.

## After the run

I'll report back: `scanned / reconciled / unchanged / errors` totals plus the booking codes that flipped to completed. Finance "Collected Revenue" will reflect them on next refresh.

## Note on the "every 3 hours" expectation

The current cron schedule for this job is **every 6 hours** (not 3). If you want it tightened to every 3 hours, I can re-schedule the `cron.schedule(...)` entry in the same turn — just say the word.

Approve and I'll run it now.
