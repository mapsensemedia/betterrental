
# Admin/Ops Panel Separation Plan

## Current State Analysis

The codebase currently has both Admin and Ops panels, but there's significant overlap:

- **Admin Panel** (`/admin/*`): Contains Dashboard, Operations hub (bookings, pickups, active, returns), Fleet, Billing, Incidents, Settings, etc.
- **Ops Panel** (`/ops/*`): Has Workboard, Pickups, Active, Returns, Fleet - but uses thin wrappers that sometimes navigate to admin routes

## Proposed Separation

### Admin Panel Purpose (Strategic/Configuration)
Focus on business management, configuration, and oversight:
- Dashboard (overview metrics)
- Alerts (action required items)
- **Bookings** (reservation management, not day-to-day ops)
- Fleet Management (categories, vehicles, CRUD)
- Fleet Costs (depreciation, cost tracking)
- Incidents (accidents, damages)
- Calendar (schedule view)
- Billing (payments, receipts, deposits)
- Analytics/Reports
- Offers (points, rewards)
- Settings (pricing, configuration)

### Ops Panel Purpose (Day-to-Day Operations)
Focus on frontline staff workflow:
- **Workboard** (today's tasks at a glance)
- **Pickups** (handover processing)
- **Active Rentals** (in-progress tracking, issue flagging)
- **Returns** (return processing)
- **Fleet Status** (vehicle availability, quick status updates)

---

## Implementation Plan

### Phase 1: Update Admin Navigation

**File:** `src/components/layout/AdminShell.tsx`

Remove "Operations" from admin sidebar since day-to-day ops move to Ops Panel. Replace with:
- Keep "Bookings" but rename to focus on reservation management (view/search all bookings)
- Add link to "Ops Panel" for users with ops access

Updated navigation items:
```text
1. Alerts (priority)
2. Dashboard
3. Bookings (view/search all - not workflow)
4. Fleet
5. Incidents
6. Fleet Costs
7. Analytics
8. Calendar
9. Billing
10. Support/Tickets
11. Offers
12. Settings
13. [Divider] → Switch to Ops Panel (for eligible users)
```

### Phase 2: Update Ops Panel Navigation  

**File:** `src/components/ops/OpsShell.tsx`

Ensure Ops navigation is focused and complete:
```text
1. Workboard (today's overview)
2. Pickups (pending handovers)
3. Active Rentals (currently on road)
4. Returns (incoming returns)
5. Fleet Status (quick availability view)
```

Add better quick actions and ensure routes work independently of admin panel.

### Phase 3: Enhance Ops Pages to Be Self-Sufficient

Currently, some Ops pages navigate to `/admin/*` routes. Update them to use `/ops/*` routes consistently:

**Files to update:**
- `src/pages/ops/OpsWorkboard.tsx` - Change `/admin/calendar` link to work within ops context
- `src/pages/ops/OpsPickups.tsx` - Already navigates to `/ops/booking/` ✓
- `src/pages/ops/OpsActiveRentals.tsx` - Ensure uses `/ops/rental/`
- `src/pages/ops/OpsReturns.tsx` - Ensure uses `/ops/return/`

### Phase 4: Update Admin Bookings Page

**File:** `src/pages/admin/Bookings.tsx`

Simplify to be a **reservation viewer** rather than full ops workflow:
- Keep the "All" tab with full booking list
- Keep search/filter functionality
- Remove or simplify the "Pickups", "Active", "Returns" workflow tabs (those live in Ops now)
- Add prominent link: "Process in Ops Panel →" for staff who need to do workflow tasks

### Phase 5: Add Cross-Panel Navigation

**Both shells:** Add clear navigation to switch between panels when user has access to both:

- In AdminShell: Show "Switch to Ops Panel" link in footer or dropdown
- In OpsShell: Show "Switch to Admin Panel" link (already exists, verify it works)

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/AdminShell.tsx` | Remove Operations workflow link, add Ops Panel switch |
| `src/components/ops/OpsShell.tsx` | Already good, minor refinements |
| `src/pages/admin/Bookings.tsx` | Simplify to viewer mode, remove workflow tabs |
| `src/pages/ops/OpsWorkboard.tsx` | Fix calendar link |
| `src/pages/ops/OpsActiveRentals.tsx` | Verify self-contained |
| `src/pages/ops/OpsReturns.tsx` | Verify self-contained |
| `src/App.tsx` | No changes needed - routes are already set up |

### Capabilities Check

The existing capabilities system already supports this:
- `canAccessAdminPanel` - Controls admin access
- `canAccessOpsPanel` - Controls ops access
- Users can have access to both panels

### Sidebar Counts

Update `use-sidebar-counts.ts` to include ops-specific counts:
- `pickups` - Confirmed bookings ready for handover
- `active` - Active rentals count
- `returns` - Returns expected today/tomorrow

---

## Expected Outcome

### Admin Users Will See:
- Strategic dashboard with KPIs
- Full booking history and search
- Fleet CRUD operations
- Billing and financial management
- Settings and configuration
- Quick link to Ops Panel when needed

### Ops Staff Will See:
- Task-focused workboard
- Pickup queue by time (Today/Tomorrow/All)
- Active rental monitoring with issue flagging
- Return processing workflow
- Quick fleet availability view
- Link to Admin Panel (if they have access)

### Shared Components:
- BookingOps workflow page (used by both `/admin/bookings/:id/ops` and `/ops/booking/:id/handover`)
- ReturnOps workflow page (used by both panels)
- ActiveRentalDetail page (used by both panels)
- All existing shared components remain unchanged

---

## No Code Duplication

This plan maintains the architecture principle of **no duplicate pages**:
- Same BookingOps, ReturnOps, ActiveRentalDetail pages used in both panels
- Different shells (AdminShell vs OpsShell) provide panel-specific navigation
- Capability-based rendering shows/hides actions based on role + panel
