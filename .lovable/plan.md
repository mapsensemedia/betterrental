## Match Admin Sidebar to TEST BACKEND — Updated Plan

### What Changes

**1. Update sidebar navigation in `AdminShell.tsx`**

- **ACTIVE WORK group**: Remove "Workboard" item. Rename "Active Rentals" to **"Ops"** and change its href from `/admin/bookings?tab=active` to **`/admin/active-rentals`** — pointing to the existing dedicated Active Rentals page (with stats cards, filters, search, progress bars) instead of the bookings tab view.
- **TODAY'S OPERATIONS group**: Empty its items array (Pickups, Returns, Bookings removed). Add `visibleGroups` filter so empty groups don't render.
- **MONEY & BILLING → Payments**: Keep href as `/admin/finance` (existing route works), label already says "Payments".
- **ADMINISTRATION → Support**: Change href from `/admin/tickets` to `/support`, remove `badgeKey`.
- **Badge animation**: Add `animate-live-pulse` class on priority group badges.
- **`isActive` logic**: Update to highlight "Ops" when on `/admin/active-rentals` or any sub-path like `/admin/active-rentals/:bookingId`.
- Remove unused icon imports (`LayoutDashboard`, `CheckCircle`, `CheckCircle2`, `ClipboardList`, `RotateCcw`, `TrendingUp`). Add `HelpCircle`.
- Add `helpOpen` state and `HelpGuideModal` import + render.
- Add Help button (HelpCircle icon) in top bar between spacer and user menu.

**2. Add route for `/admin/active-rentals`**

In `App.tsx`, add a route for the index path `/admin/active-rentals` pointing to the existing `ActiveRentals.tsx` page component (currently exists as a file but has no route).

**3. Create `src/components/layout/HelpGuideModal.tsx`**

Copy from TEST BACKEND — an accordion-based help dialog with 4 sections: Customer Booking Guide, Admin Workflow Guide, Status Glossary, Important Notes.

**4. Add `animate-live-pulse` CSS animation**

Add to `src/index.css`:
```css
@keyframes live-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}
.animate-live-pulse {
  animation: live-pulse 2s ease-in-out infinite;
}
```
Plus a `prefers-reduced-motion` media query to disable it.

### Files Modified
1. `src/components/layout/AdminShell.tsx` — sidebar nav, isActive, help button
2. `src/App.tsx` — add `/admin/active-rentals` index route
3. `src/components/layout/HelpGuideModal.tsx` — new file
4. `src/index.css` — add live-pulse animation

### What Does NOT Change
- `ActiveRentals.tsx` page — used as-is (the full stats/filter/progress bar UI)
- `ActiveRentalDetail.tsx` — existing detail route untouched
- `OpsShell.tsx`, `PanelShell.tsx` — unchanged
- No backend, edge function, or database changes
- All existing routes remain functional (bookings tabs still accessible via URL)
