

## Verification Plan: Finance Payment Totals Accuracy Audit

### Step 1 — Full Booking Ledger Extract

- **Source**: `bookings` table
- **Query**: `SELECT id, booking_code, status, total_amount, deposit_amount, late_return_fee, wl_transaction_id, wl_deposit_transaction_id, booking_source FROM bookings ORDER BY created_at`
- **Expected output**: Complete list of all bookings with their billed totals
- **Looking for**: Baseline count of bookings and sum of `total_amount` across all statuses

### Step 2 — Full Payment Records Extract

- **Source**: `payments` table
- **Query**: `SELECT p.id, p.booking_id, b.booking_code, p.amount, p.payment_type, p.payment_method, p.status, p.transaction_id, p.created_at FROM payments p LEFT JOIN bookings b ON b.id = p.booking_id ORDER BY p.created_at`
- **Expected output**: Every payment record with its type, method, status, and associated booking code
- **Looking for**: The full universe of payment records before any filtering

### Step 3 — Payment Type and Status Distribution

- **Source**: `payments` table
- **Query**: `SELECT payment_type, status, COUNT(*), SUM(amount) FROM payments GROUP BY payment_type, status ORDER BY payment_type, status`
- **Expected output**: Matrix showing how many records and how much money exists per type/status combination (e.g. rental/completed, deposit/authorized, deposit/completed)
- **Looking for**: Which combinations exist in the data — particularly `authorized` deposits that should be excluded, and any unexpected statuses

### Step 4 — Audit the Hook's Inclusion/Exclusion Logic

- **Source**: `src/hooks/use-collected-revenue.ts` (code review, no execution)
- **Check**: Read the hook and document exactly which `payment_type` and `status` values it includes in the "collected" number, and which it excludes. Also document the dedup logic (transaction_id-based) and the WL supplement logic.
- **Expected output**: A table like:

```text
Included:  status = 'completed', all payment_types
Excluded:  status = 'authorized' (deposit holds)
Dedup:     by transaction_id, falling back to record id
WL Supp:   bookings with wl_transaction_id but no matching payment record
```

- **Looking for**: Any payment_type or status that exists in Step 3 but is unintentionally excluded or double-counted by the hook

### Step 5 — Detect Duplicate PA/PAC Records

- **Source**: `payments` table
- **Query**: `SELECT transaction_id, COUNT(*), array_agg(payment_type), array_agg(status), array_agg(amount) FROM payments WHERE transaction_id IS NOT NULL GROUP BY transaction_id HAVING COUNT(*) > 1`
- **Expected output**: Any transaction IDs that appear more than once (e.g. a PA pre-auth and a PAC capture for the same gateway transaction)
- **Looking for**: Pairs where both records have `status = 'completed'` — if the hook includes both, totals are inflated

### Step 6 — Per-Booking Payment Sum vs Billed Total

- **Source**: `payments` + `bookings` tables joined
- **Query**:
```sql
SELECT
  b.booking_code,
  b.total_amount AS billed,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) AS collected,
  b.total_amount - COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) AS gap
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.id
GROUP BY b.id, b.booking_code, b.total_amount
ORDER BY gap DESC
```
- **Expected output**: Per-booking comparison showing billed vs collected and the delta
- **Looking for**: Bookings where collected > billed (overpayment or duplicate records), bookings where collected = 0 (unrecorded revenue), and bookings with partial gaps

### Step 7 — WL Supplement Verification

- **Source**: `bookings` table + `payments` table
- **Query**:
```sql
SELECT b.booking_code, b.total_amount, b.wl_transaction_id
FROM bookings b
WHERE b.wl_transaction_id IS NOT NULL
  AND b.status IN ('confirmed', 'active', 'completed')
  AND NOT EXISTS (
    SELECT 1 FROM payments p
    WHERE p.booking_id = b.id AND p.status = 'completed'
  )
```
- **Expected output**: Bookings that have a Worldline transaction but zero completed payment records — these are the ones the WL supplement adds to collected revenue
- **Looking for**: Whether these bookings' `total_amount` values are being added correctly, and whether any have since had payments recorded (making the supplement a double-count)

### Step 8 — Unrecorded Revenue Verification

- **Source**: `bookings` table + `payments` table
- **Query**:
```sql
SELECT b.booking_code, b.total_amount, b.wl_transaction_id, b.booking_source
FROM bookings b
WHERE b.status IN ('confirmed', 'active', 'completed')
  AND b.wl_transaction_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM payments p
    WHERE p.booking_id = b.id AND p.status = 'completed'
  )
```
- **Expected output**: Bookings with no payment records AND no WL transaction — the "unrecorded revenue" bucket
- **Looking for**: Whether these are legitimate (terminal payments never logged) or false positives (cancelled bookings with wrong status)

### Step 9 — Compute the Three Totals and Compare

- **Source**: Results from Steps 6, 7, 8
- **Check**: Sum up:
  - **A** = Sum of all `completed` payments (deduplicated by transaction_id)
  - **B** = Sum of WL supplement bookings' `total_amount`
  - **C** = Sum of unrecorded revenue bookings' `total_amount`
  - **Hook total** = A + B + C
  - **Finance page displayed total** = read from UI
- **Looking for**: Whether `Hook total` matches the Finance page display, and whether A + B + C = the $6,229.76 the user expects (or whatever the current correct number is)

### Step 10 — Cross-Check Against Reports Page

- **Source**: Reports page UI + `RevenueAnalyticsTab` component
- **Check**: Navigate to Reports, note the "Collected Revenue" and "Billed Revenue" values displayed. Compare against the Finance page total from Step 9.
- **Looking for**: Any remaining divergence between Finance and Reports after the shared hook was implemented

---

### Execution Order

Steps 1-3 are independent data pulls (can run in parallel). Step 4 is a code review. Steps 5-8 are diagnostic queries. Step 9 aggregates findings. Step 10 is a UI cross-check.

No data will be modified. All queries are SELECT-only.

