

## Delivery Flow Rebuild — Plan

### Current State

**Duplicate pages**: `src/pages/delivery/` has 3 old files (DeliveryDashboard, DeliveryDetail, DeliveryWalkIn) that are **dead code** — App.tsx imports from `src/features/delivery/pages/`. However, the old `pages/delivery/DeliveryDetail.tsx` actually has the better implementation with RentalAgreementSign and StepWalkaround embedded.

**Admin ops panel**: `OPS_STEPS_DELIVERY_PRE` currently has 6 steps: checkin → payment → agreement → ready_line → dispatch → ops_activate. It is **missing walkaround** between agreement and ready_line. The OpsStepContent already renders StepAgreement and StepWalkaround for any stepId match, so adding walkaround to the step list is sufficient.

**Delivery portal**: `features/delivery/pages/Detail.tsx` uses a flat card layout with simple status-transition buttons (DeliveryActions). No guided step flow. No agreement signing or walkaround.

**dispatch creates delivery_tasks**: The `assignDriverMutation` in StepDispatch does a direct `.update()` on delivery_tasks (which may not exist yet), and `handleDispatch` calls `completeStage("dispatch")` which uses the upsert-fallback in `useUpdateDeliveryTask`. But `assignDriverMutation` does NOT use upsert — it silently fails if no row exists.

---

### Implementation Steps

#### 1. Add Walkaround Step to Delivery Ops Steps
**File**: `src/lib/ops-steps.ts`
- Insert walkaround step (number 4) between agreement (3) and ready_line (renumber to 5)
- Renumber: agreement=3, walkaround=4, ready_line=5, dispatch=6, ops_activate=7

#### 2. Fix StepDispatch to Create delivery_tasks on Driver Assignment
**File**: `src/components/admin/ops/steps/StepDispatch.tsx`
- In `assignDriverMutation`, change the delivery_tasks `.update()` to `.upsert()` with `onConflict: "booking_id"` so the row is created if missing
- Include `status: "pending"` and `assigned_driver_id: driverId` in the upsert payload

#### 3. Remove Dead Delivery Pages
**Files to delete**: `src/pages/delivery/DeliveryDashboard.tsx`, `src/pages/delivery/DeliveryDetail.tsx`, `src/pages/delivery/DeliveryWalkIn.tsx`
- These are not imported anywhere in App.tsx — safe to remove

#### 4. Rebuild Delivery Portal Detail as Sequential Step Flow
**File**: `src/features/delivery/pages/Detail.tsx`
- Replace the current flat card layout with a guided step wizard matching the ops panel UX
- Steps based on delivery status:
  - **En Route** (picked_up → en_route): status button with navigation
  - **Arrived** (en_route → arrived): mark arrived button
  - **Rental Agreement** (if not pre-signed): embed `RentalAgreementSign` component from `src/components/booking/RentalAgreementSign.tsx`
  - **Vehicle Walkaround**: embed `StepWalkaround` component for joint inspection
  - **Handover Photos**: photo capture section
  - **Complete Delivery**: embed `DeliveryHandoverCapture` for key handover and activation
- Left sidebar/top progress bar showing all steps with current status
- Main content area shows the active step
- Reuse existing components — no new components needed

#### 5. Update Delivery Portal Step Constants
**File**: `src/lib/ops-steps.ts`
- Update `DELIVERY_PORTAL_STEPS` to include en_route and arrived steps:
  - en_route (1), arrived (2), agreement (3), walkaround (4), photos (5), handover (6)
- Add new step IDs `en_route` and `arrived` to `OpsStepId` type

#### 6. Wire Up Step Completion Logic for Delivery Portal
**File**: `src/features/delivery/pages/Detail.tsx`
- Track which steps are complete based on delivery status and task data
- en_route complete when status is en_route or later
- arrived complete when status is arrived or later
- agreement complete when rental agreement is signed
- walkaround complete when inspection is done
- photos complete when handover photos captured
- handover complete when delivery is marked delivered

---

### Files Modified
1. `src/lib/ops-steps.ts` — add walkaround to delivery pre-dispatch, add en_route/arrived step IDs, update portal steps
2. `src/components/admin/ops/steps/StepDispatch.tsx` — upsert delivery_tasks on driver assignment
3. `src/features/delivery/pages/Detail.tsx` — rebuild as sequential step wizard
4. Delete `src/pages/delivery/DeliveryDashboard.tsx`, `DeliveryDetail.tsx`, `DeliveryWalkIn.tsx`

### Components Reused (not modified)
- StepAgreement, StepWalkaround, StepPhotos, StepCheckin, StepPayment
- RentalAgreementSign, DeliveryHandoverCapture
- OpsStepContent (already handles all step IDs)

