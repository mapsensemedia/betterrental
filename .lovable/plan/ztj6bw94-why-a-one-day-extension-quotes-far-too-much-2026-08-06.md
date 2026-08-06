# ZTJ6BW94 — why a one-day extension quotes far too much

## What the booking data actually shows

ZTJ6BW94 (Kayla Metcalf, walk-in, MID SIZE SUV, agreed rate $100/day):

| When | Change | Charged |
|---|---|---|
| Jul 27 | Created, 2 days | $246.40 |
| Jul 28 | 2 -> 9 days | $746.49 |
| Aug 5 | 9 -> 10 days | $103.59 |

Current stored state: 10 days, subtotal $979.00, tax $117.48, total $1,096.48. Payments on file total exactly $1,096.48, so nothing has been over-collected yet — every past charge reconciles with the stored total.

The Aug 5 one-day step ($92.50 subtotal + tax) reconciles as: $100 day + $2.50 daily regulatory fees - $10 duration discount. That charge was correct **at the time**, but it left the booking in a state that makes the *next* extension quote wrong.

## The two defects that inflate the next one-day extension

**1. A rate that hasn't changed still forces a full re-price (the main one).**
`useEditBooking` always sends `newDailyRate`, pre-filled with the booking's own stored rate. On the server, `operation: "modify"` treats *any* `newDailyRate` as a deliberate rate override and takes the branch that rebuilds the entire booking from today's rate card instead of applying only the duration delta. For ZTJ6BW94 the stored subtotal sits $106 below the rate card (the retired duration discount is baked into the agreed price), so a modify through that path charges roughly $106 + tax on top of the legitimate one-day amount — a ~$233 "one-day extension" instead of ~$115. This is the same class of bug as L2J4F7JK, just through the rate/location route rather than the extension route.

**2. Stale discount bookkeeping on the booking record.**
The booking still carries `duration_discount = 106` while weekly/monthly discounts are retired. On the next modify the server writes `duration_discount = 0` from a fresh engine run while the subtotal stays delta-derived (still discount-inclusive). The itemized breakdown then reads the vehicle line $106 too high with no offsetting discount line, so screens and the agreement show a total that doesn't match the money.

## Fix

1. **Reproduce and log first.** Quote a one-day extension for ZTJ6BW94 through each modify route (Modify Rental dates tab, and rate/location) and record the quoted delta, to confirm which route produced the number that was seen.
2. **Treat an unchanged rate as no override.**
   - `use-booking-edit.ts`: only send `newDailyRate` when the entered value actually differs from `booking.daily_rate`.
   - `reprice-booking` (`operation: "modify"`): ignore an override that equals the stored `daily_rate`, so it falls through to the delta-only path. A real rate change keeps today's rebuild behaviour.
3. **Keep discount bookkeeping consistent with the stored subtotal.** In the delta path, stop overwriting `duration_discount` with a value from a full engine run that the subtotal does not reflect: carry the stored discount forward unchanged (delta-only never re-derives it), and let the retired-discount cleanup be an explicit, separately-quoted action.
4. **Normalise ZTJ6BW94.** One-off data correction so its stored subtotal and `duration_discount` agree (remove the $106 discount from the record without changing the $1,096.48 already collected — this is a bookkeeping alignment only), then regenerate its current agreement.
5. **Verify.** Re-quote a one-day extension on ZTJ6BW94 and confirm it lands at roughly $102.50 subtotal / ~$114.80 total, and that shortening by a day gives the mirror credit. Re-check L2J4F7JK and ZKFF584Q quotes are unchanged.

## Technical notes

- `supabase/functions/reprice-booking/index.ts` lines 138-222: `overrideRate !== null` selects `finalSubtotal = serverTotals.subtotal + extras` (full rate-card rebuild) instead of `storedSubtotal + deltaSubtotal`.
- `src/hooks/use-booking-edit.ts` lines 94 and 113: `dailyRate` is pre-filled from the booking and always forwarded as `newDailyRate` for non-`timeOnly` edits. `RateLocationPanel` is the current caller.
- Engine constants confirming the delta math: weekend surcharge 15% per weekend day, PVRT $1.50/day + ACSRCH $1.00/day, tax 7% PST + 5% GST.
