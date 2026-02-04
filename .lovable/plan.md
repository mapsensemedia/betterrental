
# Plan: Rental Ops Console Performance Optimization & Feature Integration

## Executive Summary

This plan addresses performance lag in the rental operations console, integrates missing VIN assignment functionality, and ensures mileage updates propagate correctly to vehicle records. The console is the core operational workflow for the business and requires optimization for staff efficiency.

---

## Part 1: Performance Optimization

### Problem Analysis

The BookingOps page currently initiates **11+ separate queries** on load, causing noticeable lag:

| Current Query | Stale Time | Issue |
|---------------|------------|-------|
| `useBookingById` | Default (0) | Re-fetches on every focus |
| `useWalkaroundInspection` | Default (0) | No caching |
| `useVehiclePrepStatus` | Default (0) | No caching |
| `useBookingConditionPhotos` | Default (0) | No caching |
| `useCheckInRecord` | Default (0) | No caching |
| `usePaymentDepositStatus` | Default (0) | No caching |
| `useRentalAgreement` | Default (0) | No caching |
| `useBookingVerification` | Default (0) | No caching |
| `useCheckVehicleAvailability` | Default (0) | No caching |
| `useAvailableDrivers` | Default (0) | No caching |
| Real-time subscription | Always active | Triggers invalidations |

### Proposed Solutions

#### 1. Add Tiered Caching Strategy

Apply consistent staleTime values across ops-related hooks:

```text
Tier 1 (5s)  : Real-time critical - delivery status, active status
Tier 2 (15s) : Operational data - prep status, photos, agreements
Tier 3 (30s) : Reference data - vehicle info, drivers list
```

**Files to modify:**
- `src/hooks/use-walkaround.ts`
- `src/hooks/use-vehicle-prep.ts`
- `src/hooks/use-condition-photos.ts`
- `src/hooks/use-checkin.ts`
- `src/hooks/use-payment-deposit.ts`
- `src/hooks/use-rental-agreement.ts`
- `src/hooks/use-verification.ts`
- `src/hooks/use-available-drivers.ts`

#### 2. Create Consolidated Booking Ops Query

Create a single optimized query hook that fetches all booking-related data in one request:

**New file:** `src/hooks/use-booking-ops-data.ts`

This hook will:
- Fetch booking with all related data in parallel using `Promise.all`
- Include prep status, photos, agreements, payments in one round-trip
- Return a unified object with proper TypeScript types
- Reduce network round-trips from 11+ to 3-4

#### 3. Optimize Realtime Subscriptions

Modify `useRealtimeDeliveryStatuses` to be more selective:
- Only subscribe when booking is a delivery type
- Use debounced invalidation to prevent rapid re-renders
- Add cleanup verification

---

## Part 2: VIN/Unit Assignment Integration

### Problem Analysis

The `StepIntake.tsx` component contains VIN assignment UI (`UnitAssignmentCard`) but is **never rendered** in the ops workflow. The `OpsStepContent.tsx` renders `StepCheckin` for the "checkin" step instead of `StepIntake`.

Current step content mapping in `OpsStepContent.tsx`:
```text
checkin  -> StepCheckin (customer verification only)
payment  -> StepPayment
prep     -> StepPrep (has driver assignment for delivery, no VIN)
agreement -> StepAgreement
walkaround -> StepWalkaround
photos   -> StepPhotos
handover -> StepHandover
```

**Missing:** VIN unit assignment is not accessible in any step for pickup bookings.

### Proposed Solution

Integrate the `UnitAssignmentCard` directly into the `StepCheckin` component for all bookings (pickup and delivery):

**File to modify:** `src/components/admin/ops/steps/StepCheckin.tsx`

Add a new section after customer verification:
1. Vehicle category display (already assigned at booking)
2. VIN unit selection/auto-assign capability
3. Show assigned unit details (VIN, plate, mileage)

This provides:
- Staff can assign specific vehicles during check-in
- Unit assignment is visible without navigating away
- Integrates with existing completion tracking

