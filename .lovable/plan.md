# Fix: booking created under the wrong customer name, and missing confirmations

## What actually happened with RJR3RAYM

Confirmed from the records, not guessed:

- The booking was created at 22:29 while the browser was signed in with the shared Surrey Newton counter login `support@c2crental.ca`. That login signed in two minutes earlier, at 22:27.
- The details saved on that shared login are not the company's — they are a customer's: name "ALVIN SUSANTO", email `alvin274@gmail.com`, phone `7789559946`. So the booking took its renter details from the shared login, which is why it reads as Alvin Susanto.
- The confirmation text for RJR3RAYM was sent to Alvin's number, and the confirmation email was addressed to Alvin's email address. Tanish was never contacted.
- The confirmation email failed anyway: every customer email in the system is currently rejected because `c2crental.ca` is not yet verified for sending. Tanish's two earlier bookings show the same rejection.

So there are three separate problems: a shared staff login carrying a customer's identity, the public checkout happily booking under whichever login is signed in, and customer emails not being deliverable at all.

## What will be done

### 1. Clean up this booking
- Put Tanish's own name, email and phone on booking RJR3RAYM as the renter, so the record is correct, then cancel it as a test booking. No text or email is sent for it.

### 2. Repair the shared counter login
- Restore `support@c2crental.ca` to a company identity: company name, its own email address, and remove the customer's phone number, address and licence details that were written onto it.
- Alvin's own customer record stays untouched; nothing of his history is lost.
- Four other bookings currently sit under this shared login as if it were the renter — they will be listed for you with the real renter details found on each, and left alone unless you ask for changes.

### 3. Stop it happening again
- Booking on the public site while signed in with a company or counter login will no longer silently use that login's details. The checkout asks for the renter's name, email and phone and creates a separate customer record for them, exactly like a guest booking.
- Confirmation text and email for every booking go to the renter's details captured at checkout, never to whatever is stored on the signed-in login.
- Customer-entered details (phone, licence, address, name) can never be written onto a company or counter login again, from the website or from staff screens.
- A one-off check across all accounts flagged seven other accounts whose stored email no longer matches their login email; these are ordinary customer accounts, and the report will be shown to you rather than changed automatically.

### 4. Emails (noted, not fixed in this step)
You chose not to set up the sending domain yet, so customer confirmation emails will keep being rejected. Texts continue to work. When you're ready, the sending domain setup makes confirmation, account-setup and receipt emails start arriving.

## Technical notes

- Data repair via `run_sql`: correct `profiles` row `af216e25-…` (name/email/phone/licence/address), update the renter fields on booking `805b7337-…` (RJR3RAYM) to Tanish, then set its status to cancelled with a void reason. No notification resend or backfill anywhere.
- `create-booking`: when the authenticated caller has a `staff_assignments` row or a `user_roles` row, stop using its `profiles` row as the renter. Require renter name/email/phone in the request, resolve or create a `customers` row for them, attach `customer_id`, and drop the `profiles` phone upsert for these accounts.
- `NewCheckout.tsx`: detect a staff/company session and show the guest-style renter fields instead of assuming the signed-in identity; pass them to `create-booking`.
- Notification contact resolution (`_shared` contact helper used by `send-booking-sms`, `send-booking-email`): prefer booking-level renter/customer contact over the account profile.
- Extend the existing `staff-account-guard` usage to every profile write path, including `use-auth.ts` sign-in upsert and `use-license-upload.ts`, so a staff/company account is never overwritten client-side.
- Read-only report of the seven profile/login email mismatches; no automatic edits.
