
# Ops Panel Full Implementation Plan

## Problem Summary
The Ops panel exists but is not fully functional:
1. **No bookings showing** - The pickups page queries for `pending/confirmed` but data may not match filters
2. **Wrong shell used** - BookingOps, ReturnOps, ActiveRentalDetail use `<AdminShell>` even when accessed from `/ops/*` routes
3. **Admin still has operational tasks** - The separation isn't complete
4. **Missing All Bookings view** - Ops staff can't see/search all bookings

## Root Cause
The shared pages (BookingOps, ReturnOps, ActiveRentalDetail) are hardcoded with `<AdminShell>` instead of detecting which panel context they're in.

---

## Implementation Plan

### Phase 1: Create Panel-Aware Shell Wrapper

Create a new component that automatically selects the correct shell based on the current route:

**New File: `src/components/shared/PanelShell.tsx`**

```typescript
// Detects /ops/* vs /admin/* route and renders appropriate shell
// Props: children, hideNav (optional)
// Uses useLocation() to determine context
```

This ensures BookingOps, ReturnOps, and ActiveRentalDetail work correctly in both panels.

### Phase 2: Update Shared Operational Pages

Update these pages to use PanelShell instead of hardcoded AdminShell:

| File | Change |
|------|--------|
| `src/pages/admin/BookingOps.tsx` | Replace `<AdminShell>` with `<PanelShell>` |
| `src/pages/admin/ReturnOps.tsx` | Replace `<AdminShell>` with `<PanelShell>` |
| `src/pages/admin/ActiveRentalDetail.tsx` | Replace `<AdminShell>` with `<PanelShell>` |
| `src/pages/admin/BookingDetail.tsx` | Replace `<AdminShell>` with `<PanelShell>` |

Also update the "back" navigation to return to the correct panel:
- From `/ops/*` routes → go back to `/ops/*`
- From `/admin/*` routes → go back to `/admin/*`

### Phase 3: Create Complete Ops Workboard Dashboard

Enhance `src/pages/ops/OpsWorkboard.tsx` to be a full operations dashboard:

**New Features:**
- **Today's Pickups section** with direct booking cards
- **Expected Returns section** with list
- **Active Rentals counter** with overdue highlighting  
- **Alerts section** for urgent items
- **Universal search bar** (booking code, phone, customer name)
- Real-time data refresh using existing queries

### Phase 4: Create Ops All Bookings Page

**New File: `src/pages/ops/OpsBookings.tsx`**

A simplified version of admin Bookings page for ops staff:
- Uses same `listBookings()` from domain layer (no duplication)
- Tabs: All | Pending | Confirmed | Active | Completed
- Search/filter functionality
- Click opens booking in ops context
- No admin-only actions (rates, void, etc.)

Update OpsShell navigation to include "All Bookings" item.

### Phase 5: Fix Data Visibility in Existing Ops Pages

**OpsPickups.tsx:**
- Currently fetches `pending` + `confirmed` - this is correct
- Add debug logging to verify data is returned
- Remove day filter for "All" tab to show all pending pickups

**OpsActiveRentals.tsx:**
- Already correctly queries `status: "active"`

**OpsReturns.tsx:**  
- Already correctly queries `status: "active"` with date filtering

**OpsFleet.tsx:**
- Fix navigation: change `/admin/fleet/category/...` to stay in ops context or use shared route

### Phase 6: Update Navigation and Routing

**OpsShell.tsx Navigation Updates:**
```text
1. Workboard (dashboard overview)
2. All Bookings (NEW - full booking list)
3. Pickups (pending handovers)
4. Active Rentals (on road)
5. Returns (incoming)
6. Fleet Status (view only)
```

**App.tsx Route Updates:**
- Ensure all ops routes use OpsProtectedRoute
- Add `/ops/bookings` route for all bookings view

### Phase 7: Remove Operational Links from Admin

**AdminShell.tsx:**
- Remove any remaining operational workflow links
- Keep only: Dashboard, Bookings (view-only), Fleet, Incidents, Billing, Analytics, Settings

**Admin Bookings.tsx:**
- Already updated to be view-only
- Verify it shows "Process in Ops Panel" button

---

## Technical Details

### PanelShell Component Logic

```typescript
function PanelShell({ children, hideNav = false }) {
  const location = useLocation();
  const isOpsContext = location.pathname.startsWith("/ops");
  
  if (isOpsContext) {
    return <OpsShell hideNav={hideNav}>{children}</OpsShell>;
  }
  return <AdminShell hideNav={hideNav}>{children}</AdminShell>;
}
```

### Back Navigation Logic

```typescript
function useBackRoute(defaultPath: string) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  // Use explicit returnTo if provided
  const returnTo = searchParams.get("returnTo");
  if (returnTo) return returnTo;
  
  // Infer from context
  if (location.pathname.startsWith("/ops")) {
    return defaultPath.replace("/admin", "/ops");
  }
  return defaultPath;
}
```

### Files to Create
1. `src/components/shared/PanelShell.tsx` - Panel-aware shell wrapper
2. `src/pages/ops/OpsBookings.tsx` - All bookings list for ops
3. `src/hooks/use-panel-context.ts` - Hook to determine current panel

### Files to Modify
1. `src/pages/admin/BookingOps.tsx` - Use PanelShell, fix back navigation
2. `src/pages/admin/ReturnOps.tsx` - Use PanelShell, fix back navigation  
3. `src/pages/admin/ActiveRentalDetail.tsx` - Use PanelShell, fix back navigation
4. `src/pages/admin/BookingDetail.tsx` - Use PanelShell
5. `src/pages/ops/OpsWorkboard.tsx` - Enhance with full dashboard
6. `src/pages/ops/OpsPickups.tsx` - Verify data loading
7. `src/pages/ops/OpsFleet.tsx` - Fix navigation links
8. `src/components/ops/OpsShell.tsx` - Add All Bookings nav item
9. `src/App.tsx` - Add ops/bookings route

---

## Expected Outcome

### Ops Panel Will Have:
- Full dashboard with today's tasks at a glance
- All Bookings view with search/filter
- Pickups queue showing all pending/confirmed bookings
- Active rentals with overdue highlighting
- Returns processing
- Fleet status (view only)
- All operational workflows (handover, return, etc.)

### Admin Panel Will Have:
- Dashboard with KPIs and analytics
- Bookings list (view-only, links to Ops for processing)
- Fleet management (full CRUD)
- Incidents management
- Billing and payments
- Settings and configuration
- No day-to-day operational workflows

### Shared Components (No Duplication):
- BookingOps workflow → used by both panels via PanelShell
- ReturnOps workflow → used by both panels via PanelShell
- ActiveRentalDetail → used by both panels via PanelShell
- All domain layer queries → reused everywhere
- Capability-based action visibility → already in place

---

## Permissions Verification

Current capability system already supports this separation:
- `canAccessOpsPanel`: admin, staff, cleaner, finance
- `canAccessAdminPanel`: admin only

Operations staff will:
- See all bookings and operational controls
- Process pickups, returns, and handovers
- View fleet status
- NOT see admin settings, rates, or management features

Admin users will:
- Access both panels
- See management controls in admin panel
- Can switch to ops panel for hands-on work
