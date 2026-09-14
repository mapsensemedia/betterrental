# Move all customer and admin email onto the verified c2crental.ca domain

## What's wrong today

Every rental progress update — payment received, licence approved or rejected, vehicle assigned, agreement generated, agreement signed, check-in done, vehicle prepared, walkaround done, rental started, return started, rental completed, deposit released, booking cancelled — is sent from `noreply@resend.dev`, a test address. Those emails frequently don't reach customers. Other emails (confirmation, invoice, agreement link, sign-in code, contact form) already use c2crental.ca addresses, but each one hard-codes its own sender, so there is no single place to fix or change them.

## What changes

1. **New Resend key.** Save the key for the account where c2crental.ca is verified, replacing the current one. Every email function reads the same stored key, so nothing else needs editing for this.
2. **One shared sender setting.** Add a single small shared file holding the sending identity, and have every email function use it:
   - Customer emails: `C2C Car Rental <noreply@c2crental.ca>`
   - Admin alerts: `C2C Car Rental <alerts@c2crental.ca>`
   - Contact form: `C2C Car Rental <support@c2crental.ca>` (unchanged)
   - All customer emails get replies routed to `support@c2crental.ca`
3. **Kill the test address.** The rental progress emails switch from `noreply@resend.dev` to the customer sender above. This is the change that makes booking, agreement, invoice and cancellation updates actually arrive.
4. **Admin alerts stay going to `it@cartok.ca`** — unchanged, just sent through the verified domain.
5. **Record failures properly.** Where an email send fails, log the real error text from Resend and write a "failed" row into the notification history, instead of the current silent console-only failures.
6. **Verify with one live test.** After deploying, send a single test email to your own address and confirm delivery in the Resend log. No past emails are resent or backfilled.

## Emails covered after this change

Customer: booking confirmation, guest account setup link, sign-in / booking lookup code, payment confirmation, agreement ready to sign, agreement signed, licence approved / rejected, vehicle assigned, check-in and prep updates, rental started, return started, rental completed, deposit released, return invoice / receipt, booking cancelled, contact-form confirmation.

Admin: new booking, cancellation, licence uploaded, agreement signed, payment received, issue reported, damage reported, late return, overdue, return due soon, rental activated, return completed, contact-form submissions.

## Technical detail

- New `supabase/functions/_shared/email-sender.ts` exporting `EMAIL_FROM_CUSTOMER`, `EMAIL_FROM_ALERTS`, `EMAIL_FROM_SUPPORT`, `EMAIL_REPLY_TO`.
- Update the `from` (and add `reply_to`) in: `send-booking-notification` (the `resend.dev` one), `send-booking-email`, `send-payment-confirmation`, `send-agreement-notification`, `send-account-setup-link`, `send-booking-otp`, `generate-return-receipt`, `notify-admin`, `send-contact-email`.
- `RESEND_API_KEY` replaced via the secure secret form; no key value ever appears in code.
- Failure logging reuses the existing `writeNotificationLog` helper in `_shared/notify-log.ts` with `channel: "email"` and status `failed`.
- Redeploy the nine functions above. No database migration, no front-end change, no change to when emails fire.

## Not in this plan

- No change to which events trigger emails (the deferred SMS/email Phase 2 stages stay as they are).
- No resending or backfilling of past emails.
- Supabase auth emails (password reset, confirmation) are a separate system and are untouched.
