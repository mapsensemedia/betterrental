

## Fix: Revenue Breakdown Undercounting

### Root Cause

The Revenue Breakdown only counts revenue from two sources:
1. Records in the `payments` table with `status = 'completed'`
2. WL supplement entries (bookings with Worldline transaction IDs not yet in `payments`)

**Two confirmed bookings have collected payments that are completely invisible to the finance module:**

| Booking | Amount | Status | Issue |
|---------|--------|--------|-------|
| U7CENCBP | $218.40 | confirmed | No payment record, no WL transaction |
| EVUFSRKX | $322.56 | confirmed | No payment record, no WL transaction |

These are likely terminal/cash payments that were processed but never logged via the "Log Terminal Payment" form. Total missing: **$540.96**.

Additionally, two more bookings have captured deposits ($350 each) where FZH86F8W's deposit is picked up by WL supplement but may have edge-case dedup issues.

### Fix — Two Parts

#### Part 1: Add "Unrecorded Revenue" detection to the Overview tab

In `src/pages/admin/Finance.tsx`, add a third data source query that finds confirmed/active/completed bookings with NO corresponding completed payment record AND no WL transaction. These represent revenue collected outside tracked channels.

Display these as a warning card in the Revenue Breakdown section:
- Show count and total of unrecorded bookings
- Link to each booking so staff can retroactively log the payment
- Add their amounts to the collected revenue total

#### Part 2: Ensure `typeBreakdown` uses the same dedup as `metrics.collected`

Currently `typeBreakdown` (line 512-516) sums with simple `.filter().reduce()` without `transaction_id` dedup, while `metrics.collected` (line 473-488) deduplicates via a `Set`. Apply the same dedup pattern to `typeBreakdown` to prevent any future double-counting edge cases.

### Files Modified

1. `src/pages/admin/Finance.tsx` — Add unrecorded-revenue query, warning card, fix typeBreakdown dedup

### What Does NOT Change
- Payment logging flows (terminal, Worldline)
- Existing dedup between payments table and WL supplement
- Invoice/receipt generation

