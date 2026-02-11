
# Fix: Subtotal Mismatch in Booking Summary

## Problem Identified

The booking subtotal is **$192.96** but the visible line items only add up to **$160.98** (Vehicle $80 + Protection $75.98 + PVRT $3 + ACSRCH $2). The hidden **$31.98** comes from additional driver fees ($15.99/day x 2 days) that were included in the pricing calculation but are **never displayed** in the Ops Booking Summary.

### Root Causes Found

1. **AddOns page URL bug (line 189 in AddOns.tsx)**: When navigating to checkout, it passes `selectedAddOnIds` (uncleaned) instead of `cleanedAddOnIds`, allowing the "Additional Driver" add-on ID to leak into checkout URL params.

2. **OpsBookingSummary missing line item**: The ops summary displays vehicle, protection, add-ons, young driver fee, PVRT, and ACSRCH -- but has **zero code** to display additional driver fees from `booking_additional_drivers`. So even when drivers are correctly charged, the breakdown never shows them.

3. **Checkout doesn't filter "Additional Driver" add-on**: The `addOnIds` array used for inserting into `booking_add_ons` is not filtered, potentially double-counting.

## Plan

### 1. Fix AddOns.tsx URL param bug
- Line 189: Change `selectedAddOnIds.join(",")` to `cleanedAddOnIds.join(",")` so the "Additional Driver" add-on ID never reaches checkout URL

### 2. Filter add-on IDs at checkout (NewCheckout.tsx)
- Filter out "Additional Driver" add-on from `addOnIds` before using them for price calculation and DB insertion, as a safety net

### 3. Add additional drivers line item to OpsBookingSummary
- Query `booking_additional_drivers` for the booking (the parent query likely already fetches this -- verify and add if not)
- Add a visible line item between add-ons and young driver fee showing "Additional Drivers (N) - $XX.XX"

### 4. Ensure the booking query includes additional drivers
- Check the booking detail query used by the ops pages to ensure `booking_additional_drivers` is included in the select

## Technical Details

### File Changes

| File | Change |
|------|--------|
| `src/pages/AddOns.tsx` | Line 189: use `cleanedAddOnIds` instead of `selectedAddOnIds` |
| `src/pages/NewCheckout.tsx` | Filter `addOnIds` to exclude "Additional Driver" add-on before DB insert |
| `src/components/admin/ops/OpsBookingSummary.tsx` | Add additional drivers line item in the financial breakdown section |
| Ops booking query (hooks) | Ensure `booking_additional_drivers` is fetched alongside the booking |

### Impact
- Fixes the visible subtotal mismatch for all bookings with additional drivers
- Prevents the "Additional Driver" add-on from leaking into checkout in future bookings
- All existing bookings with additional drivers will now show the fee breakdown correctly
