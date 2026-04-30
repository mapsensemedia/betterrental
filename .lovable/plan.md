## What's actually wrong

Booking **DA2PHVEX** is not a payment failure — the money was successfully charged through Worldline. It's a **display/labelling bug** introduced by the recent payment processing change.

What the database actually shows for DA2PHVEX:

- `bookings.status` = `completed`
- `bookings.wl_transaction_id` = `10000195`, `wl_auth_status` = `authorized`
- `payments` row: rental, $92.96, **status = `authorized`** (not `completed`), txn `10000195`
- Deposit row: $350 voided/released (normal — rental is finished)

So the rental was charged via Worldline as a **pre-auth (PA)**, never explicitly captured, yet the booking still progressed all the way through `active` → `completed`. The customer paid; the system just never wrote `completed` on the payment row.

## Why this happened (root cause)

The recent rewrite of `supabase/functions/wl-pay/index.ts` removed the forced `/completions` call. Now:

- If Worldline returns `type: "P"` (purchase) → payment row written as `completed`.
- If Worldline returns anything else, including `type: "PA"` (pre-auth) → payment row written as `authorized`, with the comment *"Capture for authorized rentals is performed manually from the admin panel via wl-capture."*

In practice, several recent online rentals came back as `PA` and were **never manually captured** before the rental was completed and the deposit released. The funds are held on the customer's card and will auto-settle on Worldline's side (typical 5–7 days), but our DB still says `authorized`.

Then the customer-facing rental view does this:

```
src/pages/booking/BookingPass.tsx:107-111
const completedPayments = payments.filter(p => p.status === "completed");
const rentalPayment = completedPayments.find(p => p.payment_type === "rental");
const paymentStatus = rentalPayment ? "Paid" : "Pending";
```

Because the row is `authorized`, not `completed`, the customer sees **"Pending"** even though the booking is `completed` and money was taken. The admin payment panel has the same issue (it only shows the green "Paid" badge when `paymentStatus === 'paid'`, which requires `completed` rows).

## Fix plan

Two parts: behaviour going forward, and cleanup for already-affected bookings.

### 1. Treat authorized rentals as "paid" in the UI

In `src/hooks/use-payment-deposit.ts` and the customer rental detail views (`BookingPass.tsx`, and any other place that filters strictly on `status === 'completed'`), treat a rental payment row whose status is `authorized` as paid for display purposes once the booking has progressed past `confirmed` (i.e. `active`, `completed`, `cancelled-after-charge`). Show a small "Authorized" hint only on the admin payment panel, not on the customer pass.

Specifically:
- `usePaymentDepositStatus` already computes `paymentStatus = 'authorized'` correctly. Customer-facing screens should map `authorized` + booking past confirmed → display label **"Paid"**.
- `BookingPass.tsx` should switch from filtering only `completed` rows to using the same hook (or matching its logic) so it does not contradict reality.

### 2. Auto-complete authorized rentals when the booking reaches `completed`

When a return is closed out and the booking moves to `completed`, any `authorized` rental payment row for that booking should be flipped to `completed` (and `bookings.wl_auth_status` to `completed`) by the same edge function that performs closeout. This guarantees the DB reflects the real-world settlement and stops the "appears unpaid" issue from recurring.

This is a server-side change (edge function), keeping with the rule that financial writes go through edge functions only.

### 3. One-time backfill for already-affected bookings

Run a single SQL backfill to fix the existing rows where the booking is already `completed` (or `active` past handover) and the rental payment is still `authorized` with a Worldline txn id present. Update those `payments.status` to `completed` and `bookings.wl_auth_status` to `completed`. Log each one to `audit_logs` so it's traceable.

This will immediately resolve DA2PHVEX and any siblings.

### 4. Add a visibility safeguard

Add an admin alert (or extend the existing `check-rental-alerts` cron) to flag any booking that becomes `active` while its rental payment is still `authorized` for more than 24h, so this stops silently propagating.

## Files to touch

- `supabase/functions/wl-pay/index.ts` — no logic change, but make sure it logs the returned `type` clearly (already does).
- New / extended edge function used by return closeout — flip authorized rental payment to completed when booking → `completed`.
- `src/hooks/use-payment-deposit.ts` — minor: ensure `allComplete` is also true when booking status is `completed` and a rental row exists in `authorized` state with a valid `wl_transaction_id`.
- `src/pages/booking/BookingPass.tsx` — replace the `completedPayments` filter with the hook's `paymentStatus`, so the customer sees "Paid".
- Migration / data backfill — one-time SQL to repair existing rows + audit log entries.
- `supabase/functions/check-rental-alerts/index.ts` — add the "authorized > 24h on active booking" alert.

## Out of scope

- No changes to Worldline auth flow itself; pre-auth + later capture remains the model.
- No automatic capture against Worldline — money is already settling on their side; we are aligning DB labelling, not double-charging.
