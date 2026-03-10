

## Surgical Fix: Decouple Rental Activation from Checklist

### What's Blocking Activation Today

In `BookingOps.tsx` lines 258-277, `handleActivateRental` has **4 client-side guards**:
1. `assigned_unit_id` check — **reasonable, keep this**
2. `walkaround` inspection complete — **BLOCKER, removing**
3. `isPaymentComplete` — **BLOCKER, removing**
4. `isAgreementSigned` — **BLOCKER, removing**

Additionally, the footer "Activate Rental" button (line 490) only renders when `activeStep === "handover"` AND walkaround is complete — so staff never even see it unless they navigate through every step.

The **edge function** (`update-booking-status/index.ts`) has **no guard** blocking `confirmed → active`. It correctly sets `vehicle_units.status = 'on_rent'` (line 161). No changes needed there.

### Changes

**File 1: `src/pages/admin/BookingOps.tsx`**
- Remove walkaround, payment, and agreement guards from `handleActivateRental` — keep only the `assigned_unit_id` check
- Change footer activate button condition: show it for any `confirmed` booking with an assigned unit, regardless of current step or walkaround status

**File 2: `src/pages/admin/BookingDetail.tsx`**
- Add "Activate Rental" button in the header actions area when `booking.status === "confirmed"`
- Add confirmation dialog: "Activate this rental for [customer name] — [vehicle name]? This will mark the vehicle as on-rent."
- On confirm, call `useUpdateBookingStatus` with `newStatus: "active"`, show toast on success/error

### What This Does NOT Change
- Checklist steps, walkaround, inspections, photos — all remain intact and usable
- Returns flow — untouched
- Edge function — no modifications needed
- Any other pages — untouched

### Risks
- Staff can now activate without completing walkaround/payment/agreement — this is intentional per the request, but means those steps become advisory rather than mandatory
- The `assigned_unit_id` guard remains, so activation still requires a vehicle to be assigned first

