# Plan: Business Hours + Hour-based Day Billing

Two related changes to rental rules:

## 1. Restrict pickup & return times to 9:00 AM – 8:00 PM

Today the time-slot dropdowns offer every 30 minutes, 24 hours a day. We'll limit them to **9:00 AM through 8:00 PM** (last selectable slot 8:00 PM).

**File:** `src/lib/rental-rules.ts`
- Change `PICKUP_TIME_SLOTS = generateTimeSlots(0, 23, 30)` → `generateTimeSlots(9, 20, 30)`
- Update `DEFAULT_PICKUP_TIME` to `"10:00"` (already is, leave as-is)
- Export new constants `BUSINESS_HOURS_START = 9`, `BUSINESS_HOURS_END = 20` for reuse.

All three consumers (`GlassSearchBar`, `RentalSearchCard`, `WalkInBookingDialog`) read from `PICKUP_TIME_SLOTS`, so they update automatically.

**Validation guard** (defense in depth) — add a helper `isWithinBusinessHours(date)` and call it in:
- `RentalBookingContext` when persisting pickup/return datetimes
- `use-booking-edit.ts` and `use-booking-modification.ts` (admin/ops reschedule paths)
- `supabase/functions/_shared/booking-core.ts` server-side (reject `start_at`/`end_at` outside 09:00–20:00 local Vancouver time with a clear error)

Existing bookings already created outside these hours are not touched.

## 2. Hour-based day billing (>24h rolls to next day)

Today day count uses a **date-only diff**: pickup Jun 16 10:00 AM → return Jun 17 11:00 AM is 1 day even though it's 25 hours. We'll switch to **`ceil(hoursDiff / 24)`** so anything over 24h becomes 2 days, over 48h becomes 3 days, etc.

| Pickup → Return | Hours | Old days | New days |
|---|---|---|---|
| Jun 16 10:00 → Jun 17 10:00 | 24 | 1 | 1 |
| Jun 16 10:00 → Jun 17 11:00 | 25 | 1 | **2** |
| Jun 16 10:00 → Jun 18 09:00 | 47 | 2 | **2** |
| Jun 16 10:00 → Jun 18 11:00 | 49 | 2 | **3** |

**Files to change:**

1. **`supabase/functions/_shared/booking-core.ts`** (authoritative — line ~479)
   - Replace date-only `Math.round((endMs - startMs) / 86400000)` with
     `Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)))`
   - Use raw `start_at` / `end_at` timestamps (not stripped to midnight).

2. **`src/contexts/RentalBookingContext.tsx`** (lines 435–453)
   - `rentalDays` and `isRentalDurationValid` switch to the same `ceil(hours/24)` formula using full `pickupDate` / `returnDate` Date objects.

3. **`src/pages/Search.tsx`** (line 146) — already uses `Math.ceil(diffTime / 86400000)`. Leave as-is (matches new rule).

4. **`src/hooks/use-booking-edit.ts`** and **`src/hooks/use-booking-modification.ts`** — already use `Math.ceil(hoursDiff / 24)`. Leave as-is.

5. **`src/lib/pricing.test.ts`** — update any fixtures whose expected day count changes.

### Grace period

Strict by default: 24h 1min = 2 days. If you want a small buffer (e.g. "29 minutes free"), say so and I'll add a configurable `BILLING_GRACE_MINUTES` constant.

### Backfill

No retroactive repricing of existing bookings — change applies to **new bookings and future edits** only.

## Technical details

- Add `BUSINESS_HOURS_START`, `BUSINESS_HOURS_END`, `isWithinBusinessHours(d: Date)` to `src/lib/rental-rules.ts`.
- Server-side time validation in `booking-core.ts` returns `400 OUTSIDE_BUSINESS_HOURS` with message "Pickup and return must be between 9:00 AM and 8:00 PM".
- Update `MIN_RENTAL_DAYS` validation copy if needed; min stays 1 day (24h or less).
- Verify `validateClientPricing` tolerance still holds — server and client both move to the new formula in lockstep.

## Out of scope

- Late-return fees (already hour-based in `src/lib/late-return.ts`).
- Closing the business on specific dates / holidays.
- Per-location business hours (single global window for now).

## Open questions

1. Apply a grace period (e.g. 30 min over 24h still bills as 1 day), or strict ceil?
2. Should **walk-in / ops** bookings be allowed to bypass the 9 AM–8 PM restriction (e.g. staff overrides), or hard-enforced everywhere?
