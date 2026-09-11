# Fix the booking QR code on a staff phone

## What is happening

Two problems in the page the QR code opens, both found by reading the code.

1. **The page can hang on "loading" forever.** The page waits for an answer to "is this person staff?". When nobody is signed in on that phone (a camera app usually opens the link in its own browser with no session), that answer never arrives as a real value, so the screen stays on a spinner. Nothing appears, so the natural reaction is to scan again — and again.

2. **When staff *are* signed in, the page silently jumps to the booking and replaces itself in history.** Going back lands on the QR page again, which immediately jumps forward again. It feels like the scan is repeating and there is no way back.

## The fix

- Treat "unknown" as "not staff": once the booking is loaded, show the check-in card straight away instead of waiting on the staff check. No more endless spinner.
- Keep the staff shortcut, but make it safe: instead of an automatic silent jump, show the booking summary with a clear **Open in staff panel** button for signed-in staff, so scanning never loops and Back always works. Staff who prefer one tap get it on the first screen.
- For anyone not signed in, keep today's clean customer-safe card plus a **Staff sign in** link that returns to this same booking after signing in.
- Show the loading spinner only while the booking itself is being looked up.

Nothing else changes: no changes to booking creation, pricing, availability, payments, triggers or row security, and no messages are sent.

## Verification

- Scan a pass on a signed-out phone: the check-in card appears with the right branch and times, no endless spinner.
- Scan while signed in as super admin: the card appears with **Open in staff panel**, which opens the correct screen (handover for upcoming, active rental for out-on-rent). Back returns to the card, then out — no loop.
- Scan a made-up code: "Booking not found".

## Technical notes

- `src/pages/CheckIn.tsx` only. `useIsAdmin` is a disabled react-query v5 query when there is no user, so `isLoading` is `false` and `data` is `undefined`; the current `isAdmin === undefined` branch renders a permanent spinner. Gate rendering on the booking fetch only and coerce `isAdmin` to `Boolean(isAdmin)`.
- Remove the auto-`navigate(..., { replace: true })` effect; replace it with a staff action button using the existing status-aware routing (`/admin/active-rentals/:id` when active, `/admin/bookings/:id/ops` for draft/pending/confirmed, otherwise `/admin/bookings/:id`).
- Staff sign-in link carries `?redirect=/check-in?code=...` so sign-in returns to the same pass.
