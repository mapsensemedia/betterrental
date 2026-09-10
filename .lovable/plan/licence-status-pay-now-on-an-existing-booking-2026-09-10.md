# Licence status + "Pay now" on an existing booking

Two customer-facing fixes on the booking page.

## 1. Licence no longer sits "Under Review" forever

Today a licence uploaded online is saved with a pending status, and nothing in the customer or staff flow ever moves it off pending, so the customer sees "Under Review" indefinitely. Staff confirming the licence during handover does not change it either.

Change what the customer sees:

- Badge becomes **Received** (neutral/green tone) instead of "Under Review", with the line "We've got your licence — staff will confirm it at pickup."
- Per-photo tiles show "Received" instead of the pending clock wording.
- A licence rejected by staff still shows **Action needed** with the reason and a re-upload button.
- Once staff mark it approved, it shows **Verified** as it does now.
- The same wording is used wherever the customer sees licence state: the booking page card, the licence step in the booking flow, and the dashboard summary.

Nothing changes for staff: the photos still appear in the handover check-in step and can still be approved or rejected.

## 2. "Changed your mind?" pay-now option for pay-at-pickup bookings

On the booking page, when a booking is still awaiting payment (no completed rental payment recorded) and the booking is not cancelled or completed, the Payment Summary shows a highlighted panel:

- Heading: "Changed your mind?"
- Text: "Pay now to speed things up at pickup and enjoy a hassle-free handover."
- Button: **Pay now** — showing the rental total and the deposit hold amount.

Clicking it opens the secure card form (the same one used at checkout). On submit it charges the rental total, then places the security deposit hold on the same card — matching checkout exactly. Progress states show "Charging rental amount..." then "Placing deposit hold...".

After success the page refreshes: the payment appears in the summary, card-on-file and transaction details appear, the deposit shows as authorized, and the pay-now panel disappears. If the deposit hold fails while the rental payment succeeded, the customer sees a clear notice that the hold will be taken at pickup — the payment is never lost or double-charged. Failures show the real error and the panel stays available to retry.

The panel is hidden once a payment exists, for cancelled/completed bookings, and for bookings already paid at the counter.

## Technical notes

- Customer licence status: `src/components/booking/DriverLicenseUpload.tsx` (badge + tile labels), plus matching wording in `src/pages/booking/BookingLicense.tsx`, `src/pages/BookingDetail.tsx` licence prompt card, and the dashboard licence summary. `verification_requests.status` values stay `pending` / `verified` / `rejected` — presentation only, no schema change, so the existing staff approve/reject flow (`LicenseReviewCard`, `use-verification`) is untouched.
- Progress stepper keeps gating on `verified` for the "verified" step; the customer-visible label for an unreviewed upload becomes "Received".
- Pay-now panel: new component `src/components/booking/PayNowCard.tsx` used from the Payment Summary card in `src/pages/BookingDetail.tsx`. Reuses `WorldlineCheckout` in headless mode with `mode="pay"` for the rental amount, then `getToken()` + `wl-authorize` for the deposit hold — the same two-step sequence as `NewCheckout.tsx`, including the existing integrity check afterwards.
- Amounts come from the booking record (`total_amount`, `deposit_amount`); no repricing, no new totals, no changes to pricing, tax, processing fee, or revenue aggregation. All financial writes stay in the existing `wl-pay` / `wl-authorize` edge functions.
- Eligibility: no `payments` row with status `completed` for the booking, `status` not in `cancelled`/`completed`, and no `offline_payment_method` recorded.
- On success, invalidate `booking-payments`, booking detail, and receipts queries so the page updates without a reload.
- No migrations, no edge function changes, no notification resends.
