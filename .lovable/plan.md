

## Fix Fleet Utilization in Reports Page

### Problem
The fleet utilization section uses wrong status values (`on_rent` instead of `rented`) and mixes two data sources (vehicle_units status + active bookings count), producing incorrect numbers.

### Changes — `src/pages/admin/Reports.tsx`

**1. Fix vehicle_units query (lines 231-242)**
- Change `.in("status", ["available", "on_rent", "maintenance"])` to `.neq("status", "retired")`

**2. Remove active bookings count query (lines 244-256)**
- Delete the entire `useQuery` for `active-bookings-count-for-reports`

**3. Rewrite fleetStats useMemo (lines 290-314)**
- Use `vehicle_units.status === 'rented'` instead of `activeBookingsCount`
- Calculate: `rentedUnits`, `availableUnits`, `maintenanceUnits`
- Utilization = `rentedUnits / (rentedUnits + availableUnits) * 100` (exclude maintenance from denominator)
- Revenue per vehicle divides by rentable units only
- Remove `activeRentals` and `activeVehicles` properties; replace with `rentedUnits`, `availableUnits`, `maintenanceUnits`

**4. Update Fleet Utilization card UI (lines 776-796)**
- Change 3-column grid to 4 rows: On Rent, Available, Maintenance, Total Fleet

**5. Update Fleet Revenue card UI (lines 806-825)**
- "Active Vehicles" → "Rentable Vehicles" showing `rentedUnits + availableUnits`
- All references to `fleetStats.activeRentals` → `fleetStats.rentedUnits`
- All references to `fleetStats.activeVehicles` → rentable units count

### No other files affected

