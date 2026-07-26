## What I verified about W9JD9JDV

Stored values (from the database):

- start_at `2026-07-18 03:00Z` (Jul 17, 8:00 PM Vancouver), end_at `2026-07-26 00:00Z` (Jul 25, 5:00 PM)
- total_days `8`, daily_rate `$89.99`, subtotal `$716.52`, tax `$85.99`, total `$802.51`, protection `none`

Reconstructing the server engine (`supabase/functions/_shared/booking-core.ts`) on those exact inputs:

```text
base            89.99 × 8 days              = 719.92
weekend days    Sat 18, Sun 19, Fri 24, Sat 25 = 4
weekend surcharge 89.99 × 4 × 15%           = + 53.99
subtotal after surcharge                    =  773.91
weekly discount (8 days ≥ 7 → 10%)          = - 77.39
vehicle total                               =  696.52
PVRT $1.50 + ACSRCH $1.00 × 8 days          = + 20.00
subtotal                                    =  716.52  ← exactly the stored subtotal
```

**The weekend surcharge WAS applied** — $53.99 of it. The number matches the stored subtotal to the cent, so pricing is not broken.

### How the weekly discount got applied

`getDurationDiscount(days)` (`booking-core.ts:442-446`, mirrored in `src/lib/pricing.ts:323-331`) is purely day-count based: `>= 21` days → 20%, `>= 7` days → 10%. This booking billed 8 days, so 10% applied automatically. It is applied *after* the weekend surcharge, on the combined vehicle amount, so it also discounts 10% of the surcharge itself ($5.40). Net weekend effect: +$48.59. Regulatory fees and tax sit outside the discount.

## Why it looks like the surcharge wasn't applied

The booking row has no columns for weekend surcharge or duration discount. Every display surface (Ops financial breakdown, invoice PDF, customer summary) reverse-engineers the vehicle portion as a single remainder:

- `src/components/admin/ops/FinancialBreakdown.tsx:69-78`
- `src/lib/pdf/invoice-data-builder.ts:154-185`

`remainder = subtotal − known non-vehicle items = 696.52`, base = `719.92`, so `remainder − base = −3.40`. Because that net figure is negative, the code takes the `else if (remainderCents < 0)` branch and prints one line: **"Discount −$3.40"**. The +$53.99 surcharge and the −$77.39 weekly discount cancel into one unlabelled $3.40 line, so the surcharge is invisible on the invoice, the Ops summary, and the PDF.

This affects every booking where a weekend surcharge and a 7/21-day discount both apply — exactly the long weekend-spanning rentals where the surcharge matters most.

## A second, real bug found while tracing this

The two engines count weekend days off different calendars:

- Server (`booking-core.ts:431-433`) slices the **UTC** date out of `start_at` → day set starts **Sat Jul 18**.
- Client (`src/lib/pricing.ts:307-318`, used by checkout, Ops breakdown and invoice builder) uses **local** date parts → day set starts **Fri Jul 17**.

For this booking both paths happen to land on 4 weekend days, but for any evening pickup (5 PM–midnight local) the windows shift by a day and counts can differ, producing surcharge drift between the quote shown and the amount charged, and wrong weekend-day counts on invoice labels.

## Fix plan

**1. Persist the two vehicle adjustments (backend)**
Migration adding to `bookings`: `weekend_surcharge numeric default 0`, `duration_discount numeric default 0` (plus grants, following existing table conventions). Add them to the `block_sensitive_booking_updates` / `block_sensitive_booking_inserts` guarded field lists so only edge functions can write them.

**2. Write them from the server engine**
`computeBookingTotals` already returns `weekendSurcharge`; also return `durationDiscount`. Persist both in `create-booking`, `create-guest-booking`, walk-in creation, and `reprice-booking`.

**3. Itemize instead of netting (display)**
In `FinancialBreakdown.tsx` and `invoice-data-builder.ts`:
- When the stored columns are present, render two explicit lines: `Weekend Surcharge (N days × 15%)` `+$53.99` and `Weekly Discount (10%)` `−$77.39`.
- When absent (all historic bookings, including this one), recompute both from `daily_rate`, `total_days` and `start_at` using the shared helpers, then show any leftover as a rounding/adjustment line only if non-zero. Never collapse a positive surcharge into a "Discount" label again.
- Same treatment in the rental agreement / receipt PDF paths that reuse this builder.

**4. Align the weekend-day calendar**
Make both engines count weekend days on the **America/Vancouver** local calendar derived from the timestamp, with the client importing the same logic so quote and charge cannot diverge.

**5. Tests**
Extend `src/lib/pricing.test.ts` with the W9JD9JDV case (8 days, 4 weekend days, 10% discount → $716.52 subtotal), an evening-pickup case asserting client and server weekend counts agree, and an itemization test asserting surcharge and discount render as separate signed lines.

## Note on this specific booking

No money needs correcting — the customer was charged the surcharge correctly. Once step 3 ships, W9JD9JDV's invoice and Ops summary will show the $53.99 surcharge and $77.39 discount as distinct lines instead of a single "Discount −$3.40".

## Technical details

- Files: `supabase/functions/_shared/booking-core.ts`, `create-booking/index.ts`, `create-guest-booking/index.ts`, `reprice-booking/index.ts`, `src/lib/pricing.ts`, `src/components/admin/ops/FinancialBreakdown.tsx`, `src/lib/pdf/invoice-data-builder.ts`, `src/lib/pricing.test.ts`, one migration.
- No change to any total, tax or deposit amount; steps 1-3 are additive persistence plus presentation. Step 4 is the only behavioural change, shifting weekend-day counting for evening pickups so both engines agree.
