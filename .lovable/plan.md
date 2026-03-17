

## Fix 5 Routing & Sidebar Issues (25–29)

### File 1: `src/components/layout/AdminShell.tsx`

**Issue 25** — Remove the "Analytics" entry (line ~176-179) from INSIGHTS & REPORTS group. The "Reports" entry elsewhere already covers `/admin/reports`. *(Note: looking at the sidebar, there's only one entry at `/admin/reports` labeled "Analytics" — need to check if a separate "Reports" entry exists.)*

Actually from the code in the file header, INSIGHTS & REPORTS only has one entry: `Analytics → /admin/reports`. There is no separate "Reports" item visible. The user says two entries exist — let me re-read... The user's description says both exist. The current code shows `label: "Analytics"` at line 177. The `BarChart3` import is present but I only see one entry. The plan says remove "Analytics" and keep "Reports" — so I'll rename this entry to "Reports" with icon `BarChart3`.

- **Line 176-179**: Change `label: "Analytics"` → `label: "Reports"`, keep icon as `TrendingUp` or change to `BarChart3`

**Issue 26** — Line 129-132: Change `label: "Maintenance"` → `"Fleet Analytics"`, `description: "Service schedule"` → `"Utilization & costs"`

**Issue 27** — Update three sidebar hrefs to point directly to bookings tabs:
- Line 80: `"/admin/active-rentals"` → `"/admin/bookings?tab=active"`
- Line 92: `"/admin/pickups"` → `"/admin/bookings?tab=pickups"`
- Line 99: `"/admin/returns"` → `"/admin/bookings?tab=returns"`

Also update `isActive()` to handle query-param-based paths (currently uses `startsWith` which won't highlight correctly for `?tab=` URLs). Add logic: if href contains `?`, match on both pathname and search params.

### File 2: `src/App.tsx`

**Issue 27** — Remove three redirect routes (lines 241-243) for `/admin/pickups`, `/admin/active-rentals`, `/admin/returns` since sidebar now links directly.

**Issue 28** — Remove duplicate `/admin/photos` redirect at line 248. Keep only line 247.

**Issue 29** — Remove dead `/admin/damages` redirect at line 246. Keep the real route at line 214.

### Summary

| File | Changes |
|------|---------|
| `AdminShell.tsx` | Rename "Analytics"→"Reports", fix "Maintenance"→"Fleet Analytics", update 3 sidebar hrefs to direct bookings tab URLs, fix `isActive` for query params |
| `App.tsx` | Remove 5 dead/duplicate redirect routes (lines 241-243, 246, 248) |

