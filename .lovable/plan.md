## Goal

Remove the "current kilometres" input that was added to the rental extension flow, so staff can extend a booking without recording an odometer reading, and extension agreements go back to showing the normal "Km Out" from the pickup inspection.

## Changes

**1. Extension panel UI — `src/components/admin/ops/BookingModificationPanel.tsx`**
- Remove the odometer number input, its label/helper text ("This becomes the 'Kilometres out' on the new extension agreement"), and any related validation that blocks submitting an extension.
- Remove the "last known odometer" lookup query (latest extension → pickup inspection → unit mileage) and its display hint.
- Stop passing `currentOdometerKm` when submitting.

**2. Modification hook — `src/hooks/use-booking-modification.ts`**
- Drop `currentOdometerKm` from the `BookingModification` type and from the request body sent to the repricing function.

**3. Repricing function — `supabase/functions/reprice-booking/index.ts`**
- Remove the requirement/validation for `currentOdometerKm` on extensions.
- Stop writing the odometer reading into the extension record and stop updating the vehicle unit's `current_mileage` from it.
- Stop sending `odometerOutOverride` when triggering agreement regeneration (still regenerate the extension agreement as before).
- Keep the rest of the extension recording (previous/new end date, reason, agreement link) intact so the extension history still works.

**4. Agreement generation — `supabase/functions/generate-agreement/index.ts`**
- Remove the odometer override and the "latest extension reading" lookup; "Km Out" always comes from the pickup inspection again.
- Remove the `odometerSource: "extension"` flagging.

**5. Agreement PDF — `src/lib/pdf/rental-agreement-pdf.ts`**
- Remove the `"Km Out (at extension):"` variant so the label is always `"Km Out:"`; drop the now-unused `odometerSource` handling. Update the related assertion in `src/lib/pdf/rental-agreement-pdf.test.ts` if it checks that label.

## Notes

- No database migration: the `booking_extensions` table and its `odometer_km` column stay in place so existing history isn't lost — the columns simply stop being written. Say the word if you'd rather drop them too.
- No other pricing, activation, or return-inspection odometer capture is touched (return/handover km recording stays as-is).
