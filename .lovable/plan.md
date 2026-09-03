# Payment capture record on the ops payment screen

## What you asked for, and the one part I can't build

You want a full-page capture taken the moment the card form is complete and the
"Charge $X rental + $Y deposit hold" button is pressed, saved to the booking's financial
panel and activity.

I can build the capture. I cannot include the card number, expiry and CVV in it:

- Those three fields are not part of our page. They are rendered by the payment gateway
  inside its own secure frame, which the browser refuses to expose to our code — any
  capture we take shows those boxes as blank or masked. This is the security boundary that
  keeps us out of full card-data scope; there is no setting to turn it off.
- Storing a full card number in readable form, or storing the CVV at all after a charge, is
  prohibited for every merchant that accepts cards. If it were found in our records, the
  gateway can terminate the merchant account and fines apply per incident. So even if it
  were technically possible, I won't write code that does it.

What legitimately lets you charge the same card later is not the number — it is the saved
card token we already create at charge time. That is what "rental companies keep the card
on file" means in practice, and it already works.

So the capture will show everything except the raw number/expiry/CVV: the cardholder name,
the card brand and last 4 digits, the exact amounts, the booking, the staff member, the
branch, the timestamp, and the gateway reference — which is what an evidence record needs
to hold up in a chargeback dispute.

## What gets built

1. **Automatic capture at charge time.** When staff press the charge button on the ops
   payment screen, the app captures the full payment page as a PNG before the charge is
   sent, and stamps it with booking code, staff name, branch and timestamp. Card
   number/expiry/CVV boxes appear masked, since the browser will not release them.
2. **A "Card on file / payment evidence" record.** Saved alongside the image: cardholder
   name, card brand, last 4, amount charged, deposit hold amount, gateway transaction
   references, staff, branch, timestamp, and whether the charge and hold succeeded.
3. **Visible in two places.**
   - Booking detail → financial panel: a "Payment evidence" block listing each capture with
     its amounts and a thumbnail that opens the full image.
   - Activity history: an entry such as "Payment evidence captured — $364.08 rental +
     $350.00 hold" attributed to the staff member.
4. **Access control.** The image lives in a private store; only signed-in staff whose branch
   matches the booking (and super admins) can open it. Nothing is publicly reachable.
5. **Failed attempts too.** If the card is declined, the capture and record are still saved
   and marked declined, so there is a trail of the attempt.

## Technical notes

- Capture with `html-to-image` on the payment panel container; the gateway's cross-origin
  iframes render as their styled placeholders, so no PAN/CVV can enter the PNG. Capture runs
  in `handlePayAndHold` in `src/components/payments/OpsPaymentAndDeposit.tsx` immediately
  before the first `getToken()` call.
- New private storage bucket `payment-evidence`, path
  `<booking_id>/<timestamp>-<kind>.png`, with `storage.objects` policies restricted to
  active staff via `can_access_location` on the booking's location, plus super admins.
- New table `public.payment_evidence` (booking_id, storage_path, cardholder_name,
  card_brand, card_last4, rental_amount_cents, deposit_amount_cents, wl_transaction_id,
  wl_deposit_transaction_id, outcome, captured_by, captured_at_location_id, created_at) with
  GRANTs and staff-scoped RLS. A DB constraint blocks any column that could hold a full card
  number; only `card_last4` (4 chars) is allowed.
- Upload + insert go through a new edge function `record-payment-evidence`, so the row is
  written server-side alongside an `audit_logs` entry (`payment_evidence_captured`), which is
  what makes it appear in the existing activity history block.
- Financial panel rendering added to `src/components/admin/ops/FinancialBreakdown.tsx`
  (and therefore the booking detail overview) with a signed-URL viewer dialog.
