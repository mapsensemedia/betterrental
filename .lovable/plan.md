
# Delivery Booking Ops Flow Enhancement Plan

## Overview

This plan addresses how to differentiate the BookingOps wizard for "Bring Car to Me" (delivery) bookings versus standard pickup bookings. The core insight is that delivery bookings have fundamentally different logistics: the vehicle travels TO the customer rather than the customer arriving at the location.

---

## Current State Analysis

### How Delivery Bookings Are Identified
A booking is considered a delivery booking when:
- `pickup_address IS NOT NULL` (primary indicator)
- The booking was made with "Bring Car to Me" delivery mode selected

### Current BookingOps Flow (6 Steps)
1. **Pre-Arrival Prep** - Vehicle checklist + photos
2. **Customer Check-In** - Gov ID, license verification
3. **Payment & Deposit** - Payment collection
4. **Rental Agreement** - Manual signing
5. **Vehicle Walkaround** - Staff inspection
6. **Handover & Activation** - Keys + SMS

### Gap Analysis
The current flow assumes **in-person pickup at a location**. For delivery bookings:

| Step | Standard Pickup | Delivery Booking |
|------|-----------------|------------------|
| Prep | Done at location before customer arrives | Done at dispatch hub before driver leaves |
| Check-In | Customer physically present | Driver verifies at delivery address |
| Payment | Usually already paid online | Same, but deposit may be collected on delivery |
| Agreement | Signed in-person at counter | Signed at delivery address (or pre-signed online) |
| Walkaround | Joint inspection at location | Driver does walkaround at delivery point |
| Handover | Hand keys at counter | Hand keys at customer's address |

---

## Proposed Solution

### A. Add "Delivery Mode" Detection & Visual Indicator

Display a prominent delivery banner at the top of BookingOps when `pickup_address` exists, showing:
- Delivery address
- Assigned driver (or "Unassigned" warning)
- Dispatch hub origin
- Link to open in Delivery Portal

### B. Modify Step Definitions for Delivery Flow

Create a parallel step configuration (`DELIVERY_OPS_STEPS`) that replaces or augments standard steps:

```text
DELIVERY OPS STEPS (6 Steps - Same Count, Different Context)

1. Dispatch Prep (replaces "Pre-Arrival Prep")
   - Vehicle checklist (same)
   - Pre-inspection photos (same)
   - NEW: Assign driver (required before dispatch)
   - NEW: Driver acknowledgement checkbox

2. En Route (NEW - replaces "Check-In" for delivery context)
   - Driver marked "en route" in Delivery Portal
   - Customer notified via SMS
   - ETA displayed
   - Driver can update status from mobile

3. Payment & Deposit (same)
   - Show "Collect on delivery" note if deposit not yet held

4. On-Site Agreement (renamed from "Rental Agreement")
   - Agreement signing at delivery location
   - Or: Show if customer pre-signed online

5. On-Site Walkaround (renamed from "Vehicle Walkaround")
   - Performed at delivery address by driver
   - Photo upload from driver's device

6. Handover & Activation (same behavior)
   - Driver hands keys
   - SMS confirmation
   - Rental activated
```

### C. Conditional UI Rendering

The step sidebar and content will dynamically switch based on `booking.pickup_address`:

```text
const isDeliveryBooking = !!booking.pickup_address;
const steps = isDeliveryBooking ? DELIVERY_OPS_STEPS : OPS_STEPS;
```

### D. Add Driver Assignment Gate

For delivery bookings, add a **blocking issue** if no driver is assigned:
- Step 1 (Dispatch Prep) cannot be completed without `assigned_driver_id`
- Show prominent "Assign Driver" action button

### E. Integration with Delivery Portal

Add bidirectional linking:
- **In BookingOps**: "Open in Delivery Portal" button for delivery bookings
- **In Delivery Portal**: Deep link to BookingOps for admin-level tasks

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/ops-steps.ts` | Add `DELIVERY_OPS_STEPS` array, update types to support delivery-specific logic |
| `src/pages/admin/BookingOps.tsx` | Detect delivery mode, pass `isDelivery` flag to components |
| `src/components/admin/ops/OpsStepSidebar.tsx` | Conditionally render delivery or standard steps |
| `src/components/admin/ops/OpsStepContent.tsx` | Render delivery-specific step components |
| `src/components/admin/ops/OpsBookingSummary.tsx` | Add delivery status section |
| `src/components/admin/ops/steps/StepPrep.tsx` | Add driver assignment requirement for delivery |
| **NEW** `src/components/admin/ops/steps/StepEnRoute.tsx` | New step for tracking driver in transit |
| **NEW** `src/components/admin/ops/DeliveryModeBanner.tsx` | Visual indicator for delivery bookings |

---

## UI Mockup (Text Description)

### Delivery Mode Banner (Top of BookingOps)
```text
┌──────────────────────────────────────────────────────────────────┐
│ 🚚 DELIVERY BOOKING                                              │
│ ─────────────────────────────────────────────────────────────── │
│ Deliver To: 123 Main St, Vancouver, BC V6B 1A1                   │
│ Dispatch From: Downtown Hub                                       │
│ ─────────────────────────────────────────────────────────────── │
│ Driver: John Smith ✓ Assigned    [Open in Delivery Portal →]    │
└──────────────────────────────────────────────────────────────────┘
```

### Modified Step 1 for Delivery
```text
┌──────────────────────────────────────────────────────────────────┐
│ Step 1: Dispatch Preparation                                     │
│                                                                  │
│ ⚠️ Driver Assignment Required                                   │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Assign a driver before vehicle can be dispatched            │  │
│ │ [Select Driver ▼] [Assign]                                  │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ✅ Prep Checklist: Complete                                     │
│ ✅ Pre-Inspection Photos: 6/6                                   │
│                                                                  │
│ [Continue to Step 2 →]                                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## Business Rules

1. **Driver Assignment is Mandatory**: Delivery bookings cannot progress past Step 1 without an assigned driver
2. **Step Labels Update Dynamically**: "Check-In" becomes "En Route" for delivery bookings
3. **Delivery Status Syncs**: When driver updates status in Delivery Portal, it reflects in BookingOps
4. **Same Completion Gates**: Payment, agreement, and walkaround requirements remain the same

---

## Technical Implementation Notes

### Step ID Mapping
To maintain compatibility with existing `StepCompletion` tracking, delivery steps will use the same IDs but with different titles:

| ID | Standard Title | Delivery Title |
|----|----------------|----------------|
| `prep` | Pre-Arrival Preparation | Dispatch Preparation |
| `checkin` | Customer Check-In | En Route / Arrival |
| `payment` | Payment & Deposit | Payment & Deposit |
| `agreement` | Rental Agreement | On-Site Agreement |
| `walkaround` | Vehicle Walkaround | On-Site Walkaround |
| `handover` | Handover & Activation | Handover & Activation |

### New Completion Field for Delivery
Add to `StepCompletion.prep`:
```text
prep: {
  checklistComplete: boolean;
  photosComplete: boolean;
  driverAssigned: boolean; // NEW - required for delivery
}
```

---

## Migration Path

1. **Phase 1**: Add delivery detection + visual banner (no workflow changes)
2. **Phase 2**: Add driver assignment gate to Step 1 for delivery bookings
3. **Phase 3**: Rename step labels contextually for delivery bookings
4. **Phase 4**: Add "En Route" step with Delivery Portal sync

This plan proposes implementing Phases 1-2 first for immediate value, with Phase 3-4 as follow-up enhancements.
