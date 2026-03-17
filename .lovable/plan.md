

## Findings: Booking 26HDD44Y Not Showing in Active Rentals

### Database State

The booking `26HDD44Y` is **still in `confirmed` status** — it was never activated. There are zero `booking_status_change` audit logs for this booking, and no edge function calls to `update-booking-status` were recorded. The staff may have believed they activated it, but the mutation never executed against the database.

### Two Distinct Issues

**Issue 1: The activation never persisted**

The staff likely clicked "Activate Rental" but the status change didn't go through. This could have been a network error, a dialog dismiss race, or the confirmation button not firing `confirmAction`. Without browser logs from that moment, we can't determine the exact cause. The booking needs to be activated now.

**Issue 2: Ops Active Rentals query is too narrow**

There's a query mismatch between the two Active Rentals views:

| View | Query | Includes confirmed past start? |
|------|-------|-------------------------------|
| Admin `ActiveRentalsMonitor` | `status = active` OR `(status = confirmed AND start_at <= now)` | Yes |
| Ops `OpsActiveRentals` | `status = active` only (via `listBookings({ tab: "active" })`) | **No** |

The admin view acts as a safety net by surfacing confirmed bookings past their start time (showing them as "Needs Activation"). The ops view does not — so if activation fails silently, the booking disappears from the ops workflow entirely.

### Proposed Fix

#### Immediate: Activate booking 26HDD44Y

Call `update-booking-status` edge function to set status to `active`.

#### Code Fix: Align the ops query with admin

In `src/domain/bookings/queries.ts`, update the `tab === "active"` filter to also include confirmed bookings past their start date, matching the admin monitor's behavior:

```typescript
} else if (filters.tab === "active") {
  const nowIso = new Date().toISOString();
  query = query.or(`status.eq.active,and(status.eq.confirmed,start_at.lte.${nowIso})`);
}
```

This ensures bookings that should have been activated but weren't still appear in the ops view with their "Needs Activation" badge (which the `RentalCard` component already renders for `status === "confirmed"`).

### Files to Change

| File | Change |
|------|--------|
| `src/domain/bookings/queries.ts` | Line 73-74: Expand `tab === "active"` filter to include confirmed bookings past start time |

