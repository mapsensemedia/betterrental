## Goal

Log $735.00 cash received today against booking **5SHYDHG5** so Finance counts it in today's Collected Revenue and the booking can be closed. No code or schema changes.

## Existing state

- Booking total: $866.88
- Already logged: $131.88 (terminal, TERM-0010110020, completed)
- Outstanding: $735.00

## Action (data-only)

Insert one `payments` row via the insert tool:

| Field | Value |
|---|---|
| booking_id | `308a88fb-5659-4b18-a79d-6a8a6beb1af5` |
| amount | `735.00` |
| status | `completed` |
| payment_type | `rental` |
| payment_method | `cash` |
| transaction_id | `CASH-5SHYDHG5-20260526` (unique, traceable) |
| paid_at / created_at | `now()` (today, May 26 2026 — falls in this month's Collected Revenue) |
| notes | "Cash payment received as exception — manually logged to close booking" |

The existing `payment_method` enum/text already accepts `cash` in other rows, so no code path changes are needed. Finance's Collected Revenue aggregates completed payments by `paid_at`, so this $735 will appear in today's and this month's totals automatically.

## Not doing

- No Bambora reconciliation (cash, off-gateway).
- No edits to payment-method UI, enums, or code.
- No booking status change — once paid in full you can mark it completed via the normal ops flow, or tell me to flip status in the same turn.

Approve and I'll insert the row.
