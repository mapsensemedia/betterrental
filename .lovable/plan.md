# Fix the phantom "Discount / Adjustment" on TBH29XBT + remove weekly/monthly discounts

## What I found on TBH29XBT (verified against the database)

The booking has **no discount at all**. `duration_discount` is `0`, and the stored subtotal of **$548.33** reconciles exactly to:

```text
Vehicle            4 days x $74.98        = $299.92
Weekend surcharge  (2 weekend days x 15%) =  $22.49
Smart Protection   4 days x $37.99        = $151.96
Additional driver  4 days x $15.99        =  $63.96
PVRT + ACSRCH      4 days x ($1.50+$1.00) =  $10.00
Subtotal                                    $548.33
```

The `-$15.99` line is a **display artifact**, not a real discount, and the customer has not been under-charged.

Why it appears: the booking was first created for 5 days, an additional driver was added (fee stored as `$79.95` = 5 x $15.99), then the rental was shortened to 4 days. Repricing recalculated the subtotal using the correct 4-day driver fee ($63.96), but it never updated the stored driver row, which still says $79.95. The breakdown panel adds up the stored driver fee ($79.95), finds it $15.99 larger than what the subtotal accounts for, and labels the leftover "Discount / Adjustment −$15.99".

So there is nothing extra to charge on TBH29XBT — the fix is to correct the stale driver fee so the breakdown, agreement, and invoice all show the true itemization.

## Part 1 — Repair TBH29XBT

- Correct the stored additional-driver fee from $79.95 to $63.96 (4 days x $15.99).
- Totals stay unchanged: subtotal $548.33, tax $65.80, total $614.13. The phantom discount line disappears and every line reconciles to the cent.
- No payments exist on this booking yet, so nothing needs to be refunded or re-authorized; staff collects $614.13 as normal.

## Part 2 — Stop the stale-fee bug from recurring

- In `reprice-booking`, whenever the engine recomputes duration (`modify`, `update_time_only` with a day change, protection change, upgrade), also rewrite each `booking_additional_drivers.young_driver_fee` to `rate x new total_days`, using the same rates the engine used, so DB rows always match the subtotal.
- In the breakdown component (`FinancialBreakdown.tsx`), derive the driver line from `rate x total_days` and only fall back to the stored fee when it matches — so a stale row can never masquerade as a discount.
- Same guard in the agreement / invoice builders that read the stored driver fee.

## Part 3 — Remove weekly and monthly discounts (new bookings onward)

Existing bookings are left untouched; only bookings created or repriced from now on are affected.

- Server engine `supabase/functions/_shared/booking-core.ts`: `getDurationDiscount()` returns 0 for all durations; `durationDiscount` always 0 in the result and in `duration_discount` writes.
- Client preview `src/lib/pricing.ts`: same — `getDurationDiscount()` returns `{ rate: 0, type: "none" }` so the online funnel, walk-in dialog, and checkout previews match the server exactly (no $0.50 mismatch risk).
- Itemization helpers `src/lib/vehicle-adjustments.ts` and `supabase/functions/_shared/vehicle-adjustments.ts`: keep rendering a discount line only when a historic booking has a stored `duration_discount > 0`, so past agreements still print correctly.
- Remove the "Weekly/Monthly discount" UI rows from the checkout, booking summary, and walk-in panels for new quotes (they simply won't render at $0, but the copy that advertises the discount is dropped).
- Update `knowledgebase/04-pricing-engine.md` and the pricing diagram to record that duration discounts are retired.

## Technical notes

- Constants `WEEKLY_DISCOUNT_*` / `MONTHLY_DISCOUNT_*` stay exported (with rate 0) so imports and the existing tests in `src/lib/pricing.test.ts` keep compiling; discount test expectations are updated to 0.
- The data repair on TBH29XBT is a single-row update to `booking_additional_drivers` plus an audit-log entry; booking financial columns are not touched, so the DB integrity triggers are not involved.
