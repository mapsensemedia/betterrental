
# Comprehensive Multi-Panel Integration Plan

## Overview
This plan addresses three major requirements:
1. **Damage/Incident ↔ Support Ticket Integration** - Making damage reports visible in Support Panel
2. **New Delivery Panel** - Creating a dedicated panel for delivery drivers
3. **Cross-Panel Data Linking** - Ensuring all three panels share the same backend data

---

## Part 1: Damage/Incident ↔ Support Ticket Integration

### Problem
When a damage incident is created in Active Rental, it does not appear in the Support Panel because:
- No support ticket is auto-created when damage is reported
- The `support_tickets_v2` table has `incident_id` but no `damage_id` column
- Damage reports exist in isolation from the support workflow

### Solution

#### Database Changes
1. Add `damage_id` column to `support_tickets_v2` table
2. Create a database trigger that auto-creates a high-priority "Damage" category ticket when a `damage_reports` row is inserted

#### Code Changes
1. **Update `use-damages.ts`** - When creating damage, also create a linked support ticket
2. **Update `use-support-v2.ts`** - Include damage-linked tickets and display damage details
3. **Update Support Panel UI** - Show damage photos, severity, and vehicle info for damage-category tickets
4. **Add cross-links** - Link from Admin Damages page to Support ticket and vice versa

---

## Part 2: Delivery Panel Architecture

### New Role: `driver`
Add a `driver` role to the `app_role` enum for delivery personnel with limited access.

### Delivery Panel Features

| Feature | Description |
|---------|-------------|
| **My Deliveries** | List of bookings assigned to the logged-in driver |
| **Delivery Details** | Address, customer contact, pickup time, navigation link |
| **Create Walk-In Booking** | Simplified booking creation for field drivers |
| **Update Status** | Mark delivery as "picked up from lot", "en route", "delivered" |
| **Photo Capture** | Upload handover photos for proof of delivery |
| **Report Issue** | Quick incident/damage reporting from the field |

### Database Changes
1. Add `driver` to `app_role` enum
2. Create `delivery_status` table to track delivery workflow states
3. Add `delivery_status` column to bookings or use the existing state machine

### New Files to Create

```
src/pages/delivery/
├── DeliveryDashboard.tsx     # Main delivery driver home
├── DeliveryDetail.tsx        # Single delivery details + actions
└── DeliveryWalkIn.tsx        # Simplified walk-in booking form

src/components/delivery/
├── DeliveryProtectedRoute.tsx  # Role-based access guard
├── DeliveryShell.tsx           # Layout shell similar to SupportShell
├── DeliveryCard.tsx            # Delivery assignment card
├── DeliveryStatusBadge.tsx     # Visual status indicator
└── DeliveryHandoverCapture.tsx # Photo upload for proof

src/hooks/
├── use-delivery-access.ts      # Check if user has driver role
└── use-my-deliveries.ts        # Fetch deliveries for current driver
```

### Routes
```typescript
/delivery              → DeliveryDashboard (list of my deliveries)
/delivery/:bookingId   → DeliveryDetail (single delivery + actions)
/delivery/walk-in      → DeliveryWalkIn (create booking)
```

---

## Part 3: Cross-Panel Data Linking

### Unified Backend
All three panels use the same Supabase tables:
- `bookings` - Core booking data
- `damage_reports` - Damage records
- `incident_cases` - Incident records  
- `support_tickets_v2` - Support tickets
- `user_roles` - Role-based access

### Cross-Navigation Links

| From | To | Link |
|------|-----|------|
| Admin Damage → | Support Ticket | "View Ticket" button |
| Support Damage Ticket → | Admin Damage Detail | "View Damage Report" button |
| Admin Incident → | Support Ticket | "View Ticket" (if linked) |
| Delivery Issue → | Admin Incident | Auto-created incident appears in admin |
| Delivery Issue → | Support Ticket | Auto-created ticket appears in support |

---

## Technical Implementation Details

### 1. Database Migration

