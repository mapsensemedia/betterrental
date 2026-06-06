# Per-Location Revenue in Finance

Today the Finance page (`/admin/finance`) shows totals across all three locations (Surrey Newton, Langley Centre, Abbotsford Centre) with no way to see which location earned what. Two additions:

## 1. Overview tab — "Revenue by location" card

A new card under the existing KPI row, for the selected date range:

```text
Revenue by location                                    [month ▾]
─────────────────────────────────────────────────────────────
Surrey Newton            $12,430.00      52 payments    48%
Langley Centre            $8,120.00      36 payments    31%
Abbotsford Centre         $4,310.00      19 payments    21%
─────────────────────────────────────────────────────────────
Total                    $24,860.00     107 payments
```

- Source: `payments` rows already loaded by `OverviewTab`, joined to `bookings.location_id` → `locations.name`.
- Only `status = 'completed'` rows count toward revenue (matches the existing "Amount Collected" rule in the unified revenue source of truth).
- Clicking a row deep-links to Transactions tab with the location pre-filtered.

## 2. Transactions tab — Location filter + column

- New "Location" dropdown next to the existing Type/Status filters: **All locations / Surrey Newton / Langley Centre / Abbotsford Centre**. Persisted in the URL as `?location=<id>`.
- Filter applies to Invoices, Receipts, Payments, and Deposits sub-tabs (all are booking-scoped).
- Add a compact "Location" column (or small chip under the booking code) to each sub-tab's table so staff can see the location without opening the booking.

## Technical notes

- Extend the `payments` query in `OverviewTab` to include `bookings(location_id, locations(name))` via the existing booking join already done at line ~330.
- Extend each sub-tab query in `TransactionsTab` (invoices, receipts, payments, deposits) to select `bookings.location_id` and join `locations(name)`.
- Aggregation is integer-cents safe (sum then format) per the project's financial integrity rules.
- No schema changes, no edge function changes — read-only UI work.

## Files

- `src/pages/admin/Finance.tsx` — add location card, location filter state, URL param, table column, extended selects.

## Out of scope

- No changes to Reports page, no new exports, no email/PDF changes. Refunds and deposit captures continue to follow existing rules.
