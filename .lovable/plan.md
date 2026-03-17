

## Fix Calendar Display Issues

The data hook (`use-calendar.ts`) is already correctly querying `vehicle_categories`, including completed bookings, and implementing the customers table preference. The problems are all in `Calendar.tsx` display logic.

### File: `src/pages/admin/Calendar.tsx`

**A. Fix vehicle row label (line 331)**
- Change `{vehicle.make} {vehicle.model}` → `{vehicle.model}` (which holds the category name like "Standard SUV")
- Change subtitle from `{vehicle.year} • {vehicle.locationName || "No location"}` → just `{vehicle.locationName || "All locations"}`

**B. Replace hardcoded category filter with dynamic categories**
- Remove the `VEHICLE_CATEGORIES` constant (line 47)
- Populate the category dropdown from `calendarData.vehicles` — extract unique category names from the actual data
- This ensures the filter matches real category names (e.g. "Standard SUV" not "SUV")

**C. Add "Completed" to status filter dropdown (line 238-243)**
- Add `<SelectItem value="completed">Completed</SelectItem>` so users can filter for completed bookings in past weeks

**D. Fix column header label (line 306)**
- Change "Vehicle" → "Category" since rows are categories, not individual vehicles

### No other files need changes
The hook already handles all data correctly. The booking-to-vehicle matching (`booking.vehicleId === vehicle.id`) works because both reference `vehicle_categories.id`.

