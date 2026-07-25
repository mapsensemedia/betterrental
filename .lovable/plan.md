Replace all customer-facing support/contact email addresses on the site with `support@c2crental.ca`.

## Files to update

1. **`src/pages/Contact.tsx`**
   - Line 59: `email: "info@c2crental.ca"` → `support@c2crental.ca` (ContactPage JSON-LD)
   - Lines 150–151: `mailto:info@c2crental.com` / display text `info@c2crental.com` → `support@c2crental.ca`

2. **`index.html`**
   - Line 103: LocalBusiness JSON-LD `"email": "team@c2crental.ca"` → `support@c2crental.ca`

3. **`supabase/functions/send-contact-email/index.ts`**
   - Line 151: inbound `to: ["info@c2crental.ca"]` → `["support@c2crental.ca"]` so contact-form submissions land in the new inbox. Redeploy the function.

## Out of scope
- `admin@c2crental.ca` / `langley@c2crental.ca` in seed/migration files and MANUAL_TESTING_GUIDE (internal accounts, not the public support email).
- No changes to the Resend `from:` sender identity, DNS, or domain config — a follow-up is needed only if the `support@` mailbox isn't already receiving mail.
