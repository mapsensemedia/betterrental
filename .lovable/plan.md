

## Fix: Duplicate Walk-In Bookings on Payment Failure

### Root Cause

The walk-in flow is: **Create booking → Navigate to ops page → Take payment**. 

The booking is inserted with `status: "confirmed"` immediately, before any payment is attempted. If payment subsequently fails on the ops page, the staff member navigates back and opens the walk-in dialog again — which creates a **second** booking for the same customer. The first booking remains in "confirmed" status, orphaned without payment.

There is no mechanism to:
- Resume payment on an already-created walk-in booking from the dialog
- Prevent staff from re-creating a booking that already exists for the same customer/dates
- Detect and warn about potential duplicates

The `isSubmitting` guard only prevents double-clicks within a single submission — it does not prevent sequential submissions across dialog open/close cycles.

### Fix Plan

#### 1. Add duplicate detection in the edge function (`create-walk-in-booking/index.ts`)

Before inserting a new booking, check if a recent walk-in booking already exists for the same user + category + overlapping dates that is still in a payable state (`confirmed`, `pending`). If found, return the existing booking instead of creating a new one.

```typescript
// Before insert: check for existing recent walk-in for same user/category/dates
const { data: existing } = await supabaseAdmin
  .from("bookings")
  .select("id, booking_code, status")
  .eq("user_id", userId)
  .eq("vehicle_id", categoryId)
  .eq("booking_source", "walk_in")
  .in("status", ["confirmed", "pending"])
  .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // last 2 hours
  .limit(1)
  .maybeSingle();

if (existing) {
  return Response with existing booking (success, no new insert)
}
```

#### 2. Show "Resume" option in `WalkInBookingDialog.tsx`

After a walk-in booking is created and payment fails, if staff re-opens the dialog with the same email, show a prompt: "An unpaid walk-in booking already exists for this customer. Resume payment?" with a button that navigates to the existing booking's ops page instead of creating a new one.

#### 3. Add a client-side guard in `WalkInBookingDialog.tsx`

After successful booking creation, store the returned booking ID in a ref. If `handleSubmit` is called again before the dialog closes and resets, skip the edge function call and navigate to the existing booking.

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/create-walk-in-booking/index.ts` | Add duplicate detection query before insert; return existing booking if found |
| `src/components/admin/WalkInBookingDialog.tsx` | Store created booking ID in ref; skip re-creation if booking already exists for this session |

### What this does NOT change
- No existing bookings are modified
- Payment flow on the ops page is unchanged
- Online booking creation paths are unaffected

