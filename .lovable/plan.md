## Issue confirmed

In `src/pages/admin/Finance.tsx` (line 602), the `metrics.collected` value is computed by summing actual completed payments and then **adding `unrecordedTotal`** — the dollar value of confirmed/active/completed bookings that have no payment record and no Worldline transaction.

```ts
// Add unrecorded revenue (confirmed bookings with no payment records)
collected += unrecordedTotal;   // ← line 602: wrong by design
```

This conflates two very different things:
- **Money actually collected** (rows in `payments` with `status = completed`)
- **Money expected but not yet logged** (a booking exists, but no one has recorded the cash/terminal/transfer payment)

The same `metrics.collected` then drives:
- The "Collected Revenue" headline card
- The "Revenue Breakdown" denominator (Rental %, Deposit %)
- The "Payment Method" % shares
- The period-over-period `changePercent` comparison (which compares the inflated number against `prevPayments` that does *not* include unrecorded — an apples-to-oranges delta)

### Current real-world impact (just verified against the database)

- Month-to-date: `0` unrecorded bookings, `$0` unrecorded total. Collected card = `$11,257.04` (pure payments).
- All-time (since 2024-01-01): also `0` unrecorded.

So the headline figure is **not currently inflated**, but the logic will silently inflate the moment any walk-in/manual booking is confirmed without a payment row — exactly the case the amber "Bookings Without Payment Records" panel is meant to flag for follow-up.

## Recommendation

**Remove `unrecordedTotal` from `collected` and surface it as its own metric.** The amber warning card already lists each unrecorded booking — the fix is purely about the headline math, not about hiding the data.

### Proposed changes (no edits made yet)

1. **`metrics` calculation (line 587–610)**
   - Drop `collected += unrecordedTotal;`
   - Add a new field `unrecorded: unrecordedTotal` to the returned object so it can be displayed alongside Collected.
   - `changePercent` will now correctly compare payments-vs-payments period over period.

2. **Headline cards (Summary row)**
   - Keep "Collected Revenue" = real payments only.
   - Add a sibling card "Unrecorded Revenue" (only rendered when `> 0`) styled in amber, with subtitle "N booking(s) awaiting payment entry" and a click-through that scrolls to the existing amber list.

3. **Revenue Breakdown card (line 757–760)**
   - Remove the "Unrecorded Revenue" row from this breakdown — it doesn't belong in a breakdown of *collected* money.
   - The percentages for Rental / Deposit / Other will then sum to ~100% of actual collections.

4. **Amber "Bookings Without Payment Records" panel (line 787–824)**
   - Keep as-is. It's the correct surface for follow-up action.
   - Optionally rename the section header from "Unrecorded Revenue" to "Expected Revenue — Action Required" to reinforce that it is *not yet collected*.

5. **Memory update**
   - Update `mem://financials/unrecorded-revenue-reconciliation` to clarify that unrecorded revenue is reported **separately** and is **never** added to Collected Revenue.

### Files that would change

- `src/pages/admin/Finance.tsx` — calculation, summary cards, breakdown rows, optional header rename
- `mem://financials/unrecorded-revenue-reconciliation` — clarification

### Files intentionally NOT changed

- `src/hooks/use-collected-revenue.ts` — already correct (payments-only). It is the right model; Finance.tsx should align with it.
- The `unrecordedBookings` query and amber action panel — these are valuable and stay.

No code changes will be made until you approve.
