## Goal

Let ops mark a booking as "Paid — Bank Transfer" without inserting a Worldline-style `payments` row (so Worldline revenue stays clean), and gate the action behind an OTP sent to the admin phone `+1 (672) 755-3399`.

No new dashboards, no new reports, no new feature surface — only the toggle + OTP.

## How it works

1. On the booking detail (Ops + Admin panel), add a small action next to the existing payment status: **"Mark as Paid (Bank Transfer)"**. Visible only when balance > 0 and booking is not already flagged.
2. Clicking it opens a dialog:
   - Step 1: "Send OTP to admin" → calls edge function `send-bank-transfer-otp` which SMS's a 6-digit code to `+16727553399` via existing Twilio secrets.
   - Step 2: Enter code + optional reference note (e.g. "e-Transfer ref #123") → calls `confirm-bank-transfer-paid`.
3. On successful OTP verify, the edge function:
   - Sets booking flags: `paid_offline = true`, `offline_payment_method = 'bank_transfer'`, `offline_payment_reference = <note>`, `offline_paid_at = now()`, `offline_paid_by = <user_id>`.
   - Promotes booking `status` from `draft`/`pending` → `confirmed` (same rule as Worldline full-pay).
   - Writes an `audit_logs` entry (`action = 'bank_transfer_marked_paid'`).
   - Does **NOT** insert into `payments`.
4. Booking UI shows a green **"Paid — Bank Transfer"** badge, hides "Balance Due" warnings, and the existing "Collect Payment" / Worldline actions are hidden for that booking.
5. Revenue calculations (which derive strictly from `payments`) remain unchanged — these bookings are intentionally excluded from Worldline revenue totals, per requirement.

## Technical details

**DB migration** — add columns to `bookings`:
- `paid_offline boolean not null default false`
- `offline_payment_method text` (only value used now: `'bank_transfer'`)
- `offline_payment_reference text`
- `offline_paid_at timestamptz`
- `offline_paid_by uuid references auth.users(id)`

Update `block_sensitive_booking_updates` trigger to allow these new columns to remain client-blocked (writes only via service_role edge function, matching existing financial-integrity pattern).

**OTP storage** — reuse existing `booking_otps` table with a new `purpose = 'bank_transfer_confirm'` scoped by `booking_id`. 6-digit code, 10-min TTL, max 5 attempts, rate-limited via existing `check_rate_limit` (key: `bank_xfer_otp:<booking_id>`, 3 sends / 10 min).

**Edge functions** (both require `admin` or `staff` role via existing `requireRoleOrThrow`):
- `send-bank-transfer-otp` — generates code, stores in `booking_otps`, sends SMS via Twilio to hardcoded admin number `+16727553399` (message: `"C2C: OTP <code> to mark booking <code> as paid by bank transfer."`).
- `confirm-bank-transfer-paid` — validates OTP, updates booking flags + status, writes audit log.

**Frontend** — new component `MarkBankTransferPaidDialog.tsx` used inside `PaymentDepositPanel` (admin) and `OpsPaymentAndDeposit` (ops). Add "Paid — Bank Transfer" badge in `PaymentDepositPanel` and in the ops booking header when `paid_offline = true`. Hide Worldline collect actions when flag is set.

**Nothing else changes** — reports, revenue dashboards, invoices, agreements all stay as-is. These bookings simply won't appear in Worldline revenue (by design).

## Files touched

- New migration: `bookings` columns
- New edge functions: `supabase/functions/send-bank-transfer-otp/index.ts`, `supabase/functions/confirm-bank-transfer-paid/index.ts`
- New component: `src/components/admin/MarkBankTransferPaidDialog.tsx`
- Edit: `src/components/admin/PaymentDepositPanel.tsx` (badge + button)
- Edit: `src/components/payments/OpsPaymentAndDeposit.tsx` (badge + button, hide Worldline actions when paid_offline)
- Regen: `src/integrations/supabase/types.ts` (auto)

## Confirm before I build

- Admin OTP number: **+1 (672) 755-3399** — correct?
- OTP delivery: **SMS via existing Twilio** (already configured). OK, or do you also want email fallback?
- Who can trigger it: **admin + staff (ops)**, or admin-only?
