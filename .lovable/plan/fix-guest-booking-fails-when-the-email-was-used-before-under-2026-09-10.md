# Fix: guest booking fails when the email was used before under a different name

## What happened

Your test booking failed with "Booking failed" / "Validation error". The empty availability was not the cause — the logs show the booking was accepted as an overbooking and then broke one step later.

Confirmed from the function logs for this attempt:

1. The email you used already exists in the system, saved under the name "test booking".
2. You typed a different name ("TESTING FOR WEBSITE ISSUES Testing by Hilal"), so the system decided this is a different person and tried to create a brand-new login for the same email.
3. Creating a login with an email that already exists is refused ("A user with this email address has already been registered"), so the whole booking was abandoned and the customer saw a generic failure.

Any real customer who books once, then books again with their name typed differently (nickname, middle name, extra spaces, company name) hits the same dead end.

## The fix

1. When the name does not match but the email already exists, reuse the existing login for the booking instead of trying to create a second one. Nothing is duplicated on the account side.
2. Keep the separate customer record for the differently-named person, as the system does today, so real-world identity stays distinct and staff can see both names.
3. Handle the "email already registered" refusal gracefully as a safety net: look the existing account up by email and continue the booking rather than failing.
4. Replace the generic failure with a clear message, and log the real reason so a failure like this is visible instead of showing up as "Validation error".

No change to pricing, availability, overbooking behaviour, or anything already-booked. No messages are sent as part of this fix.

## Technical detail

- File: `supabase/functions/create-guest-booking/index.ts`, the guest-user block around lines 210–260.
- Name-mismatch branch: instead of falling through to `auth.admin.createUser`, set `userId` to the existing profile's id (still logging the mismatch) and let the `customers` resolution below create the distinct customer row.
- Wrap `createUser`: on `code === "email_exists"`, resolve the auth user via `profiles` by email (fallback `auth.admin.listUsers` filtered by email), assign `userId`, and continue; only return an error if no user can be resolved.
- Return `409`/`400` with an actionable `message` instead of the bare `{ error: "Failed to process booking" }` 500, and log `createError.code` + message.
- Apply the same guard in `create-booking`/`booking-core` only if the same `createUser` pattern exists there; verify before editing.
- Redeploy the function and confirm the build is clean.
