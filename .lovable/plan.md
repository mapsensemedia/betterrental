## What's actually happening

The stored numbers for G3PH8276 are correct. The subtotal is not "daily rate × days + delivery"; it also contains the weekend surcharge, the weekly discount, and the regulatory fees:

```text
Vehicle          $74.99 × 17 days   = $1,274.83
Weekend Surcharge (7 days × 15%)    +    $78.74
Weekly Discount (10%)               −   $135.36
Delivery Fee                        +    $49.00
PVRT ($1.50/day × 17)               +    $25.50
ACSRCH ($1.00/day × 17)             +    $17.00
                                    ------------
Subtotal                            = $1,309.71  ✓ matches the record
```

So the arithmetic is right. The problem is the **Pricing Breakdown card on the Financial tab of the Booking Details page** (the screen you're on). It is broken in three ways:

1. It prints the all-inclusive stored subtotal under the label **"Rental Subtotal (17 days)"**, directly beneath "Daily Rate". That reads as "vehicle only", so it looks like $74.99 × 17 should equal it.
2. It then lists Protection, Add-ons, PVRT, ACSRCH and Drop-off *below* that line as if they were additional charges — but they are already inside the number above. Anyone adding the column down gets a wrong figure.
3. It never shows the **Weekend Surcharge**, the **Weekly/Monthly Discount**, or the **Delivery Fee** at all — the three lines that explain the gap you spotted.

A correct, self-reconciling breakdown component already exists in the codebase (`FinancialBreakdown`, used on the Ops booking summary surfaces). It itemizes weekend surcharge and duration discount as explicit signed lines, shows the delivery fee, and guarantees the lines add up to the stored subtotal to the cent. The Booking Details page simply never adopted it.

## The fix

**1. Replace the hand-rolled breakdown on the Financial tab**

In `src/pages/admin/BookingDetail.tsx`, swap the body of the "Pricing Breakdown" card for the shared `FinancialBreakdown` component, passing the same booking object (add-ons and additional drivers are already loaded on this page under the shapes that component expects). This removes the duplicated Daily Rate / Rental Subtotal / Protection / Add-ons / Young Driver / PVRT / ACSRCH / Drop-off / Upgrade block and replaces it with one breakdown that reads top-to-bottom:

```text
Vehicle (17d × $74.99/day)          $1,274.83
Weekend Surcharge (7 days × 15%)      +$78.74
Weekly Discount (10%)                −$135.36
Delivery Fee                           $49.00
PVRT ($1.50/day)                       $25.50
ACSRCH ($1.00/day)                     $17.00
────────────────────────────────────────────
Subtotal                            $1,309.71
Tax (12%)                             $157.17
────────────────────────────────────────────
Total                               $1,466.88
Deposit                               $350.00
```

The existing tax split (PST/GST), late-return fee and total rows that sit below the card stay as they are; only the duplicated charge lines above the subtotal are replaced.

**2. Relabel the Overview tab's Financial Summary**

The quick-glance card on the Overview tab shows `Daily Rate → Duration → Subtotal`, which invites the same wrong mental multiplication. Change "Subtotal" to **"Subtotal (all charges)"** and add a one-line hint that the full itemization lives on the Financial tab. No numbers change.

**3. Add the missing delivery line to the shared component's sibling surfaces**

`FinancialBreakdown` already renders a Delivery Fee row, so ops surfaces are fine. I'll verify the Financial tab renders it for this booking after the swap.

## Technical notes

- Files touched: `src/pages/admin/BookingDetail.tsx` only. `FinancialBreakdown` and `buildVehicleAdjustmentLines` are reused unchanged.
- This is presentation-only. No pricing math, no stored amounts, no database writes, no edge functions.
- `FinancialBreakdown` derives the vehicle line as *stored subtotal minus every other known line*, then itemizes weekend surcharge and duration discount from the stored `weekend_surcharge` / `duration_discount` columns, emitting a labelled "Rate Adjustment" line for any residue. That is why it always reconciles exactly, including for older bookings that predate those columns.
- Verification: load booking G3PH8276 on the Financial tab and confirm the visible lines sum to $1,309.71, and spot-check a booking with no delivery and no weekend days to confirm no empty rows appear.
