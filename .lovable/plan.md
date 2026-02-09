

# Fix Confirmation Email and SMS Delivery

## Problem
Both `send-booking-email` and `send-booking-sms` edge functions crash when trying to fetch booking details because they attempt a PostgREST join to a `vehicles` table via `vehicles!inner(...)`. However, `bookings.vehicle_id` actually stores a `vehicle_categories` ID, and there is no foreign key relationship between `bookings` and `vehicles`. PostgREST cannot resolve the join and returns a "Could not find a relationship" error, causing the functions to return 404 before ever calling Resend or Twilio.

The `send-booking-notification` function already handles this correctly by querying `vehicle_categories` separately.

## Fix

### Step 1: Update `send-booking-email/index.ts`
- Remove the `vehicles!inner (make, model, year, image_url)` from the booking query.
- After fetching the booking, query `vehicle_categories` separately using `booking.vehicle_id` to get the vehicle name.
- Replace `vehicleData` references with the category name (e.g., "COMPACT - Nissan Versa or Similar").

### Step 2: Update `send-booking-sms/index.ts`
- Same fix: Remove the `vehicles!inner (make, model, year)` join.
- Query `vehicle_categories` separately using `booking.vehicle_id`.
- Update vehicle name formatting to use category name.

### Step 3: Redeploy both edge functions
- Deploy `send-booking-email` and `send-booking-sms`.
- Test by triggering a new booking or using the admin notification resend feature.

### Secondary: Resend "From" Address
The email function currently uses `onboarding@resend.dev` (Resend's sandbox). This only delivers to the Resend account owner's email address. For production delivery to all customers, a verified custom domain must be configured in the Resend dashboard (e.g., `noreply@c2crental.ca`), and the `from` field updated accordingly.

---

## Regarding Pin Pad / Card Reader Integration

Connecting a physical transaction pin pad is possible through **Stripe Terminal**, which provides a JavaScript SDK for web applications. It supports authorization holds (manual capture) which is compatible with the existing payment architecture.

However, this is a significant feature requiring:
- Stripe-certified hardware purchase
- A new backend endpoint for connection tokens
- New admin/ops UI for reader management and payment collection
- Testing with physical hardware

This should be scoped and planned as a separate initiative. It does not block the email/SMS fix.

---

## Technical Details

### Files Modified
| File | Change |
|------|--------|
| `supabase/functions/send-booking-email/index.ts` | Replace `vehicles!inner(...)` join with separate `vehicle_categories` query |
| `supabase/functions/send-booking-sms/index.ts` | Replace `vehicles!inner(...)` join with separate `vehicle_categories` query |

### Current vs Fixed Query Pattern

Current (broken):
```
.select(`id, booking_code, ..., vehicles!inner (make, model, year)`)
```

Fixed (matching send-booking-notification pattern):
```
.select(`id, booking_code, ..., vehicle_id`)
// Then separately:
const { data: category } = await supabase
  .from("vehicle_categories")
  .select("name")
  .eq("id", booking.vehicle_id)
  .single();
```
