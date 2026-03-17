

## Fix 6 Broken Navigation Links

### Issue 1 — BookingDetail.tsx (line 273)
Change `/ops/bookings/${bookingId}` → `/ops/booking/${bookingId}` (singular)

### Issue 2 — ActiveRentalDetail.tsx (lines 188-190)
Change:
- Ops: `/ops/booking-ops/${rental?.id}` → `/ops/booking/${rental?.id}/handover`
- Admin: `/admin/booking-ops/${rental?.id}` → `/admin/bookings/${rental?.id}/ops`

### Issue 3 — Damages.tsx (line 104)
Change navigate target from `/admin/billing?booking=...&adjustment=damage&amount=...` to `/admin/finance?tab=transactions&booking=...&adjustment=damage&amount=...`

In **Finance.tsx**: Read `booking`, `adjustment`, `amount` from URL params on mount. When present, show a banner in the Transactions tab: "Damage charge pending: $[amount] for booking [code]. Add as manual payment or adjustment."

### Issue 4 — FailedPaymentsWidget.tsx (line 108)
Change Link from `/admin/billing?status=failed` to `/admin/finance?tab=transactions&status=failed`

In **Finance.tsx**: Read `status` param on mount. When `status=failed`, apply it as the default transaction status filter.

### Issue 5 — Alerts.tsx (line 387)
Change Link from `/admin/inventory?vehicle=${selectedAlert.vehicleId}` to `/admin/fleet?vehicle=${selectedAlert.vehicleId}`

In **FleetManagement.tsx**: Read `vehicle` param on mount via `useSearchParams`. If present, auto-select that category by matching the vehicle ID against categories, making the vehicle immediately visible.

### Issue 6 — SupportAnalytics.tsx (lines 153 and 525)
- Line 153: `/admin/support` → `/support`
- Line 525: `/admin/support?id=${ticket.id}` → `/support?id=${ticket.id}`

Also fix **Overview.tsx** lines 304-305: Change `/admin/billing` → `/admin/finance` and `/admin/inventory` → `/admin/fleet` (these are redirect routes that drop params).

### Files to Modify

| File | Change |
|------|--------|
| `BookingDetail.tsx` | Fix ops route (singular) |
| `ActiveRentalDetail.tsx` | Fix both opsRoute values |
| `Damages.tsx` | Route to `/admin/finance` with params |
| `FailedPaymentsWidget.tsx` | Route to `/admin/finance` with params |
| `Alerts.tsx` | Route to `/admin/fleet` with param |
| `SupportAnalytics.tsx` | Route to `/support` (2 places) |
| `Overview.tsx` | Fix Billing and Inventory quick links |
| `Finance.tsx` | Read URL params for damage banner and status filter |
| `FleetManagement.tsx` | Read vehicle param and auto-select |

