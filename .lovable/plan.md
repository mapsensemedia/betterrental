## Context

The "Expected Revenue — Action Required" panel on `/admin/finance` (Finance.tsx, lines 805–843) is currently flagging booking **KSF25Z8L** (FIROZ KHONDKER, $335.16).

DB check confirms:
- `status = confirmed` (never activated → never picked up)
- `assigned_unit_id = null`
- `start_at = 2026-05-22 07:00 UTC` (already elapsed)
- `wl_transaction_id = null`, no completed payment rows

So yes — this warning is firing for a booking where the pickup window has elapsed but the customer has not shown up / not been activated. The current copy ("These confirmed bookings have no logged payment… Use Log Terminal Payment") is misleading because there is nothing to log — the rental never started.

The underlying query (lines 368–419) pulls bookings with `status IN ('confirmed','active','completed')` whose `start_at <= now`. That mixes two very different situations:

1. **`confirmed`** past start_at, no unit assigned → customer hasn't picked up (no-show / awaiting pickup)
2. **`active` / `completed`** → vehicle handed over but staff forgot to log the terminal payment

The fix is a UI-only change in `src/pages/admin/Finance.tsx`: split the panel into two sections with appropriate copy.

## Changes

**File:** `src/pages/admin/Finance.tsx` (lines 805–843, plus a small derivation just above the JSX)

1. Derive two arrays from `unrecordedBookings` (we already select `status` in the query — confirm and add it to the returned object on line 409–415 so the UI can read it):
   - `noShowBookings` → `status === 'confirmed'`
   - `unloggedPaymentBookings` → `status === 'active' || status === 'completed'`

2. Replace the single amber card with two cards, each rendered only when its array is non-empty:

   **Card A — Awaiting Pickup / No-Show** (amber, same styling)
   - Title: `Awaiting Pickup — Action Required (N booking[s])`
   - Body: `These bookings were scheduled to be picked up but the customer has not arrived yet. The vehicle was never handed over, so no payment is expected to be logged. Contact the customer to confirm pickup, or cancel/mark as no-show if they will not come.`
   - Action icon links to `/admin/ops/{id}` (unchanged).
   - Total label: `Total Expected (Awaiting Pickup)`

   **Card B — Payment Not Logged** (amber, same styling)
   - Title: `Payment Not Logged — Action Required (N booking[s])`
   - Body: `These active or completed rentals have no logged payment, so the money has not been counted in Collected Revenue. Use "Log Terminal Payment" on each booking to record the transaction.`
   - Same row layout and totals as today.
   - Total label: `Total Unrecorded`

3. Keep both totals using the same `${amount.toLocaleString(...)}` formatting, the same `AlertTriangle` icon, `border-amber-500/30 bg-amber-500/5`, and the same external-link button.

4. The `Unrecorded Revenue` metric tile (line 737) and the `unrecordedTotal` calculation stay as-is — they still represent total expected revenue not yet collected, which is accurate.

No query/business-logic/edge-function changes. No status transitions. No financial recalculation.

## Out of scope

- Automatic no-show detection or status changes (would require backend work and product policy on grace period).
- Cancelling KSF25Z8L itself — the user only asked about the wording.
