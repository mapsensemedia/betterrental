

## Fix Fleet Utilization — Status Mismatch in Reports

### Root Cause

The database stores vehicle unit status as `on_rent` (confirmed: 11 units currently have this status, 3 of which match active bookings). There is **no CHECK constraint** enforcing `rented` — that was a misunderstanding.

The previous fix changed `Reports.tsx` to filter for `status === "rented"`, but the actual DB value is `"on_rent"`. This is why the dashboard shows 0 "On Rent" — no units match `"rented"` because none exist with that value.

The entire rest of the codebase (OpsFleet, FleetManagement, delivery mutations, fleet types) all correctly use `on_rent`. The edge function `update-booking-status` also writes `on_rent`.

### Fix — `src/pages/admin/Reports.tsx`

One-line change in the `fleetStats` useMemo (around line 278):

```typescript
// Change:
const rentedUnits = vehicleUnits.filter(u => u.status === "rented").length;

// To:
const rentedUnits = vehicleUnits.filter(u => u.status === "on_rent").length;
```

Also include `damage` status units (1 unit currently has this) alongside maintenance in the UI, since the DB has 4 statuses in practice: `available`, `on_rent`, `maintenance`, `damage`.

Update the query filter (line ~269) to also include `damage`:
```typescript
// Currently: .neq("status", "retired")
// Keep as-is — this already fetches all non-retired units including damage
```

The query is already correct (`.neq("status", "retired")`). Only the JS filter needs fixing.

### Files
| File | Change |
|------|--------|
| `src/pages/admin/Reports.tsx` | Change `"rented"` → `"on_rent"` in fleetStats filter |

No edge function changes. No database changes.

