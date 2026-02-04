
# Multi-Issue Fix: Search, Walkaround Edit, Delivery Ops, and Pay at Pickup

## Issues to Address

1. **Booking search not finding results** - The OpsShell search navigates to `/ops/booking/{bookingCode}` but the route expects a booking ID (UUID). Need to first lookup booking by code, then redirect to the actual booking.

2. **Vehicle Walkaround has no edit option** - Once marked complete, the walkaround step cannot be edited. Need to add an "Edit" button to allow re-opening completed steps.

3. **Delivery bookings operations flow needs splitting** - Pre-delivery steps (check-in, payment, vehicle prep) should be done in the Operations panel, while customer-facing steps (rental agreement, vehicle walkaround) should be done through the Delivery Portal at the delivery location.

4. **"Bring Car to Me" should not have Pay at Pickup option** - Delivery bookings require payment before the vehicle leaves the depot, so the "Pay at Pickup" option should be hidden for delivery mode.

---

## Implementation Plan

### 1. Fix Booking Search by Code/Name/Email/Phone

**Problem**: The OpsShell search navigates directly to `/ops/booking/{code}` but the route expects a UUID. Also, the search should support customer name, email, and phone.

**Files to Modify**:
- `src/components/ops/OpsShell.tsx` - Update search to look up booking first
- `src/domain/bookings/queries.ts` - Add search by code/name/email/phone function

**Changes**:

```typescript
// In OpsShell.tsx - Replace direct navigation with lookup
const handleBookingSearch = async (e: React.FormEvent) => {
  e.preventDefault();
  const term = bookingCode.trim();
  if (!term) return;
  
  setSearching(true);
  try {
    // Check if it looks like a booking code (alphanumeric, starts with C2C)
    if (term.match(/^C2C[A-Z0-9]+$/i)) {
      const booking = await getBookingByCode(term);
      if (booking) {
        navigate(`/ops/booking/${booking.id}`);
        return;
      }
    }
    
    // Otherwise search by name/email/phone
    navigate(`/ops/bookings?search=${encodeURIComponent(term)}`);
  } finally {
    setSearching(false);
    setBookingCode("");
  }
};
```

**New query function in queries.ts**:
```typescript
export async function searchBookings(term: string): Promise<BookingSummary[]> {
  // Search across booking_code, profile name, email, phone
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, locations(id, name, city, address)")
    .or(`booking_code.ilike.%${term}%`)
    .order("created_at", { ascending: false })
    .limit(20);
  
  // Also search profiles for matches
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  
  if (profiles?.length) {
    const profileIds = profiles.map(p => p.id);
    const { data: profileBookings } = await supabase
      .from("bookings")
      .select("*, locations(id, name, city, address)")
      .in("user_id", profileIds)
      .limit(20);
    
    // Merge and dedupe results
    // ...
  }
  
  return results;
}
```

---

### 2. Add Edit Functionality to Vehicle Walkaround

**Problem**: Once the walkaround is marked as complete, there's no way to edit it.

**Files to Modify**:
- `src/components/admin/ops/steps/StepWalkaround.tsx` - Add edit mode toggle
- `src/hooks/use-walkaround.ts` - Add mutation to re-open inspection

**Changes**:

```typescript
// In StepWalkaround.tsx
const [isEditing, setIsEditing] = useState(false);

// Add Edit button next to Complete badge
{isComplete && !isEditing && (
  <Button variant="outline" size="sm" onClick={() => handleReopen()}>
    <Pencil className="h-3.5 w-3.5 mr-1" />
    Edit
  </Button>
)}

// Re-open handler
const handleReopen = () => {
  reopenWalkaround.mutate(inspection.id, {
    onSuccess: () => {
      setIsEditing(true);
      toast.success("Walkaround reopened for editing");
    }
  });
};
```

**New hook mutation**:
```typescript
export function useReopenWalkaround() {
  return useMutation({
    mutationFn: async (inspectionId: string) => {
      const { error } = await supabase
        .from("walkaround_inspections")
        .update({ inspection_complete: false })
        .eq("id", inspectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"] });
    },
  });
}
```

---

### 3. Split Delivery Bookings Operations Flow

**Current Flow** (all in BookingOps):
1. Customer Check-In
2. Payment & Deposit
3. Rental Agreement
4. Vehicle Walkaround
5. Handover Photos
6. Handover & Activation

**New Flow**:

**Operations Panel (Pre-Delivery Steps)**:
1. Customer Check-In (verify identity remotely)
2. Payment & Deposit (collect before vehicle leaves)
3. Vehicle Unit Assignment (assign specific VIN)
4. Pre-Delivery Photos (staff captures before dispatch)
5. Dispatch to Driver (transition to delivery portal)

**Delivery Portal (On-Site with Customer)**:
1. Rental Agreement (customer signs on-site)
2. Vehicle Walkaround (with customer)
3. Handover Photos (final photos at delivery location)
4. Complete Delivery (activate rental)

**Files to Modify**:
- `src/lib/ops-steps.ts` - Add step configurations for delivery vs pickup flows
- `src/pages/admin/BookingOps.tsx` - Show only pre-delivery steps for delivery bookings
- `src/pages/delivery/DeliveryDetail.tsx` - Add on-site steps (walkaround, agreement already there)
- `src/components/admin/ops/steps/StepHandover.tsx` - For delivery, show "Dispatch to Driver" instead of "Activate"

