

## Match Admin Sidebar to TEST BACKEND

### Problem with Previous Plan
The previous plan incorrectly routed "Ops" to a separate `/admin/active-rentals` page. The TEST BACKEND's "Ops" sidebar item points to **`/admin/bookings?tab=active`** — the unified Bookings page with tabs (New, All, Pickups, Active, Returns, Completed), stats cards, and the ActiveRentalsMonitor component on the Active tab. This project already has this exact Bookings page. No new routes are needed.

### Changes

**1. `src/components/layout/AdminShell.tsx`** — Sidebar navigation update

| Current | TEST BACKEND Target |
|---------|-------------------|
| ACTIVE WORK: Alerts, Workboard, Active Rentals | ACTIVE WORK: Alerts, **Ops** (href stays `/admin/bookings?tab=active`) |
| TODAY'S OPERATIONS: Pickups, Returns, Bookings | TODAY'S OPERATIONS: **empty** (filtered out) |
| MONEY & BILLING: Payments (`/admin/finance`), Agreements, Offers | Same (keep `/admin/finance` route, label "Payments") |
| ADMINISTRATION: Vendors, Support (`/admin/tickets` + badge), Settings | Support → **`/support`**, no badge |

Additional changes:
- Remove "Workboard" item entirely
- Rename "Active Rentals" to **"Ops"** (keep same href `/admin/bookings?tab=active`)
- Empty TODAY'S OPERATIONS items array — add `visibleGroups` filter to hide empty groups
- Support: change href to `/support`, remove `badgeKey`
- Update `isActive()`: when href is `/admin/bookings?tab=active`, also highlight when on `/admin/bookings` with any params or sub-paths (matching TEST BACKEND logic)
- Add `animate-live-pulse` class on priority group badges
- Add `helpOpen` state, HelpCircle button in header (between spacer and user menu), render `HelpGuideModal`
- Clean up unused imports (`LayoutDashboard`, `CheckCircle`, `ClipboardList`, `RotateCcw`, `TrendingUp`), add `HelpCircle`

**2. `src/components/layout/HelpGuideModal.tsx`** — New file

Copy from TEST BACKEND: accordion-based help dialog with 4 sections (Customer Booking Guide, Admin Workflow Guide, Status Glossary, Important Notes).

**3. `src/index.css`** — Add live-pulse animation

```css
@keyframes live-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}
.animate-live-pulse {
  animation: live-pulse 2s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .animate-live-pulse { animation: none; }
}
```

### What Does NOT Change
- `/admin/bookings` page (Bookings.tsx) — already has tabs, stats cards, ActiveRentalsMonitor on Active tab
- No new routes needed
- No backend, edge function, or database changes
- All existing routes remain functional
- OpsShell, PanelShell unchanged

### Files
| File | Action |
|------|--------|
| `src/components/layout/AdminShell.tsx` | Update nav items, isActive, add help button |
| `src/components/layout/HelpGuideModal.tsx` | Create new |
| `src/index.css` | Add animation |

