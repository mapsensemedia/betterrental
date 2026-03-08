

## Problem

The **young driver fee ($15/day)** is never applied to walk-in bookings. The entire age band pipeline is missing from the walk-in flow:

1. **Walk-in form UI** (`WalkInBookingDialog.tsx`, `DeliveryWalkIn.tsx`): No driver age selection field exists. The form never collects or sends `driverAgeBand`.
2. **Walk-in edge function** (`create-walk-in-booking/index.ts`): Does not accept `driverAgeBand` from the request body. Does not store `driver_age_band` on the booking. Does not compute or store `young_driver_fee`.
3. **Client-side pricing preview**: The `calculateBookingPricing()` call in the walk-in form does not pass `driverAgeBand`, so the preview also shows incorrect (lower) totals.

For regular bookings (`create-booking`), the age band is collected on the landing page and flows through correctly. Walk-in bookings skip this entirely.

## Plan

### 1. Add driver age band selector to `WalkInBookingDialog.tsx`

- Add `driverAgeBand: "25_70"` to the form state (default to standard age band)
- Add a Select dropdown labeled "Driver Age" with two options: "25–70 (Standard)" and "20–24 (Young Driver — +$15/day)"
- Pass `driverAgeBand` into `calculateBookingPricing()` so the live pricing preview includes the young driver fee
- Send `driverAgeBand` in the edge function request body

### 2. Add driver age band selector to `DeliveryWalkIn.tsx`

- Same pattern: add age band state, selector UI, and include it in the edge function call body

### 3. Update `create-walk-in-booking/index.ts` edge function

- Extract `driverAgeBand` from the request body (default to `"25_70"` if not provided, for backward compatibility)
- Compute `young_driver_fee`: if `driverAgeBand === "20_24"`, fee = `$15 × totalDays`; otherwise 0
- Add `young_driver_fee` to the subtotal/tax/total calculation
- Store both `driver_age_band` and `young_driver_fee` on the inserted booking row

### Files to modify
- `src/components/admin/WalkInBookingDialog.tsx` — add age band field + pricing integration
- `src/pages/delivery/DeliveryWalkIn.tsx` — add age band field + pass to edge function
- `supabase/functions/create-walk-in-booking/index.ts` — accept, compute, and persist young driver fee

