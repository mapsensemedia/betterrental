

## Plan: Reopen Lovpreet Singh's booking without customer notifications

### Problem
Booking `131595a7-2aaa-4104-ab3c-dbf07128c85c` (code `69M6RYX9`) is `completed` and needs to be reopened to `active` so it appears under Returns. The edge function currently sends SMS/email notifications on status changes to `active`, which must be suppressed for this reopen.

### Changes

#### 1. Edge function: Add `skipNotifications` flag
**File:** `supabase/functions/update-booking-status/index.ts`

- Accept `skipNotifications` boolean in the request body
- When `skipNotifications` is true, skip the notification block (lines 191-215) that invokes `send-booking-notification` and `notify-admin`
- Still perform all other operations (status update, vehicle unit → `on_rent`, audit log, return field clearing)

#### 2. Hook: Pass `skipNotifications` through
**File:** `src/hooks/use-bookings.ts`

- Add `skipNotifications?: boolean` to the mutation params type
- Pass it in the edge function body
- When `skipNotifications` is true, show toast "Booking status updated" instead of "Booking status updated - customer notified"

#### 3. UI: Wire reopen button with `skipNotifications`
**File:** `src/components/admin/BookingOpsDrawer.tsx`

- In `handleReopenRental`, pass `skipNotifications: true` to the mutation
- Update toast to: "Rental reopened — you can now close it with the correct details"

#### 4. Reopen the booking via edge function call
After deploying the updated edge function, invoke it directly to reopen the specific booking:
- Call `update-booking-status` with `{ bookingId: "131595a7-...", newStatus: "active", reopen: true, skipNotifications: true }`
- This sets status → `active`, clears `actual_return_at`, resets `return_state` to `not_started`, sets vehicle unit to `on_rent`
- The booking will then appear in the Returns list (which shows active bookings due today/tomorrow/overdue)

