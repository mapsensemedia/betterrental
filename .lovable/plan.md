## Goal
Determine whether Bambora/Worldline has any transaction(s) for order number `P455Y39D` that match the $112.55 charge the user says was processed via the Bambora backoffice — and reconcile our DB accordingly.

## What's in our DB for P455Y39D
| Txn ID | Type | Method | Amount | Status |
|---|---|---|---|---|
| 10000362 | rental | card | $477.41 | completed |
| 10000364 | rental | card | $477.41 | completed (duplicate of 362) |
| 10000365 | deposit | card | $350.00 | voided |
| CASH-P455Y39D-20260528 | rental | cash | $112.55 | completed (manual entry I added) |

So we already show $112.55 collected, but as **cash**. If Bambora actually has a $112.55 card charge, the cash row is wrong and should be replaced with the real Worldline txn.

## Plan

### Step 1 — Add a search-by-order edge function
Create `supabase/functions/wl-search-by-order/index.ts` that calls Bambora's Reports API:

- `POST https://api.na.bambora.com/v1/reports`
- Body: `{ name: "Search", start_date, end_date, start_row: 1, end_row: 200, criteria: [{ field: 14, operator: "=", value: orderNumber }] }`
- Field 14 = `trnOrderNumber`
- Uses existing `worldlineRequest()` helper for HTTP Basic auth (Passcode merchant:passcode)

No `supabase/config.toml` change needed (defaults to `verify_jwt = false` like the other `wl-*` functions).

### Step 2 — Call it
Invoke via `supabase--curl_edge_functions` with:
- `orderNumber: "P455Y39D"`
- `startDate: "2026-05-20T00:00:00"` (a few days before our known txns)
- `endDate: "2026-05-31T23:59:59"` (today)

This returns every Bambora transaction (approved or declined, P / R / VP / etc.) tagged with that order number, including any made directly in the Bambora backoffice.

### Step 3 — Reconcile based on what comes back

**Case A — Bambora has an approved $112.55 P txn we don't have in DB:**
- Insert a real `payments` row: `payment_method='card'`, `transaction_id=<bambora id>`, `amount=112.55`, `payment_type='rental'`, `status='completed'`, `created_at=<bambora processed_at>`.
- Delete the placeholder `CASH-P455Y39D-20260528` row.
- Update booking's `wl_transaction_id` / `card_last_four` from the Bambora record.

**Case B — Bambora has nothing new (only 10000362/364/365 echo back):**
- Confirm to the user that no $112.55 charge exists at the gateway. The cash row stays as the source of truth, and we either keep it or remove it depending on what they actually collected.

**Case C — Bambora has a $112.55 charge that was later refunded/voided:**
- Report the txn id + status, leave DB untouched, ask the user how to record it.

### Step 4 — Tell the user the result
Plain summary: txn id, amount, status, processed_at, card last 4. No DB changes without their confirmation if anything is ambiguous.

## Out of scope
- No changes to the Finance UI, no migrations, no refactors.
- Will not auto-refund or auto-void anything at Bambora.
- Will not touch other bookings.
