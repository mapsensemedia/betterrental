# Fix extension/shortening repricing on discounted long-term rentals

## What is actually happening

Both bookings are long-term rentals whose stored price was **lower than today's standard rate card** (a negotiated / legacy long-term price).

When staff change the return date, the system does not add one day of charge. Instead it **throws away the stored price and rebuilds the whole booking from the current rate card**. The customer therefore silently gets re-priced for the entire rental, and the "extension charge" absorbs that difference.

Confirmed from the audit log:

**L2J4F7JK — Jamol Garrett Archer**
```text
stored 46-day subtotal (agreed)     2,427.80
engine 46-day subtotal (rate card)  3,006.00   <- 578.20 higher
engine 47-day subtotal              3,067.50
booking was rewritten to            3,067.50  -> total 3,435.61
customer saw an extra-day charge of ~ $716
correct extra day = 59.00 rate + 2.50 daily fees = 61.50 + 12% = $68.88
```

**ZKFF584Q — Jaskirat Singh**
```text
stored 21-day subtotal (agreed)       928.62  -> total 1,040.05
engine 22-day subtotal             1,199.15  -> total 1,343.05  (the +$303 jump)
engine 21-day subtotal             1,147.65
correct extra day = 49.00 + 2.50 = 51.50 + 12% = $57.68
```

So the $716 and the $303 are not day charges — they are the gap between the agreed long-term price and the current rate card, applied all at once.

This is the same class of bug already fixed for **upgrades** (upgrades are now delta-only). The `modify` operation was never converted.

## The fix

Change the `modify` operation to be **delta-only**, exactly like upgrades:

1. Run the pricing engine twice — once for the current dates, once for the new dates.
2. Take only the difference (`engineNew − engineOld`).
3. Apply that difference to the **stored** subtotal, then recompute tax and total.
4. If the stored price differs from the rate card, report that as a **pricing drift notice** in the response (informational) instead of silently absorbing it.
5. Explicit `newDailyRate` overrides keep their current behaviour: a deliberate rate change is still allowed to reset the vehicle line.

Result for the two bookings under the new logic:
```text
L2J4F7JK  2,427.80 + 61.50 = 2,489.30  tax 298.72  total 2,788.02
ZKFF584Q    928.62 + 51.50 =   980.12  tax 117.61  total 1,097.73
```

## Data repair (approved)

- **L2J4F7JK**: set 47 days, subtotal 2,489.30, tax 298.72, total 2,788.02. Outstanding balance $68.88 — not yet charged; staff will take it on the terminal and log it through the existing terminal-payment flow.
- **ZKFF584Q**: set 22 days (end Aug 7), subtotal 980.12, tax 117.61, total 1,097.73. Extra day $57.68 still to be collected on the terminal.
- Both repairs recorded in `audit_logs` as a manual correction with the old and new figures.
- No payment rows are invented — the terminal charges get logged when they are actually taken.

## Extension charge visibility

The extension dialog will show the delta it is about to add ("1 extra day — $61.50 + tax = $68.88") so staff can see the amount before confirming, and a warning line if the booking's stored price is below the current rate card.

## Regenerate the extended rental agreement

After a date change is applied, the rental agreement must be reissued so the signed document matches the new return date and corrected totals:

- Regenerate the agreement for **L2J4F7JK** (new return Aug 7) and **ZKFF584Q** (new return Aug 8 local) as part of the data repair.
- Going forward, a successful `modify` that extends the return date triggers agreement regeneration automatically, using the corrected delta-based totals and carrying over the original Km Out from the pickup inspection.
- The new agreement version is issued for customer signature and the previous version is retained for the record.



## Technical detail

- `supabase/functions/reprice-booking/index.ts` — `operation === "modify"`: compute `computeBookingTotals()` for both the old and the new date range, derive `deltaSubtotal`, apply to `booking.subtotal`; recompute PST 7% / GST 5% on the new subtotal. Keep the existing `preserveExtrasPrices` extras-sync behaviour and the additional-driver fee re-sync. Continue writing `weekend_surcharge` / `duration_discount` / `different_dropoff_fee` from the engine, but as deltas against the stored values so the itemisation stays consistent. Return `pricingDrift` in the response payload.
- `src/hooks/use-booking-modification.ts` — surface the returned delta and drift in the success toast; `previewModification()` switches to delta-based preview against the stored total instead of a full recompute.
- `src/components/admin/ops/` extension dialog — render the delta line and the drift warning.
- Agreement reissue: call the existing agreement generation path (`rental_agreements` + `src/lib/pdf/rental-agreement-pdf.ts`) after an extension, so `terms_json` reflects the new `end_at`, `total_days` and corrected financial lines.
- Data repair via two `UPDATE` statements plus audit-log inserts, followed by an agreement regeneration for each booking.

