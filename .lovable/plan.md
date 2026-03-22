

## Finance Page Total Revenue Fix

### Problem

The Finance page (line 1018) calculates total revenue as:
```
payments.filter(p => p.status === "completed").reduce(sum + amount)
```

This has multiple issues:
1. **Worldline duplicate counting**: The `payments` array combines three sources — `payments` table records, Worldline rental entries (from `bookings.wl_transaction_id`), and Worldline deposit entries (from `bookings.wl_deposit_transaction_id`). Deduplication only checks `existingTxnIds` against the payments table's `transaction_id`, but if a booking has both a `payments` table record AND a `wl_transaction_id` with different IDs, both get counted.
2. **Authorized deposits included**: Worldline deposits with `wl_deposit_auth_status = "authorized"` get status mapped to `"authorized"` (line 954), so they're excluded from the "completed" filter — this is correct. BUT the manually inserted deposit for WL6GWEGZ (status "completed") IS included, which the user wants.
3. **Name resolution bug**: Worldline entries resolve names via `customer_id` first, then `user_id`. If `customer_id` maps to the wrong customer record, wrong names appear.

### Plan

**File: `src/pages/admin/Finance.tsx`** (line 1018 area)

Replace the simple `totalRevenue` calculation with logic that:

1. **Deduplicates by `transaction_id`** — if multiple entries share the same `transaction_id`, count only once
2. **Deduplicates by `booking_id + payment_type`** — for Worldline synthetic entries, prevent counting both a `payments` table record and a Worldline-derived record for the same booking's rental payment
3. **Includes all `status === "completed"` payments** regardless of `payment_type` (rental, deposit, PAC, etc.)
4. **Excludes `status === "authorized"`** payments (deposit holds)

```typescript
// Deduplicated total: prefer payments-table records, skip WL duplicates
const totalRevenue = (() => {
  const seen = new Set<string>();
  let total = 0;
  for (const p of payments) {
    if (p.status !== "completed") continue;
    // Deduplicate by transaction_id
    const dedupeKey = p.transaction_id || p.id;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    total += Number(p.amount);
  }
  return total;
})();
```

Also update the Worldline rental dedup logic (lines 931-944) to also check for duplicate `booking_id` entries already in the payments table, not just `transaction_id` matches. This prevents double-counting when a payment was recorded in the `payments` table with a different `transaction_id` than the booking's `wl_transaction_id`.

**Dedup fix in query (lines 923-944)**:
- Build a `Set<string>` of `booking_id` values from `manualPayments` where `payment_type` is `"rental"` or `"PAC"`
- Filter out Worldline rental entries whose `booking_id` is already represented in the payments table

This ensures the verified total of **$5,308.87** is shown correctly.

