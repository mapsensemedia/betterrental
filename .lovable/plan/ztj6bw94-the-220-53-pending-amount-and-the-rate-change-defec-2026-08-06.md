# ZTJ6BW94 — the $220.53 pending amount, and the rate-change defect behind it

## What the record shows

Two modifications were made to this booking tonight:

| Time (UTC) | Change | Stored subtotal | Stored total |
|---|---|---|---|
| before | 10 days @ $100 | $979.00 | $1,096.48 |
| 02:36 | daily rate $100 -> $99 (still 10 days) | $1,074.40 | $1,203.33 |
| 02:39 | 10 -> 11 days | $1,175.90 | $1,317.01 |

Payments on file total $1,096.48, so pending = $1,317.01 - $1,096.48 = **$220.53**.

**It is not a previous due amount.** Before tonight's two edits the stored total was $1,096.48 and the three collected payments (all `rental`, all `completed`) add up to exactly $1,096.48 — nothing was outstanding, and there is no invoice record carrying a balance for this booking. The whole $220.53 was created by tonight's edits:

- **$113.68 — the correct one-day extension.** The 02:39 step added exactly $101.50 to the subtotal ($99 day + $1.50 PVRT + $1.00 ACSRCH) = $113.68 with 12% tax. The extension itself is right.
- **$106.85 — an unintended re-price from the 02:36 rate change.** Changing the rate from $100 to $99 did not apply a $1/day adjustment; it rebuilt the whole 10-day booking from today's rate card ($990 vehicle + $59.40 weekend + $25.00 daily fees = $1,074.40), which erased the $106.00 legacy duration discount baked into the agreed $979.00. Net effect: subtotal +$95.40, total +$106.85.

$113.68 + $106.85 = $220.53 — so the customer is being quoted the legitimate extension plus $106.85 of re-priced history, not an old balance.


## Fix

1. **Rate changes become a delta, like duration changes already are.**
   In `reprice-booking` (`operation: "modify"`), the `overrideRate` branch currently sets `finalSubtotal` from a full rate-card rebuild. Change it to apply only the rate difference to the stored subtotal, so negotiated prices and legacy discounts survive a rate edit:
   - vehicle-line delta = (new rate - stored rate) x billed days, applied to the stored subtotal
   - carry `weekend_surcharge` / `duration_discount` forward by their own engine delta (same treatment the duration path already uses) instead of overwriting them from a fresh run
   - `daily_rate` still updates to the new rate, and drift is reported rather than billed

2. **Repair ZTJ6BW94 so the pending amount is the extension only.**
   Set subtotal $1,080.50, tax $129.66, total $1,210.16 ( = agreed $979.00 + $101.50 extension), leaving pending exactly **$113.68**, and restore `duration_discount = 106.00` and `weekend_surcharge = 60.00` so the itemized breakdown matches the money. The three collected payments ($1,096.48) are untouched. Log the correction to `audit_logs` and regenerate the current rental agreement.

   Note on the rate edit: this repair keeps the first 10 days at the originally agreed price and applies $99/day to the new 11th day only — which is what the quoted $113.68 assumes. If instead the $99 rate is meant to re-rate all 11 days, the correct pending would be $102.28 (a $1/day credit on the earlier days); say so and it will be applied that way.

3. **Verify.** Re-read the booking totals, confirm pending = $113.68, re-quote a further one-day extension (expected $101.50 subtotal / $113.68 total), and confirm a rate edit on a discounted booking no longer moves the historical amount.

## Technical notes

- `supabase/functions/reprice-booking/index.ts` lines ~194-201: `if (overrideRate !== null) { finalSubtotal = roundCents(serverTotals.subtotal + extrasRowsTotal); ... }` is the full-rebuild branch to replace with delta math.
- The duration-delta branch immediately below already has the correct pattern (`baseStored + deltaSubtotal`, itemization carried forward) — the rate branch should reuse it with the rate delta included.
- Engine constants confirmed: PVRT $1.50/day, ACSRCH $1.00/day, weekend surcharge 15% per weekend day, tax 7% PST + 5% GST.
