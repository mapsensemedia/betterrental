# Text the invoice when a rental is completed

Today, when staff finish the return and the deposit step, the system creates the customer's invoice/receipt and emails it. No text is sent. This adds a text message alongside that email, for future completed rentals only.

## What the customer will get

One text, sent at the same moment the invoice is created:

```text
C2C Rental: Invoice ABC12345 for your rental is ready.
Total $1,127.99. Deposit $350.00 released.
Full receipt emailed to you. Questions? Call (604) 763-4242
```

Details included: booking code, total charged, deposit released or withheld (only when there is a deposit), and the branch phone number. When part of the deposit is kept, the text says the amount withheld instead of released. Card numbers and personal details are never included.

## Rules

- Only rentals completed from now on. Nothing past is texted, retried or backfilled.
- One text per rental. If the invoice already exists, no text is sent again.
- Sent to the renter's own mobile number (the customer record on the booking, falling back to their account or pickup contact). If there is no usable mobile, nothing is sent and a "failed" row is recorded with the reason.
- The email keeps working exactly as it does now; the text is additional and a failure of one never blocks the other.
- Both the text and the email are recorded so you can look them up by booking or phone number.

## Technical notes

- Extend `supabase/functions/generate-return-receipt/index.ts`: after the receipt row is created and the email attempt finishes, resolve the renter's contact via `resolveBookingContact` (`_shared/notify-log.ts`), normalise the mobile with `toE164` (`_shared/phone.ts`), and send via Twilio using `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER`.
- Message body built with `BRAND`, `fmtMoney` and `getBookingContactPhone` from `_shared/sms-format.ts` so wording and the branch number match every other message.
- Write one `notification_logs` row per channel through `writeNotificationLog` with `notification_type: "rental_invoice"`, idempotency key `rental_invoice_sms_{bookingId}`; skip the send when a `sent` row with that key already exists. Failures use `failureKey` and store the Twilio error body.
- Wrap the SMS block in its own try/catch so the function still returns success (and the existing `emailSent` flag) if Twilio fails; also return `smsSent` in the response.
- Deploy `generate-return-receipt` after the change. No database migration and no front-end change required; the existing `alreadyExists` short-circuit keeps it single-send.
