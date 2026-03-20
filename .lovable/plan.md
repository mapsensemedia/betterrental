

## Fix Delivery Activation Architecture

### Problem
1. The delivery portal's "Complete Handover" step works but is buried as a simple status transition button. It doesn't clearly communicate that this activates the rental.
2. Ops Backup Activation requires delivery portal evidence (photos, ID check, arrived status) creating a deadlock when all admin ops steps are done but driver hasn't completed on-site steps.
3. The ops backup activation does a direct `.update()` on bookings which may be blocked by the `trg_block_sensitive_booking_updates` trigger.

### Changes

#### 1. Rebuild Delivery Portal Handover Step (Primary Activation Path)
**File**: `src/features/delivery/pages/Detail.tsx` (lines 305-314)

Replace the handover step content with a proper activation flow:
- Show HandoverChecklist as before
- Below checklist, show a prominent "Activate Rental & Complete Delivery" button (green, large)
- Button is disabled until all prior portal steps (agreement, walkaround, photos) are complete
- On click: show confirmation dialog explaining this will activate the rental
- On confirm: call `markDelivered()` which already triggers `updateDeliveryStatus` → sets booking to `active` + vehicle unit to `on_rent`
- On success: show success screen with confirmation message
- On failure: show error with "Contact Operations for backup activation" message
- If already delivered: show green "Rental Activated" confirmation card

#### 2. Relax Ops Backup Activation Prerequisites
**File**: `src/components/admin/ops/steps/OpsBackupActivation.tsx`

Change the prerequisites array (lines 74-80):
- "Driver Arrived at Location" → keep but change to **optional** (not required)
- "Handover Photos Captured" → change to **optional** (driver captures these, not ops)
- "ID Check Passed" → **remove entirely** (already done in Step 1 Customer Verification)
- "Fuel Level Recorded" → keep as optional
- "Odometer Recorded" → keep as optional
- Only **hard requirement**: activation reason (min 10 chars) — already implemented

Update the `canActivate` check: only require `reason.trim().length >= 10`.

Update the description to clearly state: "This is only needed if the driver cannot activate from the Delivery Portal. Check delivery portal status first."

#### 3. Relax Ops Backup Activation Backend Validation
**File**: `src/hooks/use-delivery-task.ts` (lines 343-372)

In `useOpsBackupActivation.mutationFn`:
- Remove the delivery status check (lines 352-361) — ops backup should work even if driver status is not "arrived"
- Remove the handover photo count check (lines 364-372)
- Keep only: authentication check + reason validation
- The booking status update (lines 377-388) does a direct `.update()` — this may be blocked by the database trigger. Change to use `supabase.functions.invoke("update-booking-status")` edge function instead, which runs as service_role

#### 4. Update Handover Step Label in Delivery Portal
**File**: `src/features/delivery/constants/delivery-status.ts`

Change the `arrived` status `actionLabel` (line 116) from "Complete Handover" to "Activate Rental & Complete Delivery" to make the action clearer.

### Files Modified
1. `src/features/delivery/pages/Detail.tsx` — rebuild handover step with proper activation UI
2. `src/components/admin/ops/steps/OpsBackupActivation.tsx` — relax prerequisites to reason-only
3. `src/hooks/use-delivery-task.ts` — remove backend evidence checks from ops backup
4. `src/features/delivery/constants/delivery-status.ts` — update action label

### What Already Works (No Changes Needed)
- `updateDeliveryStatus` in `src/features/delivery/api/mutations.ts` (line 71-93) already activates the booking and sets vehicle to `on_rent` when status = "delivered"
- Audit logging already exists in both paths
- `DeliveryActions` component already handles the status transition flow

