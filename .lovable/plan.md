
# Unified Incidents & Support Integration Plan

## Problem Summary
An incident was created for booking C2CML5U2O00 (visible in the database as a row in `incident_cases`) but it does not appear in either:
1. The Admin Incidents panel (`/admin/incidents`)
2. The Support Panel (`/support`)

This happens because:
- No trigger auto-creates a support ticket when an incident is filed
- The Incidents panel's local query joins to `vehicles` table (which is empty) instead of `vehicle_categories`
- Support Panel has no visibility into incidents

## Solution Architecture

All incidents and damages will flow through the Support Panel as the primary case management hub. The Admin panel will show a summary view linking to Support.

### Data Flow
```
Incident Created → Auto-generate Support Ticket → Visible in /support
                                               → Quick view in /admin/incidents with link
```

## Implementation Steps

### Part 1: Database Changes

1. **Add "incident" category to support tickets**
   - Expand the category constraint to include `incident`

2. **Create auto-ticket trigger for incident_cases**
   - Similar to `auto_create_damage_ticket` but for incidents
   - Auto-generates a high-priority support ticket when incident is reported
   - Links via `incident_id` column

3. **Backfill existing incidents**
   - Create support tickets for any orphaned incident_cases

### Part 2: Frontend - Support Panel Updates

1. **Add "incident" category support**
   - Update `TicketCategory` type to include "incident"
   - Add styling for incident-category tickets
   - Show incident details (severity, type, claim status) inline

2. **Enhance ticket detail view for incidents**
   - Display incident severity badge
   - Show incident type (collision, theft, etc.)
   - Display claim number and status
   - Link to incident photos
   - Action buttons: Update Status, File Claim, etc.

### Part 3: Frontend - Admin Panel Simplification

1. **Simplify Incidents page**
   - Remove the duplicated incident management UI
   - Show a summary table with quick stats
   - Add prominent "Manage in Support Panel" link
   - Keep "Create Incident" button (which will auto-create ticket)

2. **Update CreateIncidentDialog**
   - After creating incident, query client invalidates support tickets
   - Toast includes link to the created support ticket

### Part 4: Cross-Navigation

1. **Admin → Support links**
   - From incident row: "View Ticket" button
   - From damage row: "View Ticket" button

2. **Support → Admin links**
   - From incident ticket: "View Full Details" to admin incident detail
   - From damage ticket: "View Damage Report" link

---

## Technical Implementation Details

### Database Migration SQL

```sql
-- 1. Add 'incident' to category options
-- (category is a text column with CHECK constraint or enum)
-- Will need to update the constraint/type

-- 2. Create trigger function for incident cases
CREATE OR REPLACE FUNCTION public.auto_create_incident_ticket()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_vehicle_name TEXT;
BEGIN
  -- Get customer ID from booking (if exists)
  IF NEW.booking_id IS NOT NULL THEN
    SELECT user_id INTO v_customer_id 
    FROM public.bookings 
    WHERE id = NEW.booking_id;
  ELSE
    v_customer_id := NEW.customer_id;
  END IF;

  -- Get vehicle name from category
  SELECT name INTO v_vehicle_name
  FROM public.vehicle_categories
  WHERE id = NEW.vehicle_id;

  -- Create support ticket linked to incident
  INSERT INTO public.support_tickets_v2 (
    subject,
    description,
    category,
    priority,
    is_urgent,
    booking_id,
    incident_id,
    customer_id,
    created_by,
    created_by_type,
    status
  ) VALUES (
    'Incident: ' || INITCAP(REPLACE(NEW.incident_type, '_', ' ')) || 
    ' - ' || INITCAP(NEW.severity),
    NEW.description,
    'incident',
    CASE 
      WHEN NEW.severity = 'major' THEN 'high'
      WHEN NEW.severity = 'moderate' THEN 'medium'
      ELSE 'low'
    END,
    NEW.severity = 'major' OR NOT NEW.is_drivable,
    NEW.booking_id,
    NEW.id,
    v_customer_id,
    NEW.created_by,
    'staff',
    'new'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
CREATE TRIGGER trigger_auto_create_incident_ticket
  AFTER INSERT ON public.incident_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_incident_ticket();

-- 4. Backfill: Create tickets for existing incidents without tickets
INSERT INTO public.support_tickets_v2 (
  subject, description, category, priority, is_urgent,
  booking_id, incident_id, customer_id, created_by, created_by_type
)
SELECT 
  'Incident: ' || INITCAP(REPLACE(ic.incident_type, '_', ' ')) || ' - ' || INITCAP(ic.severity),
  ic.description,
  'incident',
  CASE WHEN ic.severity = 'major' THEN 'high' ELSE 'medium' END,
  ic.severity = 'major',
  ic.booking_id,
  ic.id,
  ic.customer_id,
  ic.created_by,
  'staff'
FROM public.incident_cases ic
WHERE NOT EXISTS (
  SELECT 1 FROM public.support_tickets_v2 st 
  WHERE st.incident_id = ic.id
);
```

### File Changes

| File | Changes |
|------|---------|
| `src/hooks/use-support-v2.ts` | Add "incident" to `TicketCategory` type, update fetching logic to include incident details |
| `src/pages/support/SupportTickets.tsx` | Add incident category label/styling, show incident details in ticket detail panel |
| `src/pages/admin/Incidents.tsx` | Simplify to summary view with "Manage in Support" link |
| `src/hooks/use-incidents.ts` | Invalidate support-tickets-v2 queries after create |
| `src/components/admin/CreateIncidentDialog.tsx` | Invalidate support queries, show toast with link |

### Support Panel Ticket Detail for Incidents

When a ticket has `incident_id`, display:
- Incident severity badge (Minor/Moderate/Major)
- Incident type (Collision, Theft, Weather, etc.)
- Claim status (Required/Not Required, Claim Number)
- Vehicle drivability status
- Link to incident photos
- Quick actions: Update Incident Status, Add Claim Number

---

## Expected Outcome

After implementation:
1. Creating an incident auto-generates a support ticket
2. All incident/damage tickets appear in `/support` 
3. Support agents manage all cases in one unified inbox
4. Admin panel shows summary with links to Support
5. Cross-navigation between panels works seamlessly

## Files to be Modified

### New/Updated Hooks
- `src/hooks/use-support-v2.ts` - Add incident category and details

### Updated Pages
- `src/pages/support/SupportTickets.tsx` - Incident ticket rendering
- `src/pages/admin/Incidents.tsx` - Simplified view with Support link

### Updated Components
- `src/components/admin/CreateIncidentDialog.tsx` - Query invalidation
- `src/components/layout/SupportShell.tsx` - Add incident queue item (optional)
