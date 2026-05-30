## Goal
Update `/mnt/documents/outstanding_dues.xlsx` so every outstanding-due booking shows the customer name, and add a breakdown of the actual charge transactions that make up the "Paid" amount.

## Current state
- One sheet `Outstanding Dues`, 10 bookings.
- Columns: Booking Code, Invoice #, Status, Start Date, End Date, Total ($), Paid ($), Due ($), Reason.
- No customer name. "Paid ($)" is a single rolled-up number with no transaction-level detail.

## Changes

### Sheet 1 — `Outstanding Dues` (enriched)
Add columns, keep existing ones:
- `Customer Name` (from `customers` via `bookings.customer_id`, fallback to `profiles` via `user_id`)
- `Customer Phone` (helpful for collections; optional — include unless you say no)
- `Location` (location name)
- `Charges Count` (number of successful payment rows on that booking)
- `Last Charge Date`

### Sheet 2 — `Charged Transactions` (new)
One row per successful payment tied to the 10 due bookings. Columns:
- Booking Code
- Customer Name
- Invoice #
- Payment Date
- Method (card / terminal / etc.)
- Amount ($)
- Worldline Txn ID / RRN
- Status

Sorted by Booking Code, then Payment Date. Footer total per booking via SUBTOTAL.

### Sheet 3 — `Summary` (new, small)
- Total Outstanding Due ($)
- Total Already Charged ($) across these bookings
- Count of bookings with zero charges vs. partial charges

## Data sources
- `bookings` (booking_code, customer_id, user_id, location_id, total_amount)
- `customers` (name, phone) — joined on `bookings.customer_id`
- `profiles` fallback when `customer_id` is null
- `locations` (name)
- `payments` table — only `status = 'completed'` (or equivalent successful state) rows for the 10 booking IDs
- `final_invoices` for invoice number confirmation

## Formatting
- Currency cells: `$#,##0.00;($#,##0.00);-`
- Bold header row, frozen top row, autosized columns
- Sheet 1 sorted by Due ($) descending (unchanged ordering)
- File saved as `outstanding_dues_v2.xlsx` so the original is preserved; QA each sheet by rendering to image before delivery.

## Out of scope
- No DB writes, no app/UI changes.
- No reopening of "what counts as paid" — using existing `payments` completed rows as source of truth (matches Lovable Cloud rule: Amount Collected is derived from completed payments).
