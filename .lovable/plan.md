
# Plan: Integrate VehicleHealthCard and LifecycleSummarySection into Fleet Costs

## Problem Identified

The newly created `VehicleHealthCard` and `LifecycleSummarySection` components are currently only accessible at `/admin/fleet-analytics`, which has **no navigation link** in the admin sidebar. This makes these features invisible to users.

**Current Navigation Structure:**
- `/admin/fleet` - Fleet Management (Categories + VIN Pool) - Has sidebar link
- `/admin/fleet-costs` - Fleet Costs (VIN tracking, expenses) - Has sidebar link  
- `/admin/fleet-analytics` - Fleet Analytics (Where components currently live) - **No sidebar link**

## Proposed Solution

Integrate the lifecycle and vehicle health features directly into the existing **Fleet Costs** page (`/admin/fleet-costs`) since it already focuses on vehicle-level financial tracking.

---

## Implementation Steps

### Step 1: Add Tab Navigation to Fleet Costs Page

Transform the FleetCosts page to use a tabbed interface with:
- **Units Tab** (default) - Existing VIN/expense tracking table
- **Lifecycle Tab** - LifecycleSummarySection component
- **Health Overview Tab** - VehicleHealthCard grid view

### Step 2: Import and Integrate Components

Add the following imports to `src/pages/admin/FleetCosts.tsx`:
```text
import { LifecycleSummarySection } from "@/components/admin/fleet/LifecycleSummarySection";
import { VehicleHealthCard } from "@/components/admin/fleet/VehicleHealthCard";
```

### Step 3: Create Health Cards Data Integration

Create a hook or inline query to fetch enhanced vehicle data that combines:
- Unit basic info (VIN, plate, status)
- Financial metrics (revenue, costs, profit)
- Lifecycle data (acquisition date, depreciation, disposal dates)
- Vendor information

### Step 4: Add Quick Access Link (Optional)

Add a link from Fleet Management (`/admin/fleet`) to Fleet Costs for easy access to lifecycle/health data.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/FleetCosts.tsx` | Add tabs structure, import LifecycleSummarySection and VehicleHealthCard |
| `src/hooks/use-fleet-cost-enhanced.ts` | Already exists, may need minor adjustments |

## Alternative Option

If you prefer to keep Fleet Analytics as a separate page, I can instead add a sidebar navigation link to `/admin/fleet-analytics` in `AdminShell.tsx`. This would expose all the analytics tabs (Overview, By Vehicle, Comparison, etc.) as a dedicated analytics section.

---

## Technical Details

**Current FleetCosts.tsx Structure:**
- Header with actions (Reports, Depreciation, Refresh, Add Unit)
- Summary cards (Total Units, Acquisition Cost, Expenses, Investment)
- Filters (Search, Category, Status)
- Vehicle units table with CRUD operations

**After Changes:**
```text
FleetCosts Page
+-- Header + Actions
+-- Summary Cards
+-- Tabs
|   +-- [Units] - Existing table with filters
|   +-- [Lifecycle] - LifecycleSummarySection
|   +-- [Vehicle Health] - VehicleHealthCard grid
```

The existing table and dialogs remain unchanged; new tabs provide access to the lifecycle and health components.
