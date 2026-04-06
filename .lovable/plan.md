

## Plan: Replace Active Tab with TEST BACKEND's ActiveRentalsMonitor

### Problem
The Active tab currently uses generic `BookingWorkflowCard` components. The screenshot shows the TEST BACKEND's `ActiveRentalsMonitor` with progress bars, time remaining/overdue display, elapsed time, and a "Live" indicator. Need to replace the existing `ActiveRentalsMonitor.tsx` with the TEST BACKEND version and use it in the Active tab.

### Changes

**1. Replace `src/components/admin/ActiveRentalsMonitor.tsx`**

Replace the current self-contained component (which uses `useActiveRentalStats` hook internally) with the TEST BACKEND version that accepts props:
- `bookings: ActiveBooking[]` — array with `id`, `bookingCode`, `startAt`, `endAt`, `status`, `profile`, `location`, `vehicle`
- `onOpen: (id: string) => void` — click handler
- `className?: string`

The component includes:
- `RentalRow` sub-component with progress bar, time remaining/overdue, elapsed time
- Header with Car icon, "Active Rentals Monitor" title, green "Live" dot, total count
- Overdue count warning badge
- Sorts overdue first (earliest endAt), then on-schedule (soonest due first)
- Red border + background for overdue rows

This is a direct copy from the TEST BACKEND — the `BookingSummary` type already has matching fields (`startAt`, `endAt`, `bookingCode`, `profile.fullName`, `location.name`, `vehicle.name`).

**2. Update Active tab in `src/pages/admin/Bookings.tsx`** (lines 827-883)

Replace the current Active tab content (separate Overdue card + Active Rentals card using `BookingWorkflowCard`) with:
```tsx
<ActiveRentalsMonitor
  bookings={applyOpsFilters([...categorizedBookings.overdue, ...categorizedBookings.active])}
  onOpen={(id) => handleOpenBooking(id, "active")}
/>
```

The monitor component handles overdue/on-schedule sorting internally, so we pass both overdue and active bookings combined. Keep the `OperationsFilters` above it.

Add import: `import { ActiveRentalsMonitor } from "@/components/admin/ActiveRentalsMonitor";`

### Files

| File | Action |
|------|--------|
| `src/components/admin/ActiveRentalsMonitor.tsx` | Replace with TEST BACKEND version (props-based) |
| `src/pages/admin/Bookings.tsx` | Import ActiveRentalsMonitor, replace Active tab content (lines 837-882) |

### What Does NOT Change
- No backend, edge function, or database changes
- All other tabs unchanged
- `use-active-rentals.ts` hook remains (used elsewhere)
- Filters still work via `applyOpsFilters`

