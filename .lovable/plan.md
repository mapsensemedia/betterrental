# Record a counter-terminal payment for a rental extension

Right now, when a rental is extended and the extra amount is taken on the card
machine at the counter, there is nowhere to record it after the handover is
finished. The terminal-payment form only appears inside the handover wizard, so
extensions on live rentals stay showing as unpaid (for example 4GMS6TLU still
shows $118.48 outstanding even though the total was already updated to $218.66).

## What will be added

A "Record terminal payment" action inside the Payment Status panel — the panel
already shown on the booking details page and on the active rental page — that
appears whenever a booking still has a balance owing, at any stage of the rental.

Staff enter the amount, the receipt / reference number from the card machine, the
last four digits of the card, and optionally the approval code. Several receipt
numbers can be entered if the amount was split across more than one swipe.

Once saved, the payment appears in the payment history, the balance owing drops,
and the activity trail records who entered it.

## Guardrails so nothing else shifts

- The amount can never exceed the balance still owing, and each receipt number
  can only be entered once — a repeat entry is refused.
- The rental's own stage is left untouched. Today, recording a full terminal
  payment can push a booking back to "confirmed"; for a live rental that would be
  a step backwards, so that will only happen for bookings that have not yet been
  picked up.
- No prices, taxes, fees or totals are recalculated. This only records money
  received.
- Deposit holds stay separate — this action never touches the deposit.
- Reporting stays as it is: the payment is recorded the same way as any other
  counter payment, so revenue, finance totals and the invoice balance pick it up
  through the existing logic with no changes to that logic.

## Verification

On 4GMS6TLU, record $118.48 against a card-machine receipt and confirm: the
balance owing goes to zero, the payment shows in the history and the activity
trail, the rental stays "active", and the finance transactions list shows the
$118.48 under the branch on today's date.

## Technical notes

- `supabase/functions/log-terminal-payment/index.ts`: gate the
  `bookingUpdate.status = "confirmed"` write behind
  `["draft","pending"].includes(booking.status)`; leave the remaining-balance
  math, duplicate-receipt check, payment row shape
  (`payment_type: "rental"`, `payment_method: "terminal"`,
  `transaction_id: TERM-<receipt>`), deposit-ledger path and audit log unchanged.
  Add `extension` context to the audit payload only (no schema change).
- `src/components/payments/TerminalPaymentForm.tsx`: reused unchanged; it already
  takes `outstandingBalance` and supports multiple receipt rows.
- `src/components/admin/PaymentDepositPanel.tsx`: add a collapsible/dialog
  section rendering `TerminalPaymentForm` with `bookingId`,
  `outstandingBalance={status.balance}`, `depositOnly={false}` and no
  `includeDeposit` default, shown only when `status.balance > 0 && !paidOffline`;
  invalidate `['payment-deposit-status', bookingId]` plus the booking/active-rental
  query keys on success (same pattern as the existing bank-transfer dialog).
- No migration, no changes to `recompute_invoice_totals`, pricing engines, or any
  revenue aggregation — those already derive from completed `payments` rows.
