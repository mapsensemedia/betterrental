# Fix: Manual agreement-signing & manual payment-capture in Ops

## What's actually wrong with booking 8CWFZQ6A

I traced the booking and the wl-capture logs.

- Rental pre-auth `10000532` for $111.42 → status `authorized` (PA succeeded).
- Deposit pre-auth `10000533` for $350 → status `authorized`.
- When you clicked **Capture Rental Now**, the edge function `wl-capture` called Bambora `/payments/10000532/completions` and Bambora returned:
  ```
  code: 319, category: 2, message: "CALL HELP DESK"
  ```
  That's a gateway-side decline of the completion (typically: auth expired, settlement window passed, or merchant flagged). The funds are still held on the card but Worldline won't let us settle them through the API right now.
- The booking is stuck because:
  1. `wl_auth_status` stays `authorized`, so the UI keeps showing **Capture Rental Now** and never marks the rental "paid".
  2. There is no manual override — staff can't tell the system "we settled this another way / it'll be settled out-of-band, mark it done so the rental can go active".
  3. The agreement step has no "mark signed in person" button either (the `useMarkSignedManually` mutation exists in `src/hooks/use-rental-agreement.ts` but is never wired into the ops UI).

## Plan

Two small, independent ops-panel features + one safe escape hatch in the capture edge function.

### 1. Wire "Mark Agreement Signed in Person" into the ops Agreement step
File: `src/components/admin/RentalAgreementPanel.tsx` (and/or `src/components/admin/ops/steps/StepAgreement.tsx`).

- When the agreement is generated but not yet signed digitally, show a secondary button **"Mark Signed in Person"** next to the existing "Send signing link" controls.
- On click → confirm dialog → call existing `useMarkSignedManually(bookingId)` (already implemented; writes `signed_manually=true`, `signed_manually_at`, `signed_manually_by`, `status='signed'`, audit log).
- Invalidate `rental-agreement` and `bookings` queries so `completion.agreementSigned` flips and the ops wizard advances.

No DB / edge-function changes needed for this part — the columns and the mutation already exist.

### 2. Add "Mark Payment Captured (Manual)" in the ops Payment step
File: `src/components/admin/ops/steps/StepPayment.tsx`, plus a small extension to `supabase/functions/wl-capture/index.ts`.

UI:
- In the **Rental** section, when `wlAuthStatus === "authorized"` and the in-API capture is failing, show a small **"Mark captured manually"** link/button under the existing "Capture Rental Now" button (kept primary).
- Clicking opens a confirm dialog explaining: "This bypasses the gateway settlement and marks the rental as paid. Use only when Worldline returned an error (e.g. 'CALL HELP DESK') and the charge will be settled out-of-band." Requires a short free-text **reason** and is admin-only.

Edge function change — extend `wl-capture` with a `manualOverride: true` branch (admin role only):
- Skip the Bambora `/completions` call.
- Update `bookings.wl_auth_status = 'completed'`.
- Update the matching `payments` row (`transaction_id = wl_transaction_id`) to `status = 'completed'`, set `payment_method = 'card_manual_capture'`.
- Insert an `audit_logs` entry `action: 'rental_capture_manual_override'` with the staff user id and reason.
- Return the same shape as the normal rental capture success.

Then the existing client logic in `usePaymentDepositStatus` already promotes the booking to "paid" once the rental payment row is `completed` covering the total, which lets the ops wizard's payment step show **Complete** and lets handover proceed → booking goes `active` via the existing activation flow.

### 3. Make the manual-capture path role-gated and auditable
- In `wl-capture`, require `requireRoleOrThrow(userId, ["admin"])` specifically when `manualOverride === true` (not just `admin/staff/finance` like the normal capture).
- Always write the audit log (action, booking id, reason, user, gateway error that triggered the override if the client passes one).

### 4. Surface the gateway error context
In `StepPayment.tsx`, when the last attempted Worldline capture call fails, keep the error toast (already done) and additionally remember the last error message in component state so the "Mark captured manually" dialog can pre-fill the reason field with `Worldline capture failed: <error>` for the audit log.

## Technical notes

- Files touched:
  - `src/components/admin/ops/steps/StepPayment.tsx` — add "Mark captured manually" button + confirm dialog + invoke `wl-capture` with `{ bookingId, kind: 'rental', manualOverride: true, reason }`.
  - `src/components/admin/RentalAgreementPanel.tsx` (or `StepAgreement.tsx`) — add "Mark Signed in Person" button calling existing `useMarkSignedManually`.
  - `supabase/functions/wl-capture/index.ts` — add `manualOverride` branch for `kind: 'rental'` (and optionally `kind: 'deposit'` for consistency, but only `rental` is required to unblock the user).
- No DB migration needed: `payments.status='completed'`, `bookings.wl_auth_status='completed'`, and `rental_agreements.signed_manually*` columns already exist. The seatbelt trigger `block_sensitive_booking_updates` allows the edge function to update via service role.
- Booking 8CWFZQ6A specifically: after deploy, staff clicks **Mark captured manually** with reason "Bambora 319 CALL HELP DESK — settled via merchant portal" → rental payment row flips to `completed`, ops can proceed to handover and activate the booking. The deposit hold (still `authorized` on `10000533`) is unaffected and can be captured/released as normal at return.

## Out of scope

- Investigating the Worldline 319 root cause on the merchant account (separate ops/finance task — likely auth window expired or merchant flag).
- Changing the existing auto-capture flow for normal happy-path bookings.
