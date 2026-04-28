## Problem

After removing auto-capture from `wl-pay`, every online booking now records the rental payment as `status = 'authorized'` (Bambora PA — funds held but not captured). The UI treats anything that isn't `'completed'` as **unpaid**, so bookings like **DA2PHVEX** (txn 10000195, confirmed PA in Bambora) show as "Payment Pending / Unpaid" even though the customer's card has been successfully authorized.

We need to clearly distinguish three states on every payment surface:

- **Paid** — at least one `completed` rental payment covers the total (green)
- **Authorized** — rental row is `authorized` but not yet captured (blue / "capture pending")
- **Unpaid** — no rental payment exists (red/amber, current behavior)

No data is wrong in the DB. This is purely a display/derivation fix.

## Files to change

### 1. `src/hooks/use-payment-deposit.ts`
- Add a new computed field `rentalAuthorized: boolean` (true when there is a rental payment with `status === 'authorized'` and no completed rental payment covers the total) and `rentalCapturePending: boolean`.
- Extend `paymentStatus` union to include `'authorized'`. Logic:
  - `'paid'` if `netPaid >= totalDue` (unchanged)
  - `'authorized'` if not paid AND a rental payment row has `status === 'authorized'` (or `wlAuthStatus === 'authorized'`) covering at least the rental amount
  - `'partial'` / `'unpaid'` otherwise (unchanged)
- Add `totalAuthorized: number` summing `authorized` rental payments, for display.

### 2. `src/components/admin/PaymentDepositPanel.tsx`
- Add a third badge state for `paymentStatus === 'authorized'`: blue badge "Authorized — Capture Pending".
- In the summary block, when authorized show a new line: `Authorized (not yet captured): $XX.XX` with explanatory subtext "Funds held on card. Capture from the Operations panel when ready."
- Per-payment row: keep current `status` badge; for `authorized` show as a blue (info) variant rather than the default secondary so it's visually distinct.

### 3. `src/hooks/use-bookings.ts`
- Extend the payments fetch to also include `'authorized'` rental rows. Build a second set `authorizedBookingIds` and expose `hasAuthorizedRental: boolean` alongside `hasPaidPayment` on each `BookingWithDetails`.

### 4. `src/pages/admin/Bookings.tsx` — `PaymentStatusDot`
- Insert a new branch between the "Paid" and "Payment Pending" branches:
  - If `!hasPaid && hasAuthorizedRental` → blue dot, label **"Authorized"** (with tooltip "Card authorized — capture pending").
- Keep all other branches unchanged.

### 5. `src/hooks/use-bookings.ts` types
- Update `BookingWithDetails` interface to include the new `hasAuthorizedRental` field (and any consumer types that destructure it).

## Out of scope

- No changes to `wl-pay`, `wl-authorize`, `wl-capture`, or any edge function.
- No data writes — DA2PHVEX stays in `authorized` state (which is correct since the PA hasn't been captured yet).
- Booking detail page (`src/pages/BookingDetail.tsx`) and Ops `StepPayment.tsx` already handle the authorized state correctly — no changes there.
- Finance/Billing aggregates (Collected Revenue) continue to count only `completed` payments per the core memory rule "Amount Collected is strictly derived from completed payments records" — authorized funds are NOT revenue until captured.

## Verification

After deploying, booking DA2PHVEX should display:
- Admin Bookings list: blue **"Authorized"** dot instead of red "Unpaid"
- Booking detail Payment panel: blue badge "Authorized — Capture Pending" with `$92.96` shown as authorized (not as outstanding balance)
- Ops Payment step: unchanged — already shows the "Capture Now" button
- Finance / Collected Revenue: unchanged — $92.96 is NOT counted until captured
