# Fix: walk-in booking blocked for existing customers

## What's happening

The email `jyot.toor@yahoo.com` already exists in the system as customer/account **"varinder pal Toor"** (phone +1 778-319-7313), including a login account created Aug 12.

When staff enter that email with any name that isn't an exact match for "varinder pal Toor", the walk-in tool:

1. Shows the "Existing customer found" prompt (correct).
2. Even after choosing "Yes, use this customer", the second step — resolving the login account — only reuses the existing account when the typed name matches exactly. Otherwise it tries to create a *new* account with the same email, which the auth system rejects because the email is already registered.
3. That rejection is reported as the misleading message "Walk-in bookings require a valid customer email…", so the booking never gets created.

## The fix

1. When staff confirm "Yes, use this customer", trust that decision end-to-end: reuse the existing account for that email instead of attempting to create a duplicate. The typed name no longer has to match character-for-character.
2. Add a safety net: if account creation ever fails because the email is already registered, look up the existing account by email and use it rather than aborting the booking.
3. Only create a brand-new account when staff explicitly chose "No, create new customer" and no account exists for that email — in that case the new customer record is still created, and the booking links to the existing login account for that email (one account per email is an auth-system rule).
4. Replace the misleading error text with the actual reason so staff see what really went wrong.
5. Optional convenience: when the typed name differs from the stored one and staff confirm it's the same person, update the stored name on the customer record so future bookings and agreements use the corrected name. (Say the word if you'd rather leave stored names untouched.)

## Technical notes

- File: `supabase/functions/create-walk-in-booking/index.ts`, section 6 ("Resolve or create auth user").
  - Pass a flag through when `useCustomerId` is supplied so profile lookup by email reuses `existingProfile.id` regardless of name match.
  - Wrap `auth.admin.createUser` failure handling: on an "already registered" style error, re-query `profiles`/`auth.users` by email and adopt that id instead of returning 400.
  - Return `createError.message` in the error payload (staff-facing) instead of the generic email copy.
- No schema changes, no client changes required; `WalkInBookingDialog.tsx` already sends `useCustomerId` / `forceNewCustomer`.
- After deploy, re-run the walk-in booking for this email to confirm it completes.
