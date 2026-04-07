

## Fix Fleet Utilization — Stale `on_rent` Status

### Root Cause

The `vehicle_units.status` column has 11 units stuck as `on_rent` because the status was never reset when those bookings ended. Only 3 units actually have active bookings. The Reports page trusts this stale status, showing 11 "On Rent" instead of 3.

### Fix — `src/pages/admin/Reports.tsx`

**1. Add a query for active bookings with assigned units** (after the vehicle_units query, ~line 242):

```typescript
const { data: activeRentalUnitIds = [] } = useQuery({
  queryKey: ["active-rental-units-for-reports"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("assigned_unit_id")
      .eq("status", "active")
      .not("assigned_unit_id", "is", null);
    if (error) throw error;
    return (data || []).map(b => b.assigned_unit_id);
  },
  staleTime: 60_000,
});
```

**2. Rewrite fleetStats useMemo** (lines 276-300) to derive "on rent" from active bookings, not stale unit status:

```typescript
const fleetStats = useMemo(() => {
  const totalVehicles = vehicleUnits.length;
  const activeRentalSet = new Set(activeRentalUnitIds);
  
  // "On rent" = units with an active booking (source of truth)
  const rentedUnits = vehicleUnits.filter(u => activeRentalSet.has(u.id)).length;
  // Maintenance/damage from unit status (reliable — set manually)
  const maintenanceUnits = vehicleUnits.filter(u => 
    u.status === "maintenance" || u.status === "damage"
  ).length;
  // Available = total minus rented minus maintenance
  const availableUnits = totalVehicles - rentedUnits - maintenanceUnits;

  const rentableUnits = rentedUnits + availableUnits;
  const utilizationRate = rentableUnits > 0
    ? (rentedUnits / rentableUnits) * 100 : 0;
  const revenuePerVehicle = collectedRevenue / (rentableUnits || 1);

  return { totalVehicles, rentedUnits, availableUnits, maintenanceUnits,
           rentableUnits, utilizationRate, revenuePerVehicle,
           totalRevenue: collectedRevenue };
}, [vehicleUnits, activeRentalUnitIds, collectedRevenue]);
```

### Why this approach
- `vehicle_units.status` is unreliable for "on rent" (gets stuck due to edge function bugs)
- `bookings.status = 'active'` is the authoritative source for what's currently rented
- Maintenance/damage status is still read from `vehicle_units.status` (set manually by staff, reliable)

### Files
| File | Change |
|------|--------|
| `src/pages/admin/Reports.tsx` | Add active bookings query + rewrite fleetStats to derive on-rent from bookings |

No database or edge function changes.

