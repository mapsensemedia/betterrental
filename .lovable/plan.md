

## Fix: Vehicle Change, Duplicate Counter Upsell, and Blank Step Content

### Issues Identified

1. **Blank screen when clicking "Change / Upgrade Vehicle"** from the 3-dot menu: The handler sets `activeStep` to `"prep"`, but the standard counter flow (`OPS_STEPS`) does not include a `"prep"` step. Steps are: checkin, payment, agreement, walkaround, photos, handover. Since no step with id `"prep"` exists, `OpsStepContent` finds no matching step and renders nothing.

2. **No vehicle assignment/change option visible on the step content**: The `VehicleAssignment` component only appears within the "Handover & Activation" step under "Quick Actions", which is buried at the bottom. It needs to be available on the check-in step and accessible from the 3-dot menu via a dialog.

3. **Duplicate Counter Upsell panels**: One appears on the "Customer Check-In" step (line 174-177 of OpsStepContent) and another on the "Payment & Deposit" step (line 186-189). The one on Payment & Deposit should be removed.

---

### Fix Plan

#### 1. Fix 3-dot menu "Change / Upgrade Vehicle" -- Use a Dialog instead of step navigation

Instead of trying to navigate to a non-existent step, clicking "Change / Upgrade Vehicle" will open a **dialog** containing the `VehicleAssignment` component. This works regardless of which step the user is currently on.

**File: `src/pages/admin/BookingOps.tsx`**
- Add state: `const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false)`
- Change the dropdown menu item for "Change / Upgrade Vehicle" from `setActiveStep("prep")` to `setVehicleDialogOpen(true)`
- Add a `Dialog` at the bottom of the component that renders `VehicleAssignment` with the booking's current vehicle, location, and date range
- Same fix for the "Edit Booking Details" menu item -- open a dialog with `BookingEditPanel` instead of navigating to checkin step

#### 2. Add VehicleAssignment to the Check-In step content

**File: `src/components/admin/ops/OpsStepContent.tsx`**
- In the `checkin` step section, add `VehicleAssignment` component alongside the existing `BookingEditPanel` and `CounterUpsellPanel`, only shown when status is `pending` or `confirmed`

#### 3. Remove duplicate CounterUpsellPanel from Payment step

**File: `src/components/admin/ops/OpsStepContent.tsx`**
- Remove lines 186-189 (the `CounterUpsellPanel` inside the `payment` step block)
- Keep only the one in the `checkin` step

#### 4. Keep handover Quick Actions as-is
The existing `VehicleAssignment` and `BookingEditPanel` in the handover step remain for last-minute changes.

---

### Technical Details

**BookingOps.tsx changes:**
- Add `vehicleDialogOpen` and `editDialogOpen` state variables
- Replace step navigation with dialog open calls in the dropdown menu
- Add two new `Dialog` components rendered at the component bottom:
  - Vehicle Assignment Dialog with `VehicleAssignment` component
  - Edit Booking Dialog with `BookingEditPanel` component

**OpsStepContent.tsx changes:**
- Add `VehicleAssignment` to the checkin step section (after `BookingEditPanel`, before `CounterUpsellPanel`)
- Remove the `CounterUpsellPanel` from the payment step (lines 186-189)

**Backend impact:** None -- all changes are UI-only, using existing components and hooks. Cache invalidation is already handled by the existing `useAssignVehicle` and `useUnassignVehicle` hooks.

