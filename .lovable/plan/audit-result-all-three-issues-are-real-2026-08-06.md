# Audit result: all three issues are real

I checked the actual code. Below is what I found, in plain language, followed by the fix plan.

## Issue 1 — Walk-in booking saves the wrong kind of vehicle reference (CONFIRMED)

What I found:

- `src/components/admin/WalkInBookingDialog.tsx` builds its vehicle dropdown from `useVehicles()`, which reads the **old `vehicles` table**. That hook is even marked deprecated in the code ("the vehicles table is being phased out in favor of vehicle_categories + vehicle_units").
- The dialog then sends the picked row's id as `categoryId` to the walk-in backend function, which writes it straight into `bookings.vehicle_id`.
- Every customer-facing screen (search, protection, add-ons, checkout, and the delivery walk-in screen) picks from `vehicle_categories` instead, and those bookings store a **category** id in the same column.

Why this hurts: the same column ends up holding two different kinds of id depending on how the booking was created. Nothing looks broken on screen because the dialog also copies the name and rate into the booking. But the moment staff upgrade, reprice, or change protection, the system looks that id up as a category — it either finds nothing or silently replaces it with a real category, which is exactly the "reference switches on first upgrade" behaviour reported. It is also why walk-in protection prices came out different from online prices.

## Issue 2 — Booking-change actions are scattered and inconsistent (CONFIRMED)

What the code shows today:

| Action | Component | Screens it appears on |
| --- | --- | --- |
| Extend / change dates with price preview | `BookingModificationPanel` | **1** — the booking ops drawer only |
| Edit dates + location + daily rate (no extension record) | `BookingEditPanel` | 4 — ops drawer, booking ops page, return ops, active rental detail (+ pickup wizard step) |
| Change protection | `ProtectionChangePanel` | 3 — return ops, active rental detail, pickup wizard step |
| Add extras / drivers mid-rental | `CounterUpsellPanel` | 4 — ops drawer, return ops, active rental detail, pickup wizard |
| Vehicle upgrade | `VehicleUpgradePanel` | 1 — pickup wizard step |

So what staff can do depends entirely on which screen they happen to open. When a customer phones mid-rental, staff are on Active Rental Detail — which has **no extend button at all**.

## Issue 3 — The edit form's date fields bypass the extension flow (CONFIRMED)

`BookingEditPanel` has Start/End date-time inputs plus a daily-rate field, and submits through `useEditBooking` → `reprice-booking` with `operation: "modify"`. Because it is the only date control on most screens, staff use it to push a return date out. That path:

- shows only a rough client-side estimate, not the server's real itemised before/after;
- never routes through the extension UI, so no extension confirmation is presented to the customer;
- leaves no "an extension happened" record for staff to see later, unlike the modify panel's flow.

# Plan

## A. Walk-in dialog uses the same category list as everything else

- Replace `useVehicles()` in `WalkInBookingDialog.tsx` with the category source the rest of the app uses (`useBrowseCategories` / `useFleetCategories`, filtered by the selected location), so options are real `vehicle_categories` rows with their rate, seats, fuel and transmission.
- Keep the field name `categoryId` end-to-end; rename the local `vehicleId` state to `categoryId` so nobody re-introduces the confusion.
- Protection rates in the dialog resolve through `getProtectionRateForCategory` using the category name, matching the online flow.
- No backend change needed: `create-walk-in-booking` already stores whatever id it receives; it will now receive the correct one.
- One-time data check: list existing walk-in bookings whose `vehicle_id` is not a valid `vehicle_categories` id and report them, so we can decide whether to remap. No bulk data rewrite without your approval.

## B. One "Modify Rental" box, identical on every booking screen

Create a single `ModifyRentalPanel` (in `src/components/admin/ops/`) with sectioned tabs:

1. **Dates & duration** — start/end, extend or shorten, server-priced itemised before/after (vehicle, protection, add-ons, drivers, fees, tax, total) and a clear "to collect / to refund" figure.
2. **Vehicle** — reuse `VehicleUpgradePanel` logic (delta-only pricing, taxes shown).
3. **Protection** — reuse `ProtectionChangePanel`.
4. **Extras & drivers** — reuse `CounterUpsellPanel` with its existing pro-rated remaining-days behaviour.
5. **Rate & location** — daily rate and pickup location, gated behind a reason field as today.

Each section keeps using its existing server route (`reprice-booking`) so financial writes stay server-side and audited. Availability of a section depends on booking status only (not on which screen you are on) — e.g. the vehicle tab is read-only after return.

Then mount this one panel on: booking ops drawer, Booking Ops page, Active Rental Detail, Return Ops, Booking Detail, pickup wizard modify step, and the ops booking view — replacing the current ad-hoc mix.

## C. Edit form becomes contact details and notes only

- Remove start/end date-time, daily rate and location fields from `BookingEditPanel`; rename it to reflect its new job (contact name/phone, pickup address, notes, special instructions).
- Those fields live only in the Modify Rental box from now on, so every date change goes through the priced, recorded path.
- Add a short inline hint on the edit form: "To change dates, rate or vehicle, use Modify Rental."

## Technical notes

- Extension records: the dates section calls `reprice-booking` with the extension operation so the `booking_extensions` row and agreement regeneration happen, instead of the plain `modify` write the edit form used.
- All previews are sourced from the server-shaped calculation already added to `use-booking-modification.ts` (tax-inclusive, extras-aware) rather than each screen's own math.
- No schema migration is required for A–C; only the optional data audit query in A.