---

## Part 3: Mileage Update Verification

### Current Implementation

The return flow **already updates vehicle mileage** correctly in `StepReturnIntake.tsx`:

```text
// Lines 110-119 in StepReturnIntake.tsx
if (booking?.assigned_unit_id && odometer) {
  await supabase
    .from("vehicle_units")
    .update({ current_mileage: parseInt(odometer) })
    .eq("id", booking.assigned_unit_id);
}
```

### Verification Steps

1. Confirm query invalidation includes `vehicle-units` (already present)
2. Add success toast message indicating mileage was synced
3. Add visual confirmation in the fleet costs/analytics pages

**Minor enhancement:** Update success toast to clearly indicate mileage sync:
```text
"Return intake saved - Vehicle mileage updated to {value} km"
```

---

## Part 4: Code Cleanup

### Orphaned Components

The following components are underutilized and should be integrated or removed:

| Component | Status | Action |
|-----------|--------|--------|
| `StepIntake.tsx` | Never rendered | Remove - integrate useful parts into StepCheckin |
| `VehicleAssignment.tsx` | Only in StepIntake | Keep - useful for category changes |
| `UnitAssignmentCard.tsx` | Only in StepIntake | Move to StepCheckin |

### Hook Consolidation

Create unified hook for booking ops data to reduce code duplication across step components.

---

## Implementation Order

1. **Performance First** - Add staleTime to all ops hooks (immediate impact)
2. **VIN Assignment** - Integrate UnitAssignmentCard into StepCheckin
3. **Mileage Confirmation** - Enhance return flow feedback
4. **Cleanup** - Remove/consolidate orphaned code
5. **Testing** - End-to-end validation of ops flow

---

## Technical Details

### Hook Modifications for Caching

Example pattern to apply to each hook:

```typescript
// Before
return useQuery({
  queryKey: ['walkaround', bookingId],
  queryFn: async () => { ... },
  enabled: !!bookingId,
});

// After
return useQuery({
  queryKey: ['walkaround', bookingId],
  queryFn: async () => { ... },
  enabled: !!bookingId,
  staleTime: 15000, // 15 seconds for operational data
  gcTime: 60000,    // Keep in cache for 1 minute
});
```

### StepCheckin VIN Integration

Add imports and new section:

```typescript
// Add import
import { UnitAssignmentCard } from "@/components/admin/UnitAssignmentCard";

// Add after verification checklist, before closing div
{booking.vehicle_id && (
  <UnitAssignmentCard
    bookingId={booking.id}
    vehicleId={booking.vehicle_id}
    vehicleName={vehicleName}
  />
)}
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/use-walkaround.ts` | Add staleTime: 15000 |
| `src/hooks/use-vehicle-prep.ts` | Add staleTime: 15000 |
| `src/hooks/use-condition-photos.ts` | Add staleTime: 15000 |
| `src/hooks/use-checkin.ts` | Add staleTime: 15000 |
| `src/hooks/use-payment-deposit.ts` | Add staleTime: 15000 |
| `src/hooks/use-rental-agreement.ts` | Add staleTime: 15000 |
| `src/hooks/use-verification.ts` | Add staleTime: 15000 |
| `src/hooks/use-available-drivers.ts` | Add staleTime: 30000 |
| `src/components/admin/ops/steps/StepCheckin.tsx` | Add UnitAssignmentCard |
| `src/components/admin/return-ops/steps/StepReturnIntake.tsx` | Enhance mileage toast |

### Files to Remove/Consolidate

| File | Action |
|------|--------|
| `src/components/admin/ops/steps/StepIntake.tsx` | Remove after integration |

---

## Expected Outcomes

1. **~60% reduction** in initial load queries (11+ to 4-5)
2. **Visible VIN assignment** during check-in for all booking types
3. **Clear mileage sync feedback** in return flow
4. **Cleaner codebase** with reduced orphaned components
5. **Smoother UX** with reduced re-renders and lag
