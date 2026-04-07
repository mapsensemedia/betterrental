

## Show Assigned Vehicle Unit on Booking Detail Page

### Investigation Summary

The `AssignedUnitDisplay` component already exists (line 124-179 of `BookingDetail.tsx`) and is rendered inside the Vehicle card (line 568). It queries `vehicle_units` by `assigned_unit_id` and shows VIN, plate, and color. The code is structurally correct.

The likely issue is **visual prominence** — the unit info is tucked inside the Vehicle card as a small subsection with muted styling (`text-xs`, `text-muted-foreground`), making it easy to miss. Also, when no unit is assigned, it shows a tiny muted "No unit assigned" line that blends into the card.

### Fix — `src/pages/admin/BookingDetail.tsx`

**1. Extract `AssignedUnitDisplay` into its own Card** (move from inside Vehicle card to a separate card below it)

- Remove line 567-568 from inside the Vehicle `<CardContent>`
- Add a new standalone Card after the Vehicle card with a clear header: "Assigned Vehicle Unit" with a `Truck` icon
- When a unit IS assigned: show VIN, License Plate, Color, and Status as clearly labeled rows (normal text size, not `text-xs`)
- When NO unit is assigned: show a visible notice with an info icon: "No vehicle unit assigned" in a muted but noticeable style

**2. Improve the component styling**

- Use `text-sm` instead of `text-xs` for labels
- Make VIN use `font-mono` styling for readability
- Add a subtle status badge for the unit status (available, on_rent, maintenance, etc.)
- Use a clear card header with icon, consistent with other cards on the page

### Files
| File | Change |
|------|--------|
| `src/pages/admin/BookingDetail.tsx` | Move `AssignedUnitDisplay` to its own Card, improve styling and empty state |

