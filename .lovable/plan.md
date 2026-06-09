# Walk-In: Send Account Setup Link

Add an opt-in checkbox to the **Walk-In Booking** dialog that, on successful booking creation, emails the customer a link to `/complete-signup` with their booking pre-linked, so they can set a password and access their booking online.

## Why
Walk-in customers today get a `customers` record and a guest `auth.users` entry with a random password they never see. They never receive the standard `/complete-signup` prompt, so they can't log in to view their booking. This change gives staff a one-click way to invite them.

## UX

In `src/components/admin/WalkInBookingDialog.tsx`, just below the Email field, add:

- ☐ **Email customer a link to set up their account** (default: checked when email looks valid)
- Helper text: *"Sends a secure link to set a password and view this booking online."*

After successful submission, if the box is checked, a toast confirms: *"Account setup link sent to john@example.com"*. Failure to send is non-fatal and shown as a warning toast — the booking still succeeds.

## Flow

```text
Staff submits walk-in
   ├── create-walk-in-booking (existing)  -> booking + customer + guest auth user
   └── if sendSetupLink:
         send-account-setup-link (NEW)    -> emails /complete-signup link to customer
```

## New edge function: `send-account-setup-link`

- Auth: requires JWT + `is_admin_or_staff` (same pattern as `create-walk-in-booking`).
- Input: `{ bookingId: string }`.
- Steps:
  1. Load booking → resolve `user_id`, `booking_code`, customer email + name via `profiles` / `customers`.
  2. Reject if email is missing or if the `auth.users` row is **already confirmed** (i.e. customer already has a real account) — return `{ skipped: "already_registered" }`.
  3. Build URL: `${APP_ORIGIN}/complete-signup?bookingId=<id>&bookingCode=<code>&email=<email>`.
     - `APP_ORIGIN` resolved from request `Origin` header, falling back to a hardcoded production URL (`https://www.c2crental.ca`).
  4. Send via Resend (existing `RESEND_API_KEY`), reusing the `from` address pattern from `send-booking-email` (`C2C Rental <onboarding@resend.dev>`).
  5. Log to `notification_logs` (channel `email`, type `account_setup_invite`).
- Returns `{ success: true, sentTo }` or `{ error }`.

## Client wiring

In `WalkInBookingDialog.tsx`:
- New state: `sendSetupLink: boolean` (default `true`).
- New checkbox under the Email input.
- After `submitBooking()` succeeds and `data.booking.id` exists, if `sendSetupLink && formData.email`, fire-and-await `supabase.functions.invoke("send-account-setup-link", { body: { bookingId: data.booking.id } })` before navigating. Show success/warn toast based on result.

## Reuse existing pieces (no changes needed)
- `/complete-signup` page already accepts `bookingId`, `bookingCode`, `email` query params and handles both the "create account" and "already registered → log in" branches.
- `create-walk-in-booking` already creates an unconfirmed auth user tied to the email — so signing up at `/complete-signup` will either match that shell user (after they verify their email) or surface the existing-account path.

## Out of scope
- No SMS variant (email-only for v1).
- No changes to `create-walk-in-booking` itself.
- No changes to `/complete-signup` UI.
- No custom-domain email setup; we keep the current Resend sender used elsewhere in the project.

## Files
- **New:** `supabase/functions/send-account-setup-link/index.ts`
- **Edit:** `src/components/admin/WalkInBookingDialog.tsx` (checkbox + post-submit invoke)
