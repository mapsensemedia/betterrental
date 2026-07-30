## What I found for booking 3X34FMYF

Verified in the live data:

- Status: `confirmed`. **No payments recorded and no invoice issued yet**, so repricing is safe and no refund is involved.
- Dates: Jul 30 → Aug 5, `total_days = 7`, protection plan `smart`.
- Category on the booking: **STANDARD SUV – Nissan Murano or Similar** → protection Group 2 → $57.99/day. That is why $57.99 is showing.
- But the booking's stored `daily_rate` is **$99.99**, which is the Mid-Size SUV (Rav4) rate — Standard SUV is $109.99. So the booking was quoted as a Mid-Size SUV and is now pointing at the Standard SUV category.
- `pricing_snapshot` is empty, so the protection line is recomputed from the category name every time it renders. Simply editing the stored totals would not change the $57.99 shown on screen.

## Recommended fix

**Point the booking back to the Mid-Size SUV category, then reprice.** This matches the $99.99 daily rate already on the booking and makes the protection group resolve to Group 1 ($37.99/day) everywhere — booking detail, agreement, invoice — instead of only patching one number.

Steps:

1. Set the booking's category back to `MID SIZE SUV – Toyota Rav4 or Similar`.
2. Recompute totals with Smart protection at $37.99/day × 7 days:
   - Protection drops from $405.93 to $265.93 (−$140.00)
   - Subtotal: $953.87 → $813.87
   - Tax (PST 7% + GST 5%): $114.46 → $97.66
   - **Total: $1,068.33 → $911.53**
   Exact figures re-derived from the live booking at execution time rather than hardcoded.
3. Recompute through the server-side pricing path (`reprice-booking`) so the write goes through the service role and passes the booking financial-integrity triggers — client-side updates to these fields are blocked by design.
4. Log the change to `audit_logs` with a note that the category/protection group was corrected.
5. Verify: reload the booking detail and confirm the breakdown reads "Smart Coverage ($37.99/day × 7d)" and the total is $911.53.

## If the vehicle really is a Standard SUV

If the customer is actually taking a Murano, tell me and I will instead keep the Standard SUV category and apply a **one-off protection rate override of $37.99/day on this booking only** (goodwill/price-honour), leaving the category and the $109.99 rate question separate. That path needs a small `protection_rate_override` field on bookings, which the pricing display and invoice builder would respect.

## Note on the wider issue

This is the same Mid-Size SUV vs Standard SUV protection-group confusion you raised earlier. This plan fixes the one booking only; the systemic fix (single source of truth for protection groups across online, walk-in and ops) is still outstanding and can follow separately.
