
# Security & Workflow Hardening Plan

This plan addresses three critical operational gaps that can lead to audit trail issues, workflow bypasses, and fleet tracking problems.

---

## Overview

| Issue | Risk Level | Impact |
|-------|------------|--------|
| No Void Booking UI | Medium | Admins can't void bookings through UI - must be done via API |
| Return workflow bypass | High | Status can be changed without damage inspection, auto-releasing deposits |
| VIN not enforced | Medium | Vehicles rented without proper fleet assignment tracking |

---

## 1. Add Void Booking UI to Admin Panel

### What's Missing
- The `void-booking` edge function exists and properly logs to `audit_logs`
- The domain mutation `voidBooking()` exists in `src/domain/bookings/mutations.ts`
- But there's no UI component to trigger this action

### Solution
Create a `VoidBookingDialog` component similar to `CancelBookingDialog`:

- **Reason selection** (required): Fraud detected, Booking error, Dispute resolution, Duplicate entry, Other
- **Detailed notes** (minimum 20 characters)
- **Optional refund amount input** (for tracking purposes)
- **Confirmation step** with warning about permanent nature

### Files to Create/Modify
- Create: `src/components/admin/VoidBookingDialog.tsx`
- Modify: `src/pages/admin/BookingDetail.tsx` - Add "Void Booking" option to actions menu
- Modify: `src/pages/admin/Bookings.tsx` - Add void action to row-level menu

### UI Placement
- BookingDetail page: Add to header actions dropdown (only visible for admin role)
- Bookings list: Add to row-level context menu (hidden from completed/cancelled)

---

## 2. Enforce Return Workflow State Machine

### Current Problem
The `useUpdateBookingStatus` hook allows direct status changes:
```typescript
// This bypasses the entire return workflow!
updateStatus.mutate({ bookingId, newStatus: "completed" });
```

### Solution
Add workflow validation before status changes:

**A. Create validation function** in `src/lib/return-steps.ts`:
```typescript
export function canBypassReturnWorkflow(
  currentStatus: BookingStatus,
  newStatus: BookingStatus,
  returnState: ReturnState
): { allowed: boolean; reason?: string } {
  // Only block active → completed transitions
  if (currentStatus === "active" && newStatus === "completed") {
    if (!isStateAtLeast(returnState, "closeout_done")) {
      return {
        allowed: false,
        reason: "Complete return workflow first (intake, evidence, issues, closeout)"
      };
    }
  }
  return { allowed: true };
}
```

**B. Update `useUpdateBookingStatus`** to check workflow:
- Fetch `return_state` along with booking details
- Call validation before allowing `active → completed`
- Show error toast if workflow not complete
- Add optional `bypassReason` parameter for exceptional cases (admin override with logged reason)

**C. Add admin override capability**:
- If admin provides `bypassReason`, log it prominently in audit
- Require minimum 50 characters for bypass justification
- Create admin alert for any bypassed workflows

### Files to Modify
- `src/lib/return-steps.ts` - Add validation function
- `src/hooks/use-bookings.ts` - Enforce workflow check in `useUpdateBookingStatus`
- `src/domain/bookings/mutations.ts` - Add bypass handling to domain function

---

## 3. Enforce VIN Assignment Before Activation

### Current Problem
In `BookingOps.tsx`, the `handleActivateRental` function checks:
- ✅ Walkaround complete
- ✅ Payment collected  
- ✅ Agreement signed
- ❌ **VIN assigned (missing!)**

### Solution

**A. Update `StepHandover.tsx`** prerequisites:
Add "Unit Assigned" to the checklist:
```typescript
const prerequisites = [
  // ... existing checks
  { label: "Vehicle Unit Assigned", complete: !!booking.assigned_unit_id },
];
```

**B. Update `handleActivateRental`** in `BookingOps.tsx`:
```typescript
if (!booking.assigned_unit_id) {
  toast.error("Assign a vehicle unit (VIN) before activation");
  return;
}
```

