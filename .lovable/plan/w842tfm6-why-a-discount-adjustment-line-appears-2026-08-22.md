# W842TFM6 — why a "Discount / Adjustment" line appears

## What actually happened (confirmed from the database)

W842TFM6 is a walk-in booking created at 16:35 Vancouver on Aug 21.

Audit trail for the booking:

- `walk_in_booking_created` — subtotal **$200.48**, total_days **2**
- `booking_driver_upsell_add` — additional driver Joy Lupai (20–24), fee **$45.00**
- `pricing_drift` — stored_subtotal **$200.48**, canonical_subtotal **$345.72**, difference **−$145.24**
- `booking_modified` — subtotal **$245.48**, total_days **2 → 3**

The rental runs Aug 21 17:00 → Aug 23 20:00 Vancouver = 51 hours = **3 billable days** under the current hours-based rule. The walk-in dialog priced it as **2 days**: 2 × $84.99 + weekend surcharge for 2 days ($25.50) + PVRT $3.00 + ACSRCH $2.00 = $200.48. Adding the driver ran the server reprice, which set `total_days` to 3 (correct) but, being delta-only, added just the $45 driver fee — leaving the vehicle/weekend/regulatory lines priced for 2 days while the booking now says 3 days.

The breakdown component derives the vehicle line as a remainder (subtotal minus every known line), so:

```text
subtotal                      245.48
− driver 45.00 − PVRT 4.50 − ACSRCH 3.00   = 192.98  (remainder)
vehicle base 3 × 84.99                     = 254.97
remainder − base                           = −61.99  → "Discount / Adjustment"
```

So the "discount" is not a discount: it is the unbilled 3rd day (plus the missing weekend surcharge on it), displayed as a credit. There is no discount stored on the booking (`duration_discount = 0`).

## Root causes to fix

1. **Walk-in dialog counts days by calendar date, not hours.** It uses `endDate − startDate` on the date pickers, ignoring pickup/return times, so any rental over 24h that spans few calendar dates is priced one day short. Everywhere else the system uses `ceil(hours / 24)`.
2. **`create-walk-in-booking` trusts the client.** It writes the client's `subtotal`/`taxAmount`/`totalAmount`/`totalDays` (`subtotal ?? ...`) instead of computing them server-side, so a wrong client quote becomes the charged price.
3. **Delta-only reprice silently leaves the gap.** When a reprice changes `total_days`, the day-driven lines (vehicle base, weekend surcharge, PVRT, ACSRCH) are not brought in line — the drift is only logged.
4. **The breakdown mislabels a negative remainder as a discount.** A shortfall with no stored discount should read as an underbilled/pricing-gap warning, not a green credit.

## Changes

**Walk-in pricing (frontend)**
- `src/components/admin/WalkInBookingDialog.tsx`: build the full pickup/return timestamps first (date + time), then compute `totalDays = max(1, ceil(hours / 24))` and feed that to `calculateBookingPricing`. The summary panel then shows the same day count the booking will store.

**Walk-in pricing (server, authoritative)**
- `supabase/functions/create-walk-in-booking/index.ts`: compute days from `start_at`/`end_at` with the hours-based rule and derive `subtotal`/`tax`/`total` from the shared engine (`computeBookingTotals`), ignoring client-supplied money fields (keep accepting them only for a drift log). This makes a wrong client quote impossible to persist.

**Reprice day-count correction**
- `supabase/functions/reprice-booking/index.ts`: keep delta-only behaviour for extras, but when the recomputed day count differs from the stored `total_days`, include the day-driven correction (vehicle base + weekend surcharge + PVRT + ACSRCH for the added/removed days) in the delta, and record it in the `booking_modified` audit entry. Extras stay delta-priced; no retroactive rate rewrite.

**Breakdown display**
- `src/lib/vehicle-adjustments.ts` (and its edge twin `supabase/functions/_shared/vehicle-adjustments.ts`): when the leftover is negative and no `duration_discount` is stored, label it "Underbilled — not charged" and render it as a warning rather than a green discount, so staff see money missing instead of a phantom credit.

**This booking**
- Recommended: reprice W842TFM6 to the correct 3-day amount — subtotal **$345.72**, tax **$41.49**, total **$387.21** (currently $245.48 / $29.45 / $274.93, i.e. **$112.28** under-charged) and collect the balance at the counter. If you prefer to honour the quoted price instead, tell me and I will leave the money as-is and only align the record so no phantom discount shows.

## Technical notes

- The kilometre/discount rules are untouched; weekly/monthly discounts stay retired.
- All money math stays in integer cents; financial writes remain server-side through edge functions.
- No changes to the customer-facing booking funnel, which already uses the hours-based day count.
