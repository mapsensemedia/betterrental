## What I found for booking G3PH8276 (Mission, BC)

The delivery fee **was** applied and charged — it is just invisible on the agreement, which makes it look like it was never added.

Verified from live data:
- The booking row has `delivery_fee = 49`, `pickup_address = "Stave Lake Road, Mission, BC"`.
- Its `subtotal` is $1,309.71. The itemized lines on the agreement (rental $1,274.83, weekend surcharge +$78.74, weekly discount −$135.36, PVRT $25.50, ACSRCH $17.00) add up to $1,260.71. The missing $49 is exactly the delivery fee — it is inside the taxed subtotal and the $1,466.88 total.
- $49 is the correct fee under the existing rules (free ≤10 km, $49 for 10–50 km); Abbotsford Centre → Mission is well past 10 km.

So the real defects are:

1. **The rental agreement never itemizes delivery.** `generate-agreement` computes `deliveryFeeAmt` only to derive the weekend/discount adjustment, but never writes a delivery line into the agreement text and never stores `deliveryFee` in `terms_json.financial`. The agreement PDF therefore also cannot print it, and the subtotal does not reconcile with the lines above it. The same is true for the different-drop-off fee.
2. **The fee is client-supplied and never re-derived server-side.** `create-booking` / `create-guest-booking` store whatever `deliveryFee` the browser sends. Checkout zeroes the fee whenever `deliveryMode` is not `"delivery"` in restored state, while the delivery address is still submitted — so a state/refresh edge case can produce a delivery booking with a $0 fee and no error anywhere.

The invoice builder and the admin/ops financial breakdown already itemize "Delivery Fee" correctly, so those need no change.

## The fix

**1. Make the delivery fee server-authoritative (silent, no customer-facing errors)**

In the shared booking core used by `create-booking` and `create-guest-booking`:
- When a booking carries a delivery address with coordinates, compute the straight-line distance between the pickup branch (`locations.lat/lng`) and the delivery point (`pickup_lat/lng`), and resolve the tier fee with the existing `DELIVERY_TIERS` rules (free ≤10 km, $49 up to 50 km).
- Use the higher of the client-supplied fee and the server-derived fee. Straight-line distance is always ≤ real driving distance, so this can only correct an under-charge and never inflates a legitimately quoted fee.
- Never surface a message to the customer; the corrected fee simply flows into the totals, the booking record, and the payment amount.
- Repricing paths (`reprice-booking`, `persist-booking-extras`) already read `delivery_fee` from the booking row, so the corrected value automatically propagates to later recalculations.

**2. Itemize delivery (and drop-off) on the rental agreement**

In `generate-agreement`:
- Add `Delivery Fee: $X` and `Different Drop-off Fee: $X` lines to the agreement text, shown only when greater than zero.
- Add `deliveryFee` and `differentDropoffFee` to `terms_json.financial` so the structured record is complete.

In the agreement PDF renderer:
- Print those two rows in the financial section between add-ons and the regulatory fees, only when non-zero, so the printed subtotal reconciles line by line.

**3. Repair the existing agreement for G3PH8276**

Regenerate the agreement for this booking so its text and `terms_json` include the $49 delivery line. No money changes — the customer was already charged correctly, and the totals, taxes, payment and deposit stay exactly as they are.

## Explicitly unchanged

Rental rates, weekend surcharge, duration discounts, taxes, deposit logic, protection, add-ons, availability, and all UI outside the agreement output stay as they are. No new customer-facing error or warning messaging is introduced.

## Technical notes

- Files touched: `supabase/functions/_shared/booking-core.ts` (delivery fee derivation), `supabase/functions/create-booking/index.ts` and `create-guest-booking/index.ts` (pass delivery coordinates/branch into the derivation), `supabase/functions/generate-agreement/index.ts` (text + `terms_json`), `src/lib/pdf/rental-agreement-pdf.ts` (two conditional rows).
- The distance helper mirrors `DELIVERY_TIERS` / `calculateDeliveryFee` from `src/lib/rental-rules.ts`; edge functions cannot import from `src/`, so the tier table is duplicated in a shared edge helper with a comment tying it to the source of truth.
- No schema migration is needed; `bookings.delivery_fee`, `pickup_lat`, `pickup_lng` and `locations.lat/lng` all already exist and are populated.
