
## Goal
A customer cannot complete a booking when they choose the **delivery** option. Find the real cause, fix it, and make future delivery failures self-diagnosing instead of showing a generic "Failed to create booking" toast.

## Current state (verified from code)

Delivery bookings flow through `src/pages/NewCheckout.tsx` → `supabase.functions.invoke("create-guest-booking" | "create-booking")` with these delivery-specific fields:
- `pickupAddress`, `pickupLat`, `pickupLng` (from `RentalBookingContext.deliveryAddress/Lat/Lng`)
- `deliveryFee` (client-computed from `calculateDeliveryFee(distanceKm)`)
- `locationId` = `searchData.closestPickupCenterId` (dispatch hub), with a hard fallback to Surrey Newton if not a valid UUID
- `paymentMethod` is forced to `pay-now` for delivery

Server (`supabase/functions/_shared/booking-core.ts`) re-derives every price from DB, then compares client `totalAmount` to server total with `PRICE_MISMATCH_TOLERANCE`; a mismatch returns HTTP 400 `PRICE_MISMATCH`. A DB trigger `create_delivery_status_for_booking` fires whenever `pickup_address IS NOT NULL` and inserts into `delivery_statuses`.

I do not have a captured failing request in the current network log, and the user skipped the reproduction questions, so **step 1 must be reproducing the exact error** before code changes.

## Most likely causes (ranked)

1. **PRICE_MISMATCH from delivery fee or billable-day drift.** The recent switch to hour-based `Math.ceil((end-start)/24h)` means a 25h delivery booking is 2 days on the server. If any surface (Protection, Add-ons, Checkout summary) still passes a 1-day-based `totalAmount`, server rejects it. Delivery bookings are the most sensitive because they add an extra line item on top.
2. **Generic error hides the real cause.** `NewCheckout.tsx` reads `guestResponse.data?.error`, but `supabase.functions.invoke` on a non-2xx sets `data = null` and puts the JSON body inside `error.context` (a `Response`). The user sees "Edge Function returned a non-2xx status code" for every 400 — including `PRICE_MISMATCH`, `age_validation_failed`, `DUPLICATE_BOOKING`. We already have `src/lib/edge-function-error.ts` for exactly this and it is not used here.
3. **`create_delivery_status_for_booking` trigger** — inserts a row into `public.delivery_statuses` on any booking whose `pickup_address IS NOT NULL`. If the table's grants, NOT NULL columns, or FK for `updated_by` are out of sync, the whole `INSERT INTO bookings` fails and the edge function returns `server_error`.
4. **`closestPickupCenterId` missing / stale** — for guests who land on checkout via a deep link without going through the search step, `closestPickupCenterId` may be `null`. The fallback UUID is Surrey Newton's constant, which is correct, but if the DB row for that UUID does not exist the `location_id` FK fails.
5. **Delivery-only fields not persisted correctly** — `pickup_address` is truncated to 500 chars; `pickup_lat`/`pickup_lng` columns must exist and accept numeric. Worth a schema check.

## Plan

### Step 1 — Reproduce and capture the real error
- Drive the customer funnel via Playwright in the sandbox as a guest: pick a Surrey category, switch to Delivery, enter a valid Vancouver address (~15 km), pick times inside business hours, run through Protection → Add-ons → Checkout, submit.
- Capture the network response body for the failing `create-guest-booking` / `create-booking` call, plus edge function logs (`supabase--edge_function_logs`) for the same request.
- Also reproduce as a logged-in user (uses `create-booking`) to know whether the failure is guest-only or shared.

### Step 2 — Surface the real error in the UI (independent of root cause)
Edit `src/pages/NewCheckout.tsx` in both the `create-booking` and `create-guest-booking` branches:
- Use `extractEdgeFunctionError(data, error)` from `src/lib/edge-function-error.ts` to read the JSON body from `error.context` before falling back to a generic toast.
- Keep the existing `errorMessages` map for known codes (`PRICE_MISMATCH`, `age_validation_failed`, `DUPLICATE_BOOKING`, `vehicle_unavailable`, `reservation_expired`, `PRICE_VALIDATION_FAILED`), but drive it off the parsed body instead of `response.data`.
- Log the parsed body to console so the next failing report has a specific code.

This alone converts the current opaque failure into a specific, actionable message and is safe regardless of the root cause found in Step 1.

### Step 3 — Fix whichever cause Step 1 identifies

Written as conditional branches so we only ship the fix that matches the evidence. If Step 1 finds:

- **`PRICE_MISMATCH`** → confirm which surface sent the stale total. The client pricing path used by `NewCheckout` is `pricing` from `src/lib/pricing.ts`; ensure `days` there uses the same hour-ceil rule as `supabase/functions/_shared/booking-core.ts` (lines 476–485). If `pricing.ts` still uses date-diff, align it. Add `deliveryFee` explicitly to the `pricing` inputs on checkout so it is included in the client total that is compared server-side.
- **DB trigger / delivery_statuses insert failure** → inspect the `delivery_statuses` schema (columns, NOT NULLs, grants, FKs), and either backfill grants or make `create_delivery_status_for_booking` resilient (skip on missing updated_by, wrap in `EXCEPTION WHEN OTHERS` so a delivery-log write never blocks a booking insert). Migration goes through `supabase--migration`.
- **`locationId` is null / invalid** → in `NewCheckout.tsx`, when `deliveryMode === "delivery"` and `closestPickupCenterId` is missing, recompute it from `deliveryLat/Lng` via `findClosestLocation` in `src/constants/rentalLocations.ts` before submitting. Guard the checkout submit button so it stays disabled until a valid `locationId` and delivery coords are present.
- **`pickupAddress` / coords not accepted server-side** → add explicit Zod validation on `pickupAddress` (non-empty, ≤500), `pickupLat` (−90..90), `pickupLng` (−180..180) inside `create-guest-booking` and `create-booking` before `validateClientPricing`, and return a clear `delivery_address_invalid` code the UI can render.

### Step 4 — Regression guards
- Add a Playwright case under `e2e/regression/` for a full guest delivery booking (Surrey hub, address ~15 km, 2‑day rental, standard protection, one add-on), asserting a 200 from `create-guest-booking` and that `pickup_address`, `delivery_fee`, and a `delivery_statuses` row are populated.
- Add a unit test in `src/lib/pricing.test.ts` that a 25h delivery booking is billed as 2 days and that `deliveryFee` is included in `subtotal`.

### Step 5 — Verify
- Re-run the Playwright reproduction; expect success and a `delivery_statuses` row.
- Re-run the edge function logs; expect no `PRICE_MISMATCH` / `PRICE_VALIDATION_FAILED` / `server_error`.
- Manually verify the booking appears in Ops → Deliveries.

## Files likely touched

- `src/pages/NewCheckout.tsx` — error surfacing (Step 2), possible `locationId` guard (Step 3)
- `src/lib/pricing.ts` and `src/lib/pricing.test.ts` — only if Step 1 shows client/server day drift
- `supabase/functions/create-guest-booking/index.ts`, `supabase/functions/create-booking/index.ts` — optional delivery-field validation
- Migration for `delivery_statuses` grants or `create_delivery_status_for_booking` — only if Step 1 shows a trigger failure
- `e2e/regression/*.spec.ts` — new delivery regression test

## Out of scope

Non-delivery booking paths, admin/ops UI, pricing rules for pickup-mode bookings, Worldline flow itself, and any refactor of the shared booking-core beyond what the identified cause requires.
