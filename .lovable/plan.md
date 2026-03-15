

# C2C Rental Booking Flow — Return Time & Pricing Fix

## Problem Analysis

After thorough code inspection, here are the two root causes:

### Bug #1: Return Time Resets to Midnight
The `localDateTimeToISO` function correctly converts date + time to ISO. However, the pricing engine (`computeBookingTotals` in `_shared/booking-core.ts` line 474-478) strips time from both `startAt` and `endAt`, using only the date portion (`substring(0, 10)`) for day calculations. **The timestamps themselves are stored correctly in the DB with the customer's selected time** — the `create-booking` edge function passes `startAt` and `endAt` directly to the insert (lines 213-214).

So this is actually **not a storage bug**. The customer's time IS persisted. If the user is seeing 12:00 AM, it's likely a display issue or the `localDateTimeToISO` function converting to UTC (`.toISOString()` always outputs UTC). A customer selecting 12:00 PM PDT gets stored as `2026-03-15T20:00:00.000Z` — which when naively displayed without timezone conversion shows 8:00 PM UTC, not midnight. **I need to verify the actual display behavior.**

**Real fix**: Ensure all UI display points use local timezone formatting (which `date-fns` `format()` already does). The `localDateTimeToISO` function is correct. If there's a confirmed midnight issue, it would be in how the search context hydrates the time from URL params.

### Bug #2: Ops Edit Triggers Unintended Price Recalculation
This is confirmed. The `BookingEditPanel` sends ALL date changes through `reprice-booking` with operation `"modify"`, which always runs the full pricing engine including duration discounts. When ops changes return time by a few hours (e.g., 12:00 PM → 3:00 PM on same day), the day count doesn't change but the discount tiers might shift if it crosses a day boundary. More critically, **any date edit forces a full reprice** — there's no way for ops to update just the return time without triggering price recalculation.

## Plan

### 1. Add "update_time_only" operation to `reprice-booking` edge function
**File**: `supabase/functions/reprice-booking/index.ts`

Add a new operation branch `"update_time_only"` that:
- Accepts `newStartAt` and/or `newEndAt` timestamps
- Updates ONLY `start_at` and/or `end_at` in the bookings table
- Does NOT recalculate any financial fields
- Writes an audit log entry with action `"booking_time_adjusted"`
- Returns the updated timestamps without any pricing data

```text
if (operation === "update_time_only") {
  // Only update timestamps, no pricing recalculation
  updateData = {};
  if (newStartAt) updateData.start_at = newStartAt;
  if (newEndAt) updateData.end_at = newEndAt;
  // NO financial field changes
  auditAction = "booking_time_adjusted";
}
```

### 2. Split BookingEditPanel into time-only vs full edit modes
**File**: `src/components/admin/ops/BookingEditPanel.tsx`

Add a toggle/separation between:
- **"Adjust Time"** — only updates pickup/return time on the same dates. Calls `reprice-booking` with `operation: "update_time_only"`. Shows a confirmation dialog with old vs new times and a message: "Total price will NOT change."
- **"Full Edit"** (existing behavior) — for date changes that shift day count, location changes, or rate overrides. Continues to call with `operation: "modify"`.

Logic: When only the time portion changed (same calendar date), default to `update_time_only`. When the date portion changes, use `modify` as before.

### 3. Add `useEditBooking` support for time-only operation  
**File**: `src/hooks/use-booking-edit.ts`

Add a `timeOnly` flag to `BookingEditPayload`. When set, the mutation sends `operation: "update_time_only"` instead of `"modify"`. The success toast says "Return time updated — no price change."

### 4. Verify customer-facing time display
**Files**: Display components that format `start_at`/`end_at`

Audit key display points to confirm they use `format(new Date(isoString), "h:mm a")` (date-fns, which uses local timezone). The existing code already does this correctly in:
- `OpsPickups.tsx` (line 47: `parseISO` + `format`)
- `BookingEditPanel.tsx` (line 96: `format(new Date(...))`)
- Booking detail views

No changes needed here unless testing reveals an actual midnight display bug.

### 5. Confirmation dialog for time-only changes
**File**: `src/components/admin/ops/BookingEditPanel.tsx`

When the edit is time-only, the confirmation dialog shows:
- Old pickup/return time
- New pickup/return time  
- "Total price will NOT change" (explicit reassurance)
- No pricing preview section

### Summary of file changes

| File | Change |
|------|--------|
| `supabase/functions/reprice-booking/index.ts` | Add `update_time_only` operation branch |
| `src/hooks/use-booking-edit.ts` | Add `timeOnly` flag to payload and mutation |
| `src/components/admin/ops/BookingEditPanel.tsx` | Auto-detect time-only changes, use appropriate operation, update confirmation dialog |

No database schema changes needed — `start_at` and `end_at` already store full timestamps correctly.

