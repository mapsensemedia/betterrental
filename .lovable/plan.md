# Bambora Auto-Reconciliation for Authorized Rentals

## Problem

After the `wl-pay` rewrite removed forced capture, rental payments returned as `PA` (pre-auth) are written to our DB as `authorized` and never flipped to `completed` unless someone manually captures them. Bambora, however, often settles them on its side (a `PAC` row appears under `adjusted_by`). Result: customer/admin UI shows "Pending" or "Unpaid" while the money is actually in.

We just confirmed and backfilled 4 such bookings (2FTY86HU, MSHXYKWN, AMKS28BT, M8V9LAHX) for April–May. We need this to happen automatically going forward.

Querying Bambora with `GET /v1/payments/{id}` is **read-only** — it never moves money and does not charge the customer or merchant. Safe to run on a schedule.

## What we'll build

### 1. New edge function: `wl-reconcile-authorized`

A scheduled, server-side reconciler that:

1. Selects all `payments` rows where:
   - `payment_type = 'rental'`
   - `status = 'authorized'`
   - `transaction_id IS NOT NULL`
   - `created_at >= now() - interval '60 days'` (rolling window — pre-auths older than ~7 days have either settled or expired anyway, 60d gives safety margin)
2. For each row, call Bambora `GET /v1/payments/{transaction_id}` via the existing `_shared/worldline.ts` client (Basic Auth with passcode — no charge).
3. Parse the response:
   - If `total_completions >= amount` AND `adjusted_by[].type === 'PAC'` → Bambora has captured it.
   - Otherwise leave it alone (still genuinely a pending pre-auth).
4. For each captured row:
   - Update `payments.status = 'completed'`
   - Update parent `bookings.wl_auth_status = 'completed'` (only if currently `authorized`)
   - Insert an `audit_logs` entry with `action = 'rental_payment_auto_completed'`, including the Bambora PAC id and timestamp.
5. Return a JSON summary: `{ scanned, reconciled: [{booking_code, txn_id, amount}], unchanged, errors }`.

### 2. Schedule it

Add a cron entry (every 6 hours is plenty — settlement isn't real-time) using Supabase `pg_cron` + `pg_net`, calling the function with the service-role key. We already use this pattern for `check-rental-alerts` (runs every 15 min per logs).

### 3. Manual trigger from admin (optional, lightweight)

A small "Reconcile Pending Captures" button on the admin Finance/Payments page that POSTs to the same edge function and toasts the result. Useful when staff notice a discrepancy and don't want to wait for the cron.

### 4. Keep the existing display fallback

The hook/UI changes already shipped (treat `authorized` rentals on `active`/`completed` bookings as "Paid") stay in place as a belt-and-braces fallback in case reconciliation runs late.

## Why this is safe

- `GET /payments/{id}` is a query, not a transaction — Bambora confirms this is the standard inquiry endpoint and no fees apply.
- We only flip DB rows when Bambora itself reports `PAC` — we never assume.
- All writes go through an edge function (service role), respecting the existing trigger that blocks client-side financial writes.
- Every change is audit-logged with the Bambora PAC reference for traceability.

## Files to create / change

```text
supabase/functions/wl-reconcile-authorized/index.ts   (new)
supabase/config.toml                                   (register function if needed)
src/pages/admin/...Finance page                        (add manual button — optional)
migration: pg_cron job to call the function every 6h
```

## Out of scope

- No changes to `wl-pay` behavior — pre-auth + later settlement remains the model.
- No automatic captures against Bambora (we don't call `/completions`); we only mirror what Bambora has already done.
- Deposits are unaffected — they have their own webhook/lifecycle.

## Acceptance

- After deploy, run the function once manually; verify it returns `reconciled: []` (everything Apr–May already backfilled).
- Within 6 hours of a future authorized rental being settled by Bambora, our DB shows `completed` and the customer's pass / admin panel shows "Paid".
- Audit log shows one `rental_payment_auto_completed` entry per reconciled row, with Bambora PAC id.
