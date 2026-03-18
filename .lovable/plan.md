

## Investigation Summary

### Root Cause

The `booking_add_ons` table is empty because **neither booking creation path persists add-on rows**:

1. **Online bookings (`create-booking`)**: The function calls `createBookingAddOns()` correctly, but the customers who booked never selected any add-ons during checkout (the `addOns` array was empty). The add-ons referenced on signed agreements (protection plans, young driver fees, vehicle upgrades) are **not stored in `booking_add_ons`** — they are stored as dedicated columns on the `bookings` table itself (`protection_plan`, `young_driver_fee`, `upgrade_daily_fee`).

2. **Walk-in bookings (`create-walk-in-booking`)**: This function **has no add-on support at all**. It doesn't accept add-on input, doesn't call `computeBookingTotals`, and doesn't call `createBookingAddOns`. Walk-in bookings with extras rely entirely on the Counter Upsell Panel after creation — but staff haven't used it.

### What the user likely sees as "add-ons" vs what the system tracks

| Item | Where stored | In `booking_add_ons`? |
|------|-------------|----------------------|
| Protection plan (Smart/Premium) | `bookings.protection_plan` | No |
| Young driver fee | `bookings.young_driver_fee` | No |
| Vehicle upgrade | `bookings.upgrade_daily_fee` | No |
| Child seat, GPS, fuel, etc. | `booking_add_ons` table | Should be, but none selected |

The analytics "Add-On Breakdown" chart queries `booking_add_ons` which is correctly empty — no optional extras (child seats, roadside, fuel service) were ever added to any booking. The protection/upgrade/young-driver charges exist but are stored differently.

---

## Plan

### 1. Fix Add-On Revenue Analytics to include all extras

Update `src/hooks/use-revenue-analytics.ts` to also account for booking-level extras (protection, upgrades, young driver fees) in the Add-On metrics and breakdown charts, not just `booking_add_ons` rows. This gives staff visibility into all ancillary revenue.

- Add protection plan revenue as a breakdown item (compute from `protection_plan` field + category rate × days)
- Add vehicle upgrade revenue (`upgrade_daily_fee × total_days`)
- Add young driver fee revenue (`young_driver_fee` column)
- Merge these with any `booking_add_ons` data for the charts

### 2. Fix the Revenue Analytics tab chart component

Update `src/components/admin/analytics/RevenueAnalyticsTab.tsx` to render the new combined extras data in the Add-On Breakdown and Add-On Revenue Trend charts.

### 3. Add add-on support to walk-in booking creation

Update `supabase/functions/create-walk-in-booking/index.ts` to accept an optional `addOns` array, compute prices via `computeBookingTotals`, and call `createBookingAddOns` — matching the `create-booking` flow. This ensures future walk-in bookings can include extras at creation time.

### 4. No data backfill needed

The existing bookings have correct totals — protection, upgrades, and young driver fees are already reflected in `subtotal` and `total_amount`. The `booking_add_ons` table is empty because no optional extras (seats, GPS, fuel) were actually selected. No rows need to be inserted.

