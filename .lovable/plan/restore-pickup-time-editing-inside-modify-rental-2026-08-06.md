# Restore pickup time editing inside Modify Rental

## What's happening now

In the pickup wizard (Start Handover), the Modify Rental box's **Dates** tab only lets staff change the **return** date/time. The pickup date/time is shown as read-only text. When date fields were moved out of the old edit form into Modify Rental, only the return side came across — so there is currently no way to correct a pickup time from any booking screen.

The backend already supports it: `reprice-booking` accepts `newStartAt` for both the `modify` operation (priced) and the `update_time_only` operation (timestamps only, no financial change), and `useEditBooking` already knows how to call both.

## What will change

In the **Dates** tab of Modify Rental (`BookingModificationPanel`), the pickup date/time becomes editable alongside the return date/time:

- Two datetime inputs: **Pickup** and **Return**, both restricted to the 9:00 AM – 8:00 PM operating window (times outside the window are rejected with an inline message).
- Return must stay after pickup; duration is recomputed live using the existing "any hours past 24 counts as the next day" rule.
- Live impact summary, driven by whether the billable day count changes:
  - **Same day count** (e.g. pickup moved 10:00 AM to 2:00 PM and return shifted the same way, or just a time correction): shown as "Time change only — no price change". Applied via the `update_time_only` operation, so the customer's agreed price, taxes, protection and extras are untouched.
  - **Day count changes**: the existing itemized before/after preview (vehicle, protection, extras, drivers, fees, tax, total) is shown and the change is applied as a priced modification with the delta-only rules already in place, plus the drift warning.
- Quick actions for pickup: shift pickup earlier/later by 1 hour, and reset to the original pickup time.
- A reason note stays mandatory, the confirmation dialog states plainly whether money moves, and the change is recorded in the booking timeline (and the agreement regenerated) exactly as return-date changes are today.

Because Modify Rental is the same component everywhere, this restores pickup time editing in the pickup wizard, the booking ops drawer, booking detail and active rental detail at once.

## Technical notes

- `src/components/admin/ops/BookingModificationPanel.tsx`: add `newStartAt` state, pickup datetime input with 9–8 validation, quick pickup shift buttons, and branch the submit between `update_time_only` and priced `modify`.
- `src/hooks/use-booking-modification.ts`: extend `BookingModification` with optional `newStartAt` and a `timeOnly` flag; forward `operation: "update_time_only"` when only timestamps move, otherwise `modify` with `newStartAt`/`newEndAt`. Update `previewModification` to price from the new start rather than the stored `start_at`.
- No edge function or database changes required — `reprice-booking` already handles both operations and both fields.
- Validation of the 9:00–20:00 window reuses the operating-hours constants used by the booking funnel; no pricing logic changes.
