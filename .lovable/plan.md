

## Problem

The "Activate Rental" action fails because `useUpdateBookingStatus` (in `src/hooks/use-bookings.ts`, line 351) does a direct client-side `supabase.from("bookings").update({ status: newStatus })`. The database trigger `block_sensitive_booking_updates` blocks any client-side change to `bookings.status` — only `service_role` is allowed.

This is the same class of bug as the previous vehicle manager fix. Every booking status transition through this hook is broken.

## Fix

### 1. Create a new edge function: `update-booking-status`

A lightweight edge function that:
- Accepts `{ bookingId, newStatus, notes?, bypassReason? }`
- Validates the caller has admin/staff role
- Runs the return workflow validation (for active → completed)
- Updates `bookings.status` using `service_role` client
- Updates `vehicle_units.status` (on_rent / available) as needed
- Handles deposit logic on status change
- Logs audit entry
- Returns the updated booking

### 2. Update `useUpdateBookingStatus` in `src/hooks/use-bookings.ts`

Replace the direct `supabase.from("bookings").update()` call with `supabase.functions.invoke("update-booking-status", { body: { ... } })`. Move the server-side logic (return workflow validation, vehicle unit status updates, deposit handling) into the edge function. Keep client-side query invalidation and toast handling as-is.

### Files

- **Create**: `supabase/functions/update-booking-status/index.ts`
- **Edit**: `src/hooks/use-bookings.ts` — replace mutation body to call edge function instead of direct update

