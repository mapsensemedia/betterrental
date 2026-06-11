## Diagnosis — Daniel Reyes duplicate bookings

Both bookings exist as **separate, real Worldline transactions**. This is not a webhook duplicate or accounting glitch — the customer was actually charged twice.

### Side-by-side facts

| Field | FTUXPFU3 (orphan) | 63H9EEU3 (active) |
|---|---|---|
| Vehicle | same | same |
| Dates | Jun 10 17:00 → Jun 12 17:00 | Jun 10 18:30 → Jun 12 18:30 (time-adjusted by staff) |
| Created | 2026-06-10 01:17:42 | 2026-06-10 01:17:11 (30 sec earlier) |
| Rental charge | $128.78 captured @ 01:17:47 (tx 10000540) | $128.78 captured @ 18:19:12 (tx 10000555) |
| Deposit hold | $350 authorized (tx 10000541) | $350 authorized (tx 10000556) |
| Status today | confirmed, no unit assigned, never picked up | active, unit assigned, checked in |

### What happened (timeline)
1. Customer (or staff) created **two bookings 30 seconds apart** on Jun 10 ~01:17 — likely a double-submit on the checkout button or two browser tabs.
2. The checkout flow paid **FTUXPFU3** immediately ($128.78 rental + $350 deposit auth).
3. The second booking **63H9EEU3** was left unpaid (draft/pending).
4. ~17 hours later, staff opened 63H9EEU3 in the Ops panel, adjusted the start time, assigned a unit, ran check-in, **took a second card payment** ($128.78 + $350 deposit auth), and activated it.
5. FTUXPFU3 was never voided/refunded. Customer is now out **$128.78 cash + $350 still on hold** for a booking they never used.

### Root cause
- `create-booking` has no idempotency / duplicate-window check. The reservation hold mechanism does not prevent the same user from creating a second booking for the same vehicle moments later.
- The Ops payment screen does not warn staff when another booking for the same customer + vehicle + overlapping dates is already paid.

---

## Remediation plan

### Immediate (operational, no code)
1. **Refund FTUXPFU3 rental** — $128.78 via Worldline (manual; automated refund is not wired per existing memory).
2. **Release FTUXPFU3 deposit hold** — void pre-auth tx `10000541` via `wl-void` / deposit release flow in Ops.
3. **Cancel FTUXPFU3** — set status `cancelled` with note "Duplicate of 63H9EEU3 — refunded".
4. Log both actions in `audit_logs` and notify the customer.

### Code changes (prevent recurrence)
1. **`create-booking` / `create-guest-booking` duplicate guard**
   - Before insert, check for an existing booking by the same `user_id` + `vehicle_id` with overlapping `[start_at, end_at]` and status in `(draft, pending, confirmed, active)` created within the last 10 minutes.
   - If found, return `409 DUPLICATE_BOOKING` with the existing `booking_code` so the client can resume that one instead.

2. **Ops Payment duplicate warning (`StepPayment.tsx`)**
   - Before invoking `wl-auth` / `wl-capture`, query for other bookings of the same customer + vehicle with overlapping dates that already have `wl_auth_status='completed'`.
   - If found, show a blocking dialog: "Customer already paid for booking XXXXXX covering these dates. Continue anyway?" requiring explicit confirmation + reason logged to `audit_logs`.

3. **Client-side double-submit lock**
   - In the checkout submit handler, disable the pay button on first click and keep it disabled until the server response (success or error). Also store an in-flight idempotency key in `sessionStorage` keyed by `vehicleId|startAt|endAt` so a refresh/second tab can't fire again.

### Files to touch
- `supabase/functions/create-booking/index.ts`
- `supabase/functions/create-guest-booking/index.ts`
- `src/components/admin/ops/steps/StepPayment.tsx`
- `src/components/checkout/...` (submit handler — to be located during build)

No DB schema changes needed; the guards use existing columns.
