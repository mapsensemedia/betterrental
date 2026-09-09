# 4GMS6TLU — extend one day + add one additional driver (1 day)

## What you're charging (verified against the booking's own numbers)

Current booking: 1 day, $84.99/day, subtotal $87.49 (rate + $2.50 daily regulatory fees), tax $10.50, card fee $2.19, total $100.18. No protection plan, no weekend surcharge, standard age band.

New return: Sep 10, 2026, 6:00 PM (2 days total).

| Item | Amount |
| --- | --- |
| Extra rental day (Sep 9 → Sep 10) | $84.99 |
| Regulatory fees for the extra day (PVRT $1.50 + ACSRCH $1.00) | $2.50 |
| Additional driver — 1 day at $15.99 | $15.99 |
| Added before tax | **$103.48** |
| PST 7% + GST 5% on the added amount | $12.42 |
| Card processing fee adjustment (2.5%) | $2.58 |
| **Additional charge to collect** | **$118.48** |

New booking totals after the change: subtotal $190.97, tax $22.92, card fee $4.77, **total $218.66**. Deposit hold stays at $350 (already authorized). Kilometres stay unlimited (rental is under 7 days).

## Additional driver details to record

From the licence photo provided: Megan Dyan Helmer, BC licence 6353509, DOB 1978-09-09 (age 47 — standard rate, not the young-driver rate), expires 2027-09-09, class 5. The licence image gets stored on the booking as the driver's document.

## How it will be done

1. Extend the rental to Sep 10, 6:00 PM through the ops "Modify rental" path so the charge is a duration-only delta of $87.49 — the agreed $84.99 rate is preserved, not re-quoted from today's rate card.
2. Add the additional driver through the upsell path with the fee scoped to the extension day only, so exactly $15.99 is billed rather than the full 2-day amount.
3. Tax, card fee and the balance due recompute from the corrected subtotal; the rental agreement regenerates and the $118.48 balance shows as due on the booking's financial tab for collection at return (or now, if you want to take the card payment immediately).
4. Verify afterwards: subtotal $190.97 / total $218.66, driver line $15.99, no phantom discount or adjustment line, and the extension recorded in the booking history.

## Technical notes

- Extension via `reprice-booking` `operation: "modify"` (delta-only, integer-cents).
- Driver added via `persist-booking-extras` `upsell-driver-add`, with the pro-rated one-day fee stored on `booking_additional_drivers.young_driver_fee` and passed as the extras delta so the subtotal moves by exactly that amount.
- Licence image uploaded to the private `driver-licenses`/booking documents storage and linked to the driver row.

## One thing to confirm

Do you want the $118.48 charged to the card on file (VI ••••0293) now, or left as a balance due to collect at return?