**Changes**:

```typescript
// In ops-steps.ts - Add delivery-specific step configurations
export const OPS_STEPS_DELIVERY_PRE = [
  { id: "checkin", ... },
  { id: "payment", ... },
  { id: "prep", title: "Vehicle Assignment", ... },
  { id: "photos", title: "Pre-Delivery Photos", ... },
  { id: "dispatch", title: "Dispatch to Driver", ... },
];

export const DELIVERY_PORTAL_STEPS = [
  { id: "agreement", ... },
  { id: "walkaround", ... },
  { id: "photos", title: "Handover Photos", ... },
  { id: "handover", ... },
];
```

**In BookingOps.tsx**:
```typescript
// Use different steps based on booking type
const steps = isDeliveryBooking ? OPS_STEPS_DELIVERY_PRE : OPS_STEPS;

// For delivery handover step, show dispatch button instead
{isDeliveryBooking && activeStep === "dispatch" && (
  <DispatchStep 
    bookingId={bookingId}
    assignedDriver={assignedDriver}
    onDispatch={() => navigate("/delivery")}
  />
)}
```

**In DeliveryDetail.tsx** - Add the on-site steps:
```typescript
// Add walkaround step component
<Card>
  <CardHeader>
    <CardTitle>Vehicle Walkaround</CardTitle>
    <CardDescription>Complete inspection with customer</CardDescription>
  </CardHeader>
  <CardContent>
    <StepWalkaround bookingId={delivery.id} completion={...} />
  </CardContent>
</Card>
```

---

### 4. Disable Pay at Pickup for Delivery Bookings

**Problem**: Delivery bookings require payment before the vehicle leaves the depot.

**Files to Modify**:
- `src/pages/NewCheckout.tsx` - Conditionally hide "Pay at Pickup" for delivery mode

**Changes**:

```typescript
// In NewCheckout.tsx
const isDeliveryMode = searchData.deliveryMode === "delivery";

// Force pay-now for delivery
useEffect(() => {
  if (isDeliveryMode && paymentMethod === "pay-later") {
    setPaymentMethod("pay-now");
  }
}, [isDeliveryMode, paymentMethod]);

// In the payment method selection UI:
<div className="grid grid-cols-2 gap-3">
  <button
    type="button"
    onClick={() => setPaymentMethod("pay-now")}
    className={cn(
      "p-3 rounded-lg border-2 text-left transition-all",
      paymentMethod === "pay-now"
        ? "border-primary bg-primary/5"
        : "border-border hover:border-muted-foreground/50",
      isDeliveryMode && "col-span-2" // Full width when only option
    )}
  >
    <p className="font-medium text-sm">Pay Now</p>
    <p className="text-xs text-muted-foreground">Instant confirmation</p>
  </button>
  
  {/* Hide Pay at Pickup for delivery */}
  {!isDeliveryMode && (
    <button
      type="button"
      onClick={() => setPaymentMethod("pay-later")}
      className={cn(
        "p-3 rounded-lg border-2 text-left transition-all",
        paymentMethod === "pay-later"
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50"
      )}
    >
      <p className="font-medium text-sm">Pay at Pickup</p>
      <p className="text-xs text-muted-foreground">Card required on file</p>
    </button>
  )}
</div>

{/* Add info message for delivery */}
{isDeliveryMode && (
  <p className="text-xs text-muted-foreground mt-2">
    Payment is required before delivery. Pay at pickup is not available for deliveries.
  </p>
)}
```

---

## Summary of Files to Change

| File | Changes |
|------|---------|
| `src/components/ops/OpsShell.tsx` | Update search to lookup booking by code, redirect to search page for name/email/phone |
| `src/domain/bookings/queries.ts` | Add `searchBookings()` function for multi-field search |
| `src/components/admin/ops/steps/StepWalkaround.tsx` | Add "Edit" button to re-open completed walkaround |
| `src/hooks/use-walkaround.ts` | Add `useReopenWalkaround()` mutation |
| `src/lib/ops-steps.ts` | Add delivery-specific step configurations |
| `src/pages/admin/BookingOps.tsx` | Use delivery-specific pre-delivery steps for delivery bookings |
| `src/pages/delivery/DeliveryDetail.tsx` | Add walkaround and on-site steps |
| `src/pages/NewCheckout.tsx` | Hide "Pay at Pickup" for delivery bookings |

---

## Technical Notes

### Booking Search Flow
1. User enters search term in OpsShell
2. If term matches booking code pattern (C2C...), try direct lookup
3. If found, navigate to booking detail page
4. If not found or doesn't match pattern, navigate to `/ops/bookings?search=term`
5. OpsBookings page filters results by term across code/name/email/phone

### Delivery Ops Split
The key insight is that delivery bookings have two distinct phases:
- **Pre-dispatch**: Staff prepares everything before the vehicle leaves
- **On-site**: Driver completes customer-facing tasks at delivery location

The Delivery Portal already has the agreement signing UI. We add the walkaround step there as well.

### Payment Flow for Delivery
By hiding the "Pay at Pickup" option for delivery mode, we ensure payment is always collected before the vehicle is dispatched. This aligns with the business requirement that payment must occur before handover for deliveries.
