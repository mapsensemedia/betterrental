# Customer booking flow — fixes

Scope: the customer-facing side only. The c2ccarrental addresses now redirect to c2crental.ca, so the domain item is dropped.

## 1. Driver's licence photo upload (root cause found)

Customers saw an error every time they tried to upload licence photos. Confirmed cause: the licence/verification records table has no access grants for signed-in users, so the app is refused permission the moment it tries to save the record — even though the file itself uploads and the access rules are otherwise correct. A second problem: the app builds a plain public link for a private file store, so even a saved photo would not display.

Work:
- Grant signed-in customers and the server the access they need on the verification records table.
- Switch photo viewing to time-limited secure links (customer and staff side).
- Bring back the "Front" / "Back" photo upload on the customer's licence page, keeping the licence number field alongside it (number typed + photos uploaded).
- Make it clear on the page that photos are needed before pickup, with plain-language errors on failure (wrong file type, too large, offline).
- Verify end to end with a real signed-in customer before closing.

On "customers never see their own documents": the additional-documents area added for handover is deliberately staff-only, and customers have no upload there — nothing to fix, no customer is blocked by it today. Their real blocker was the licence upload above.

## 2. Protection and Add-ons pages show a fake near-zero price

If the chosen car is lost (refresh, shared link, private browsing), these two pages price the rental at $0/day and still allow Continue, so the customer sees a total like "$2.87" and later hits a price mismatch.

Work: give both pages the same guard the payment page already has — show "Please choose your vehicle again" and send them back to the car list instead of showing a price.

## 3. Deposit hold can fail silently

After the rental amount is charged, a failed $350 hold is only written to a hidden log; the customer still sees success.

Work: when the hold fails, still keep the booking, but tell the customer clearly, offer one retry on the same page, and flag the booking so staff see "deposit not held" before pickup.

## 4. Guests locked out of their own booking

Guests who close the tab before setting a password cannot reach their booking, licence upload or agreement.

Work: add a "Find my booking" lookup by booking code + email that opens the booking's own page with licence upload, agreement and pickup pass, and email that link with the confirmation. Also keep the set-a-password invitation, but no longer make it the only way in.

## 5. Confirmation page

The confirmation page is unreachable and shows "Booking not found" for guests.

Work: make it the landing page again after both card payment and pay-at-pickup, and let it load by booking code so guests see it. Show booking code, car, dates, location, amount paid, deposit status and next steps.

## 6. Rough edges

- Replace the generic "Failed to create booking" on rate limits with "Too many attempts — please wait a few minutes", and loosen the limit so shared offices/mobile networks are not blocked; keep the counter in the database so it is reliable.
- Same friendly message and retry allowance on the text/email code step.
- Real format checks on email and phone before submitting.
- Warn when a shared/bookmarked link mixes an old car with new dates, instead of silently continuing.

## Technical notes

- Migration: `GRANT SELECT, INSERT, UPDATE ON public.verification_requests TO authenticated; GRANT ALL ... TO service_role;` (policies already exist and are correct). Storage policies on `verification-documents` already allow per-user folders.
- `src/hooks/use-verification.ts`: replace `getPublicUrl` with `createSignedUrl`; surface storage/PostgREST errors verbatim in the toast.
- `src/pages/booking/BookingLicense.tsx` + `DriverLicenseUpload.tsx`: restore upload UI, keep number entry.
- `src/pages/Protection.tsx`, `src/pages/AddOns.tsx`: early return guard when `vehicle` is undefined (mirror `NewCheckout.tsx` line ~709).
- `src/pages/NewCheckout.tsx`: deposit branch (~lines 972-1013) sets a `depositFailed` state → visible alert + retry; keep the existing integrity alert.
- Guest lookup: new page plus an edge function that verifies booking code + email and returns a scoped session/token; no direct table access from the client.
- `BookingConfirmed.tsx`: accept `code` param and load through the same lookup function; re-link from checkout success.
- Rate limits: move in-memory counters in `create-guest-booking` and `verify-booking-otp` to a `rate_limits` table with atomic increment.
