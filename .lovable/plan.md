

## Surgical Fix: Populate Empty Operations Pages with Correct Queries

### Summary of Changes

**5 files** need surgical edits. No new files, no layout changes, no redesigns.

### 1. `src/hooks/use-active-rentals.ts` — Admin Active Rentals hook
**Old:** `.eq("status", "active")` — only fetches active bookings
**New:** `.or("status.eq.active,and(status.eq.confirmed,start_at.lte." + now + ")")` — also includes confirmed bookings whose start date has passed
**Additional:** Add `needsActivation: boolean` field to the `ActiveRental` interface (true when `status === "confirmed"`)

### 2. `src/hooks/use-returns.ts` — Admin Returns hook
**Old:** `.eq("status", "active")` — always empty
**New:** `.in("status", ["active", "confirmed"])` with `.lte("start_at", now)` added for confirmed ones — post-query filter to only include confirmed bookings where start_at <= now
Since Supabase `.or()` with date comparisons is needed, change to fetch both statuses and filter confirmed ones client-side.

### 3. `src/domain/bookings/queries.ts` — Domain query used by Ops pages
**Old:** Tab "active" uses `.eq("status", "active")`
**New:** Tab "active" uses `.or("status.eq.active,and(status.eq.confirmed,start_at.lte.[now])")` to include confirmed-but-started bookings

### 4. `src/pages/admin/Overview.tsx` — Dashboard stats
**Old:** `activeBookings` counts only `status === "active"`, `todayReturns` counts only `status === "active"`
**New:**
- "Active" stat: count `active` OR (`confirmed` AND `start_at <= now`)
- "Returns Today" stat: count `active` OR `confirmed` where `end_at` is today

### 5. `src/pages/ops/OpsActiveRentals.tsx` — Ops Active Rentals page
**Old:** `listBookings({ status: "active" })`
**New:** Use the updated tab-based query via `listBookings({ tab: "active" })` which will pick up the fixed logic from `queries.ts`
**Additional:** Show a yellow "Needs Activation" badge on cards where `booking.status === "confirmed"`

### 6. `src/pages/ops/OpsReturns.tsx` — Ops Returns page
**Old:** `listBookings({ status: "active" })`
**New:** Fetch both active and confirmed-but-started bookings, same pattern as OpsActiveRentals

### What won't change
- History page already works correctly — it has completed/cancelled tabs and a "due" tab for active+confirmed
- No UI layout, component structure, or page design changes
- Checklist flows, walkaround, inspections, photos untouched
- Edge functions untouched

### Badge behavior
- Bookings with `status === "confirmed"` that appear in Active Rentals or Returns will show a yellow **"Needs Activation"** badge so staff know to manually activate them