**C. Update completion object**:
Add VIN check to `StepCompletion.handover`:
```typescript
handover: {
  activated: booking?.status === 'active',
  smsSent: !!booking?.handover_sms_sent_at,
  unitAssigned: !!booking?.assigned_unit_id, // NEW
}
```

**D. For delivery bookings** (already handled):
- Delivery prep step already requires VIN assignment
- Validate in dispatch step as well

### Files to Modify
- `src/pages/admin/BookingOps.tsx` - Add VIN check to activation
- `src/components/admin/ops/steps/StepHandover.tsx` - Add to prerequisites list
- `src/lib/ops-steps.ts` - Add `unitAssigned` to completion interface

---

## Technical Details

### VoidBookingDialog Component
```text
+------------------------------------------+
|  ⚠️ Void Booking                          |
|  GHTZ5KW2                                 |
+------------------------------------------+
|  Reason for voiding: *                    |
|  [Dropdown: Fraud/Error/Dispute/etc]      |
|                                          |
|  Detailed explanation: *                  |
|  [Textarea - min 20 chars]               |
|                                          |
|  Refund amount (optional):               |
|  [$ ______]                              |
|                                          |
|  ⚠️ This action cannot be undone.         |
|  The booking will be marked as voided    |
|  and logged in the audit trail.          |
|                                          |
|  [Cancel]  [Void Booking]                |
+------------------------------------------+
```

### Return Workflow Validation Flow
```text
User clicks "Complete Return"
         ↓
Check: currentStatus === "active" && newStatus === "completed"?
         ↓ Yes
Fetch return_state from database
         ↓
Check: isStateAtLeast(returnState, "closeout_done")?
         ↓ No
❌ Block: "Complete return workflow first"
         ↓ Yes
✅ Allow status change → Deposit automation runs
```

### VIN Enforcement Flow  
```text
User clicks "Activate Rental"
         ↓
Check: assigned_unit_id is not null?
         ↓ No
❌ Block: "Assign vehicle unit first"
         ↓ Yes
Continue with existing validation
         ↓
✅ Activate rental
```

---

## Summary of Changes

| File | Change |
|------|--------|
| **New:** `src/components/admin/VoidBookingDialog.tsx` | Void booking UI component |
| `src/pages/admin/BookingDetail.tsx` | Add void action to menu |
| `src/lib/return-steps.ts` | Add bypass validation function |
| `src/hooks/use-bookings.ts` | Enforce workflow in status updates |
| `src/pages/admin/BookingOps.tsx` | Add VIN check to activation |
| `src/components/admin/ops/steps/StepHandover.tsx` | Add VIN to prerequisites |
| `src/lib/ops-steps.ts` | Add unitAssigned to completion |

---

## Testing Checklist

After implementation, verify:
1. [x] Void booking dialog appears only for admin users
2. [x] Voided bookings are logged with user ID and reason in audit_logs
3. [x] Attempting to complete a rental without return workflow shows error
4. [x] Attempting to activate without VIN shows error  
5. [x] Delivery bookings still work correctly with VIN assignment
6. [x] Admin override with justification is logged prominently

---

## Implementation Status: ✅ COMPLETE

All three security hardening items have been implemented:

1. **VoidBookingDialog** - Created new component at `src/components/admin/VoidBookingDialog.tsx`
   - Reason dropdown with 6 options (fraud, error, dispute, duplicate, customer request, other)
   - Notes field requiring minimum 20 characters
   - Optional refund tracking field
   - Destructive warning before action
   - Added to BookingDetail.tsx header actions dropdown

2. **Return Workflow Enforcement** - Updated `src/lib/return-steps.ts` and `src/hooks/use-bookings.ts`
   - Added `validateReturnWorkflow()` function
   - Blocks `active → completed` unless `return_state` is `closeout_done`
   - Admin bypass requires 50+ character justification
   - Bypasses create admin alerts and prominent audit logs

3. **VIN Enforcement** - Updated `BookingOps.tsx`, `StepHandover.tsx`, and `ops-steps.ts`
   - Added VIN check to `handleActivateRental()`
   - Added "Vehicle Unit Assigned (VIN)" to handover prerequisites
   - Added `unitAssigned` field to `StepCompletion.handover` interface
