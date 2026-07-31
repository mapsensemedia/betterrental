## Goal
Booking **7HNPMA5E** currently bills 6 days even though pickup/return are unchanged. Keep the dates and times exactly as they are, but count and charge it as **5 days**. This is a one-off data correction for this booking only — no pricing-engine or hour-based-billing code changes.

## Current state (verified in the database)
- Booking id `85ad3a78-…c1c2b291`, status `confirmed`, no payments recorded yet, no add-ons, no additional drivers
- start `2026-08-01 03:00Z` → end `2026-08-06 03:00Z` (dates stay untouched)
- `total_days` = 6, daily rate $87.99, protection `smart` @ $37.99/day
- Subtotal $810.48 = base $527.94 + weekend surcharge $39.60 + protection $227.94 + regulatory fees $15.00
- Tax $97.25 (12%), total $907.73, deposit $350.00

## New 5-day figures
| Line | Old (6 d) | New (5 d) |
|---|---|---|
| Base rate 87.99/day | 527.94 | 439.95 |
| Weekend surcharge (3 weekend days, unchanged) | 39.60 | 39.60 |
| Smart protection 37.99/day | 227.94 | 189.95 |
| PVRT 1.50 + ACSRCH 1.00 per day | 15.00 | 12.50 |
| **Subtotal** | **810.48** | **682.00** |
| Tax 12% (PST 7 + GST 5) | 97.25 | 81.84 |
| **Total** | **907.73** | **763.84** |
| Deposit (unchanged) | 350.00 | 350.00 |

## Changes
1. Update this single booking row: `total_days = 5`, `subtotal = 682.00`, `tax_amount = 81.84`, `total_amount = 763.84`. Leave `start_at`, `end_at`, `daily_rate`, `weekend_surcharge`, and `deposit_amount` untouched.
2. Write an `audit_logs` entry (`action = 'manual_reprice'`, entity `booking`) with the old/new totals and the reason "manual override: bill as 5 days per management approval".
3. Refresh derived documents for this booking so the customer-facing figures match: recompute any `final_invoices` totals for it (none expected, will confirm) and regenerate the rental agreement so its terms/PDF show 5 days and $763.84.

## Technical notes
- Applied via a data update (not a migration); financial columns are trigger-protected against client writes but service-level data updates are allowed.
- Because `total_days` is the field the UI and PDF read for duration, the admin Financial Breakdown, invoice, and agreement will all display 5 days after the update.
- No changes to `computeBookingTotals`, the hours→days ceiling rule, or any shared pricing code, so all other and future bookings keep the current hour-based day counting.
