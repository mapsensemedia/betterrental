## Goal

Make sure every online checkout creates **both** a rental payment row (any status) **and** a deposit pre-authorization. Stop blocking the deposit step on rental capture outcomes. Remove all auto-capture / forced-completion logic. Add safety nets so we never hand over a car without a deposit hold again.

---

## Problem recap

For booking `DC487PNL`:
- `wl-pay` got `PA` from Bambora, tried `POST /payments/{id}/completions`, got "no longer be voided… already settled".
- Function returned `{ captured: false, captureError: "..." }`.
- Client `WorldlineCheckout.onSuccess` checks `data.declined` / `data.error`. Capture-failure is neither → it returned success silently in some cases, but the parent `NewCheckout` flow uses the `wl-pay` response shape; combined with the alert noise and the `captureError` payload, real customers ended up navigating away before `wl-authorize` ran.
- Net result: **rental row exists as `authorized`, no deposit hold, customer drove off.**

---

## Files that will change

**Edge functions**
1. `supabase/functions/wl-pay/index.ts` — strip auto-capture & alert; always return success on `approved=true`; record row as `authorized` (PA) or `completed` (P).
2. `supabase/functions/wl-capture/index.ts` — extend to also support **rental** capture (currently only deposit). Branch on `kind: "rental" | "deposit"` (default `deposit` for backward compat).
3. `supabase/functions/_shared/booking-core.ts` — add helper `assertRentalAndDepositOrAlert(bookingId)` used by `wl-authorize` at the end of its flow.
4. `supabase/functions/wl-authorize/index.ts` — **NOT modified per instruction**, but called from a new tiny post-step. To avoid touching it, the safety check is performed by a new edge function instead (see #5).
5. `supabase/functions/check-booking-payment-integrity/index.ts` — **new**. Called by the client after `wl-authorize` (and after ops `OpsPaymentAndDeposit`). Reads `payments` + `deposit_ledger` for the booking; if either is missing, inserts an `admin_alerts` row with `alert_type = 'payment_pending'` and a clear title.

**Frontend**
6. `src/pages/NewCheckout.tsx` — in the `WorldlineCheckout onSuccess` handler:
   - Always proceed to `wl-authorize` regardless of `wl-pay`'s `captured`/`captureError` fields.
   - After both calls, invoke `check-booking-payment-integrity`.
   - Keep the user-facing toast neutral ("Payment received — finalizing booking…") until the integrity check returns.
7. `src/components/payments/OpsPaymentAndDeposit.tsx` — same change: never short-circuit deposit step based on rental status; call integrity check at the end.
8. `src/components/payments/WorldlineCheckout.tsx` — minor: stop treating `captureError`/`captured:false` from `wl-pay` as an error path. (It already doesn't; we'll just remove a dead-code branch and the `data.error` path that fires on capture failures.)
9. `src/components/admin/ops/steps/StepPayment.tsx` — add a **"Capture Rental Now"** button visible when:
   - `paymentStatus.wlAuthStatus === 'authorized'` AND
   - there is a rental `payments` row with `status='authorized'`.
   Calls `wl-capture` with `{ bookingId, kind: 'rental' }`.
10. `src/components/admin/ops/steps/StepHandover.tsx` and `src/features/delivery/pages/Detail.tsx` — wrap the activation/handover-complete action with a **confirmation modal** when either:
    - no rental `payments` row, OR
    - no `deposit_ledger` `hold` AND `wl_deposit_auth_status` not in (`authorized`, `captured`).
    Modal title: "No deposit hold on file" — single red **Activate anyway** button + Cancel. The override is logged to `audit_logs` with `action = 'activation_without_deposit'`.

**No-op (explicitly preserved)**
- `supabase/functions/wl-authorize/index.ts` — untouched.
- `supabase/functions/wl-webhook/index.ts` — untouched (it already records captures when Bambora settles).
- Deposit logic everywhere — untouched (always pre-auth).

---

## New `wl-pay` behavior (exact contract)

```text
Bambora returns approved=1, type=P   → payments.status = 'completed', wl_auth_status = 'completed', booking.status → 'confirmed'.
Bambora returns approved=1, type=PA  → payments.status = 'authorized', wl_auth_status = 'authorized', booking.status → 'confirmed'.
Bambora returns approved=0           → 402, declined:true (unchanged).
Any other error                      → 5xx (unchanged).
```
- Removes: forced `/completions` call, `ALREADY_COMPLETED_CODES` handling, "Rental capture failed" `admin_alerts` insert.
- Always returns `{ success: true, transactionId, amount, authCode, captured: <bool> }`. Client must ignore `captured`.

## New `wl-capture` behavior

- Accepts `{ bookingId, kind?: 'rental' | 'deposit' (default 'deposit'), amount? }`.
- For `kind='rental'`: targets `wl_transaction_id`, on success sets `payments.status='completed'` for that txn and `wl_auth_status='completed'`.
- For `kind='deposit'`: unchanged (current behavior preserved).
- Auth: admin/staff/finance only (already enforced).

## New `check-booking-payment-integrity` edge function

- Auth: any caller with `accessToken` for the booking, OR an authenticated user owning the booking, OR admin/staff.
- Reads:
  - `payments` rows for the booking with `payment_type='rental'`,
  - `deposit_ledger` rows with `action='hold'`,
  - `bookings.wl_deposit_auth_status`.
- If rental row missing OR (no deposit hold ledger AND `wl_deposit_auth_status` not in `authorized|captured`):
  - Insert `admin_alerts`: `alert_type='payment_pending'`, title `Booking missing rental or deposit — needs review (XXXXXX)`, message lists which side is missing.
- Returns `{ ok: boolean, missingRental: bool, missingDeposit: bool }`.
- **Idempotency:** before insert, check for an existing pending alert of same type+booking to avoid duplicates.

## Activation safety modal (UX)

```text
┌─ No deposit hold on file ────────────────┐
│  This booking does not have an authorized │
│  $350 deposit hold. The customer's card   │
│  will not be on file for damages.         │
│                                           │
│  Are you sure you want to activate?       │
│                                           │
│  [Cancel]   [Activate anyway (red)]      │
└───────────────────────────────────────────┘
```

Triggered for both:
- Ops Handover step ("Complete Handover" / "Activate Rental").
- Delivery Driver Detail page final activation.

Override is recorded to `audit_logs` so finance can review.

## Finance page surfacing

`src/pages/admin/Finance.tsx` already lists `admin_alerts`. Verify the new `payment_pending` alerts surface on it; if not, add a small filter so they appear under "Action required" — minor, scoped tweak only.

---

## Out of scope (explicit)

- No retry / no auto-capture anywhere in `wl-pay`.
- No changes to `wl-authorize` or deposit edge functions.
- No backfill of existing bookings (you are handling DC487PNL manually).
- No changes to webhook handling.

---

## What you'll see after this ships

- Every successful online checkout: 1 rental `payments` row + 1 `deposit_ledger` hold + `wl_deposit_*` populated.
- Bookings whose rental landed as PA: visible in ops with `wl_auth_status=authorized` and a **Capture Rental Now** button. Money is taken only when you click it.
- If anything is missing post-checkout, a `payment_pending` alert appears on `/admin/finance` and `/admin/alerts`.
- Ops cannot activate without first clicking through the red confirmation modal when a deposit hold is missing.

Approve and I'll implement exactly this — no extra refactors.