# Fix: additional driver fee is never billed and shows up as a discount

## What is actually happening (verified)

Adding an additional driver inserts the driver row (with the correct fee) but the booking's charged subtotal never increases. Because every booking screen derives the vehicle line as "subtotal minus all known line items", the unbilled driver fee turns into a negative adjustment — i.e. a fake discount roughly equal to the driver fee.

Confirmed on live bookings, e.g.:

- UPLYNPBQ — 2 days x $74.99 + Smart coverage + regulatory fees = $230.96; stored subtotal $242.21; driver fee row $31.98 is not inside it.
- CN97G5G3 — driver fee $95.94 recorded, not inside the $887.88 subtotal.
- LWRA3FA5, 4J7EAWQY, E8AG6TQP, KP4EH5JK, TBH29XBT and others show the same pattern.

Root cause is in `supabase/functions/reprice-booking/index.ts` (`operation: "modify"`). After a driver is added, `persist-booking-extras` calls reprice with the same start/end dates. The delta-only math computes the engine price for the old dates (`engineOld`) and the new dates (`serverTotals`) using the *same* extras inputs, so `deltaSubtotal` comes out as exactly $0. In the mid-rental path (`preserveExtrasPrices`) the persisted extras sum is read into `extrasRowsTotal` and then never used at all. Net effect: the driver charge is silently dropped, and the display layer reports the gap as a discount.

## Fix

### 1. Bill the extras change as an explicit delta (server)

`supabase/functions/persist-booking-extras/index.ts` already knows the exact amount it added or removed (including mid-rental pro-rata). Pass that as `extrasDeltaSubtotal` on the reprice call:

- `upsell-driver-add`: `+ newDriverRecord.youngDriverFee` (post pro-rata value, the value actually stored on the row)
- `upsell-driver-remove`: `- removed row young_driver_fee`
- `upsell-add` / `upsell-remove`: `+/-` the persisted add-on line price (same value written to `booking_add_ons.price`)

In `reprice-booking`, `operation: "modify"` adds `extrasDeltaSubtotal` to `deltaSubtotal` before computing `finalSubtotal`, then recomputes PST 7% + GST 5% and the total from it. Agreed/negotiated rates stay untouched — only the extras delta and any duration/rate delta move the money. Remove the now-dead `extrasRowsTotal` block, and validate the incoming delta (finite number, sane bound, subtotal floored at 0).

Also skip the driver-fee "sync to rate x total_days" pass when an extras delta was applied and the row holds a pro-rated fee, so a pro-rated driver is not silently inflated back to the full rental on the next reprice.

### 2. Stop deriving the driver line from rate x total days (display)

`src/components/admin/ops/FinancialBreakdown.tsx` recomputes each driver as `rate x total_days`, which contradicts pro-rated mid-rental drivers and re-creates a phantom adjustment. Use the stored `young_driver_fee` as source of truth (fall back to `rate x total_days` only when the stored value is 0/absent), and label pro-rated lines as such. Apply the same rule in the other surfaces that mirror this math: `src/lib/pdf/invoice-data-builder.ts`, `src/components/booking/AgreementStructuredView.tsx`, `supabase/functions/generate-agreement`, `supabase/functions/generate-return-receipt`.

### 3. Verify

- Add a driver to a confirmed (not yet started) booking: subtotal rises by exactly the driver fee, tax and total follow, no adjustment/discount line appears.
- Add a driver mid-rental: only remaining days are charged, breakdown shows the pro-rated amount, no discount line.
- Remove a driver: subtotal drops by exactly the stored fee.
- Add/remove an add-on: unchanged behaviour, still delta-only.
- Extend a booking that already has a driver: the extension delta stays duration-only; the driver amount is not re-billed.

### 4. Repair the affected existing bookings (needs your go-ahead)

The bookings above were undercharged by the driver amount. Once the fix is in I can produce the exact list (booking code, missing amount, current balance) and, if you want, a migration that corrects subtotal/tax/total and regenerates the agreement and invoice for each. Closed/refunded bookings would be left alone and reported instead.

## Technical notes

- All money math stays integer-cents; taxes recomputed from the corrected subtotal (PST 7% + GST 5%).
- `booking_additional_drivers.young_driver_fee` remains the single source of truth for what a driver was charged.
- Pricing drift detection stays informational only — it never applies a correction.
