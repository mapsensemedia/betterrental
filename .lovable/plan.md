
# Delivery Panel Enhancement Plan

## Summary
Enhance the Delivery Panel to provide real-time updates when new "Bring Car to Me" bookings are assigned, and display more complete delivery information for drivers.

---

## Current Issues Identified

1. **No real-time subscription** - The delivery panel doesn't refresh when new bookings are assigned to the driver
2. **Vehicle data mismatch** - The hook fetches from the legacy `vehicles` table, but `vehicle_id` in bookings now points to `vehicle_categories`
3. **Missing operational details**:
   - Assigned vehicle unit info (VIN, license plate, color)
   - Dispatch hub location (where to pick up the vehicle)
   - Customer email for additional contact

---

## Implementation Steps

### 1. Add Real-Time Subscription for Deliveries

Create a new real-time hook that invalidates the `my-deliveries` query when bookings change:

**New hook: `useRealtimeDeliveries`**
- Subscribe to `bookings` table changes
- Also subscribe to `delivery_statuses` table for status updates
- Invalidate `my-deliveries` query on changes

### 2. Fix Vehicle Category Data Fetching

Update `use-my-deliveries.ts` to fetch from `vehicle_categories` instead of the deprecated `vehicles` table:

**Changes to `useMyDeliveries`:**
- Replace `vehicles` table query with `vehicle_categories` query
- Add category name to the vehicle display
- Include category image for visual identification

### 3. Add Assigned Unit Details

Enhance the hook to fetch `vehicle_units` data when `assigned_unit_id` is present:

**New data fields:**
- VIN (Vehicle Identification Number)
- License plate
- Vehicle color
- Current mileage

### 4. Add Dispatch Hub Information

Include the dispatch location (where the driver picks up the vehicle from):

**New data fields:**
- `dispatchLocation.name` - Hub name
- `dispatchLocation.address` - Full address
- `dispatchLocation.phone` - Contact phone

### 5. Update DeliveryCard Component

Enhance the card to display new information:

**New UI elements:**
- Vehicle unit badge (license plate if available)
- "Pick up from" dispatch location section
- Customer email with tap-to-email action
- Visual indicator for urgent deliveries (within 2 hours)

### 6. Update DeliveryDashboard with Real-Time

Integrate the real-time subscription hook into the dashboard.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/use-realtime-subscriptions.ts` | Add `useRealtimeDeliveries` hook |
| `src/hooks/use-my-deliveries.ts` | Fix vehicle category fetch, add unit details, add dispatch location |
| `src/components/delivery/DeliveryCard.tsx` | Display new fields, add urgency indicator |
| `src/pages/delivery/DeliveryDashboard.tsx` | Integrate real-time subscription |
| `src/components/delivery/DeliveryShell.tsx` | Add real-time subscription for sidebar counts |

---

## Technical Details

### Updated DeliveryBooking Interface

```text
interface DeliveryBooking {
  // ... existing fields ...
  
  // Enhanced vehicle info (from vehicle_categories)
  category: {
    id: string;
    name: string;
    imageUrl: string | null;
  } | null;
  
  // Assigned unit details (from vehicle_units)
  assignedUnit: {
    id: string;
    vin: string;
    licensePlate: string | null;
    color: string | null;
  } | null;
  
  // Dispatch hub (where driver picks up vehicle)
  dispatchLocation: {
    id: string;
    name: string;
    address: string;
    phone: string | null;
  } | null;
  
  // Customer email added
  customer: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  
  // Urgency flag
  isUrgent: boolean; // true if pickup within 2 hours
}
```

### Real-Time Subscription Flow

```text
Booking assigned to driver
        │
        ▼
Supabase Realtime broadcasts change
        │
        ▼
useRealtimeDeliveries receives event
        │
        ▼
Invalidates "my-deliveries" query
        │
        ▼
React Query refetches data
        │
        ▼
Delivery Panel UI updates instantly
```

---

## Expected Outcome

After implementation:
- Drivers will see new assigned deliveries appear instantly without refreshing
- Each delivery card will show:
  - Vehicle category with image
  - Assigned unit license plate (if assigned)
  - Dispatch hub location ("Pick up vehicle from...")
  - Customer contact with phone AND email
  - Urgency indicator for time-sensitive deliveries
- Status updates from other drivers will reflect in real-time
