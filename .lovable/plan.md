# Why so many transactions show "authorized"

## How statuses work today

- **Deposits**: Bambora **pre-auth (PA)** holds — these are *supposed* to stay `authorized`. They only become `completed` if we explicitly capture (rare; only on damage/charge). The "authorized" pill on the 4 deposit rows in your screenshot (5G5VYNBF, 6RL2U9B3, E43ACW8Z) is correct and should not change to "Paid".
- **Rentals (online card)**: Created as a Bambora **pre-auth**, then captured (PAC) when the booking is confirmed/picked up. Our `payments.status` flips from `authorized` → `completed` at one of three moments:
  1. `wl-capture` runs at booking confirmation / pickup.
  2. The `wl-webhook` receives the PAC notification from Bambora.
  3. The `wl-reconcile-authorized` cron sweeps and finds a matching PAC.
- **Terminal/POS rentals**: Posted directly as `completed` → shows "Paid" (e.g. EGK9798B).

## Current reconciliation interval with Bambora

`pg_cron` job `wl-reconcile-authorized-every-6h` → **every 6 hours, on the hour** (`0 */6 * * *`, UTC). It scans up to 500 `authorized` rental payments from the last 60 days, calls `GET /payments/{id}` on Bambora, and if the response has a PAC adjustment with `total_completions ≥ amount`, it promotes the payment to `completed` and logs an audit entry.

So for an online rental authorised at 6:34 PM, the worst case is up to 6 hours before the dashboard flips it to Paid (unless the webhook or wl-capture fires sooner).

## Why the rental rows in your screenshot are still "authorized"

Three likely causes — we should fix #2 and #3:

1. **They genuinely haven't been captured yet at Bambora.** PAC fires when staff confirms/picks up. If the booking is still pending, the pre-auth is correct.
2. **`wl-capture` succeeded but didn't update our `payments` row.** Need to verify capture call paths write `status = completed` back to `payments`, not just `bookings.wl_auth_status`.
3. **The 6-hour cron window is too long for an admin dashboard.** A 60–90 minute sweep matches what most ops teams expect when they see a booking confirmed but the payment still showing "authorized".

## Proposed changes

### 1. Tighten the cron interval
Move `wl-reconcile-authorized` from every 6h to **every 30 minutes** (`*/30 * * * *`). The job is read-only against Bambora (GET /payments/{id}) and idempotent, so cost/risk is negligible at our volume (<500 candidates). This caps the visible "authorized → paid" lag to ~30 minutes.

### 2. Reconcile on demand from the Refresh button
The "Refresh" button on Payments → Overview currently only invalidates React Query caches. Add an `await fetch(wl-reconcile-authorized)` call before the cache invalidation so a manual click also pulls the latest PAC status from Bambora, then re-renders. Show a toast like "Reconciled N transactions with Bambora."

### 3. Auto-promote on booking confirmation/pickup
Audit `wl-capture` and the confirm/pickup edge functions. If they call Bambora's PAC successfully, also `UPDATE payments SET status='completed'` for the matching `transaction_id` in the same transaction. This removes the dependency on the cron sweep for the happy path.

### 4. UI clarity (small)
On the Recent Transactions table, render a tooltip on the `authorized` pill explaining:
- For **Deposit** rows: "Hold placed — released or captured at return."
- For **Rental** rows: "Pre-authorized — auto-captures on pickup or within 30 min."

This stops the dashboard from looking like 50% of revenue is stuck.

## Out of scope

- Changing deposit `authorized` to "Paid". That would misrepresent a hold as a charge.
- Changing the 60-day candidate window in the reconciler.
- Worldline webhook signature work (separate task if missing PACs are ever observed).

## Technical notes

- Files touched: `supabase/functions/wl-reconcile-authorized/index.ts` (unchanged logic), `supabase/functions/wl-capture/index.ts` (verify+patch payments update), `src/pages/admin/Finance.tsx` (refresh handler + tooltip), and one new migration to alter the existing pg_cron schedule:

```sql
SELECT cron.unschedule('wl-reconcile-authorized-every-6h');
SELECT cron.schedule(
  'wl-reconcile-authorized-every-30m',
  '*/30 * * * *',
  $$SELECT net.http_post(...) -- same body$$
);
```