```sql
-- Add driver role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';

-- Add damage_id to support tickets
ALTER TABLE public.support_tickets_v2 
  ADD COLUMN IF NOT EXISTS damage_id UUID REFERENCES public.damage_reports(id) ON DELETE SET NULL;

-- Create delivery status tracking
CREATE TABLE public.delivery_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned',
  notes TEXT,
  photo_urls JSONB DEFAULT '[]',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT delivery_status_check CHECK (
    status IN ('assigned', 'picked_up', 'en_route', 'delivered', 'issue')
  )
);

-- Enable RLS
ALTER TABLE public.delivery_statuses ENABLE ROW LEVEL SECURITY;

-- RLS: Drivers can read/update their own assigned deliveries
CREATE POLICY "Drivers can view their deliveries"
  ON public.delivery_statuses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = delivery_statuses.booking_id
      AND b.assigned_driver_id = auth.uid()
    )
    OR public.is_admin_or_staff(auth.uid())
  );

-- Function to auto-create support ticket on damage report
CREATE OR REPLACE FUNCTION public.auto_create_damage_ticket()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.support_tickets_v2 (
    subject,
    description,
    category,
    priority,
    is_urgent,
    booking_id,
    damage_id,
    customer_id,
    created_by,
    created_by_type
  ) VALUES (
    'Damage Report: ' || NEW.severity || ' - ' || NEW.location_on_vehicle,
    NEW.description,
    'damage',
    CASE WHEN NEW.severity = 'major' THEN 'high' ELSE 'medium' END,
    NEW.severity = 'major',
    NEW.booking_id,
    NEW.id,
    (SELECT user_id FROM bookings WHERE id = NEW.booking_id),
    NEW.reported_by,
    'staff'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_create_damage_ticket
  AFTER INSERT ON public.damage_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_damage_ticket();
```

### 2. Update is_admin_or_staff Function
Include `driver` role for basic access checks where needed.

### 3. New Hook: use-delivery-access.ts
```typescript
// Check if user has driver role (or higher)
export function useIsDriverOrAbove() {
  // Returns true for driver, staff, admin roles
}
```

### 4. New Hook: use-my-deliveries.ts
```typescript
// Fetch bookings where assigned_driver_id = current user
// Include delivery status, customer info, pickup address
```

### 5. DeliveryShell Component
Similar to SupportShell but with driver-specific navigation:
- My Deliveries (pending, en route, completed)
- Create Walk-In
- Quick navigation back to assigned list

### 6. Support Panel Updates
- Show damage details inline for damage-category tickets
- Display linked photos from condition_photos
- Link to admin damage detail page
- Show damage severity badge

---

## User Flows

### Flow 1: Damage Reported → Support Ticket Created
1. Staff reports damage in Active Rental
2. Damage saved to `damage_reports`
3. Trigger creates `support_tickets_v2` with `damage_id` link
4. Ticket appears in Support Panel under "Damage" category
5. Support agent can view damage photos and resolution status

### Flow 2: Driver Logs In
1. Driver signs up (or admin assigns driver role)
2. Driver accesses `/delivery`
3. Sees list of bookings assigned to them
4. Can view delivery details, get directions, update status
5. Can create walk-in booking on the spot
6. Can report issues (creates incident + ticket)

### Flow 3: Cross-Panel Navigation
1. Support agent sees damage ticket
2. Clicks "View in Admin" → Opens admin damages page with that damage selected
3. Admin views damage → Clicks "View Ticket" → Opens support panel with ticket selected

---

## Security Considerations

1. **Driver Role Restrictions**:
   - Can only see bookings assigned to them
   - Cannot access admin dashboard
   - Cannot modify pricing or vehicle data
   - Can create walk-in bookings (limited fields)
   - Can report issues (creates tickets with their ID)

2. **RLS Policies**:
   - `delivery_statuses`: Drivers see only their bookings
   - `bookings`: Drivers can read assigned bookings, not all
   - `damage_reports`: Drivers can create, not delete

3. **Panel Access**:
   - Admin Panel: admin, staff, cleaner, finance
   - Support Panel: admin, staff, support
   - Delivery Panel: admin, staff, driver

---

## Summary of Changes

| Category | Items |
|----------|-------|
| **Database** | Add `driver` role, `damage_id` column, `delivery_statuses` table, trigger for auto-ticket creation |
| **New Pages** | 3 delivery pages (Dashboard, Detail, WalkIn) |
| **New Components** | 5 delivery components (Shell, Route Guard, Cards, Status) |
| **New Hooks** | 2 delivery hooks + update to damage/support hooks |
| **Updated Hooks** | `use-damages.ts`, `use-support-v2.ts`, `use-incidents.ts` |
| **Updated UI** | Support Panel damage display, cross-navigation links |
| **Routes** | Add `/delivery/*` routes with protection |
