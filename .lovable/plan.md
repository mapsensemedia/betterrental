## Goal

When staff extend an active rental, they must record the vehicle's current kilometre reading. That reading becomes the "Kilometres Out" on the newly generated extension agreement (instead of the original pickup odometer), and is kept as a history record.

## Current behaviour (verified)

- Extensions are done in the "Modify Rental Duration" panel (`src/components/admin/ops/BookingModificationPanel.tsx`, opened from the booking Ops drawer) → `useModifyBooking` → `reprice-booking` edge function with `operation: "modify"`.
- When the days or total change, `reprice-booking` calls `generate-agreement` with `forceRegenerate`, which stores `condition.odometerOut` from the **pickup** inspection record only (`inspection_metrics` where `phase = 'pickup'`). It also does not mark the regenerated document as an extension.
- The agreement PDF renders `condition.odometerOut` as the kilometre-out figure.
- There is no place to record an odometer reading mid-rental; `inspection_metrics.phase` only allows `pickup` or `return`.

## Plan

### 1. Database
New table `public.booking_extensions` to keep one row per extension:
- booking_id, previous_end_at, new_end_at, odometer_km, previous_odometer_km, reason, price_difference, recorded_by, agreement_id, created_at
- Grants for `authenticated` (read) and `service_role` (full); RLS so only admin/staff can read, writes come from the edge function.

### 2. Extension UI
In the Modify Rental Duration panel, when the new return date is later than the current one:
- Show a required numeric field **"Current odometer (km)"**, with the last known reading (pickup inspection odometer, else the unit's `current_mileage`) displayed as a hint.
- Validate: whole number, must be greater than or equal to the last known reading; block confirm until entered.
- Show it in the confirmation dialog alongside the pricing preview.
- Shortening a rental keeps the existing behaviour (no odometer required).

### 3. reprice-booking edge function
- Accept optional `currentOdometerKm` on the `modify` operation; require it when `newEndAt` extends the booking.
- Insert the `booking_extensions` row, update the assigned unit's `current_mileage`, and include the value in the audit log.
- When regenerating the agreement, pass `isExtension: true` and `odometerOutOverride: currentOdometerKm`.

### 4. generate-agreement edge function
- Accept `odometerOutOverride`; if absent, fall back to the most recent `booking_extensions.odometer_km` for the booking, then to the pickup inspection reading.
- Store the value as `condition.odometerOut` and add `condition.odometerSource` ("pickup" or "extension") plus `condition.originalOdometerOut` so the pickup figure is not lost.
- Mark the record `agreement_type: 'extension'` when generated from an extension.

### 5. Agreement PDF / display
- Keep the existing "Kilometres Out" line driven by `condition.odometerOut`.
- On extension agreements, label it "Kilometres out (at extension)" and show the original pickup reading beneath it for reference.
- Booking Detail → Agreements tab already badges extension documents; no change needed there.

## Notes

- Kilometre allowance and excess-km pricing rules are untouched; this only changes what the agreement records as the starting reading for the extended term.
- No pricing, tax or unrelated flow changes.
