## Goal

Attach the Nissan Kicks shown in your photo — **VIN `3N1CP5CV7RL483132`, plate `A819JZ`** — to booking **SZWURS55**, and make sure the rental agreement reflects it. Then ship the missing UI so this is self-serve next time.

## What I found

- **Vehicle unit `e2004597-29ca-4d42-a0a3-f661d4bd4262`** — 2024 Nissan Kicks, VIN `3N1CP5CV7RL483132`, plate `A819JZ`, category **Mystery Car**, location Surrey. Status is already `on_rent` but no booking is pointing at it (it was flipped without being attached).
- **Booking SZWURS55** — status `active`, category **Mystery Car**, pickup Surrey, `assigned_unit_id = NULL`. Exact category and location match — safe to attach this exact unit.
- **Rental agreement** — the generator (`generate-agreement` edge function) reads VIN, plate, color, odometer, make/model/year from `vehicle_units` whenever `assigned_unit_id` is set; with it null it falls back to category info only. So once we attach + regenerate, the PDF will show the Nissan Kicks details.
- **Financials** — `assigned_unit_id` is outside the DB seatbelt trigger (`block_sensitive_booking_updates` only guards status, daily_rate, subtotal, tax, total, deposit, delivery fee, dropoff fee, upgrade fee, young driver fee). Attaching a unit cannot and will not change any total. No reprice is performed.

## Plan

### Step 1 — Data fix for SZWURS55 (immediate, one-off migration)

```sql
-- Idempotent: only attach if still unassigned and unit still matches
UPDATE bookings
SET assigned_unit_id = 'e2004597-29ca-4d42-a0a3-f661d4bd4262',
    updated_at = now()
WHERE id = '1a0cf2ea-7eab-494e-8904-fda659b9166d'
  AND assigned_unit_id IS NULL;

-- Unit is already on_rent; ensure it stays that way (no-op if already correct)
UPDATE vehicle_units
SET status = 'on_rent', updated_at = now()
WHERE id = 'e2004597-29ca-4d42-a0a3-f661d4bd4262';

-- Audit trail
INSERT INTO audit_logs (action, entity_type, entity_id, new_data)
VALUES (
  'unit_assigned_post_activation',
  'bookings',
  '1a0cf2ea-7eab-494e-8904-fda659b9166d',
  jsonb_build_object(
    'unit_id', 'e2004597-29ca-4d42-a0a3-f661d4bd4262',
    'vin', '3N1CP5CV7RL483132',
    'plate', 'A819JZ',
    'source', 'manual_data_fix'
  )
);
```

### Step 2 — Regenerate the rental agreement for SZWURS55

After the data update, invoke the existing `generate-agreement` edge function for this booking. It will rebuild the PDF and the new version will include:

- VIN `3N1CP5CV7RL483132`
- Plate `A819JZ`
- Make / model / year (Nissan Kicks 2024)
- Color and current odometer (whatever is on the unit row)
- Pickup odometer/fuel from `inspection_metrics` if recorded

The customer-facing **/booking/:id/agreement** page and the ops Agreement step both read from the same `rental_agreements` row, so both will update automatically.

### Step 3 — Ship the post-activation "Attach vehicle" UI (prevents recurrence)

So staff never need a data fix again, add the previously-planned card to `ActiveRentalDetail.tsx`:

- New edge function `assign-unit-to-active-booking` (admin/staff only) — validates category + location + availability, atomically writes `bookings.assigned_unit_id` and flips `vehicle_units.status` to `on_rent`, writes audit log, then triggers `generate-agreement` for the booking.
- New component `ActiveRentalUnitAssignCard.tsx` — lists available units for the booking's category at its pickup location, lets staff pick one, shows toasts for "Vehicle attached" and "Agreement regenerated".
- Wire it into `src/pages/admin/ActiveRentalDetail.tsx`, rendered only when `status === 'active' && !rental.unit`.
- Invalidates: `active-rental`, `booking`, `vehicle-units`, `available-vehicles`, `fleet-vehicles`, `rental-agreement`, `booking-activity-timeline`.

## Calculations — confirmed unaffected

Pricing inputs (`daily_rate`, `total_days`, protection, add-ons, fees, taxes) do not reference `assigned_unit_id`. The DB seatbelt trigger forbids client updates to every money field, so a plain assignment of `assigned_unit_id` is the only column that changes. SZWURS55's current totals (subtotal 361.96, tax 43.44, total 405.40, deposit 350.00) will remain identical.

## Files

- new migration: attach unit + audit log (Step 1)
- new: `supabase/functions/assign-unit-to-active-booking/index.ts` (Step 3)
- new: `src/components/admin/ops/ActiveRentalUnitAssignCard.tsx` (Step 3)
- edit: `src/pages/admin/ActiveRentalDetail.tsx` (Step 3)

Regeneration in Step 2 is a one-shot function invocation, no file changes.