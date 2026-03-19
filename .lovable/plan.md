

## Plan: Activate Booking VJU2QNQ6 & Verify Fix

### Investigation Results

The booking VJU2QNQ6 (`b150f746-3b2f-4b4c-9d38-b5fabf717fec`) is genuinely still `confirmed` — no activation was ever recorded in audit logs or edge function logs. The "Needs Activation" badge is correct behavior for a `confirmed` booking. The operator's click likely failed silently (network/auth timeout).

The code is working correctly:
- The `update-booking-status` edge function properly handles `confirmed → active`
- The query invalidation fix (adding `active-rental-detail` key) from the previous change is already in place
- The `ActiveRentalDetail` page reads `rental.status` from the database and displays the appropriate badge

### Actions

#### 1. Activate the booking via the edge function
Call `update-booking-status` edge function with:
- `bookingId: "b150f746-3b2f-4b4c-9d38-b5fabf717fec"`
- `newStatus: "active"`
- `activationSource: "ops_manual"`
- `activationReason: "Admin activated — original activation click failed silently"`
- `skipNotifications: true`

This will set `status = 'active'`, `activated_at`, `handed_over_at`, update the assigned vehicle unit to `on_rent`, create an audit log, and create an admin alert.

#### 2. Verify the page updates
After the edge function call succeeds, the page should show the "Active" badge instead of "Needs Activation" on next data fetch.

### No Code Changes Needed
The activation flow and query invalidation are already correct. This is a data issue (booking was never activated), not a code bug.

