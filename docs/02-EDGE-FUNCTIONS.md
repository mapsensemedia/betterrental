# 02 — EDGE FUNCTIONS

Every statement below is derived by parsing the actual source under
`supabase/functions/`. Line numbers refer to each function's `index.ts`
unless another file is named. `verify_jwt` values come from
`supabase/config.toml`; a function absent from that file uses the platform
default `verify_jwt = true`.

## Folder listing of `supabase/functions/`

| Entry | Type | index.ts lines | config.toml verify_jwt |
| --- | --- | --- | --- |
| `_shared/` | shared module folder (18 files) | — | n/a |
| `assign-unit-to-active-booking/` | edge function | 225 | not listed → default true |
| `backfill-additional-drivers/` | edge function | 300 | false |
| `calculate-fleet-costs/` | edge function | 142 | true |
| `cancel-booking/` | edge function | 170 | false |
| `change-booking-vehicle/` | edge function | 267 | not listed → default true |
| `check-booking-payment-integrity/` | edge function | 120 | false |
| `check-rental-alerts/` | edge function | 190 | false |
| `check-ticket-escalation/` | edge function | 177 | not listed → default true |
| `claim-delivery/` | edge function | 110 | not listed → default true |
| `close-account/` | edge function | 449 | false |
| `confirm-admin-email/` | edge function | 102 | true |
| `confirm-bank-transfer-paid/` | edge function | 147 | not listed → default true |
| `create-booking/` | edge function | 525 | false |
| `create-guest-booking/` | edge function | 507 | false |
| `create-walk-in-booking/` | edge function | 641 | false |
| `force-close-booking/` | edge function | 238 | not listed → default true |
| `generate-agreement/` | edge function | 780 | false |
| `generate-return-receipt/` | edge function | 570 | false |
| `get-mapbox-token/` | edge function | 50 | false |
| `log-terminal-payment/` | edge function | 269 | false |
| `lookup-booking-pass/` | edge function | 93 | false |
| `manage-booking-documents/` | edge function | 212 | not listed → default true |
| `manage-staff/` | edge function | 353 | not listed → default true |
| `notify-admin/` | edge function | 507 | false |
| `notify-branch-sms/` | edge function | 446 | not listed → default true |
| `persist-booking-extras/` | edge function | 789 | false |
| `reprice-booking/` | edge function | 857 | not listed → default true |
| `send-account-setup-link/` | edge function | 230 | not listed → default true |
| `send-agreement-notification/` | edge function | 292 | false |
| `send-bank-transfer-otp/` | edge function | 126 | not listed → default true |
| `send-booking-email/` | edge function | 331 | false |
| `send-booking-notification/` | edge function | 502 | false |
| `send-booking-otp/` | edge function | 277 | false |
| `send-booking-sms/` | edge function | 215 | false |
| `send-contact-email/` | edge function | 273 | false |
| `send-payment-confirmation/` | edge function | 282 | false |
| `send-support-sms/` | edge function | 226 | false |
| `update-booking-customer/` | edge function | 203 | false |
| `update-booking-status/` | edge function | 477 | false |
| `validate-promo-code/` | edge function | 63 | not listed → default true |
| `verify-booking-otp/` | edge function | 93 | false |
| `void-booking/` | edge function | 150 | not listed → default true |
| `wl-authorize/` | edge function | 179 | false |
| `wl-cancel-auth/` | edge function | 146 | false |
| `wl-capture/` | edge function | 334 | false |
| `wl-create-profile/` | edge function | 118 | false |
| `wl-debug-config/` | edge function | 42 | not listed → default true |
| `wl-get-profile/` | edge function | 85 | false |
| `wl-pay/` | edge function | 161 | false |
| `wl-query-txn/` | edge function | 30 | false |
| `wl-reconcile-authorized/` | edge function | 166 | not listed → default true |
| `wl-search-by-order/` | edge function | 41 | not listed → default true |
| `wl-search-txns/` | edge function | 55 | false |
| `wl-webhook/` | edge function | 143 | false |

### `_shared/` modules

| File | Lines | Exported symbols |
| --- | --- | --- |
| `_shared/auth.ts` | 200 | `AuthResult`, `validateAuth`, `getAdminClient`, `isAdminOrStaff`, `getUserOrThrow`, `requireRoleOrThrow`, `requireBookingOwnerOrStaff`, `authErrorResponse` |
| `_shared/availability.ts` | 79 | `AvailabilityGuardResult`, `CategoryCapacity`, `getCategoryCapacity`, `assertCategoryAvailable`, `CATEGORY_NOT_OFFERED_MESSAGE`, `CATEGORY_UNAVAILABLE_MESSAGE` |
| `_shared/booking-core.ts` | 1133 | `TEST_PROMO_PERCENT_OFF`, `resolveTestPromoCode`, `BookingInput`, `AddOnInput`, `AdditionalDriverInput`, `BookingResult`, `ServerPricingResult`, `hashWithKey`, `ACCESS_TOKEN_TTL_MS`, `verifyOtpAndMintToken`, `validateAccessToken`, `requireBookingOwnerOrToken`, `computeDropoffFee`, `computeBookingTotals`, `validateClientPricing`, `checkBookingConflicts`, `isValidAgeBand`, `createBookingRecord`, `createBookingAddOns`, `createAdditionalDrivers`, `sendBookingNotifications` |
| `_shared/booking-dates.ts` | 28 | `businessDay`, `isPastBusinessDay`, `PAST_START_MESSAGE` |
| `_shared/cors.ts` | 189 | `getCorsHeaders`, `handleCorsPreflightRequest`, `getClientIp`, `RateLimitConfig`, `checkRateLimit`, `rateLimitResponse`, `sanitizeEmail`, `sanitizePhone`, `isValidEmail`, `isValidPhone`, `GENERIC_ERRORS` |
| `_shared/delivery-pricing.ts` | 71 | `DELIVERY_FEE`, `MAX_DELIVERY_DISTANCE_KM`, `haversineKm`, `feeForDistanceKm`, `deriveDeliveryFee` |
| `_shared/idempotency.ts` | 110 | `hasEventBeenProcessed`, `markEventProcessed`, `generateIdempotencyKey`, `claimIdempotencyKey` |
| `_shared/location-guard.ts` | 185 | `LocationAccessError`, `StaffScope`, `getStaffScope`, `requireStaffScope`, `requireLocationAccess`, `requireSuperAdmin`, `requireBookingLocationAccess`, `guardBookingWrite`, `locationErrorResponse`, `requireBookingLocationOrThrow`, `requireLocationOrThrow` |
| `_shared/logger.ts` | 101 | `LogContext`, `generateRequestId`, `createLogger`, `ErrorCodes` |
| `_shared/notifications.ts` | 174 | `NotificationRequest`, `NotificationResult`, `generateNotificationKey`, `wasNotificationSent`, `logNotification`, `sendNotificationWithIdempotency`, `fireAndForgetNotification` |
| `_shared/notify-log.ts` | 117 | `NotifyLogRow`, `writeNotificationLog`, `failureKey`, `resolveBookingContact` |
| `_shared/phone.ts` | 22 | `toE164`, `INVALID_PHONE` |
| `_shared/processing-fee.ts` | 28 | `PROCESSING_FEE_THRESHOLD`, `PROCESSING_FEE_RATE_LOW_TIER`, `PROCESSING_FEE_RATE_HIGH_TIER`, `getProcessingFeeRate`, `computeProcessingFee` |
| `_shared/rate-limit-db.ts` | 54 | `checkDbRateLimit` |
| `_shared/sms-format.ts` | 79 | `BRAND`, `EMERGENCY_PHONE`, `TIMEZONE`, `fmtDateVan`, `fmtDateTimeVan`, `fmtMoney`, `formatPhoneForMessage`, `getBookingContactPhone` |
| `_shared/staff-account-guard.ts` | 27 | `isStaffAccount`, `STAFF_ACCOUNT_WRITE_ERROR` |
| `_shared/vehicle-adjustments.ts` | 130 | `WEEKEND_SURCHARGE_RATE`, `WEEKLY_DISCOUNT_THRESHOLD`, `WEEKLY_DISCOUNT_RATE`, `MONTHLY_DISCOUNT_THRESHOLD`, `MONTHLY_DISCOUNT_RATE`, `AdjustmentLine`, `countWeekendDaysVancouver`, `getDurationDiscount`, `deriveVehicleAdjustments`, `buildVehicleAdjustmentLines` |
| `_shared/worldline.ts` | 108 | `WorldlineResponse`, `WorldlineError`, `worldlineRequest`, `parseWorldlineError`, `getMerchantId` |

---

## `assign-unit-to-active-booking`

- **Path:** `supabase/functions/assign-unit-to-active-booking/index.ts` (225 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
4: import { getUserOrThrow, requireRoleOrThrow } from "../_shared/auth.ts";
26: const user = await getUserOrThrow(req, corsHeaders);
27: await requireRoleOrThrow(user.userId!, ["super_admin", "manager", "admin", "staff"], corsHeaders);
45: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
183: const authHeader = req.headers.get("Authorization") ?? "";
190: Authorization: authHeader,
191: apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
```

### CORS

```ts
3: import { getCorsHeaders } from "../_shared/cors.ts";
19: const corsHeaders = getCorsHeaders(req);
21: if (req.method === "OPTIONS") {
22: return new Response(null, { headers: corsHeaders });
26: const user = await getUserOrThrow(req, corsHeaders);
27: await requireRoleOrThrow(user.userId!, ["super_admin", "manager", "admin", "staff"], corsHeaders);
36: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
58: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
65: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
72: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
86: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
94: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `unitId` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
22: return new Response(null, { headers: corsHeaders });
29: const body = await req.json().catch(() => ({}));
34: return new Response(
36: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
56: return new Response(
58: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
63: return new Response(
65: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
70: return new Response(
72: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
84: return new Response(
86: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
92: return new Response(
94: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
100: return new Response(
102: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
108: return new Response(
110: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
124: return new Response(
126: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
137: return new Response(
139: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
154: return new Response(
156: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
204: return new Response(
213: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
219: return new Response(
```

**Status codes returned:** 200, 400, 404, 409, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L21: `if (req.method === "OPTIONS") {`
2. L22: `return new Response(null, { headers: corsHeaders });`
3. L25: `try {`
4. L33: `if (!bookingId || !unitId) {`
5. L34: `return new Response(`
6. L50: `.from("bookings")`
7. L55: `if (bErr || !booking) {`
8. L56: `return new Response(`
9. L62: `if (booking.status !== "active") {`
10. L63: `return new Response(`
11. L69: `if (booking.assigned_unit_id) {`
12. L70: `return new Response(`
13. L78: `.from("vehicle_units")`
14. L83: `if (uErr || !unit) {`
15. L84: `return new Response(`
16. L91: `if (unit.category_id !== booking.vehicle_id) {`
17. L92: `return new Response(`
18. L99: `if (unit.location_id !== booking.location_id) {`
19. L100: `return new Response(`
20. L107: `if (unit.status !== "available" && unit.status !== "on_rent") {`
21. L108: `return new Response(`
22. L116: `.from("bookings")`
23. L123: `if (conflict && conflict.length > 0) {`
24. L124: `return new Response(`
25. L132: `.from("vehicle_units")`
26. L136: `if (unitUpdErr) {`
27. L137: `return new Response(`
28. L144: `.from("bookings")`
29. L148: `if (bookUpdErr) {`
30. L151: `.from("vehicle_units")`
31. L154: `return new Response(`
32. L161: `await supabase.from("audit_logs").insert({`
33. L175: `.from("rental_agreements")`
34. L182: `try {`
35. L184: `const regen = await fetch(`
36. L197: `if (!regen.ok) {`
37. L198: `console.warn("generate-agreement returned non-OK:", regen.status, await regen.text());`
38. L201: `console.warn("generate-agreement invocation failed:", (e as Error).message);`
39. L204: `return new Response(`
40. L219: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, status, vehicle_id, location_id, assigned_unit_id, start_at, end_at` |
| `vehicle_units` | `id, vin, license_plate, status, category_id, location_id` |
| `bookings` | `id, booking_code` |

### Tables written

| Table | Operation |
| --- | --- |
| `vehicle_units` | UPDATE |
| `bookings` | UPDATE |
| `vehicle_units` | UPDATE |
| `audit_logs` | INSERT |
| `rental_agreements` | UPDATE |

**RPCs called:** none

### External API calls

- L184: `const regen = await fetch(`
- endpoint literal: `https://deno.land/std@0.168.0/http/server.ts`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: `src/components/admin/ops/ActiveRentalUnitAssignCard.tsx:54`

### Failure behaviour / atomicity

**Atomic: NO.** 5 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `backfill-additional-drivers`

- **Path:** `supabase/functions/backfill-additional-drivers/index.ts` (300 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
6: "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
24: const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
28: const authHeader = req.headers.get("Authorization");
29: if (!authHeader) {
36: const token = authHeader.replace("Bearer ", "");
```

### CORS

```ts
3: const corsHeaders = {
4: "Access-Control-Allow-Origin": "*",
5: "Access-Control-Allow-Headers":
18: if (req.method === "OPTIONS") {
19: return new Response(null, { headers: corsHeaders });
32: headers: { ...corsHeaders, "Content-Type": "application/json" },
41: headers: { ...corsHeaders, "Content-Type": "application/json" },
55: headers: { ...corsHeaders, "Content-Type": "application/json" },
105: { headers: { ...corsHeaders, "Content-Type": "application/json" } }
290: { headers: { ...corsHeaders, "Content-Type": "application/json" } }
296: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingCodes` | JSON body | UNKNOWN: no explicit guard |
| `since` | JSON body | UNKNOWN: no explicit guard |
| `dryRun` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
19: return new Response(null, { headers: corsHeaders });
30: return new Response(JSON.stringify({ error: "Unauthorized" }), {
31: status: 401,
39: return new Response(JSON.stringify({ error: "Unauthorized" }), {
40: status: 401,
53: return new Response(JSON.stringify({ error: "Admin access required" }), {
54: status: 403,
59: const body = await req.json();
103: return new Response(
280: return new Response(
294: return new Response(
296: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 401, 403, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L14: `return Math.round(Number(n || 0) * 100);`
2. L17: `Deno.serve(async (req) => {`
3. L18: `if (req.method === "OPTIONS") {`
4. L19: `return new Response(null, { headers: corsHeaders });`
5. L22: `try {`
6. L29: `if (!authHeader) {`
7. L30: `return new Response(JSON.stringify({ error: "Unauthorized" }), {`
8. L38: `if (authError || !user) {`
9. L39: `return new Response(JSON.stringify({ error: "Unauthorized" }), {`
10. L46: `.from("user_roles")`
11. L52: `if (!roleCheck || roleCheck.length === 0) {`
12. L53: `return new Response(JSON.stringify({ error: "Admin access required" }), {`
13. L66: `.from("system_settings")`
14. L89: `.from("bookings")`
15. L94: `if (bookingCodes && bookingCodes.length > 0) {`
16. L101: `if (bError) throw bError;`
17. L102: `if (!bookings || bookings.length === 0) {`
18. L103: `return new Response(`
19. L112: `.from("booking_additional_drivers")`
20. L120: `.from("booking_add_ons")`
21. L125: `for (const a of addOnsData || []) {`
22. L132: `? await supabase.from("vehicle_categories").select("id, name").in("id", vehicleIds)`
23. L145: `if (name.includes("LARGE") && name.includes("SUV")) return 3;`
24. L146: `if (name.includes("MINIVAN")) return 2;`
25. L147: `if (name.includes("STANDARD") && name.includes("SUV")) return 2;`
26. L148: `return 1;`
27. L152: `if (!plan || plan === "none") return 0;`
28. L154: `return GROUP_RATES[group]?.[plan] ?? 0;`
29. L162: `for (const b of bookings) {`
30. L171: `if (days <= 0) {`
31. L178: `if (hasDrivers.has(b.id)) {`
32. L186: `.from("booking_additional_drivers")`
33. L191: `if (existCheck && existCheck.length > 0) {`
34. L215: `if (deltaCents <= 0) {`
35. L224: `for (const { rate, band, matchType } of [`
36. L229: `if (perDriverCents <= 0) continue;`
37. L230: `for (let n = 1; n <= 4; n++) {`
38. L232: `if (Math.abs(deltaCents - expected) <= 1) {`
39. L237: `if (matchResult) break;`
40. L240: `if (!matchResult) {`
41. L249: `const rows = Array.from({ length: matchResult.n }, (_, i) => ({`
42. L264: `if (dryRun) {`
43. L268: `.from("booking_additional_drivers")`
44. L271: `if (insertError) {`
45. L280: `return new Response(`
46. L293: `console.error("Backfill error:", err);`
47. L294: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `user_roles` | `role` |
| `system_settings` | `key, value` |
| `bookings` | `id, booking_code, subtotal, daily_rate, total_days, young_driver_fee, different_dropoff_fee, delivery_fee, upgrade_daily_fee, protection_plan, vehicle_id, created_at` |
| `booking_additional_drivers` | `booking_id` |
| `booking_add_ons` | `booking_id, price` |
| `vehicle_categories` | `id, name` |
| `booking_additional_drivers` | `id, driver_name` |

### Tables written

| Table | Operation |
| --- | --- |
| `booking_additional_drivers` | INSERT |

**RPCs called:** none

### External API calls

- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: none

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `calculate-fleet-costs`

- **Path:** `supabase/functions/calculate-fleet-costs/index.ts` (142 lines)
- **Purpose (from file header):** Fleet Cost Calculator Edge Function
- **config.toml `verify_jwt`:** true

### Auth requirement (enforcing code quoted)

```ts
8: import { getUserOrThrow, requireRoleOrThrow, AuthError, authErrorResponse } from "../_shared/auth.ts";
19: const user = await getUserOrThrow(req, corsHeaders);
20: await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin", "staff", "finance"], corsHeaders);
31: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
```

### CORS

```ts
7: import { getCorsHeaders } from "../_shared/cors.ts";
11: const corsHeaders = getCorsHeaders(req);
13: if (req.method === "OPTIONS") {
14: return new Response(null, { headers: corsHeaders });
19: const user = await getUserOrThrow(req, corsHeaders);
20: await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin", "staff", "finance"], corsHeaders);
22: if (err instanceof AuthError) return authErrorResponse(err, corsHeaders);
24: status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
40: headers: { ...corsHeaders, "Content-Type": "application/json" },
58: headers: { ...corsHeaders, "Content-Type": "application/json" },
70: headers: { ...corsHeaders, "Content-Type": "application/json" },
76: headers: { ...corsHeaders, "Content-Type": "application/json" },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `action` | JSON body | UNKNOWN: no explicit guard |
| `vehicleUnitId` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
14: return new Response(null, { headers: corsHeaders });
23: return new Response(JSON.stringify({ error: "Unauthorized" }), {
24: status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
34: const { action, vehicleUnitId } = await req.json().catch(() => ({}));
39: return new Response(JSON.stringify({ success: true, metrics }), {
57: return new Response(JSON.stringify({ success: true, processed: results.length }), {
69: return new Response(JSON.stringify({ success: true, data: cached }), {
74: return new Response(JSON.stringify({ error: "Invalid action" }), {
75: status: 400,
81: return new Response(JSON.stringify({ error: error.message }), {
82: status: 500,
```

**Status codes returned:** 400, 401, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L10: `Deno.serve(async (req) => {`
2. L13: `if (req.method === "OPTIONS") {`
3. L14: `return new Response(null, { headers: corsHeaders });`
4. L17: `try {`
5. L22: `if (err instanceof AuthError) return authErrorResponse(err, corsHeaders);`
6. L23: `return new Response(JSON.stringify({ error: "Unauthorized" }), {`
7. L28: `try {`
8. L37: `if (action === "calculate_unit" && vehicleUnitId) {`
9. L39: `return new Response(JSON.stringify({ success: true, metrics }), {`
10. L45: `if (action === "calculate_all") {`
11. L47: `.from("vehicle_units")`
12. L52: `for (const unit of units || []) {`
13. L57: `return new Response(JSON.stringify({ success: true, processed: results.length }), {`
14. L63: `if (action === "get_cached") {`
15. L65: `.from("fleet_cost_cache")`
16. L69: `return new Response(JSON.stringify({ success: true, data: cached }), {`
17. L74: `return new Response(JSON.stringify({ error: "Invalid action" }), {`
18. L80: `console.error("Fleet cost calculation error:", error);`
19. L81: `return new Response(JSON.stringify({ error: error.message }), {`
20. L91: `.from("bookings")`
21. L98: `.from("damage_reports")`
22. L104: `.from("maintenance_logs")`
23. L110: `.from("vehicle_units")`
24. L137: `.from("fleet_cost_cache")`
25. L140: `return cacheData;`

### Tables read

| Table | Selected columns |
| --- | --- |
| `vehicle_units` | `id` |
| `fleet_cost_cache` | `*` |
| `bookings` | `total_amount, total_days` |
| `damage_reports` | `estimated_cost` |
| `maintenance_logs` | `cost` |
| `vehicle_units` | `acquisition_cost` |

### Tables written

| Table | Operation |
| --- | --- |
| `fleet_cost_cache` | UPSERT |

**RPCs called:** none

### External API calls

- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: none

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `cancel-booking`

- **Path:** `supabase/functions/cancel-booking/index.ts` (170 lines)
- **Purpose (from file header):** cancel-booking — customer-initiated cancellation of their own booking.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
13: import { getUserOrThrow, getAdminClient, authErrorResponse } from "../_shared/auth.ts";
31: const { userId } = await getUserOrThrow(req, corsHeaders);
38: const admin = getAdminClient();
```

### CORS

```ts
12: import { getCorsHeaders } from "../_shared/cors.ts";
19: const corsHeaders = getCorsHeaders(req);
23: headers: { ...corsHeaders, "Content-Type": "application/json" },
26: if (req.method === "OPTIONS") {
27: return new Response(null, { status: 204, headers: corsHeaders });
31: const { userId } = await getUserOrThrow(req, corsHeaders);
162: return authErrorResponse(err, corsHeaders);
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `reason` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
21: new Response(JSON.stringify(body), {
27: return new Response(null, { status: 204, headers: corsHeaders });
32: const { bookingId, reason } = await req.json();
34: if (!bookingId) return json({ error: "bookingId is required" }, 400);
48: return json({ error: "Booking not found" }, 404);
53: return json({ error: "Not your booking" }, 403);
60: return json({ success: true, alreadyCancelled: true });
65: return json(
159: return json({ success: true });
167: return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
```

**Status codes returned:** 200, 204

### Logic, in source order (numbered; every guard, early return and DB call)

1. L18: `Deno.serve(async (req) => {`
2. L26: `if (req.method === "OPTIONS") {`
3. L27: `return new Response(null, { status: 204, headers: corsHeaders });`
4. L30: `try {`
5. L34: `if (!bookingId) return json({ error: "bookingId is required" }, 400);`
6. L41: `.from("bookings")`
7. L46: `if (fetchErr || !booking) {`
8. L47: `console.error(`[cancel-booking] lookup failed for ${bookingId}`, fetchErr);`
9. L48: `return json({ error: "Booking not found" }, 404);`
10. L51: `if (booking.user_id !== userId) {`
11. L52: `console.warn(`[cancel-booking] ownership mismatch on ${booking.booking_code}`);`
12. L53: `return json({ error: "Not your booking" }, 403);`
13. L58: `if (booking.status === "cancelled") {`
14. L60: `return json({ success: true, alreadyCancelled: true });`
15. L63: `if (!CANCELLABLE.includes(booking.status)) {`
16. L65: `return json(`
17. L81: `.from("bookings")`
18. L89: `if (updateErr) {`
19. L90: `console.error(`[cancel-booking] status update failed for ${booking.booking_code}`, updateErr);`
20. L91: `throw updateErr;`
21. L95: `if (booking.assigned_unit_id) {`
22. L97: `.from("vehicle_units")`
23. L100: `if (unitErr) {`
24. L101: `console.error(`[cancel-booking] unit release failed for ${booking.booking_code}`, unitErr);`
25. L105: `await admin.from("audit_logs").insert([{`
26. L120: `try {`
27. L121: `const { error: notifyErr } = await admin.functions.invoke("send-booking-notification", {`
28. L124: `if (notifyErr) {`
29. L125: `console.error(`[cancel-booking] cancellation notice failed for ${booking.booking_code}`, notifyErr);`
30. L137: `console.error(`[cancel-booking] cancellation notice threw for ${booking.booking_code}`, err);`
31. L151: `const waitUntil = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })`
32. L152: `.EdgeRuntime?.waitUntil;`
33. L153: `if (typeof waitUntil === "function") {`
34. L159: `return json({ success: true });`
35. L161: `try {`
36. L162: `return authErrorResponse(err, corsHeaders);`
37. L166: `console.error("[cancel-booking] unexpected error", err);`
38. L167: `return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, booking_code, status, user_id, assigned_unit_id, notes` |

### Tables written

| Table | Operation |
| --- | --- |
| `bookings` | UPDATE |
| `vehicle_units` | UPDATE |
| `audit_logs` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** `send-booking-notification`

### Frontend call sites

- `src/components/booking/CancelBookingDialog.tsx:62:      const { data, error } = await supabase.functions.invoke("cancel-booking", {`

### Failure behaviour / atomicity

**Atomic: NO.** 3 separate write statement(s); invokes 1 other function(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `change-booking-vehicle`

- **Path:** `supabase/functions/change-booking-vehicle/index.ts` (267 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
4: import { getUserOrThrow, requireRoleOrThrow } from "../_shared/auth.ts";
22: const user = await getUserOrThrow(req, corsHeaders);
23: await requireRoleOrThrow(user.userId!, ["super_admin", "manager", "admin", "staff"], corsHeaders);
48: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
205: const authHeader = req.headers.get("Authorization") ?? "";
212: Authorization: authHeader,
213: apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
```

### CORS

```ts
3: import { getCorsHeaders } from "../_shared/cors.ts";
18: const corsHeaders = getCorsHeaders(req);
19: if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
22: const user = await getUserOrThrow(req, corsHeaders);
23: await requireRoleOrThrow(user.userId!, ["super_admin", "manager", "admin", "staff"], corsHeaders);
40: return json({ error: "bookingId, newUnitId, and newStartMileage are required" }, 400, corsHeaders);
57: if (bErr || !booking) return json({ error: "Booking not found" }, 404, corsHeaders);
59: return json({ error: `Booking is ${booking.status} — only active bookings can have their vehicle changed` }, 400, corsHeaders);
62: return json({ error: "Booking has no vehicle assigned yet — use the initial assign flow" }, 400, corsHeaders);
65: return json({ error: "New unit is the same as the current unit" }, 400, corsHeaders);
74: if (nuErr || !newUnit) return json({ error: "New vehicle unit not found" }, 404, corsHeaders);
77: return json({ error: "New unit is not at the booking's location" }, 400, corsHeaders);
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `newUnitId` | JSON body | optional (defaulted) |
| `newStartMileage` | JSON body | UNKNOWN: no explicit guard |
| `oldEndMileage` | JSON body | UNKNOWN: no explicit guard |
| `newLicensePlate` | JSON body | UNKNOWN: no explicit guard |
| `newVin` | JSON body | UNKNOWN: no explicit guard |
| `reason` | JSON body | optional (defaulted) |
| `notes` | JSON body | optional (defaulted) |
| `swapEffectiveAt` | JSON body | UNKNOWN: no explicit guard |
| `releaseOldUnitTo` | JSON body | UNKNOWN: no explicit guard |
| `// 'available' | 'maintenance'` | JSON body | optional (defaulted) |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
19: if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
25: const body = await req.json().catch(() => ({}));
40: return json({ error: "bookingId, newUnitId, and newStartMileage are required" }, 400, corsHeaders);
57: if (bErr || !booking) return json({ error: "Booking not found" }, 404, corsHeaders);
59: return json({ error: `Booking is ${booking.status} — only active bookings can have their vehicle changed` }, 400, corsHeaders);
62: return json({ error: "Booking has no vehicle assigned yet — use the initial assign flow" }, 400, corsHeaders);
65: return json({ error: "New unit is the same as the current unit" }, 400, corsHeaders);
74: if (nuErr || !newUnit) return json({ error: "New vehicle unit not found" }, 404, corsHeaders);
77: return json({ error: "New unit is not at the booking's location" }, 400, corsHeaders);
80: return json({ error: `New unit status is ${newUnit.status} — must be available or maintenance` }, 400, corsHeaders);
90: return json({ error: `Unit is already assigned to booking ${conflict[0].booking_code}` }, 409, corsHeaders);
125: if (relErr) return json({ error: `Failed to release old unit: ${relErr.message}` }, 500, corsHeaders);
143: return json({ error: `Failed to update new unit: ${newUpdErr.message}` }, 500, corsHeaders);
156: return json({ error: `Failed to update booking: ${bUpdErr.message}` }, 500, corsHeaders);
243: return json({
257: return json({ error: msg }, status, getCorsHeaders(req));
261: function json(body: unknown, status: number, cors: Record<string, string>) {
262: return new Response(JSON.stringify(body), {
```

**Status codes returned:** 

### Logic, in source order (numbered; every guard, early return and DB call)

1. L19: `if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });`
2. L21: `try {`
3. L39: `if (!bookingId || !newUnitId || newStartMileage === undefined || newStartMileage === null) {`
4. L40: `return json({ error: "bookingId, newUnitId, and newStartMileage are required" }, 400, corsHeaders);`
5. L53: `.from("bookings")`
6. L57: `if (bErr || !booking) return json({ error: "Booking not found" }, 404, corsHeaders);`
7. L58: `if (booking.status !== "active") {`
8. L59: `return json({ error: `Booking is ${booking.status} — only active bookings can have their vehicle changed` }, 400, corsHeaders);`
9. L61: `if (!booking.assigned_unit_id) {`
10. L62: `return json({ error: "Booking has no vehicle assigned yet — use the initial assign flow" }, 400, corsHeaders);`
11. L64: `if (booking.assigned_unit_id === newUnitId) {`
12. L65: `return json({ error: "New unit is the same as the current unit" }, 400, corsHeaders);`
13. L70: `.from("vehicle_units")`
14. L74: `if (nuErr || !newUnit) return json({ error: "New vehicle unit not found" }, 404, corsHeaders);`
15. L76: `if (newUnit.location_id !== booking.location_id) {`
16. L77: `return json({ error: "New unit is not at the booking's location" }, 400, corsHeaders);`
17. L79: `if (!["available", "maintenance", "on_rent"].includes(newUnit.status)) {`
18. L80: `return json({ error: `New unit status is ${newUnit.status} — must be available or maintenance` }, 400, corsHeaders);`
19. L83: `.from("bookings")`
20. L89: `if (conflict && conflict.length > 0) {`
21. L90: `return json({ error: `Unit is already assigned to booking ${conflict[0].booking_code}` }, 409, corsHeaders);`
22. L95: `.from("vehicle_units")`
23. L102: `.from("rental_agreements")`
24. L118: `if (oldEndMileage !== undefined && oldEndMileage !== null && Number.isFinite(Number(oldEndMileage))) {`
25. L122: `.from("vehicle_units")`
26. L125: `if (relErr) return json({ error: `Failed to release old unit: ${relErr.message}` }, 500, corsHeaders);`
27. L133: `if (typeof newLicensePlate === "string" && newLicensePlate.trim()) newUnitUpdate.license_plate = newLicensePlate.trim();`
28. L134: `if (typeof newVin === "string" && newVin.trim()) newUnitUpdate.vin = newVin.trim();`
29. L137: `.from("vehicle_units")`
30. L140: `if (newUpdErr) {`
31. L142: `await supabase.from("vehicle_units").update({ status: oldUnit?.status ?? "on_rent" }).eq("id", booking.assigned_unit_id);`
32. L143: `return json({ error: `Failed to update new unit: ${newUpdErr.message}` }, 500, corsHeaders);`
33. L148: `if (newUnit.category_id && newUnit.category_id !== booking.vehicle_id) {`
34. L152: `const { error: bUpdErr } = await supabase.from("bookings").update(bookingUpd).eq("id", bookingId);`
35. L153: `if (bUpdErr) {`
36. L154: `await supabase.from("vehicle_units").update({ status: oldUnit?.status ?? "on_rent" }).eq("id", booking.assigned_unit_id);`
37. L155: `await supabase.from("vehicle_units").update({ status: "available" }).eq("id", newUnitId);`
38. L156: `return json({ error: `Failed to update booking: ${bUpdErr.message}` }, 500, corsHeaders);`
39. L160: `if (currentAgreement?.id) {`
40. L162: `.from("rental_agreements")`
41. L171: `.from("vehicle_swap_history")`
42. L192: `await supabase.from("audit_logs").insert({`
43. L204: `try {`
44. L206: `const regen = await fetch(`
45. L219: `if (regen.ok) {`
46. L222: `.from("rental_agreements")`
47. L230: `if (newAgreementId && historyRow?.id) {`
48. L232: `.from("vehicle_swap_history")`
49. L237: `console.warn("generate-agreement failed:", regen.status, await regen.text());`
50. L240: `console.warn("generate-agreement error:", (e as Error).message);`
51. L243: `return json({`
52. L257: `return json({ error: msg }, status, getCorsHeaders(req));`
53. L262: `return new Response(JSON.stringify(body), {`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, status, vehicle_id, location_id, assigned_unit_id` |
| `vehicle_units` | `id, vin, license_plate, status, category_id, location_id, current_mileage` |
| `bookings` | `id, booking_code` |
| `vehicle_units` | `id, vin, license_plate, current_mileage, status, category_id` |
| `rental_agreements` | `id, status` |
| `rental_agreements` | `id` |

### Tables written

| Table | Operation |
| --- | --- |
| `vehicle_units` | UPDATE |
| `vehicle_units` | UPDATE |
| `vehicle_units` | UPDATE |
| `bookings` | UPDATE |
| `vehicle_units` | UPDATE |
| `vehicle_units` | UPDATE |
| `rental_agreements` | UPDATE |
| `vehicle_swap_history` | INSERT |
| `audit_logs` | INSERT |
| `vehicle_swap_history` | UPDATE |

**RPCs called:** none

### External API calls

- L206: `const regen = await fetch(`
- endpoint literal: `https://deno.land/std@0.168.0/http/server.ts`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

- `src/components/admin/ChangeVehicleDialog.tsx:160:      const { data, error } = await supabase.functions.invoke("change-booking-vehicle", {`

### Failure behaviour / atomicity

**Atomic: NO.** 10 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `check-booking-payment-integrity`

- **Path:** `supabase/functions/check-booking-payment-integrity/index.ts` (120 lines)
- **Purpose (from file header):** check-booking-payment-integrity
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
15: import { validateAuth, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
16: import { requireBookingOwnerOrToken } from "../_shared/booking-core.ts";
34: const auth = await validateAuth(req);
36: // requireBookingOwnerOrToken throws on unauthorized access
37: const booking = await requireBookingOwnerOrToken(bookingId, authUserId, accessToken);
41: const supabase = getAdminClient();
```

### CORS

```ts
14: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
20: const corsHeaders = getCorsHeaders(req);
21: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
30: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
109: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
112: if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
116: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `accessToken` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
26: const { bookingId, accessToken } = await req.json();
28: return new Response(
30: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
107: return new Response(
109: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
114: return new Response(
116: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

**Status codes returned:** 200, 400, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L19: `Deno.serve(async (req) => {`
2. L21: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
3. L25: `try {`
4. L27: `if (!bookingId) {`
5. L28: `return new Response(`
6. L45: `.from("bookings")`
7. L51: `.from("payments")`
8. L58: `.from("deposit_ledger")`
9. L73: `if (!ok) {`
10. L76: `.from("admin_alerts")`
11. L84: `if (!existing || existing.length === 0) {`
12. L86: `if (missingRental) parts.push("rental payment");`
13. L87: `if (missingDeposit) parts.push("deposit hold");`
14. L90: `await supabase.from("admin_alerts").insert({`
15. L107: `return new Response(`
16. L112: `if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);`
17. L114: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `booking_code, wl_deposit_auth_status, deposit_status, wl_transaction_id` |
| `payments` | `id, status` |
| `deposit_ledger` | `id` |
| `admin_alerts` | `id` |

### Tables written

| Table | Operation |
| --- | --- |
| `admin_alerts` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/pages/NewCheckout.tsx:1073:                            await supabase.functions.invoke("check-booking-payment-integrity", { body: integrityBody });`
- `src/components/booking/PayNowCard.tsx:133:              await supabase.functions.invoke("check-booking-payment-integrity", { body: { bookingId } });`
- `src/components/payments/OpsPaymentAndDeposit.tsx:141:      await supabase.functions.invoke("check-booking-payment-integrity", {`

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `check-rental-alerts`

- **Path:** `supabase/functions/check-rental-alerts/index.ts` (190 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
5: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
16: const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
```

### CORS

```ts
3: const corsHeaders = {
4: "Access-Control-Allow-Origin": "*",
5: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
9: // Handle CORS preflight
10: if (req.method === "OPTIONS") {
11: return new Response(null, { headers: corsHeaders });
176: headers: { ...corsHeaders, "Content-Type": "application/json" },
185: headers: { ...corsHeaders, "Content-Type": "application/json" }
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
11: return new Response(null, { headers: corsHeaders });
175: return new Response(JSON.stringify(result), {
181: return new Response(
184: status: 500,
```

**Status codes returned:** 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L8: `Deno.serve(async (req) => {`
2. L10: `if (req.method === "OPTIONS") {`
3. L11: `return new Response(null, { headers: corsHeaders });`
4. L14: `try {`
5. L37: `if (days === null || days === undefined) return null;`
6. L40: `return d.toISOString();`
7. L45: `.from("bookings")`
8. L55: `if (bookingsError) {`
9. L56: `console.error("[check-rental-alerts] Error fetching bookings:", bookingsError);`
10. L57: `throw bookingsError;`
11. L65: `.from("vehicle_categories")`
12. L74: `.from("profiles")`
13. L83: `for (const booking of activeBookings || []) {`
14. L90: `if (endAt < now) {`
15. L95: `.from("admin_alerts")`
16. L102: `if (!existingAlert) {`
17. L105: `.from("admin_alerts")`
18. L117: `if (!alertError) {`
19. L128: `else if (endAt <= twoHoursFromNow) {`
20. L131: `.from("admin_alerts")`
21. L137: `if (!existingAlert) {`
22. L142: `.from("admin_alerts")`
23. L154: `if (!alertError) {`
24. L175: `return new Response(JSON.stringify(result), {`
25. L180: `console.error("[check-rental-alerts] Error:", errorMessage);`
26. L181: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `
        id,
        booking_code,
        user_id,
        vehicle_id,
        end_at
      ` |
| `vehicle_categories` | `id, name` |
| `profiles` | `id, full_name, email, phone` |
| `admin_alerts` | `id` |
| `admin_alerts` | `id` |

### Tables written

| Table | Operation |
| --- | --- |
| `admin_alerts` | INSERT |
| `admin_alerts` | INSERT |

**RPCs called:** none

### External API calls

- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: none

### Failure behaviour / atomicity

**Atomic: NO.** 2 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `check-ticket-escalation`

- **Path:** `supabase/functions/check-ticket-escalation/index.ts` (177 lines)
- **Purpose (from file header):** Check Ticket Escalation
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
41: const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
```

### CORS

```ts
14: import { getCorsHeaders } from "../_shared/cors.ts";
32: const corsHeaders = getCorsHeaders(req);
34: // Handle CORS preflight
35: if (req.method === "OPTIONS") {
36: return new Response(null, { headers: corsHeaders });
160: headers: { ...corsHeaders, "Content-Type": "application/json" },
172: headers: { ...corsHeaders, "Content-Type": "application/json" },
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
36: return new Response(null, { headers: corsHeaders });
154: return new Response(
165: return new Response(
171: status: 500,
```

**Status codes returned:** 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L31: `Deno.serve(async (req) => {`
2. L35: `if (req.method === "OPTIONS") {`
3. L36: `return new Response(null, { headers: corsHeaders });`
4. L39: `try {`
5. L53: `.from("tickets")`
6. L58: `if (fetchError) {`
7. L59: `throw new Error(`Failed to fetch tickets: ${fetchError.message}`);`
8. L62: `for (const ticket of tickets || []) {`
9. L66: `if (!rule) continue;`
10. L72: `if (hoursElapsed < rule.escalateAfterHours) continue;`
11. L74: `try {`
12. L75: `if ("newPriority" in rule) {`
13. L78: `.from("tickets")`
14. L85: `if (updateError) {`
15. L92: `.from("ticket_messages")`
16. L101: `await supabase.from("audit_logs").insert({`
17. L117: `.from("admin_alerts")`
18. L124: `if (existingAlerts && existingAlerts.length > 0) {`
19. L130: `.from("admin_alerts")`
20. L140: `if (alertError) {`
21. L154: `return new Response(`
22. L164: `console.error("Ticket escalation error:", error);`
23. L165: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `tickets` | `id, subject, priority, status, updated_at, user_id, booking_id` |
| `admin_alerts` | `id` |

### Tables written

| Table | Operation |
| --- | --- |
| `tickets` | UPDATE |
| `ticket_messages` | INSERT |
| `audit_logs` | INSERT |
| `admin_alerts` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: none

### Failure behaviour / atomicity

**Atomic: NO.** 4 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `claim-delivery`

- **Path:** `supabase/functions/claim-delivery/index.ts` (110 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
5: import { validateAuth, getAdminClient } from "../_shared/auth.ts";
12: const admin = getAdminClient();
32: const auth = await validateAuth(req);
56: const admin = getAdminClient();
```

### CORS

```ts
2: getCorsHeaders,
3: handleCorsPreflightRequest,
4: } from "../_shared/cors.ts";
25: const corsHeaders = getCorsHeaders(req);
27: if (req.method === "OPTIONS") {
28: return handleCorsPreflightRequest(req);
36: headers: { ...corsHeaders, "Content-Type": "application/json" },
44: headers: { ...corsHeaders, "Content-Type": "application/json" },
52: headers: { ...corsHeaders, "Content-Type": "application/json" },
76: headers: { ...corsHeaders, "Content-Type": "application/json" },
89: headers: { ...corsHeaders, "Content-Type": "application/json" },
100: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
34: return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
35: status: 401,
40: const body: ClaimDeliveryRequest = await req.json();
42: return new Response(JSON.stringify({ success: false, error: "Missing bookingId" }), {
43: status: 400,
50: return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
51: status: 403,
74: return new Response(JSON.stringify({ success: false, error: "Failed to claim" }), {
75: status: 500,
82: return new Response(
88: status: 409,
94: return new Response(
100: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
104: return new Response(JSON.stringify({ success: false, error: "Server error" }), {
105: status: 500,
```

**Status codes returned:** 200, 400, 401, 403, 409, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L14: `.from("user_roles")`
2. L21: `return !error && !!data;`
3. L24: `Deno.serve(async (req) => {`
4. L27: `if (req.method === "OPTIONS") {`
5. L28: `return handleCorsPreflightRequest(req);`
6. L31: `try {`
7. L33: `if (!auth.authenticated || !auth.userId) {`
8. L34: `return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {`
9. L41: `if (!body?.bookingId) {`
10. L42: `return new Response(JSON.stringify({ success: false, error: "Missing bookingId" }), {`
11. L49: `if (!isDriver) {`
12. L50: `return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {`
13. L60: `.from("bookings")`
14. L72: `if (updateError) {`
15. L73: `console.error("[claim-delivery] update failed:", updateError);`
16. L74: `return new Response(JSON.stringify({ success: false, error: "Failed to claim" }), {`
17. L80: `if (!updated) {`
18. L82: `return new Response(`
19. L94: `return new Response(`
20. L103: `console.error("[claim-delivery] unexpected error:", e);`
21. L104: `return new Response(JSON.stringify({ success: false, error: "Server error" }), {`

### Tables read

| Table | Selected columns |
| --- | --- |
| `user_roles` | `id` |

### Tables written

| Table | Operation |
| --- | --- |
| `bookings` | UPDATE |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/hooks/use-claim-delivery.ts:10:      const { data, error } = await supabase.functions.invoke("claim-delivery", {`
- `src/features/delivery/api/mutations.ts:123:  const { data, error } = await supabase.functions.invoke("claim-delivery", {`

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `close-account`

- **Path:** `supabase/functions/close-account/index.ts` (449 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
3: import { validateAuth, isAdminOrStaff } from "../_shared/auth.ts";
38: const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
42: const authResult = await validateAuth(req);
45: // Check for service_role JWT (server-to-server backfill calls)
46: const authHeader = req.headers.get("Authorization");
47: if (authHeader) {
49: const token = authHeader.replace("Bearer ", "");
51: if (payload.role === "service_role") {
```

### CORS

```ts
2: import { getCorsHeaders } from "../_shared/cors.ts";
31: const corsHeaders = getCorsHeaders(req);
33: if (req.method === "OPTIONS") {
34: return new Response(null, { headers: corsHeaders });
59: { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
69: { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
79: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
118: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
125: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
138: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
439: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
445: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
34: return new Response(null, { headers: corsHeaders });
57: return new Response(
59: { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
67: return new Response(
69: { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
74: const { bookingId, additionalCharges, notes, backfillMode, suppressNotifications }: CloseAccountRequest = await req.json();
77: return new Response(
79: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
116: return new Response(
118: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
123: return new Response(
125: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
132: return new Response(
138: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
427: return new Response(
439: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
443: return new Response(
445: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 400, 401, 403, 404, 409, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L27: `return Math.round(v * 100) / 100;`
2. L30: `Deno.serve(async (req) => {`
3. L33: `if (req.method === "OPTIONS") {`
4. L34: `return new Response(null, { headers: corsHeaders });`
5. L41: `try {`
6. L44: `if (!authResult.authenticated) {`
7. L47: `if (authHeader) {`
8. L48: `try {`
9. L51: `if (payload.role === "service_role") {`
10. L56: `if (!isServiceRole) {`
11. L57: `return new Response(`
12. L64: `if (!isServiceRole) {`
13. L66: `if (!hasAccess) {`
14. L67: `return new Response(`
15. L76: `if (!bookingId) {`
16. L77: `return new Response(`
17. L85: `.from("bookings")`
18. L106: `if (booking?.vehicle_id) {`
19. L108: `.from("vehicle_categories")`
20. L115: `if (bookingError || !booking) {`
21. L116: `return new Response(`
22. L122: `if (booking.account_closed_at && !backfillMode) {`
23. L123: `return new Response(`
24. L131: `if (!closableStatuses.includes(booking.status)) {`
25. L132: `return new Response(`
26. L144: `.from("payments")`
27. L161: `return {`
28. L174: `return {`
29. L192: `if (protectionPlan !== "none") {`
30. L196: `if (catUpper.includes("LARGE") && catUpper.includes("SUV")) group = 3;`
31. L197: `else if (catUpper.includes("MINIVAN") || (catUpper.includes("STANDARD") && catUpper.includes("SUV"))) group = 2;`
32. L243: `if (protectionTotal > 0) {`
33. L251: `for (const addon of addonsFromBooking) {`
34. L252: `if (addon.amount > 0) lineItems.push(addon);`
35. L256: `for (const driver of driversFromBooking) {`
36. L257: `if (driver.amount > 0) lineItems.push(driver);`
37. L261: `if (youngDriverFee > 0) {`
38. L269: `if (deliveryFee > 0) {`
39. L272: `if (differentDropoffFee > 0) {`
40. L275: `if (upgradeTotal > 0) {`
41. L284: `if (lateFees > 0) {`
42. L295: `for (const charge of (additionalCharges || [])) {`
43. L310: `.from("final_invoices")`
44. L334: `if (invoiceError) {`
45. L335: `console.error("Failed to create invoice:", invoiceError);`
46. L336: `throw new Error(`Failed to create invoice: ${invoiceError.message}`);`
47. L340: `if (!backfillMode) {`
48. L341: `await supabase.from("bookings").update({`
49. L350: `await supabase.from("bookings").update({`
50. L359: `try {`
51. L361: `.from("payments")`
52. L367: `if (authRentals && authRentals.length > 0) {`
53. L369: `.from("payments")`
54. L374: `.from("bookings")`
55. L378: `await supabase.from("audit_logs").insert({`
56. L390: `console.warn("Failed to auto-complete authorized rental payments:", promoteErr);`
57. L394: `await supabase.from("audit_logs").insert({`
58. L410: `if (!backfillMode && !suppressNotifications) {`
59. L411: `try {`
60. L412: `await supabase.functions.invoke("generate-return-receipt", {`
61. L421: `console.warn("Failed to generate return receipt:", receiptErr);`
62. L427: `return new Response(`
63. L442: `console.error("Error closing account:", error);`
64. L443: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `
        *,
        booking_add_ons (
          id,
          price,
          quantity,
          add_on:add_ons (name)
        ),
        booking_additional_drivers (
          id,
          driver_name,
          driver_age_band,
          young_driver_fee
        )
      ` |
| `vehicle_categories` | `name` |
| `payments` | `*` |
| `payments` | `id` |

### Tables written

| Table | Operation |
| --- | --- |
| `final_invoices` | INSERT |
| `bookings` | UPDATE |
| `bookings` | UPDATE |
| `payments` | UPDATE |
| `bookings` | UPDATE |
| `audit_logs` | INSERT |
| `audit_logs` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** `generate-return-receipt`

### Frontend call sites

- `src/hooks/use-deposit-hold.ts:32:      const { data, error } = await supabase.functions.invoke("close-account", {`
- `src/pages/admin/BookingDetail.tsx:402:      const { data, error } = await supabase.functions.invoke("close-account", {`

### Failure behaviour / atomicity

**Atomic: NO.** 7 separate write statement(s); invokes 1 other function(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `confirm-admin-email`

- **Path:** `supabase/functions/confirm-admin-email/index.ts` (102 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** true

### Auth requirement (enforcing code quoted)

```ts
4: import { getUserOrThrow, requireRoleOrThrow, AuthError, authErrorResponse } from "../_shared/auth.ts";
18: const caller = await getUserOrThrow(req, corsHeaders);
19: await requireRoleOrThrow(caller.userId, ["super_admin", "manager", "admin"], corsHeaders);
23: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
```

### CORS

```ts
3: import { getCorsHeaders } from "../_shared/cors.ts";
11: const corsHeaders = getCorsHeaders(req);
12: if (req.method === "OPTIONS") {
13: return new Response(null, { headers: corsHeaders });
18: const caller = await getUserOrThrow(req, corsHeaders);
19: await requireRoleOrThrow(caller.userId, ["super_admin", "manager", "admin"], corsHeaders);
32: headers: { ...corsHeaders, "Content-Type": "application/json" },
47: headers: { ...corsHeaders, "Content-Type": "application/json" },
54: headers: { ...corsHeaders, "Content-Type": "application/json" },
65: headers: { ...corsHeaders, "Content-Type": "application/json" },
72: headers: { ...corsHeaders, "Content-Type": "application/json" },
85: headers: { ...corsHeaders, "Content-Type": "application/json" },
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
13: return new Response(null, { headers: corsHeaders });
27: const { userId }: ConfirmAdminEmailRequest = await req.json();
30: return new Response(JSON.stringify({ error: "Missing userId" }), {
31: status: 400,
45: return new Response(JSON.stringify({ error: "Role check failed" }), {
46: status: 500,
52: return new Response(JSON.stringify({ error: "Not allowed" }), {
53: status: 403,
63: return new Response(JSON.stringify({ error: "User not found" }), {
64: status: 404,
70: return new Response(JSON.stringify({ success: true, alreadyConfirmed: true }), {
71: status: 200,
83: return new Response(JSON.stringify({ error: "Failed to confirm email" }), {
84: status: 500,
89: return new Response(JSON.stringify({ success: true }), {
90: status: 200,
96: return new Response(JSON.stringify({ error: "Internal server error" }), {
97: status: 500,
```

**Status codes returned:** 200, 400, 403, 404, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L12: `if (req.method === "OPTIONS") {`
2. L13: `return new Response(null, { headers: corsHeaders });`
3. L16: `try {`
4. L29: `if (!userId) {`
5. L30: `return new Response(JSON.stringify({ error: "Missing userId" }), {`
6. L38: `.from("user_roles")`
7. L43: `if (rolesError) {`
8. L44: `console.error("[confirm-admin-email] role check failed", rolesError);`
9. L45: `return new Response(JSON.stringify({ error: "Role check failed" }), {`
10. L51: `if (!roles || roles.length === 0) {`
11. L52: `return new Response(JSON.stringify({ error: "Not allowed" }), {`
12. L61: `if (getError || !existing?.user) {`
13. L62: `console.error("[confirm-admin-email] getUserById failed", getError);`
14. L63: `return new Response(JSON.stringify({ error: "User not found" }), {`
15. L69: `if (existing.user.email_confirmed_at) {`
16. L70: `return new Response(JSON.stringify({ success: true, alreadyConfirmed: true }), {`
17. L81: `if (updateError) {`
18. L82: `console.error("[confirm-admin-email] updateUserById failed", updateError);`
19. L83: `return new Response(JSON.stringify({ error: "Failed to confirm email" }), {`
20. L89: `return new Response(JSON.stringify({ success: true }), {`
21. L94: `if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);`
22. L95: `console.error("[confirm-admin-email] Unexpected error:", error);`
23. L96: `return new Response(JSON.stringify({ error: "Internal server error" }), {`

### Tables read

| Table | Selected columns |
| --- | --- |
| `user_roles` | `role` |

### Tables written

None.

**RPCs called:** none

### External API calls

- endpoint literal: `https://deno.land/std@0.190.0/http/server.ts`
- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: none

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `confirm-bank-transfer-paid`

- **Path:** `supabase/functions/confirm-bank-transfer-paid/index.ts` (147 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
3: import { getAdminClient, getUserOrThrow, requireRoleOrThrow, authErrorResponse } from "../_shared/auth.ts";
10: const data = encoder.encode(otp + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
20: const { userId } = await getUserOrThrow(req, corsHeaders);
21: await requireRoleOrThrow(userId, ["super_admin", "manager", "admin", "staff"], corsHeaders);
36: const supabase = getAdminClient();
```

### CORS

```ts
2: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
16: const corsHeaders = getCorsHeaders(req);
17: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
20: const { userId } = await getUserOrThrow(req, corsHeaders);
21: await requireRoleOrThrow(userId, ["super_admin", "manager", "admin", "staff"], corsHeaders);
26: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
33: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
45: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
49: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
63: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
67: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
71: { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `code` | JSON body | optional (defaulted) |
| `reference` | JSON body | optional (defaulted) |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
23: const { bookingId, code, reference } = await req.json();
25: return new Response(JSON.stringify({ error: "bookingId and 6-digit code required" }),
26: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
32: return new Response(JSON.stringify({ error: "reference must be a string" }),
33: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
44: return new Response(JSON.stringify({ error: "Booking not found" }),
45: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
48: return new Response(JSON.stringify({ error: "Booking already marked as paid by bank transfer" }),
49: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
62: return new Response(JSON.stringify({ error: "No active code — request a new one" }),
63: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
66: return new Response(JSON.stringify({ error: "Code expired — request a new one" }),
67: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
70: return new Response(JSON.stringify({ error: "Too many wrong attempts — request a new code" }),
71: { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
80: return new Response(JSON.stringify({ error: "Invalid code", remainingAttempts: Math.max(0, remaining) }),
81: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
107: return new Response(JSON.stringify({ error: "Failed to update booking" }),
108: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
137: return new Response(JSON.stringify({ success: true, bookingStatus: nextStatus }),
138: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
142: return new Response(JSON.stringify({ error: "Internal server error" }),
143: { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
```

**Status codes returned:** 200, 400, 404, 409, 429, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L12: `return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");`
2. L17: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
3. L19: `try {`
4. L24: `if (!bookingId || !code || !/^\d{6}$/.test(String(code))) {`
5. L25: `return new Response(JSON.stringify({ error: "bookingId and 6-digit code required" }),`
6. L31: `if (reference && typeof reference !== "string") {`
7. L32: `return new Response(JSON.stringify({ error: "reference must be a string" }),`
8. L39: `.from("bookings")`
9. L43: `if (bookingErr || !booking) {`
10. L44: `return new Response(JSON.stringify({ error: "Booking not found" }),`
11. L47: `if (booking.paid_offline) {`
12. L48: `return new Response(JSON.stringify({ error: "Booking already marked as paid by bank transfer" }),`
13. L53: `.from("bank_transfer_otps")`
14. L61: `if (!otpRow) {`
15. L62: `return new Response(JSON.stringify({ error: "No active code — request a new one" }),`
16. L65: `if (new Date(otpRow.expires_at).getTime() < Date.now()) {`
17. L66: `return new Response(JSON.stringify({ error: "Code expired — request a new one" }),`
18. L69: `if ((otpRow.attempts ?? 0) >= MAX_ATTEMPTS) {`
19. L70: `return new Response(JSON.stringify({ error: "Too many wrong attempts — request a new code" }),`
20. L75: `if (submittedHash !== otpRow.otp_hash) {`
21. L76: `await supabase.from("bank_transfer_otps")`
22. L80: `return new Response(JSON.stringify({ error: "Invalid code", remainingAttempts: Math.max(0, remaining) }),`
23. L85: `await supabase.from("bank_transfer_otps")`
24. L94: `.from("bookings")`
25. L105: `if (updateErr) {`
26. L106: `console.error("[confirm-bank-transfer-paid] update error", updateErr);`
27. L107: `return new Response(JSON.stringify({ error: "Failed to update booking" }),`
28. L116: `.from("payments")`
29. L121: `if (rentalErr) {`
30. L122: `console.error("[confirm-bank-transfer-paid] mark rental paid error", rentalErr);`
31. L125: `await supabase.from("audit_logs").insert({`
32. L137: `return new Response(JSON.stringify({ success: true, bookingStatus: nextStatus }),`
33. L140: `try { return authErrorResponse(err, getCorsHeaders(req)); } catch {`
34. L141: `console.error("[confirm-bank-transfer-paid] error", err);`
35. L142: `return new Response(JSON.stringify({ error: "Internal server error" }),`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, booking_code, status, paid_offline` |
| `bank_transfer_otps` | `id, otp_hash, expires_at, verified_at, attempts` |

### Tables written

| Table | Operation |
| --- | --- |
| `bank_transfer_otps` | UPDATE |
| `bank_transfer_otps` | UPDATE |
| `bookings` | UPDATE |
| `payments` | UPDATE |
| `audit_logs` | INSERT |

**RPCs called:** none

### External API calls

- endpoint literal: `https://deno.land/std@0.190.0/http/server.ts`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: `src/components/admin/MarkBankTransferPaidDialog.tsx:96`

### Failure behaviour / atomicity

**Atomic: NO.** 5 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `create-booking`

- **Path:** `supabase/functions/create-booking/index.ts` (525 lines)
- **Purpose (from file header):** create-booking - Create booking for authenticated users
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
9: * - P0 FIX: No service_role key in inter-function fetch calls
20: import { validateAuth, getAdminClient } from "../_shared/auth.ts";
28: import { isStaffAccount } from "../_shared/staff-account-guard.ts";
51: const auth = await validateAuth(req);
59: const supabaseAdmin = getAdminClient();
111: const callerIsStaffAccount = await isStaffAccount(supabaseAdmin, auth.userId);
417: // P0 FIX: Use supabase.functions.invoke instead of raw fetch with service_role Bearer token
444: // Use admin client's functions.invoke — no service_role key in headers
```

### CORS

```ts
12: getCorsHeaders,
13: handleCorsPreflightRequest,
19: } from "../_shared/cors.ts";
31: const corsHeaders = getCorsHeaders(req);
33: if (req.method === "OPTIONS") {
34: return handleCorsPreflightRequest(req);
47: return rateLimitResponse(rateLimit.resetAt, corsHeaders);
55: { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
117: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
127: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
158: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
170: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `holdId` | JSON body | UNKNOWN: no explicit guard |
| `vehicleId` | JSON body | yes |
| `locationId` | JSON body | optional (defaulted) |
| `startAt` | JSON body | optional (defaulted) |
| `endAt` | JSON body | UNKNOWN: no explicit guard |
| `pickupDate` | JSON body | UNKNOWN: no explicit guard |
| `dropoffDate` | JSON body | UNKNOWN: no explicit guard |
| `userPhone` | JSON body | UNKNOWN: no explicit guard |
| `driverAgeBand` | JSON body | yes |
| `protectionPlan` | JSON body | optional (defaulted) |
| `addOns` | JSON body | UNKNOWN: no explicit guard |
| `additionalDrivers` | JSON body | optional (defaulted) |
| `notes` | JSON body | UNKNOWN: no explicit guard |
| `deliveryFee` | JSON body | optional (defaulted) |
| `returnLocationId` | JSON body | optional (defaulted) |
| `totalAmount` | JSON body | UNKNOWN: no explicit guard |
| `paymentMethod` | JSON body | UNKNOWN: no explicit guard |
| `pickupAddress` | JSON body | optional (defaulted) |
| `pickupLat` | JSON body | optional (defaulted) |
| `pickupLng` | JSON body | optional (defaulted) |
| `saveTimeAtCounter` | JSON body | optional (defaulted) |
| `pickupContactName` | JSON body | optional (defaulted) |
| `pickupContactPhone` | JSON body | optional (defaulted) |
| `specialInstructions` | JSON body | optional (defaulted) |
| `promoCode` | JSON body | UNKNOWN: no explicit guard |
| `renterFirstName` | JSON body | UNKNOWN: no explicit guard |
| `renterLastName` | JSON body | UNKNOWN: no explicit guard |
| `renterEmail` | JSON body | UNKNOWN: no explicit guard |
| `renterPhone` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
53: return new Response(
55: { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
60: const body = await req.json();
115: return new Response(
117: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
122: return new Response(
127: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
156: return new Response(
158: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
164: return new Response(
170: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
203: return new Response(
208: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
218: return new Response(
223: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
266: return new Response(
274: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
290: return new Response(
296: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
328: return new Response(
334: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
387: return new Response(
389: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
505: return new Response(
514: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
519: return new Response(
521: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 400, 401, 409, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L30: `Deno.serve(async (req) => {`
2. L33: `if (req.method === "OPTIONS") {`
3. L34: `return handleCorsPreflightRequest(req);`
4. L37: `try {`
5. L46: `if (!rateLimit.allowed) {`
6. L47: `return rateLimitResponse(rateLimit.resetAt, corsHeaders);`
7. L52: `if (!auth.authenticated || !auth.userId) {`
8. L53: `return new Response(`
9. L114: `if (!vehicleId || !locationId || !startAt || !endAt) {`
10. L115: `return new Response(`
11. L121: `if (!driverAgeBand || !["20_24", "25_70"].includes(driverAgeBand)) {`
12. L122: `return new Response(`
13. L133: `try {`
14. L155: `console.error("[create-booking] PRICE_VALIDATION_FAILED:", err);`
15. L156: `return new Response(`
16. L162: `if (!priceCheck.valid) {`
17. L163: `console.warn(`[create-booking] Price mismatch for user ${auth.userId}: ${priceCheck.error}`);`
18. L164: `return new Response(`
19. L179: `if (userPhone && !callerIsStaffAccount) {`
20. L181: `if (sanitizedPhone && isValidPhone(sanitizedPhone)) {`
21. L183: `.from("profiles")`
22. L193: `if (holdId) {`
23. L195: `.from("reservation_holds")`
24. L202: `if (holdError || !hold) {`
25. L203: `return new Response(`
26. L212: `if (new Date(hold.expires_at) < new Date()) {`
27. L214: `.from("reservation_holds")`
28. L218: `return new Response(`
29. L231: `try {`
30. L239: `if (!capacity.offered) {`
31. L246: `console.error("[create-booking] capacity lookup failed (non-fatal)", availErr);`
32. L251: `try {`
33. L254: `.from("bookings")`
34. L263: `if (dupes && dupes.length > 0) {`
35. L265: `console.warn(`[create-booking] Duplicate detected for user ${auth.userId} vehicle ${vehicleId} — existing ${existing.booking_code}`);`
36. L266: `return new Response(`
37. L278: `console.error("[create-booking] Duplicate check failed (non-fatal):", dupErr);`
38. L289: `if (callerIsStaffAccount && (!renterEmailClean || !renterName)) {`
39. L290: `return new Response(`
40. L300: `if (renterEmailClean && (callerIsStaffAccount || renterDiffersFromAccount)) {`
41. L301: `try {`
42. L303: `.from("customers")`
43. L308: `if (`
44. L315: `.from("customers")`
45. L319: `if (custErr) console.error("[create-booking] customer insert failed", custErr);`
46. L320: `if (newCustomer) customerId = newCustomer.id;`
47. L323: `console.error("[create-booking] customer resolution failed", custErr);`
48. L327: `if (callerIsStaffAccount && !customerId) {`
49. L328: `return new Response(`
50. L343: `.from("bookings")`
51. L385: `if (bookingError) {`
52. L386: `console.error("Error creating booking:", bookingError);`
53. L387: `return new Response(`
54. L397: `try {`
55. L398: `if (serverTotals.addOnPrices.length > 0) {`
56. L402: `if (serverTotals.additionalDriverRecords.length > 0) {`
57. L406: `console.error(`[create-booking] Extras persistence FAILED for booking ${booking.id}:`, extrasError);`
58. L410: `if (holdId) {`
59. L412: `.from("reservation_holds")`
60. L417: `// P0 FIX: Use supabase.functions.invoke instead of raw fetch with service_role Bearer token`
61. L423: `try {`
62. L424: `if (!customerName && !callerIsStaffAccount) {`
63. L426: `.from("profiles")`
64. L435: `.from("vehicles")`
65. L444: `// Use admin client's functions.invoke — no service_role key in headers`
66. L451: `try {`
67. L452: `const { data, error } = await supabaseAdmin.functions.invoke(endpoint, { body });`
68. L453: `if (error) {`
69. L454: `console.error(`[create-booking] ${endpoint} invoke failed:`, error);`
70. L455: `await supabaseAdmin.from("notification_logs").insert({`
71. L468: `console.error(`[create-booking] ${endpoint} threw:`, err);`
72. L469: `await supabaseAdmin.from("notification_logs").insert({`
73. L505: `return new Response(`
74. L518: `console.error("Unexpected error:", error);`
75. L519: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `reservation_holds` | `*` |
| `bookings` | `id, booking_code, status, start_at, end_at, created_at` |
| `customers` | `id, full_name` |
| `profiles` | `full_name` |
| `vehicles` | `make, model, year` |

### Tables written

| Table | Operation |
| --- | --- |
| `profiles` | UPSERT |
| `reservation_holds` | UPDATE |
| `customers` | INSERT |
| `bookings` | INSERT |
| `reservation_holds` | UPDATE |
| `notification_logs` | INSERT |
| `notification_logs` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/pages/NewCheckout.tsx:517:          authResponse = await supabase.functions.invoke("create-booking", {`

### Failure behaviour / atomicity

**Atomic: NO.** 7 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `create-guest-booking`

- **Path:** `supabase/functions/create-guest-booking/index.ts` (507 lines)
- **Purpose (from file header):** create-guest-booking - Create booking for unauthenticated users
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
21: import { getAdminClient } from "../_shared/auth.ts";
57: const supabaseAdmin = getAdminClient();
```

### CORS

```ts
11: getCorsHeaders,
12: handleCorsPreflightRequest,
20: } from "../_shared/cors.ts";
38: const corsHeaders = getCorsHeaders(req);
40: if (req.method === "OPTIONS") {
41: return handleCorsPreflightRequest(req);
54: return rateLimitResponse(ipRateLimit.resetAt, corsHeaders);
69: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
76: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
83: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
89: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
103: { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `firstName` | JSON body | yes |
| `lastName` | JSON body | UNKNOWN: no explicit guard |
| `email` | JSON body | optional (defaulted) |
| `phone` | JSON body | optional (defaulted) |
| `isWalkIn` | JSON body | UNKNOWN: no explicit guard |
| `additionalDrivers` | JSON body | optional (defaulted) |
| `locationId` | JSON body | optional (defaulted) |
| `returnLocationId` | JSON body | UNKNOWN: no explicit guard |
| `paymentMethod` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
58: const body = await req.json();
67: return new Response(
69: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
74: return new Response(
76: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
81: return new Response(
83: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
87: return new Response(
89: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
101: return new Response(
103: { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
135: return new Response(
137: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
143: return new Response(
145: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
150: return new Response(
152: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
181: return new Response(
183: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
189: return new Response(
195: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
287: return new Response(
292: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
296: return new Response(
301: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
324: return new Response(
329: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
382: return new Response(
390: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
425: return new Response(
427: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
482: return new Response(
495: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
501: return new Response(
503: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 400, 409, 429, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L37: `Deno.serve(async (req) => {`
2. L40: `if (req.method === "OPTIONS") {`
3. L41: `return handleCorsPreflightRequest(req);`
4. L44: `try {`
5. L53: `if (!ipRateLimit.allowed) {`
6. L54: `return rateLimitResponse(ipRateLimit.resetAt, corsHeaders);`
7. L66: `if (!firstName || !lastName) {`
8. L67: `return new Response(`
9. L73: `if (!isValidEmail(email)) {`
10. L74: `return new Response(`
11. L80: `if (phone && !isValidPhone(phone)) {`
12. L81: `return new Response(`
13. L86: `if (!body.isWalkIn && !phone) {`
14. L87: `return new Response(`
15. L100: `if (!emailRateLimit.allowed) {`
16. L101: `return new Response(`
17. L134: `if (!vehicleId || !locationId || !startAt || !endAt) {`
18. L135: `return new Response(`
19. L142: `if (isPastBusinessDay(startAt)) {`
20. L143: `return new Response(`
21. L149: `if (!isValidAgeBand(driverAgeBand)) {`
22. L150: `return new Response(`
23. L158: `try {`
24. L180: `console.error("[create-guest-booking] PRICE_VALIDATION_FAILED:", err);`
25. L181: `return new Response(`
26. L187: `if (!priceCheck.valid) {`
27. L188: `console.warn(`[create-guest-booking] Price mismatch: ${priceCheck.error}`);`
28. L189: `return new Response(`
29. L204: `try {`
30. L212: `if (!capacity.offered) {`
31. L218: `console.error("[create-guest-booking] capacity lookup failed (non-fatal)", availErr);`
32. L227: `.from("profiles")`
33. L232: `if (existingProfile) {`
34. L240: `if (profileName !== guestName) {`
35. L245: `if (!userId) {`
36. L247: `const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({`
37. L259: `if (createError) {`
38. L263: `console.error(`[guest-booking] createUser failed (code=${code}): ${createError.message}`);`
39. L265: `if (code === "email_exists" || /already been registered/i.test(createError.message || "")) {`
40. L267: `try {`
41. L275: `console.error("[guest-booking] auth lookup after email_exists failed", lookupErr);`
42. L278: `if (resolvedId) {`
43. L281: `await supabaseAdmin.from("profiles").upsert({`
44. L287: `return new Response(`
45. L296: `return new Response(`
46. L307: `if (newUser?.user?.id) {`
47. L311: `await supabaseAdmin.from("profiles").upsert({`
48. L322: `if (!userId) {`
49. L323: `console.error(`[guest-booking] could not resolve a user for ${email}`);`
50. L324: `return new Response(`
51. L337: `.from("customers")`
52. L342: `if (existingCustomer) {`
53. L344: `if (existingCustomer.full_name?.toLowerCase().trim() === guestFullName.toLowerCase().trim()) {`
54. L349: `.from("customers")`
55. L353: `if (newCust) customerId = newCust.id;`
56. L358: `.from("customers")`
57. L362: `if (newCust) customerId = newCust.id;`
58. L367: `try {`
59. L370: `.from("bookings")`
60. L379: `if (dupes && dupes.length > 0) {`
61. L381: `console.warn(`[create-guest-booking] Duplicate detected for user ${userId} vehicle ${vehicleId} — existing ${existing.booking_code}`);`
62. L382: `return new Response(`
63. L394: `console.error("[create-guest-booking] Duplicate check failed (non-fatal):", dupErr);`
64. L424: `if (!bookingResult.success || !bookingResult.booking) {`
65. L425: `return new Response(`
66. L434: `if (isOverbooked) {`
67. L436: `.from("bookings")`
68. L444: `if (serverTotals.additionalDriverRecords.length > 0) {`
69. L450: `if (body.paymentMethod === "pay-now") {`
70. L453: `.from("booking_access_tokens")`
71. L458: `const rawToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))`
72. L465: `await supabaseAdmin.from("booking_access_tokens").insert({`
73. L482: `return new Response(`
74. L500: `console.error("Unexpected error:", errorMessage, error);`
75. L501: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `profiles` | `id, full_name` |
| `customers` | `id, full_name` |
| `bookings` | `id, booking_code, status, created_at` |

### Tables written

| Table | Operation |
| --- | --- |
| `profiles` | UPSERT |
| `profiles` | UPSERT |
| `customers` | INSERT |
| `customers` | INSERT |
| `bookings` | UPDATE |
| `booking_access_tokens` | UPDATE |
| `booking_access_tokens` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/pages/NewCheckout.tsx:621:          guestResponse = await supabase.functions.invoke("create-guest-booking", {`

### Failure behaviour / atomicity

**Atomic: NO.** 7 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `create-walk-in-booking`

- **Path:** `supabase/functions/create-walk-in-booking/index.ts` (641 lines)
- **Purpose (from file header):** create-walk-in-booking — Staff-only walk-in booking creation
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
7: * - Inserts via service_role client (bypasses RLS + INSERT seatbelt trigger)
29: validateAuth,
30: getAdminClient,
42: import { isStaffAccount, STAFF_ACCOUNT_WRITE_ERROR } from "../_shared/staff-account-guard.ts";
57: const auth = await validateAuth(req);
137: console.log("[walkin] role mode", { hasServiceKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") });
138: const supabaseAdmin = getAdminClient();
381: if (await isStaffAccount(supabaseAdmin, userId)) {
498: // 8. Insert booking via service_role (bypasses RLS + INSERT seatbelt)
```

### CORS

```ts
20: getCorsHeaders,
21: handleCorsPreflightRequest,
26: } from "../_shared/cors.ts";
49: const corsHeaders = getCorsHeaders(req);
51: if (req.method === "OPTIONS") {
52: return handleCorsPreflightRequest(req);
61: { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
69: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
78: { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
118: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
126: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
133: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
59: return new Response(
61: { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
67: return new Response(
69: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
76: return new Response(
78: { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
82: const body = await req.json();
116: return new Response(
118: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
124: return new Response(
126: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
131: return new Response(
133: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
146: return new Response(
148: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
153: return new Response(
155: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
160: return new Response(
162: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
178: return new Response(
180: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
205: return new Response(
207: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
232: return new Response(
244: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
260: return new Response(
262: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
273: return new Response(
275: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
352: return new Response(
356: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
383: return new Response(
385: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
395: return new Response(
397: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
484: return new Response(
494: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
535: return new Response(
537: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
620: return new Response(
630: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
635: return new Response(
637: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

**Status codes returned:** 200, 400, 401, 403, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L48: `Deno.serve(async (req) => {`
2. L51: `if (req.method === "OPTIONS") {`
3. L52: `return handleCorsPreflightRequest(req);`
4. L55: `try {`
5. L58: `if (!auth.authenticated || !auth.userId) {`
6. L59: `return new Response(`
7. L66: `if (!auth.userId) {`
8. L67: `return new Response(`
9. L75: `if (!staffCheck) {`
10. L76: `return new Response(`
11. L111: `if (locationId) {`
12. L115: `if (!locationId || !categoryId || !startAt || !endAt || !customerName || !customerPhone || !customerEmail) {`
13. L116: `return new Response(`
14. L123: `if (isPastBusinessDay(startAt)) {`
15. L124: `return new Response(`
16. L130: `if (!dailyRate || dailyRate <= 0 || !totalAmount || totalAmount <= 0) {`
17. L131: `return new Response(`
18. L145: `if (!sanitizedName) {`
19. L146: `return new Response(`
20. L152: `if (!isValidPhone(sanitizedPhoneVal)) {`
21. L153: `return new Response(`
22. L159: `if (!email || !isValidEmail(email)) {`
23. L160: `return new Response(`
24. L169: `if (useCustomerId) {`
25. L172: `.from("customers")`
26. L177: `if (!confirmedCustomer) {`
27. L178: `return new Response(`
28. L186: `.from("customers")`
29. L194: `.from("customers")`
30. L203: `if (custErr || !newCustomer) {`
31. L204: `console.error("[walkin] Failed to create customer record:", custErr);`
32. L205: `return new Response(`
33. L215: `.from("customers")`
34. L224: `if (nameMatch) {`
35. L232: `return new Response(`
36. L249: `.from("customers")`
37. L258: `if (custErr || !newCustomer) {`
38. L259: `console.error("[walkin] Failed to create customer record:", custErr);`
39. L260: `return new Response(`
40. L271: `if (!customerId) {`
41. L272: `console.error("[walkin] CRITICAL: No customer_id resolved — aborting booking creation");`
42. L273: `return new Response(`
43. L283: `.from("profiles")`
44. L289: `if (existingProfile) {`
45. L295: `if (profileName === walkinName || useCustomerId) {`
46. L303: `if (!userId) {`
47. L305: `const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({`
48. L317: `if (createError || !newUser?.user) {`
49. L327: `if (alreadyRegistered) {`
50. L329: `.from("profiles")`
51. L335: `if (fallbackProfile?.id) {`
52. L343: `if (match) {`
53. L350: `if (!userId) {`
54. L351: `console.error("[create-walk-in-booking] Failed to create walk-in customer:", createError);`
55. L352: `return new Response(`
56. L373: `if (!existingProfile || existingProfile.id !== userId || useCustomerId) {`
57. L376: `if (!existingProfile || existingProfile.id !== userId) {`
58. L381: `if (await isStaffAccount(supabaseAdmin, userId)) {`
59. L382: `console.error("[create-walk-in-booking] Blocked customer write onto staff account");`
60. L383: `return new Response(`
61. L390: `.from("profiles")`
62. L393: `if (profileUpsertError) {`
63. L394: `console.error("[create-walk-in-booking] Failed to save customer profile:", profileUpsertError);`
64. L395: `return new Response(`
65. L422: `if (Array.isArray(addOns) && addOns.length > 0) {`
66. L424: `if (addOnIds.length > 0) {`
67. L426: `.from("add_ons")`
68. L431: `for (const ao of addOnRecords || []) {`
69. L459: `if (subtotal != null && Math.abs(Number(subtotal) - computedSubtotal) > 0.5) {`
70. L460: `console.warn("[walkin] client quote drift", {`
71. L472: `.from("bookings")`
72. L482: `if (existingBooking) {`
73. L484: `return new Response(`
74. L500: `.from("bookings")`
75. L533: `if (insertError) {`
76. L534: `console.error("[create-walk-in-booking] Insert error:", insertError);`
77. L535: `return new Response(`
78. L542: `if (addOnRowsToInsert.length > 0) {`
79. L544: `.from("booking_add_ons")`
80. L547: `if (addOnInsertError) {`
81. L548: `console.error("[walkin] Failed to insert add-ons:", addOnInsertError);`
82. L550: `await supabaseAdmin.from("audit_logs").insert({`
83. L565: `await supabaseAdmin.from("delivery_statuses").insert({`
84. L573: `await supabaseAdmin.from("audit_logs").insert({`
85. L590: `try {`
86. L591: `const { data: smsData, error: smsError } = await supabaseAdmin.functions.invoke("send-booking-sms", {`
87. L594: `if (smsError) {`
88. L595: `console.error("[create-walk-in-booking] Confirmation SMS invoke failed:", smsError);`
89. L600: `console.error("[create-walk-in-booking] Confirmation SMS failed (non-fatal):", notifyErr);`
90. L604: `try {`
91. L605: `const { data: branchData, error: branchError } = await supabaseAdmin.functions.invoke(`
92. L609: `if (branchError) {`
93. L610: `console.error("[create-walk-in-booking] Branch SMS invoke failed:", branchError);`
94. L615: `console.error("[create-walk-in-booking] Branch SMS failed (non-fatal):", branchErr);`
95. L620: `return new Response(`
96. L634: `console.error("[create-walk-in-booking] Error:", msg, error);`
97. L635: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `customers` | `id` |
| `customers` | `id, full_name, email, phone` |
| `profiles` | `id, full_name` |
| `profiles` | `id` |
| `add_ons` | `id, daily_rate, one_time_fee, name` |
| `bookings` | `id, booking_code, status` |

### Tables written

| Table | Operation |
| --- | --- |
| `customers` | UPDATE |
| `customers` | INSERT |
| `customers` | INSERT |
| `profiles` | UPSERT |
| `bookings` | INSERT |
| `booking_add_ons` | INSERT |
| `audit_logs` | INSERT |
| `delivery_statuses` | INSERT |
| `audit_logs` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** `notify-branch-sms`, `send-booking-sms`

### Frontend call sites

- `src/features/delivery/pages/WalkIn.tsx:91:      const { data, error } = await supabase.functions.invoke("create-walk-in-booking", {`
- `src/components/admin/WalkInBookingDialog.tsx:218:      const { data, error } = await supabase.functions.invoke("create-walk-in-booking", {`

### Failure behaviour / atomicity

**Atomic: NO.** 9 separate write statement(s); invokes 2 other function(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `force-close-booking`

- **Path:** `supabase/functions/force-close-booking/index.ts` (238 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
3: import { validateAuth, isAdminOrStaff } from "../_shared/auth.ts";
11: * by using service_role.
36: const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
41: const authResult = await validateAuth(req);
95: // Update booking to completed (service_role bypasses seatbelt triggers)
```

### CORS

```ts
2: import { getCorsHeaders } from "../_shared/cors.ts";
29: const corsHeaders = getCorsHeaders(req);
31: if (req.method === "OPTIONS") {
32: return new Response(null, { headers: corsHeaders });
45: { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
53: { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
63: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
80: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
88: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
113: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
220: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
229: { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `actualReturnAt` | JSON body | UNKNOWN: no explicit guard |
| `returnFuelLevel` | JSON body | optional (defaulted) |
| `returnOdometer` | JSON body | optional (defaulted) |
| `closingImageUrl` | JSON body | UNKNOWN: no explicit guard |
| `adminNote` | JSON body | optional (defaulted) |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
32: return new Response(null, { headers: corsHeaders });
43: return new Response(
45: { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
51: return new Response(
53: { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
57: const body: ForceCloseRequest = await req.json();
61: return new Response(
63: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
78: return new Response(
80: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
86: return new Response(
88: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
111: return new Response(
113: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
214: return new Response(
220: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
227: return new Response(
232: return new Response(
234: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 400, 401, 403, 404, 409, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L28: `Deno.serve(async (req) => {`
2. L31: `if (req.method === "OPTIONS") {`
3. L32: `return new Response(null, { headers: corsHeaders });`
4. L39: `try {`
5. L42: `if (!authResult.authenticated || !authResult.userId) {`
6. L43: `return new Response(`
7. L50: `if (!hasAccess) {`
8. L51: `return new Response(`
9. L60: `if (!bookingId || !actualReturnAt) {`
10. L61: `return new Response(`
11. L72: `.from("bookings")`
12. L77: `if (fetchError || !booking) {`
13. L78: `return new Response(`
14. L85: `if (booking.status === "completed" || booking.status === "cancelled") {`
15. L86: `return new Response(`
16. L97: `.from("bookings")`
17. L109: `if (updateError) {`
18. L110: `console.error("Failed to update booking:", updateError);`
19. L111: `return new Response(`
20. L118: `if (returnFuelLevel !== undefined || returnOdometer !== undefined) {`
21. L120: `.from("inspection_metrics")`
22. L130: `if (metricsError) {`
23. L131: `console.error("Failed to insert inspection metrics:", metricsError);`
24. L137: `if (closingImageUrl) {`
25. L139: `.from("condition_photos")`
26. L149: `if (photoError) {`
27. L150: `console.error("Failed to insert condition photo:", photoError);`
28. L155: `if (booking.assigned_unit_id) {`
29. L157: `.from("vehicle_units")`
30. L161: `if (releaseError) {`
31. L162: `console.error("Failed to release vehicle unit:", releaseError);`
32. L168: `try {`
33. L170: `.from("payments")`
34. L176: `if (authRentals && authRentals.length > 0) {`
35. L178: `.from("payments")`
36. L183: `.from("bookings")`
37. L188: `console.warn("Failed to auto-complete authorized rental payments:", promoteErr);`
38. L193: `.from("audit_logs")`
39. L210: `if (auditError) {`
40. L211: `console.error("Failed to write audit log:", auditError);`
41. L214: `return new Response(`
42. L224: `console.error("Force close error:", err);`
43. L226: `if (status === 403 || status === 404) {`
44. L227: `return new Response(`
45. L232: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, booking_code, status, assigned_unit_id, notes` |
| `payments` | `id` |

### Tables written

| Table | Operation |
| --- | --- |
| `bookings` | UPDATE |
| `inspection_metrics` | INSERT |
| `condition_photos` | INSERT |
| `vehicle_units` | UPDATE |
| `payments` | UPDATE |
| `bookings` | UPDATE |
| `audit_logs` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/components/admin/ops/ForceCloseDialog.tsx:120:      const response = await supabase.functions.invoke("force-close-booking", {`

### Failure behaviour / atomicity

**Atomic: NO.** 7 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `generate-agreement`

- **Path:** `supabase/functions/generate-agreement/index.ts` (780 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
4: import { validateAuth } from "../_shared/auth.ts";
107: // Validate authentication — allow service_role calls (server-to-server)
108: const auth = await validateAuth(req);
109: const authHeader = req.headers.get("Authorization");
111: if (!auth.authenticated && authHeader) {
112: const token = authHeader.replace("Bearer ", "").trim();
114: const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
118: // Legacy JWT service_role key: inspect claims
121: if (payload.role === "service_role") {
161: const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
```

### CORS

```ts
3: import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIp } from "../_shared/cors.ts";
86: const corsHeaders = getCorsHeaders(req);
88: if (req.method === "OPTIONS") {
89: return new Response(null, { headers: corsHeaders });
104: return rateLimitResponse(rateLimit.resetAt, corsHeaders);
131: { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
145: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
154: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
175: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
189: { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
211: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
326: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `suppressNotifications` | JSON body | yes |
| `agreementType` | JSON body | UNKNOWN: no explicit guard |
| `forceRegenerate` | JSON body | UNKNOWN: no explicit guard |
| `copySignatureFromLatest` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
89: return new Response(null, { headers: corsHeaders });
129: return new Response(
131: { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
135: const body = await req.json();
143: return new Response(
145: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
152: return new Response(
154: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
173: return new Response(
175: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
187: return new Response(
189: { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
209: return new Response(
211: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
321: return new Response(
326: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
380: return new Response(
705: return new Response(
707: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
768: return new Response(
775: return new Response(
777: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 400, 401, 403, 404, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L33: `if (!startISO || !days || days < 1) return 0;`
2. L35: `if (Number.isNaN(start.getTime())) return 0;`
3. L42: `for (let i = 0; i < days; i++) {`
4. L45: `if (wk === "Fri" || wk === "Sat" || wk === "Sun") count++;`
5. L47: `return count;`
6. L51: `return Math.round(n * 100) / 100;`
7. L71: `if (!categoryName) return 1;`
8. L73: `if (name.includes("LARGE") && name.includes("SUV")) return 3;`
9. L74: `if (name.includes("MINIVAN")) return 2;`
10. L75: `if (name.includes("STANDARD") && name.includes("SUV")) return 2;`
11. L76: `return 1;`
12. L80: `if (planId === "none") return 0;`
13. L82: `return GROUP_RATES[group]?.[planId] ?? 0;`
14. L88: `if (req.method === "OPTIONS") {`
15. L89: `return new Response(null, { headers: corsHeaders });`
16. L92: `try {`
17. L102: `if (!rateLimit.allowed) {`
18. L103: `console.warn(`Rate limit exceeded for generate-agreement from IP: ${clientIp}`);`
19. L104: `return rateLimitResponse(rateLimit.resetAt, corsHeaders);`
20. L111: `if (!auth.authenticated && authHeader) {`
21. L115: `if (serviceKey && token === serviceKey) {`
22. L119: `try {`
23. L121: `if (payload.role === "service_role") {`
24. L128: `if (!auth.authenticated && !isServiceRole) {`
25. L129: `return new Response(`
26. L141: `if (!bookingId || typeof bookingId !== "string") {`
27. L142: `console.error("Invalid or missing bookingId");`
28. L143: `return new Response(`
29. L151: `if (!uuidRegex.test(bookingId)) {`
30. L152: `return new Response(`
31. L165: `if (auth.authenticated && auth.userId) {`
32. L167: `.from("bookings")`
33. L172: `if (!bookingCheck) {`
34. L173: `return new Response(`
35. L180: `.from("user_roles")`
36. L186: `if (bookingCheck.user_id !== auth.userId && !userRole) {`
37. L187: `return new Response(`
38. L196: `.from("bookings")`
39. L207: `if (bookingError || !booking) {`
40. L208: `console.error("Booking not found:", bookingError);`
41. L209: `return new Response(`
42. L224: `if (booking.vehicle_id) {`
43. L226: `.from("vehicle_categories")`
44. L230: `if (category) {`
45. L233: `console.error(`Category not found for vehicle_id: ${booking.vehicle_id}`);`
46. L248: `if (booking.assigned_unit_id) {`
47. L250: `.from("vehicle_units")`
48. L254: `if (unit && !unitError) {`
49. L267: `if (unitError) {`
50. L268: `console.error("Failed to fetch vehicle unit:", unitError);`
51. L280: `.from("inspection_metrics")`
52. L285: `if (inspectionData) {`
53. L297: `.from("profiles")`
54. L304: `if (booking.customer_id) {`
55. L306: `.from("customers")`
56. L310: `if (customer) {`
57. L316: `if (profile?.driver_license_expiry) {`
58. L319: `if (licenseExpiry < rentalEnd) {`
59. L320: `console.warn(`License expires ${profile.driver_license_expiry} before rental end ${booking.end_at}`);`
60. L321: `return new Response(`
61. L337: `if (customerName && customerName.includes("@")) {`
62. L347: `.from("booking_add_ons")`
63. L357: `.from("booking_additional_drivers")`
64. L369: `if (!isExtension) {`
65. L371: `.from("rental_agreements")`
66. L378: `if (existingAgreement && !forceRegenerate) {`
67. L380: `return new Response(`
68. L386: `if (existingAgreement && forceRegenerate) {`
69. L410: `return sum + (Number(addon.price) || 0);`
70. L415: `return sum + (Number(d.young_driver_fee) || 0);`
71. L426: `if (!d.authorized_start || !d.authorized_end) return null;`
72. L430: `return from === to || days === 1`
73. L438: `return {`
74. L517: `if (bookingAddOns && bookingAddOns.length > 0) {`
75. L521: `return `   ${name}: $${price.toFixed(2)}`;`
76. L565: `for (const d of (bookingDrivers || [])) {`
77. L579: `if (hasUpgrade) {`
78. L692: `.from("rental_agreements")`
79. L703: `if (createError) {`
80. L704: `console.error("Failed to create agreement:", createError);`
81. L705: `return new Response(`
82. L714: `if (copySignatureFromLatest && priorAgreement && priorAgreement.customer_signed_at) {`
83. L716: `.from("rental_agreements")`
84. L733: `if (copyErr) {`
85. L734: `console.error("Failed to copy signature onto new agreement:", copyErr);`
86. L741: `await supabase.from("audit_logs").insert({`
87. L755: `if (!suppressNotifications) {`
88. L756: `try {`
89. L758: `await supabase.functions.invoke("send-agreement-notification", {`
90. L762: `console.error("Failed to send agreement notification (non-blocking):", notifyError);`
91. L768: `return new Response(`
92. L773: `console.error("Error generating agreement:", error);`
93. L775: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `user_id` |
| `user_roles` | `role` |
| `bookings` | `
        *,
        vehicle_id,
        locations!bookings_location_id_fkey (id, name, address, city, phone),
        return_location:locations!bookings_return_location_id_fkey (id, name, address, city, phone),
        assigned_unit_id
      ` |
| `vehicle_categories` | `id, name, fuel_type, transmission, seats` |
| `vehicle_units` | `vin, license_plate, tank_capacity_liters, color, current_mileage, vehicles(make, model, year)` |
| `inspection_metrics` | `odometer, fuel_level` |
| `profiles` | `id, full_name, email, phone, driver_license_expiry` |
| `customers` | `full_name, email, phone` |
| `booking_add_ons` | `
          id,
          price,
          quantity,
          add_on_id,
          add_ons (name, description)
        ` |
| `booking_additional_drivers` | `id, driver_name, driver_age_band, young_driver_fee, driver_license_number, driver_license_expiry, authorized_start, authorized_end, authorized_days` |
| `rental_agreements` | `id, status, customer_signature, signature_png_url, signature_vector_json, signature_method, signature_device_info, signature_workstation_id, customer_signed_at, customer_ip_address, signed_manually, signed_manually_by, signed_manually_at` |

### Tables written

| Table | Operation |
| --- | --- |
| `rental_agreements` | INSERT |
| `rental_agreements` | UPDATE |
| `audit_logs` | INSERT |

**RPCs called:** none

### External API calls

- endpoint literal: `https://deno.land/std@0.168.0/http/server.ts`
- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** `send-agreement-notification`

### Frontend call sites

- `src/hooks/use-rental-agreement.ts:166:          const { data, error } = await supabase.functions.invoke("generate-agreement", {`
- `src/pages/admin/BookingDetail.tsx:421:      const { data, error } = await supabase.functions.invoke("generate-agreement", {`
- `src/components/admin/ops/CounterUpsellPanel.tsx:170:      const { data, error } = await supabase.functions.invoke("generate-agreement", {`

### Failure behaviour / atomicity

**Atomic: NO.** 3 separate write statement(s); invokes 1 other function(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `generate-return-receipt`

- **Path:** `supabase/functions/generate-return-receipt/index.ts` (570 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
6: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
24: const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
487: "Authorization": `Bearer ${resendApiKey}`,
```

### CORS

```ts
4: const corsHeaders = {
5: "Access-Control-Allow-Origin": "*",
6: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
18: if (req.method === "OPTIONS") {
19: return new Response(null, { headers: corsHeaders });
34: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
50: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
71: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
560: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
566: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
19: return new Response(null, { headers: corsHeaders });
29: const { bookingId, depositReleased, depositWithheld, withholdReason, staffUserId }: ReceiptRequest = await req.json();
32: return new Response(
34: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
48: return new Response(
50: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
69: return new Response(
71: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
498: const emailData = await emailResponse.json();
552: return new Response(
560: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
564: return new Response(
566: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 400, 404, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L18: `if (req.method === "OPTIONS") {`
2. L19: `return new Response(null, { headers: corsHeaders });`
3. L22: `try {`
4. L31: `if (!bookingId) {`
5. L32: `return new Response(`
6. L40: `.from("receipts")`
7. L46: `if (existingReceipt) {`
8. L48: `return new Response(`
9. L56: `.from("bookings")`
10. L67: `if (bookingError || !booking) {`
11. L68: `console.error("Booking not found:", bookingError);`
12. L69: `return new Response(`
13. L77: `.from("vehicle_categories")`
14. L83: `.from("locations")`
15. L94: `.from("booking_add_ons")`
16. L100: `.from("booking_additional_drivers")`
17. L106: `.from("profiles")`
18. L114: `if (!userEmail) {`
19. L156: `if (vehicleCents < 0) {`
20. L157: `console.warn(`
21. L172: `if (upgradeCents > 0) {`
22. L182: `if (youngDriverCents > 0) {`
23. L195: `if (fee <= 0) return;`
24. L223: `if (deliveryCents > 0) {`
25. L231: `if (dropoffCents > 0) {`
26. L265: `if (Math.abs(subtotalCents + storedTaxCents + processingFeeCents - totalCents) > 1) {`
27. L266: `console.warn(`
28. L298: `.from("receipts")`
29. L312: `if (receiptError) {`
30. L313: `console.error("Failed to create receipt:", receiptError);`
31. L314: `throw new Error("Failed to create receipt record");`
32. L318: `await supabase.from("receipt_events").insert({`
33. L326: `await supabase.from("audit_logs").insert({`
34. L340: `if (resendApiKey && userEmail) {`
35. L341: `try {`
36. L348: `return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });`
37. L484: `const emailResponse = await fetch("https://api.resend.com/emails", {`
38. L500: `if (emailResponse.ok) {`
39. L504: `await supabase.from("notification_logs").insert({`
40. L515: `await supabase.from("audit_logs").insert({`
41. L526: `console.error("Receipt email failed:", emailData);`
42. L528: `await supabase.from("notification_logs").insert({`
43. L538: `await supabase.from("audit_logs").insert({`
44. L548: `console.error("Email send error:", err);`
45. L552: `return new Response(`
46. L563: `console.error("Error in generate-return-receipt:", error);`
47. L564: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `receipts` | `id, receipt_number` |
| `bookings` | `
        id, booking_code, user_id, daily_rate, total_days, subtotal, 
        tax_amount, total_amount, deposit_amount, start_at, end_at,
        processing_fee, processing_fee_rate,
        actual_return_at, young_driver_fee, vehicle_id, location_id,
        delivery_fee, different_dropoff_fee, upgrade_daily_fee
      ` |
| `vehicle_categories` | `name` |
| `locations` | `name, address, city, phone` |
| `booking_add_ons` | `price, quantity, add_on:add_ons(name)` |
| `booking_additional_drivers` | `driver_name, young_driver_fee` |
| `profiles` | `email, full_name, phone` |

### Tables written

| Table | Operation |
| --- | --- |
| `receipts` | INSERT |
| `receipt_events` | INSERT |
| `audit_logs` | INSERT |
| `notification_logs` | INSERT |
| `audit_logs` | INSERT |
| `notification_logs` | INSERT |
| `audit_logs` | INSERT |

**RPCs called:** none

### External API calls

- L484: `const emailResponse = await fetch("https://api.resend.com/emails", {`
- endpoint literal: `https://api.resend.com/emails`
- endpoint literal: `https://deno.land/std@0.190.0/http/server.ts`
- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

- `src/hooks/use-return-receipt.ts:31:      const { data, error } = await supabase.functions.invoke("generate-return-receipt", {`

### Failure behaviour / atomicity

**Atomic: NO.** 7 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `get-mapbox-token`

- **Path:** `supabase/functions/get-mapbox-token/index.ts` (50 lines)
- **Purpose (from file header):** get-mapbox-token - Returns Mapbox public token for client-side usage
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
9: "authorization, x-client-info, apikey, content-type",
```

### CORS

```ts
6: const corsHeaders = {
7: "Access-Control-Allow-Origin": "*",
8: "Access-Control-Allow-Headers":
13: // Handle CORS preflight
14: if (req.method === "OPTIONS") {
15: return new Response(null, { headers: corsHeaders });
27: headers: { ...corsHeaders, "Content-Type": "application/json" },
36: headers: { ...corsHeaders, "Content-Type": "application/json" },
45: headers: { ...corsHeaders, "Content-Type": "application/json" },
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
15: return new Response(null, { headers: corsHeaders });
23: return new Response(
26: status: 500,
32: return new Response(
35: status: 200,
41: return new Response(
44: status: 500,
```

**Status codes returned:** 200, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L12: `Deno.serve(async (req) => {`
2. L14: `if (req.method === "OPTIONS") {`
3. L15: `return new Response(null, { headers: corsHeaders });`
4. L18: `try {`
5. L21: `if (!mapboxToken) {`
6. L22: `console.error("MAPBOX_PUBLIC_TOKEN not configured");`
7. L23: `return new Response(`
8. L32: `return new Response(`
9. L40: `console.error("Error in get-mapbox-token:", error);`
10. L41: `return new Response(`

### Tables read

None.

### Tables written

None.

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/hooks/use-mapbox-token.ts:11:      const { data, error } = await supabase.functions.invoke("get-mapbox-token");`

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `log-terminal-payment`

- **Path:** `supabase/functions/log-terminal-payment/index.ts` (269 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
2: getUserOrThrow,
3: requireRoleOrThrow,
4: getAdminClient,
12: "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
30: const { userId } = await getUserOrThrow(req, corsHeaders);
31: await requireRoleOrThrow(userId, ["super_admin", "manager", "admin", "staff"], corsHeaders);
92: const supabase = getAdminClient();
```

### CORS

```ts
9: const corsHeaders = {
10: "Access-Control-Allow-Origin": "*",
11: "Access-Control-Allow-Headers":
20: headers: { ...corsHeaders, "Content-Type": "application/json" },
25: if (req.method === "OPTIONS") {
26: return new Response(null, { headers: corsHeaders });
30: const { userId } = await getUserOrThrow(req, corsHeaders);
31: await requireRoleOrThrow(userId, ["super_admin", "manager", "admin", "staff"], corsHeaders);
262: return authErrorResponse(err, corsHeaders);
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `cardLastFour` | JSON body | yes |
| `cardExpiry` | JSON body | UNKNOWN: no explicit guard |
| `authCode` | JSON body | optional (defaulted) |
| `includeDeposit` | JSON body | UNKNOWN: no explicit guard |
| `depositReceiptNumber` | JSON body | UNKNOWN: no explicit guard |
| `// Deposit-only mode` | JSON body | UNKNOWN: no explicit guard |
| `// New multi-transaction field
      transactions` | JSON body | UNKNOWN: no explicit guard |
| `// Legacy single-entry fields
      receiptNumber` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
18: return new Response(JSON.stringify(body), {
26: return new Response(null, { headers: corsHeaders });
33: const body = await req.json();
```

**Status codes returned:** 200

### Logic, in source order (numbered; every guard, early return and DB call)

1. L18: `return new Response(JSON.stringify(body), {`
2. L24: `Deno.serve(async (req) => {`
3. L25: `if (req.method === "OPTIONS") {`
4. L26: `return new Response(null, { headers: corsHeaders });`
5. L29: `try {`
6. L49: `if (!bookingId || typeof bookingId !== "string") {`
7. L50: `return jsonResponse({ error: "bookingId is required" }, 400);`
8. L55: `if (!cardLastFour || !/^\d{4}$/.test(cardLastFour)) {`
9. L56: `return jsonResponse({ error: "cardLastFour must be exactly 4 digits" }, 400);`
10. L66: `if (isDepositOnly) {`
11. L69: `if (!/^[A-Za-z0-9\-_]{3,50}$/.test(depReceipt)) {`
12. L70: `return jsonResponse({ error: "A valid deposit receipt / auth number is required" }, 400);`
13. L79: `return jsonResponse({ error: "transactions array or receiptNumber is required" }, 400);`
14. L84: `for (const txn of transactions) {`
15. L86: `if (!/^[A-Za-z0-9\-_]{3,50}$/.test(trimmed)) {`
16. L87: `return jsonResponse({ error: `Invalid receipt number: "${trimmed}"` }, 400);`
17. L96: `.from("bookings")`
18. L101: `if (bookingErr || !booking) {`
19. L102: `return jsonResponse({ error: "Booking not found" }, 404);`
20. L107: `.from("payments")`
21. L119: `if (!Array.isArray(txnArray) && transactions.length === 1 && transactions[0].amount === 0) {`
22. L125: `for (const txn of transactions) {`
23. L126: `if (typeof txn.amount !== "number" || txn.amount <= 0) {`
24. L127: `return jsonResponse({ error: `Amount must be positive for receipt ${txn.receiptNumber}` }, 400);`
25. L130: `if (requestTotal > remainingBalance + 0.01) {`
26. L131: `return jsonResponse({`
27. L138: `if (txnIds.length > 0) {`
28. L140: `.from("payments")`
29. L144: `if (dupes && dupes.length > 0) {`
30. L146: `return jsonResponse({`
31. L153: `if (transactions.length > 0) {`
32. L165: `const { error: payErr } = await supabase.from("payments").insert(paymentRows);`
33. L166: `if (payErr) {`
34. L167: `console.error("Payment insert error:", payErr);`
35. L168: `return jsonResponse({ error: "Failed to record payment(s)" }, 500);`
36. L178: `if (typeof cardExpiry === "string" && /^\d{2}\/\d{2}$/.test(cardExpiry.trim())) {`
37. L181: `if (!isDepositOnly) {`
38. L184: `if (fullyPaid) {`
39. L194: `if (recordDeposit) {`
40. L198: `if (!depReceipt) {`
41. L199: `return jsonResponse({ error: "A deposit receipt / auth number is required" }, 400);`
42. L208: `const { error: ledgerErr } = await supabase.from("deposit_ledger").insert({`
43. L215: `if (ledgerErr) console.error("Deposit ledger insert error:", ledgerErr);`
44. L220: `.from("bookings")`
45. L224: `if (bookingUpdateErr) {`
46. L225: `console.error("Booking update error:", bookingUpdateErr);`
47. L226: `return jsonResponse({ error: "Payment(s) recorded but booking update failed" }, 500);`
48. L230: `await supabase.from("audit_logs").insert({`
49. L250: `return jsonResponse({`
50. L261: `try {`
51. L262: `return authErrorResponse(err, corsHeaders);`
52. L264: `console.error("Unhandled error:", err);`
53. L265: `return jsonResponse({ error: "Internal server error" }, 500);`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, total_amount, status, user_id, location_id, deposit_amount` |
| `payments` | `amount` |
| `payments` | `transaction_id` |

### Tables written

| Table | Operation |
| --- | --- |
| `payments` | INSERT |
| `deposit_ledger` | INSERT |
| `bookings` | UPDATE |
| `audit_logs` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/components/payments/TerminalPaymentForm.tsx:73:      const { data, error } = await supabase.functions.invoke("log-terminal-payment", {`

### Failure behaviour / atomicity

**Atomic: NO.** 4 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `lookup-booking-pass`

- **Path:** `supabase/functions/lookup-booking-pass/index.ts` (93 lines)
- **Purpose (from file header):** lookup-booking-pass — public, code-only booking lookup for the pass QR code.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
16: import { getAdminClient } from "../_shared/auth.ts";
51: const supabase = getAdminClient();
```

### CORS

```ts
14: import { getCorsHeaders } from "../_shared/cors.ts";
15: import { getClientIp } from "../_shared/cors.ts";
22: const corsHeaders = getCorsHeaders(req);
26: headers: { ...corsHeaders, "Content-Type": "application/json" },
29: if (req.method === "OPTIONS") {
30: return new Response(null, { status: 204, headers: corsHeaders });
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `code` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
24: new Response(JSON.stringify(body), {
30: return new Response(null, { status: 204, headers: corsHeaders });
34: const body = await req.json().catch(() => ({}));
38: return json({ error: "invalid_code" }, 400);
48: return json({ error: "rate_limited" }, 429);
61: return json({ error: "lookup_failed" }, 500);
65: return json({ error: "not_found" }, 404);
78: return json({
90: return json({ error: "unexpected_error" }, 500);
```

**Status codes returned:** 200, 204

### Logic, in source order (numbered; every guard, early return and DB call)

1. L21: `Deno.serve(async (req) => {`
2. L29: `if (req.method === "OPTIONS") {`
3. L30: `return new Response(null, { status: 204, headers: corsHeaders });`
4. L33: `try {`
5. L37: `if (!CODE_PATTERN.test(rawCode)) {`
6. L38: `return json({ error: "invalid_code" }, 400);`
7. L47: `if (!limit.allowed) {`
8. L48: `return json({ error: "rate_limited" }, 429);`
9. L54: `.from("bookings")`
10. L59: `if (error) {`
11. L60: `console.error("[lookup-booking-pass] lookup failed", error);`
12. L61: `return json({ error: "lookup_failed" }, 500);`
13. L64: `if (!booking) {`
14. L65: `return json({ error: "not_found" }, 404);`
15. L69: `if (booking.location_id) {`
16. L71: `.from("locations")`
17. L75: `if (loc) location = loc;`
18. L78: `return json({`
19. L89: `console.error("[lookup-booking-pass] unexpected error", err);`
20. L90: `return json({ error: "unexpected_error" }, 500);`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, booking_code, start_at, end_at, status, location_id` |
| `locations` | `id, name, address, city` |

### Tables written

None.

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/pages/CheckIn.tsx:62:        const { data, error: fnError } = await supabase.functions.invoke("lookup-booking-pass", {`

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `manage-booking-documents`

- **Path:** `supabase/functions/manage-booking-documents/index.ts` (212 lines)
- **Purpose (from file header):** manage-booking-documents
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
11: getUserOrThrow,
12: requireRoleOrThrow,
13: getAdminClient,
51: const { userId } = await getUserOrThrow(req, corsHeaders);
52: await requireRoleOrThrow(userId, STAFF_ROLES, corsHeaders);
55: const admin = getAdminClient();
```

### CORS

```ts
9: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
39: function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
42: headers: { ...corsHeaders, "Content-Type": "application/json" },
47: const corsHeaders = getCorsHeaders(req);
48: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
51: const { userId } = await getUserOrThrow(req, corsHeaders);
52: await requireRoleOrThrow(userId, STAFF_ROLES, corsHeaders);
62: return json({ error: "bookingId is required" }, 400, corsHeaders);
65: return json({ error: "A document label is required" }, 400, corsHeaders);
68: return json({ error: "Label must be 120 characters or fewer" }, 400, corsHeaders);
71: return json({ error: "Invalid storage path" }, 400, corsHeaders);
74: return json({ error: "fileName is required" }, 400, corsHeaders);
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `label` | JSON body | yes |
| `notes` | JSON body | UNKNOWN: no explicit guard |
| `storagePath` | JSON body | yes |
| `fileName` | JSON body | yes |
| `mimeType` | JSON body | optional (defaulted) |
| `fileSize` | JSON body | UNKNOWN: no explicit guard |
| `documentId` | JSON body | yes |
| `action` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
39: function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
40: return new Response(JSON.stringify(body), {
54: const body = (await req.json()) as Body;
62: return json({ error: "bookingId is required" }, 400, corsHeaders);
65: return json({ error: "A document label is required" }, 400, corsHeaders);
68: return json({ error: "Label must be 120 characters or fewer" }, 400, corsHeaders);
71: return json({ error: "Invalid storage path" }, 400, corsHeaders);
74: return json({ error: "fileName is required" }, 400, corsHeaders);
77: return json({ error: "Notes must be 1000 characters or fewer" }, 400, corsHeaders);
89: return json({ error: "Booking not found" }, 404, corsHeaders);
121: return json({ error: "Failed to record document" }, 500, corsHeaders);
138: return json({ success: true, document: inserted }, 200, corsHeaders);
145: return json({ error: "documentId is required" }, 400, corsHeaders);
155: return json({ error: "Document not found" }, 404, corsHeaders);
158: return json({ success: true, alreadyDeleted: true }, 200, corsHeaders);
183: return json({ error: "Failed to remove document" }, 500, corsHeaders);
202: return json({ success: true }, 200, corsHeaders);
205: return json({ error: "Unknown action" }, 400, corsHeaders);
209: return json({ error: "Internal server error" }, 500, corsHeaders);
```

**Status codes returned:** 

### Logic, in source order (numbered; every guard, early return and DB call)

1. L40: `return new Response(JSON.stringify(body), {`
2. L46: `Deno.serve(async (req) => {`
3. L48: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
4. L50: `try {`
5. L58: `if (body.action === "create") {`
6. L61: `if (!bookingId || typeof bookingId !== "string") {`
7. L62: `return json({ error: "bookingId is required" }, 400, corsHeaders);`
8. L64: `if (!label || typeof label !== "string" || !label.trim()) {`
9. L65: `return json({ error: "A document label is required" }, 400, corsHeaders);`
10. L67: `if (label.trim().length > 120) {`
11. L68: `return json({ error: "Label must be 120 characters or fewer" }, 400, corsHeaders);`
12. L70: `if (!storagePath || typeof storagePath !== "string" || !storagePath.startsWith(`${bookingId}/`)) {`
13. L71: `return json({ error: "Invalid storage path" }, 400, corsHeaders);`
14. L73: `if (!fileName || typeof fileName !== "string") {`
15. L74: `return json({ error: "fileName is required" }, 400, corsHeaders);`
16. L76: `if (notes != null && (typeof notes !== "string" || notes.length > 1000)) {`
17. L77: `return json({ error: "Notes must be 1000 characters or fewer" }, 400, corsHeaders);`
18. L83: `.from("bookings")`
19. L88: `if (bookingError || !booking) {`
20. L89: `return json({ error: "Booking not found" }, 404, corsHeaders);`
21. L94: `.from("staff_assignments")`
22. L103: `.from("booking_documents")`
23. L119: `if (insertError) {`
24. L120: `console.error("booking_documents insert error:", insertError);`
25. L121: `return json({ error: "Failed to record document" }, 500, corsHeaders);`
26. L124: `await admin.from("audit_logs").insert({`
27. L138: `return json({ success: true, document: inserted }, 200, corsHeaders);`
28. L142: `if (body.action === "delete") {`
29. L144: `if (!documentId || typeof documentId !== "string") {`
30. L145: `return json({ error: "documentId is required" }, 400, corsHeaders);`
31. L149: `.from("booking_documents")`
32. L154: `if (docError || !doc) {`
33. L155: `return json({ error: "Document not found" }, 404, corsHeaders);`
34. L157: `if (doc.deleted_at) {`
35. L158: `return json({ success: true, alreadyDeleted: true }, 200, corsHeaders);`
36. L164: `.from("bookings")`
37. L170: `.from("staff_assignments")`
38. L177: `.from("booking_documents")`
39. L181: `if (updateError) {`
40. L182: `console.error("booking_documents delete error:", updateError);`
41. L183: `return json({ error: "Failed to remove document" }, 500, corsHeaders);`
42. L188: `.from("booking-documents")`
43. L190: `if (storageError) console.warn("storage remove failed:", storageError.message);`
44. L192: `await admin.from("audit_logs").insert({`
45. L202: `return json({ success: true }, 200, corsHeaders);`
46. L205: `return json({ error: "Unknown action" }, 400, corsHeaders);`
47. L207: `if (err instanceof AuthError) return authErrorResponse(err, corsHeaders);`
48. L208: `console.error("manage-booking-documents error:", err);`
49. L209: `return json({ error: "Internal server error" }, 500, corsHeaders);`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, user_id, location_id, booking_code` |
| `staff_assignments` | `location_id` |
| `booking_documents` | `id, booking_id, label, storage_path, deleted_at` |
| `bookings` | `location_id` |
| `staff_assignments` | `location_id` |

### Tables written

| Table | Operation |
| --- | --- |
| `booking_documents` | INSERT |
| `audit_logs` | INSERT |
| `booking_documents` | UPDATE |
| `audit_logs` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/hooks/use-booking-documents.ts:104:      const { data, error } = await supabase.functions.invoke("manage-booking-documents", {`
- `src/hooks/use-booking-documents.ts:140:      const { data, error } = await supabase.functions.invoke("manage-booking-documents", {`

### Failure behaviour / atomicity

**Atomic: NO.** 4 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `manage-staff`

- **Path:** `supabase/functions/manage-staff/index.ts` (353 lines)
- **Purpose (from file header):** manage-staff — Super Admin only staff management.
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
13: import { getUserOrThrow, getAdminClient, authErrorResponse } from "../_shared/auth.ts";
37: const { userId } = await getUserOrThrow(req, corsHeaders);
41: const supabase = getAdminClient();
```

### CORS

```ts
12: import { getCorsHeaders } from "../_shared/cors.ts";
27: const corsHeaders = getCorsHeaders(req);
28: if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
33: headers: { ...corsHeaders, "Content-Type": "application/json" },
37: const { userId } = await getUserOrThrow(req, corsHeaders);
350: return authErrorResponse(err, corsHeaders);
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `action` | JSON body | UNKNOWN: no explicit guard |
| `email` | JSON body | yes |
| `displayName` | JSON body | UNKNOWN: no explicit guard |
| `employeeCode` | JSON body | UNKNOWN: no explicit guard |
| `locationId` | JSON body | UNKNOWN: no explicit guard |
| `role` | JSON body | UNKNOWN: no explicit guard |
| `password` | JSON body | yes |
| `staffId` | JSON body | yes |
| `isActive` | JSON body | UNKNOWN: no explicit guard |
| `smsAlertsEnabled` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
28: if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
31: new Response(JSON.stringify(body), {
42: const body = await req.json().catch(() => ({}));
78: return json({ staff, locations: locations ?? [] });
89: if (!email || !email.includes("@")) return json({ error: "A valid email is required" }, 400);
90: if (role === "manager" && !locationId) return json({ error: "Managers require a branch" }, 400);
92: return json({ error: "Password must be at least 8 characters" }, 400);
108: if (pwErr) return json({ error: pwErr.message }, 400);
118: return json({ error: createErr?.message ?? "Failed to create account" }, 400);
159: if (insertErr) return json({ error: insertErr.message }, 400);
172: return json({
184: if (!staffId) return json({ error: "staffId is required" }, 400);
190: if (error) return json({ error: error.message }, 400);
191: return json({ success: true });
197: if (!staffId) return json({ error: "staffId is required" }, 400);
203: if (error) return json({ error: error.message }, 400);
204: return json({ success: true });
210: if (!staffId) return json({ error: "staffId is required" }, 400);
216: if (error) return json({ error: error.message }, 400);
217: return json({ success: true });
222: if (!staffId) return json({ error: "staffId is required" }, 400);
229: if (targetErr || !target) return json({ error: "Staff member not found" }, 404);
239: return json({ error: "Password must be at least 8 characters" }, 400);
242: return json({ error: "Managers require a branch" }, 400);
245: return json({ error: "You cannot demote your own account" }, 400);
257: return json({ error: "At least one Super Admin must remain" }, 400);
290: if (error) return json({ error: error.message }, 400);
298: if (pwErr) return json({ error: pwErr.message }, 400);
301: return json({ success: true, passwordSet: !!password });
306: if (!staffId) return json({ error: "staffId is required" }, 400);
313: if (!target) return json({ error: "Staff member not found" }, 404);
315: return json({ error: "You cannot delete your own account" }, 400);
324: return json({ error: "At least one Super Admin must remain" }, 400);
331: return json({
337: return json({ success: true });
342: if (!email) return json({ error: "email is required" }, 400);
344: if (error) return json({ error: error.message }, 400);
345: return json({ success: true });
348: return json({ error: "Unknown action" }, 400);
```

**Status codes returned:** 200

### Logic, in source order (numbered; every guard, early return and DB call)

1. L26: `Deno.serve(async (req) => {`
2. L28: `if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });`
3. L36: `try {`
4. L45: `if (action === "list") {`
5. L47: `.from("staff_assignments")`
6. L50: `if (error) throw error;`
7. L52: `const { data: roles } = await supabase.from("user_roles").select("user_id, role");`
8. L55: `? await supabase.from("profiles").select("id, phone").in("id", staffIds)`
9. L60: `const { data: locations } = await supabase.from("locations").select("id, name");`
10. L63: `for (const r of roles ?? []) {`
11. L68: `for (const a of assignments ?? []) {`
12. L78: `return json({ staff, locations: locations ?? [] });`
13. L81: `if (action === "create") {`
14. L89: `if (!email || !email.includes("@")) return json({ error: "A valid email is required" }, 400);`
15. L90: `if (role === "manager" && !locationId) return json({ error: "Managers require a branch" }, 400);`
16. L91: `if (password && password.length < 8) {`
17. L92: `return json({ error: "Password must be at least 8 characters" }, 400);`
18. L99: `if (match) {`
19. L103: `if (password) {`
20. L108: `if (pwErr) return json({ error: pwErr.message }, 400);`
21. L111: `const { data: created, error: createErr } = await supabase.auth.admin.createUser({`
22. L117: `if (createErr || !created?.user) {`
23. L118: `return json({ error: createErr?.message ?? "Failed to create account" }, 400);`
24. L125: `.from("user_roles")`
25. L129: `await supabase.from("user_roles").upsert(`
26. L136: `.from("staff_assignments")`
27. L141: `if (existingAssignment) {`
28. L143: `.from("staff_assignments")`
29. L152: `const { error: insertErr } = await supabase.from("staff_assignments").insert({`
30. L159: `if (insertErr) return json({ error: insertErr.message }, 400);`
31. L164: `if (!password) {`
32. L172: `return json({`
33. L181: `if (action === "set_location") {`
34. L184: `if (!staffId) return json({ error: "staffId is required" }, 400);`
35. L187: `.from("staff_assignments")`
36. L190: `if (error) return json({ error: error.message }, 400);`
37. L191: `return json({ success: true });`
38. L194: `if (action === "set_active") {`
39. L197: `if (!staffId) return json({ error: "staffId is required" }, 400);`
40. L200: `.from("staff_assignments")`
41. L203: `if (error) return json({ error: error.message }, 400);`
42. L204: `return json({ success: true });`
43. L207: `if (action === "set_sms_alerts") {`
44. L210: `if (!staffId) return json({ error: "staffId is required" }, 400);`
45. L213: `.from("staff_assignments")`
46. L216: `if (error) return json({ error: error.message }, 400);`
47. L217: `return json({ success: true });`
48. L220: `if (action === "update") {`
49. L222: `if (!staffId) return json({ error: "staffId is required" }, 400);`
50. L225: `.from("staff_assignments")`
51. L229: `if (targetErr || !target) return json({ error: "Staff member not found" }, 404);`
52. L238: `if (password && password.length < 8) {`
53. L239: `return json({ error: "Password must be at least 8 characters" }, 400);`
54. L241: `if (role === "manager" && hasLocation && !locationId) {`
55. L242: `return json({ error: "Managers require a branch" }, 400);`
56. L244: `if (role === "manager" && target.user_id === userId) {`
57. L245: `return json({ error: "You cannot demote your own account" }, 400);`
58. L248: `if (role) {`
59. L250: `if (role === "manager") {`
60. L252: `.from("user_roles")`
61. L256: `if (remaining.length === 0) {`
62. L257: `return json({ error: "At least one Super Admin must remain" }, 400);`
63. L261: `.from("user_roles")`
64. L265: `await supabase.from("user_roles").upsert(`
65. L272: `if (Object.prototype.hasOwnProperty.call(body, "displayName")) {`
66. L275: `if (Object.prototype.hasOwnProperty.call(body, "employeeCode")) {`
67. L278: `if (Object.prototype.hasOwnProperty.call(body, "isActive")) {`
68. L281: `if (Object.prototype.hasOwnProperty.call(body, "smsAlertsEnabled")) {`
69. L285: `if (role === "super_admin") patch.location_id = null;`
70. L286: `else if (hasLocation) patch.location_id = locationId;`
71. L288: `if (Object.keys(patch).length > 0) {`
72. L289: `const { error } = await supabase.from("staff_assignments").update(patch).eq("id", staffId);`
73. L290: `if (error) return json({ error: error.message }, 400);`
74. L293: `if (password) {`
75. L298: `if (pwErr) return json({ error: pwErr.message }, 400);`
76. L301: `return json({ success: true, passwordSet: !!password });`
77. L304: `if (action === "delete") {`
78. L306: `if (!staffId) return json({ error: "staffId is required" }, 400);`
79. L309: `.from("staff_assignments")`
80. L313: `if (!target) return json({ error: "Staff member not found" }, 404);`
81. L314: `if (target.user_id === userId) {`
82. L315: `return json({ error: "You cannot delete your own account" }, 400);`
83. L319: `.from("user_roles")`
84. L323: `if (isTargetSuper && (roles ?? []).length <= 1) {`
85. L324: `return json({ error: "At least one Super Admin must remain" }, 400);`
86. L327: `await supabase.from("staff_assignments").delete().eq("id", staffId);`
87. L328: `await supabase.from("user_roles").delete().eq("user_id", target.user_id);`
88. L330: `if (delErr) {`
89. L331: `return json({`
90. L337: `return json({ success: true });`
91. L340: `if (action === "send_setup_link") {`
92. L342: `if (!email) return json({ error: "email is required" }, 400);`
93. L344: `if (error) return json({ error: error.message }, 400);`
94. L345: `return json({ success: true });`
95. L348: `return json({ error: "Unknown action" }, 400);`
96. L350: `return authErrorResponse(err, corsHeaders);`

### Tables read

| Table | Selected columns |
| --- | --- |
| `staff_assignments` | `id, user_id, location_id, display_name, employee_code, is_active, sms_alerts_enabled, created_at` |
| `user_roles` | `user_id, role` |
| `profiles` | `id, phone` |
| `locations` | `id, name` |
| `staff_assignments` | `id` |
| `staff_assignments` | `id, user_id` |
| `user_roles` | `user_id` |
| `staff_assignments` | `id, user_id` |
| `user_roles` | `user_id, role` |

### Tables written

| Table | Operation |
| --- | --- |
| `user_roles` | DELETE |
| `user_roles` | UPSERT |
| `staff_assignments` | UPDATE |
| `staff_assignments` | INSERT |
| `staff_assignments` | UPDATE |
| `staff_assignments` | UPDATE |
| `staff_assignments` | UPDATE |
| `user_roles` | DELETE |
| `user_roles` | UPSERT |
| `staff_assignments` | UPDATE |
| `staff_assignments` | DELETE |
| `user_roles` | DELETE |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/pages/admin/Staff.tsx:73:  const { data, error } = await supabase.functions.invoke("manage-staff", { body });`

### Failure behaviour / atomicity

**Atomic: NO.** 12 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `notify-admin`

- **Path:** `supabase/functions/notify-admin/index.ts` (507 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
4: import { validateAuth, isAdminOrStaff } from "../_shared/auth.ts";
39: "Authorization": `Bearer ${apiKey}`,
77: const auth = await validateAuth(req);
80: const authHeader = req.headers.get("Authorization");
81: const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
82: if (!authHeader || !authHeader.includes(supabaseServiceKey || "")) {
100: const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
```

### CORS

```ts
3: import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIp } from "../_shared/cors.ts";
56: const corsHeaders = getCorsHeaders(req);
58: if (req.method === "OPTIONS") {
59: return new Response(null, { headers: corsHeaders });
73: return rateLimitResponse(rateLimit.resetAt, corsHeaders);
95: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
109: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
424: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
430: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
50: const data = await response.json();
59: return new Response(null, { headers: corsHeaders });
93: return new Response(
95: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
102: const body = await req.json();
107: return new Response(
109: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
422: return new Response(
424: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
428: return new Response(
430: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 400, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L36: `const response = await fetch("https://api.resend.com/emails", {`
2. L52: `return { ok: response.ok, data };`
3. L58: `if (req.method === "OPTIONS") {`
4. L59: `return new Response(null, { headers: corsHeaders });`
5. L62: `try {`
6. L71: `if (!rateLimit.allowed) {`
7. L72: `console.warn(`Rate limit exceeded for notify-admin from IP: ${clientIp}`);`
8. L73: `return rateLimitResponse(rateLimit.resetAt, corsHeaders);`
9. L78: `if (!auth.authenticated) {`
10. L82: `if (!authHeader || !authHeader.includes(supabaseServiceKey || "")) {`
11. L84: `console.warn("Unauthenticated notify-admin request");`
12. L91: `if (!resendApiKey) {`
13. L92: `console.error("RESEND_API_KEY not configured");`
14. L93: `return new Response(`
15. L106: `if (!eventType || typeof eventType !== "string" || eventType.length > 50) {`
16. L107: `return new Response(`
17. L120: `if (!resolvedBookingId && bookingCode) {`
18. L122: `.from("bookings")`
19. L126: `if (lookupError) {`
20. L127: `console.error(`[notify-admin] booking lookup by code ${bookingCode} failed:`, lookupError);`
21. L130: `if (!resolvedBookingId) {`
22. L131: `console.warn(`[notify-admin] no booking found for code ${bookingCode} - logging without booking link`);`
23. L153: `try {`
24. L154: `if (!shouldCreateAlert) {`
25. L158: `.from("admin_alerts")`
26. L170: `if (alertError) {`
27. L171: `console.error("Error creating admin_alert:", alertError);`
28. L176: `console.error("Failed to create admin_alert:", alertErr);`
29. L194: `switch (eventType) {`
30. L195: `case "new_booking":`
31. L208: `case "booking_cancelled":`
32. L223: `case "booking_updated":`
33. L237: `case "rental_activated":`
34. L250: `case "return_completed":`
35. L264: `case "license_uploaded":`
36. L277: `case "agreement_signed":`
37. L291: `case "payment_received":`
38. L303: `case "issue_reported":`
39. L319: `case "damage_reported":`
40. L334: `case "late_return":`
41. L350: `case "overdue":`
42. L382: `if (priority === "urgent") {`
43. L411: `await supabase.from("notification_logs").insert({`
44. L422: `return new Response(`
45. L427: `console.error("Error in notify-admin:", error);`
46. L428: `return new Response(`
47. L445: `switch (eventType) {`
48. L446: `case "new_booking":`
49. L447: `return `New Booking${ref ? ` ${ref}` : ""}${customer ? ` - ${customer}` : ""}`;`
50. L448: `case "booking_cancelled":`
51. L449: `return `Booking Cancelled${ref ? ` ${ref}` : ""}`;`
52. L450: `case "license_uploaded":`
53. L451: `return `License Uploaded${customer ? ` - ${customer}` : ""}`;`
54. L452: `case "agreement_signed":`
55. L453: `return `Agreement Signed${ref ? ` ${ref}` : ""}`;`
56. L454: `case "payment_received":`
57. L455: `return `Payment Received${ref ? ` ${ref}` : ""}`;`
58. L456: `case "issue_reported":`
59. L457: `return `Issue Reported${ref ? ` ${ref}` : ""}`;`
60. L458: `case "damage_reported":`
61. L459: `return `Damage Reported${vehicleName ? ` - ${vehicleName}` : ""}`;`
62. L460: `case "late_return":`
63. L461: `return `Late Return${ref ? ` ${ref}` : ""}`;`
64. L462: `case "overdue":`
65. L463: `return `Overdue Rental${ref ? ` ${ref}` : ""}`;`
66. L464: `case "rental_activated":`
67. L465: `return `Rental Activated${ref ? ` ${ref}` : ""}`;`
68. L466: `case "return_completed":`
69. L467: `return `Return Completed${ref ? ` ${ref}` : ""}`;`
70. L469: `return `Alert: ${eventType}`;`
71. L481: `switch (eventType) {`
72. L482: `case "new_booking":`
73. L483: `return `${customer} has created a new booking. Review and prepare for pickup.`;`
74. L484: `case "booking_cancelled":`
75. L485: `return `A booking has been cancelled. Review cancellation details.`;`
76. L486: `case "license_uploaded":`
77. L487: `return `${customer} uploaded their driver's license. Verification required.`;`
78. L488: `case "agreement_signed":`
79. L489: `return `${customer} signed the rental agreement. Ready for handover.`;`
80. L490: `case "payment_received":`
81. L491: `return `Payment received from ${customer}.`;`
82. L492: `case "issue_reported":`
83. L493: `return `${customer} reported an issue. Review immediately.`;`
84. L494: `case "damage_reported":`
85. L495: `return `Damage reported on ${vehicle}. Assessment required.`;`
86. L496: `case "late_return":`
87. L497: `return `${vehicle} return is overdue. Contact customer.`;`
88. L498: `case "overdue":`
89. L499: `return `Rental is significantly overdue. Urgent action needed.`;`
90. L500: `case "rental_activated":`
91. L501: `return `${customer} has picked up ${vehicle}.`;`
92. L502: `case "return_completed":`
93. L503: `return `${customer} has returned ${vehicle}.`;`
94. L505: `return `Action required for this event.`;`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id` |

### Tables written

| Table | Operation |
| --- | --- |
| `admin_alerts` | INSERT |
| `notification_logs` | INSERT |

**RPCs called:** none

### External API calls

- L36: `const response = await fetch("https://api.resend.com/emails", {`
- endpoint literal: `https://api.resend.com/emails`
- endpoint literal: `https://betterrental.lovable.app/admin/active-rentals`
- endpoint literal: `https://betterrental.lovable.app/admin/alerts`
- endpoint literal: `https://betterrental.lovable.app/admin/bookings`
- endpoint literal: `https://betterrental.lovable.app/admin/damages`
- endpoint literal: `https://betterrental.lovable.app/admin/verifications`
- endpoint literal: `https://deno.land/std@0.190.0/http/server.ts`
- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

- `src/domain/bookings/mutations.ts:298:    await supabase.functions.invoke("notify-admin", {`
- `src/hooks/use-admin-notify.ts:38:    const { data, error } = await supabase.functions.invoke("notify-admin", {`
- `src/components/admin/CancelBookingDialog.tsx:85:      supabase.functions.invoke("notify-admin", {`

### Failure behaviour / atomicity

**Atomic: NO.** 2 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `notify-branch-sms`

- **Path:** `supabase/functions/notify-branch-sms/index.ts` (446 lines)
- **Purpose (from file header):** Branch text alerts.
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
24: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
79: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
391: Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
```

### CORS

```ts
22: const corsHeaders = {
23: "Access-Control-Allow-Origin": "*",
24: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
50: if (req.method === "OPTIONS") {
51: return new Response(null, { headers: corsHeaders });
67: headers: { ...corsHeaders, "Content-Type": "application/json" },
73: headers: { ...corsHeaders, "Content-Type": "application/json" },
115: headers: { ...corsHeaders, "Content-Type": "application/json" },
148: headers: { ...corsHeaders, "Content-Type": "application/json" },
179: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
279: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
361: headers: { ...corsHeaders, "Content-Type": "application/json" },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `type` | JSON body | UNKNOWN: no explicit guard |
| `bookingId` | JSON body | optional (defaulted) |
| `ticketId` | JSON body | optional (defaulted) |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
51: return new Response(null, { headers: corsHeaders });
59: const body = await req.json().catch(() => ({}));
65: return new Response(JSON.stringify({ error: "bookingId is required" }), {
66: status: 400,
71: return new Response(JSON.stringify({ error: "ticketId is required" }), {
72: status: 400,
113: return new Response(JSON.stringify({ error: "ticket_lookup_failed", details: detail }), {
114: status: 200,
146: return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_booking" }), {
147: status: 200,
177: return new Response(
179: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
277: return new Response(
279: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
359: return new Response(JSON.stringify({ success: false, reason: "sms_not_configured" }), {
360: status: 200,
398: const twilioResult = await twilioResponse.json().catch(() => ({}));
434: return new Response(
436: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
440: return new Response(JSON.stringify({ error: "server_error" }), {
441: status: 500,
```

**Status codes returned:** 200, 400, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L30: `if (!iso) return "-";`
2. L31: `return new Date(iso).toLocaleDateString("en-CA", {`
3. L40: `if (!iso) return "-";`
4. L41: `return new Date(iso).toLocaleTimeString("en-CA", {`
5. L50: `if (req.method === "OPTIONS") {`
6. L51: `return new Response(null, { headers: corsHeaders });`
7. L54: `try {`
8. L64: `if (type === "booking" && !bookingId) {`
9. L65: `return new Response(JSON.stringify({ error: "bookingId is required" }), {`
10. L70: `if (type === "ticket" && !ticketId) {`
11. L71: `return new Response(JSON.stringify({ error: "ticketId is required" }), {`
12. L95: `if (type === "ticket") {`
13. L97: `.from("support_tickets_v2")`
14. L102: `if (ticketError || !t) {`
15. L104: `console.error(`[notify-branch-sms] ticket lookup failed for ${ticketId}: ${detail}`);`
16. L113: `return new Response(JSON.stringify({ error: "ticket_lookup_failed", details: detail }), {`
17. L125: `if (!resolvedBookingId && type === "ticket" && (ticket as { customer_id?: string } | null)?.customer_id) {`
18. L127: `.from("bookings")`
19. L133: `if (recent?.id) resolvedBookingId = recent.id;`
20. L136: `if (!resolvedBookingId) {`
21. L137: `console.warn(`[notify-branch-sms] ${type} has no booking attached - nothing to route`);`
22. L146: `return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_booking" }), {`
23. L156: `.from("bookings")`
24. L163: `if (bookingError || !booking) {`
25. L165: `console.error(`
26. L177: `return new Response(`
27. L192: `if (locationId) {`
28. L194: `.from("staff_assignments")`
29. L200: `if (assignError) {`
30. L201: `console.error("[notify-branch-sms] staff_assignments lookup failed", assignError);`
31. L205: `if (staffIds.length > 0) {`
32. L207: `.from("profiles")`
33. L211: `for (const p of staffProfiles || []) {`
34. L213: `if (e164) {`
35. L214: `if (!recipientPhones.includes(e164)) recipientPhones.push(e164);`
36. L221: `console.warn(`[notify-branch-sms] booking ${booking.booking_code} has no location_id`);`
37. L225: `if (recipientPhones.length === 0) {`
38. L228: `.from("system_settings")`
39. L234: `try {`
40. L247: `if (fallback) recipientPhones.push(fallback);`
41. L248: `else if (fallbackRaw) invalidPhones.push(String(fallbackRaw));`
42. L251: `if (invalidPhones.length > 0) {`
43. L252: `console.warn(`
44. L265: `if (recipientPhones.length === 0) {`
45. L266: `console.warn(`
46. L277: `return new Response(`
47. L286: `if (booking.user_id) {`
48. L288: `.from("profiles")`
49. L295: `if ((!renter || !renterPhone) && booking.customer_id) {`
50. L297: `.from("customers")`
51. L304: `if (!renter) renter = booking.pickup_contact_name || ticket?.guest_name || "Customer";`
52. L305: `if (!renterPhone) renterPhone = booking.pickup_contact_phone || "";`
53. L310: `if (type === "booking") {`
54. L313: `.from("payments")`
55. L349: `if (!twilioSid || !twilioToken || !twilioFrom) {`
56. L350: `console.error("[notify-branch-sms] Twilio not configured - branch alert not sent");`
57. L359: `return new Response(JSON.stringify({ success: false, reason: "sms_not_configured" }), {`
58. L367: `for (const toPhone of recipientPhones) {`
59. L375: `.from("notification_logs")`
60. L380: `if (existing) {`
61. L386: `const twilioResponse = await fetch(`
62. L412: `if (!twilioResponse.ok) {`
63. L413: `console.error(`
64. L434: `return new Response(`
65. L439: `console.error("[notify-branch-sms] unexpected error", error);`
66. L440: `return new Response(JSON.stringify({ error: "server_error" }), {`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id` |
| `bookings` | `id, booking_code, start_at, end_at, location_id, user_id, customer_id, pickup_contact_name, pickup_contact_phone, total_amount, paid_offline, locations!bookings_location_id_fkey(id, name)` |
| `staff_assignments` | `user_id, display_name, sms_alerts_enabled, is_active` |
| `profiles` | `id, phone` |
| `system_settings` | `value` |
| `profiles` | `full_name, phone` |
| `customers` | `full_name, phone` |
| `payments` | `id, amount, status, payment_type` |
| `notification_logs` | `id` |

### Tables written

None.

**RPCs called:** none

### External API calls

- L386: `const twilioResponse = await fetch(`
- endpoint literal: `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
- endpoint literal: `https://deno.land/std@0.190.0/http/server.ts`
- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

- `src/hooks/use-tickets.ts:372:        .invoke("notify-branch-sms", { body: { type: "ticket", ticketId: ticket.id } })`
- `src/hooks/use-support-v2.ts:1048:        const { error: smsError } = await supabase.functions.invoke("notify-branch-sms", {`

### Failure behaviour / atomicity

**Atomic: NO.** 0 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `persist-booking-extras`

- **Path:** `supabase/functions/persist-booking-extras/index.ts` (789 lines)
- **Purpose (from file header):** persist-booking-extras
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
5: * using service_role (required by fail-closed price triggers).
18: import { validateAuth, getAdminClient, isAdminOrStaff } from "../_shared/auth.ts";
34: const auth = await validateAuth(req);
42: const supabaseAdmin = getAdminClient();
675: const authHeader = originalReq.headers.get("Authorization");
676: if (!authHeader) {
677: console.error("[persist-booking-extras] invokeRepriceBooking: missing Authorization header");
681: JSON.stringify({ error: "REPRICE_FAILED", errorCode: "MISSING_AUTH", details: "No Authorization header available for reprice call" }),
696: Authorization: authHeader,
697: apikey: anonKey,
```

### CORS

```ts
15: getCorsHeaders,
16: handleCorsPreflightRequest,
17: } from "../_shared/cors.ts";
27: const corsHeaders = getCorsHeaders(req);
29: if (req.method === "OPTIONS") {
30: return handleCorsPreflightRequest(req);
38: { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
49: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
63: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
74: { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
82: return await handleUpsellAdd(supabaseAdmin, booking, body, corsHeaders, auth.userId, req);
84: return await handleUpsellRemove(supabaseAdmin, booking, body, corsHeaders, auth.userId, req);
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `action` | JSON body | UNKNOWN: no explicit guard |
| `addOns` | JSON body | optional (defaulted) |
| `additionalDrivers` | JSON body | optional (defaulted) |
| `addOnId` | JSON body | yes |
| `quantity` | JSON body | UNKNOWN: no explicit guard |
| `bookingAddOnId` | JSON body | yes |
| `driverName` | JSON body | optional (defaulted) |
| `driverAgeBand` | JSON body | optional (defaulted) |
| `driverLicenseNumber` | JSON body | UNKNOWN: no explicit guard |
| `driverLicenseExpiry` | JSON body | optional (defaulted) |
| `authorizedStart` | JSON body | optional (defaulted) |
| `authorizedEnd` | JSON body | optional (defaulted) |
| `driverRowId` | JSON body | yes |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
36: return new Response(
38: { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
43: const body = await req.json();
47: return new Response(
49: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
61: return new Response(
63: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
72: return new Response(
74: { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
94: return new Response(
96: { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
150: return new Response(
152: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
156: return new Response(
158: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
162: return new Response(
164: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
181: return new Response(
183: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
198: return new Response(
200: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
251: return new Response(
253: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
306: return new Response(
308: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
323: return new Response(
325: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
365: return new Response(
367: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
385: return new Response(
387: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
404: return new Response(
406: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
448: return new Response(
450: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
461: return new Response(
463: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
503: return new Response(
505: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
559: return new Response(
561: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
597: return new Response(
599: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
611: return new Response(
613: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
624: return new Response(
626: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
680: errorResponse: new Response(
682: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
716: errorResponse: new Response(
718: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
774: return new Response(
785: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

**Status codes returned:** 200, 400, 401, 403, 404, 409, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L26: `Deno.serve(async (req) => {`
2. L29: `if (req.method === "OPTIONS") {`
3. L30: `return handleCorsPreflightRequest(req);`
4. L33: `try {`
5. L35: `if (!auth.authenticated || !auth.userId) {`
6. L36: `return new Response(`
7. L46: `if (!bookingId) {`
8. L47: `return new Response(`
9. L55: `.from("bookings")`
10. L60: `if (bErr || !booking) {`
11. L61: `return new Response(`
12. L68: `if (action === "upsell-add" || action === "upsell-remove" || action === "upsell-driver-add" || action === "upsell-driver-remove") {`
13. L71: `if (!staffOk) {`
14. L72: `return new Response(`
15. L81: `if (action === "upsell-add") {`
16. L82: `return await handleUpsellAdd(supabaseAdmin, booking, body, corsHeaders, auth.userId, req);`
17. L84: `return await handleUpsellRemove(supabaseAdmin, booking, body, corsHeaders, auth.userId, req);`
18. L86: `return await handleUpsellDriverAdd(supabaseAdmin, booking, body, corsHeaders, auth.userId, req);`
19. L88: `return await handleUpsellDriverRemove(supabaseAdmin, booking, body, corsHeaders, auth.userId, req);`
20. L93: `if (booking.user_id !== auth.userId) {`
21. L94: `return new Response(`
22. L129: `if (serverTotals.addOnPrices.length > 0) {`
23. L130: `try {`
24. L134: `console.error(`[persist-booking-extras] ${msg}`);`
25. L139: `if (serverTotals.additionalDriverRecords.length > 0) {`
26. L140: `try {`
27. L144: `console.error(`[persist-booking-extras] ${msg}`);`
28. L149: `if (errors.length > 0) {`
29. L150: `return new Response(`
30. L156: `return new Response(`
31. L161: `console.error("[persist-booking-extras] Unexpected error:", error);`
32. L162: `return new Response(`
33. L180: `if (!addOnId) {`
34. L181: `return new Response(`
35. L191: `.from("add_ons")`
36. L197: `if (aoErr || !addOnRow) {`
37. L198: `return new Response(`
38. L206: `.from("booking_add_ons")`
39. L212: `for (const row of (existingAddOns || [])) {`
40. L217: `const mergedAddOns = Array.from(addOnMap.entries()).map(([id, q]) => ({`
41. L224: `.from("booking_additional_drivers")`
42. L250: `if (!computedEntry) {`
43. L251: `return new Response(`
44. L260: `if (booking.status === "active" && new Date(booking.start_at).getTime() < Date.now()) {`
45. L263: `if (remainingDays > 0 && remainingDays < fullDays) {`
46. L265: `.from("add_ons")`
47. L269: `if (addOnPricing) {`
48. L272: `if (isFuel) {`
49. L288: `.from("booking_add_ons")`
50. L298: `if (existingRow) {`
51. L300: `.from("booking_add_ons")`
52. L304: `if (updateErr) {`
53. L305: `console.error("[persist-booking-extras] upsell-add update failed:", updateErr);`
54. L306: `return new Response(`
55. L313: `.from("booking_add_ons")`
56. L321: `if (insertErr) {`
57. L322: `console.error("[persist-booking-extras] upsell-add insert failed:", insertErr);`
58. L323: `return new Response(`
59. L331: `await supabaseAdmin.from("audit_logs").insert({`
60. L345: `if (reprice.errorResponse) return reprice.errorResponse;`
61. L347: `return await buildUpsellResponse(supabaseAdmin, bookingId, reprice.data, corsHeaders);`
62. L364: `if (!bookingAddOnId && !addOnId) {`
63. L365: `return new Response(`
64. L372: `.from("booking_add_ons")`
65. L376: `if (lookupById) {`
66. L384: `if (!existing) {`
67. L385: `return new Response(`
68. L398: `.from("booking_add_ons")`
69. L402: `if (delErr) {`
70. L403: `console.error("[persist-booking-extras] upsell-remove delete failed:", delErr);`
71. L404: `return new Response(`
72. L410: `await supabaseAdmin.from("audit_logs").insert({`
73. L424: `if (reprice.errorResponse) return reprice.errorResponse;`
74. L426: `return await buildUpsellResponse(supabaseAdmin, bookingId, reprice.data, corsHeaders);`
75. L447: `if (!["20_24", "25_70"].includes(ageBand)) {`
76. L448: `return new Response(`
77. L456: `.from("booking_additional_drivers")`
78. L460: `if ((existingDrivers || []).length >= 5) {`
79. L461: `return new Response(`
80. L478: `.from("booking_add_ons")`
81. L502: `if (!newDriverRecord) {`
82. L503: `return new Response(`
83. L512: `if (authorizedStart && authorizedEnd) {`
84. L515: `if (!isNaN(aStart.getTime()) && !isNaN(aEnd.getTime()) && aEnd > aStart) {`
85. L523: `if (authorizedDays && authorizedDays < fullDaysTotal && fullDaysTotal > 0) {`
86. L535: `if (remainingDays > 0 && remainingDays < fullDays && fullDays > 0) {`
87. L544: `.from("booking_additional_drivers")`
88. L557: `if (insertErr) {`
89. L558: `console.error("[persist-booking-extras] upsell-driver-add insert failed:", insertErr);`
90. L559: `return new Response(`
91. L565: `await supabaseAdmin.from("audit_logs").insert({`
92. L578: `if (reprice.errorResponse) return reprice.errorResponse;`
93. L580: `return await buildUpsellResponse(supabaseAdmin, bookingId, reprice.data, corsHeaders);`
94. L596: `if (!driverRowId) {`
95. L597: `return new Response(`
96. L604: `.from("booking_additional_drivers")`
97. L610: `if (!existing) {`
98. L611: `return new Response(`
99. L618: `.from("booking_additional_drivers")`
100. L622: `if (delErr) {`
101. L623: `console.error("[persist-booking-extras] upsell-driver-remove delete failed:", delErr);`
102. L624: `return new Response(`
103. L630: `await supabaseAdmin.from("audit_logs").insert({`
104. L643: `if (reprice.errorResponse) return reprice.errorResponse;`
105. L645: `return await buildUpsellResponse(supabaseAdmin, bookingId, reprice.data, corsHeaders);`
106. L652: `return Math.round(v * 100) / 100;`
107. L658: `return Math.max(1, Math.ceil((eMs - nMs) / (1000 * 60 * 60 * 24)));`
108. L676: `if (!authHeader) {`
109. L677: `console.error("[persist-booking-extras] invokeRepriceBooking: missing Authorization header");`
110. L678: `return {`
111. L690: `const resp = await fetch(`
112. L712: `if (!resp.ok) {`
113. L713: `console.error("[persist-booking-extras] reprice-booking failed:", resp.status, bodyText);`
114. L714: `return {`
115. L724: `try { data = JSON.parse(bodyText); } catch (_) { /* non-JSON body */ }`
116. L726: `return { errorResponse: null, data };`
117. L742: `try {`
118. L746: `.from("bookings")`
119. L755: `.from("payments")`
120. L768: `console.error("[persist-booking-extras] buildUpsellResponse failed:", e);`
121. L774: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, user_id, vehicle_id, start_at, end_at, status, protection_plan, driver_age_band, delivery_fee, different_dropoff_fee, subtotal, tax_amount, total_amount, location_id, return_location_id` |
| `add_ons` | `id, name` |
| `booking_add_ons` | `add_on_id, quantity` |
| `booking_additional_drivers` | `driver_name, driver_age_band, young_driver_fee` |
| `add_ons` | `name, daily_rate, one_time_fee` |
| `booking_add_ons` | `id, price, quantity` |
| `booking_add_ons` | `id, add_on_id, price, quantity` |
| `booking_additional_drivers` | `driver_name, driver_age_band, young_driver_fee` |
| `booking_add_ons` | `add_on_id, quantity` |
| `booking_additional_drivers` | `id, driver_name, driver_age_band, young_driver_fee` |
| `bookings` | `total_amount` |
| `payments` | `amount, status, payment_type` |

### Tables written

| Table | Operation |
| --- | --- |
| `booking_add_ons` | UPDATE |
| `booking_add_ons` | INSERT |
| `audit_logs` | INSERT |
| `booking_add_ons` | DELETE |
| `audit_logs` | INSERT |
| `booking_additional_drivers` | INSERT |
| `audit_logs` | INSERT |
| `booking_additional_drivers` | DELETE |
| `audit_logs` | INSERT |

**RPCs called:** none

### External API calls

- L690: `const resp = await fetch(`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

- `src/components/admin/ops/CounterUpsellPanel.tsx:89:      const { data, error } = await supabase.functions.invoke("persist-booking-extras", {`
- `src/components/admin/ops/CounterUpsellPanel.tsx:109:      const { data, error } = await supabase.functions.invoke("persist-booking-extras", {`
- `src/components/admin/ops/CounterUpsellPanel.tsx:129:      const { data, error } = await supabase.functions.invoke("persist-booking-extras", {`
- `src/components/admin/ops/CounterUpsellPanel.tsx:149:      const { data, error } = await supabase.functions.invoke("persist-booking-extras", {`

### Failure behaviour / atomicity

**Atomic: NO.** 9 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `reprice-booking`

- **Path:** `supabase/functions/reprice-booking/index.ts` (857 lines)
- **Purpose (from file header):** reprice-booking — Server-side booking financial field updates
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
17: getUserOrThrow,
18: requireRoleOrThrow,
19: getAdminClient,
58: const authResult = await getUserOrThrow(req, corsHeaders);
59: await requireRoleOrThrow(authResult.userId, ["super_admin", "manager", "admin", "staff"], corsHeaders);
61: const supabase = getAdminClient();
723: const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
728: Authorization: `Bearer ${serviceKey}`,
729: apikey: serviceKey,
```

### CORS

```ts
13: getCorsHeaders,
14: handleCorsPreflightRequest,
15: } from "../_shared/cors.ts";
54: const corsHeaders = getCorsHeaders(req);
55: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
58: const authResult = await getUserOrThrow(req, corsHeaders);
59: await requireRoleOrThrow(authResult.userId, ["super_admin", "manager", "admin", "staff"], corsHeaders);
66: return jsonResp({ error: "Missing bookingId or operation" }, 400, corsHeaders);
86: return jsonResp({ error: "Booking not found" }, 404, corsHeaders);
158: return jsonResp({ error: "Missing modification parameters" }, 400, corsHeaders);
174: return jsonResp({ error: "Only pending/confirmed/active/overdue bookings can be modified" }, 400, corsHeaders);
184: return jsonResp({ error: "Return date must be after pickup date" }, 400, corsHeaders);
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `operation` | JSON body | UNKNOWN: no explicit guard |
| `newEndAt` | JSON body | yes |
| `newStartAt` | JSON body | yes |
| `newDailyRate` | JSON body | UNKNOWN: no explicit guard |
| `newLocationId` | JSON body | optional (defaulted) |
| `reason` | JSON body | optional (defaulted) |
| `preserveExtrasPrices` | JSON body | UNKNOWN: no explicit guard |
| `newCategoryId` | JSON body | UNKNOWN: no explicit guard |
| `upgradeDailyFee` | JSON body | UNKNOWN: no explicit guard |
| `showToCustomer` | JSON body | UNKNOWN: no explicit guard |
| `categoryLabel` | JSON body | optional (defaulted) |
| `upgradeReason` | JSON body | optional (defaulted) |
| `assignUnitId` | JSON body | UNKNOWN: no explicit guard |
| `assignUnitCategoryId` | JSON body | optional (defaulted) |
| `newProtectionPlan` | JSON body | UNKNOWN: no explicit guard |
| `extrasDeltaSubtotal` | JSON body | optional (defaulted) |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
62: const body = await req.json();
852: return new Response(JSON.stringify(body), {
```

**Status codes returned:** 

### Logic, in source order (numbered; every guard, early return and DB call)

1. L31: `return Math.round(v * 100) / 100;`
2. L44: `return {`
3. L53: `Deno.serve(async (req) => {`
4. L55: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
5. L57: `try {`
6. L65: `if (!bookingId || !operation) {`
7. L66: `return jsonResp({ error: "Missing bookingId or operation" }, 400, corsHeaders);`
8. L74: `.from("bookings")`
9. L85: `if (fetchErr || !booking) {`
10. L86: `return jsonResp({ error: "Booking not found" }, 404, corsHeaders);`
11. L91: `.from("booking_add_ons")`
12. L102: `.from("booking_additional_drivers")`
13. L132: `if (operation === "modify") {`
14. L146: `if (rawExtrasDelta && !extrasDeltaSubtotal) {`
15. L147: `console.error("[reprice-booking] Rejected invalid extrasDeltaSubtotal:", rawExtrasDelta);`
16. L157: `if (!newEndAt && !newDailyRate && !newStartAt && !newLocationId && !extrasDeltaSubtotal && !categoryChangeId) {`
17. L158: `return jsonResp({ error: "Missing modification parameters" }, 400, corsHeaders);`
18. L163: `if (isExtension) {`
19. L173: `if (!["draft", "pending", "confirmed", "active", "overdue"].includes(booking.status)) {`
20. L174: `return jsonResp({ error: "Only pending/confirmed/active/overdue bookings can be modified" }, 400, corsHeaders);`
21. L183: `if (new Date(effectiveEndAt) <= new Date(effectiveStartAt)) {`
22. L184: `return jsonResp({ error: "Return date must be after pickup date" }, 400, corsHeaders);`
23. L270: `if (oldDays > 0 && engineOldDays > 0 && engineOldDays !== oldDays) {`
24. L274: `console.warn("[reprice-booking] stored day count corrected", {`
25. L343: `if (overrideRate !== null) {`
26. L348: `if (newLocationId && newLocationId !== booking.location_id) {`
27. L354: `if (booking.assigned_unit_id) {`
28. L355: `try {`
29. L356: `await supabase.rpc("release_vin_from_booking", { p_booking_id: booking.id });`
30. L358: `console.error("[reprice-booking] Failed to release VIN on location change:", e);`
31. L365: `if (categoryChangeId && updateData.vehicle_id !== null) {`
32. L425: `if (assignUnitId) {`
33. L426: `if (booking.assigned_unit_id) {`
34. L427: `await supabase.rpc("release_vin_from_booking", { p_booking_id: booking.id });`
35. L429: `await supabase.from("vehicle_units").update({ status: "on_rent" }).eq("id", assignUnitId);`
36. L432: `if (assignUnitCategoryId) {`
37. L484: `if (!newStartAt && !newEndAt) {`
38. L485: `return jsonResp({ error: "Missing newStartAt or newEndAt" }, 400, corsHeaders);`
39. L488: `if (!["draft", "pending", "confirmed", "active", "overdue"].includes(booking.status)) {`
40. L489: `return jsonResp({ error: "Only pending/confirmed/active/overdue bookings can be modified" }, 400, corsHeaders);`
41. L495: `if (new Date(effectiveEndAt) <= new Date(effectiveStartAt)) {`
42. L496: `return jsonResp({ error: "Return date must be after pickup date" }, 400, corsHeaders);`
43. L505: `if (newStartAt) updateData.start_at = newStartAt;`
44. L506: `if (newEndAt) updateData.end_at = newEndAt;`
45. L513: `if (newProtectionPlan === undefined) {`
46. L514: `return jsonResp({ error: "Missing newProtectionPlan" }, 400, corsHeaders);`
47. L535: `if (upgradeFee > 0) {`
48. L564: `return jsonResp({ error: `Unknown operation: ${operation}` }, 400, corsHeaders);`
49. L569: `.from("bookings")`
50. L573: `if (updateErr) {`
51. L574: `console.error("[reprice-booking] Update failed:", updateErr);`
52. L575: `return jsonResp({ error: "Failed to update booking" }, 500, corsHeaders);`
53. L590: `if (newTotalDays && newTotalDays > 0 && !preserveExtras && !extrasDeltaApplied`
54. L593: `try {`
55. L595: `.from("system_settings")`
56. L603: `.from("booking_additional_drivers")`
57. L607: `for (const row of rows || []) {`
58. L610: `if (Number(row.young_driver_fee || 0) !== expected) {`
59. L612: `.from("booking_additional_drivers")`
60. L615: `if (dErr) {`
61. L616: `console.error("[reprice-booking] Failed to sync driver fee:", dErr);`
62. L621: `console.error("[reprice-booking] Driver fee sync failed:", e);`
63. L628: `try {`
64. L630: `.from("booking_add_ons")`
65. L634: `for (const row of addOnRows || []) {`
66. L636: `if (!meta) continue;`
67. L641: `if (Number((row as any).price || 0) !== expected) {`
68. L643: `.from("booking_add_ons")`
69. L646: `if (aErr) {`
70. L647: `console.error("[reprice-booking] Failed to sync add-on price:", aErr);`
71. L652: `console.error("[reprice-booking] Add-on price sync failed:", e);`
72. L657: `await supabase.from("audit_logs").insert({`
73. L671: `if (extensionInfo) {`
74. L673: `.from("booking_extensions")`
75. L688: `if (extErr) {`
76. L689: `console.error("[reprice-booking] Failed to record extension:", extErr);`
77. L707: `if (daysChanged || totalChanged || extensionInfo) {`
78. L708: `try {`
79. L710: `.from("rental_agreements")`
80. L718: `if (existingAgreement) {`
81. L720: `// Direct service-role call: supabase.functions.invoke() would forward a`
82. L724: `const resp = await fetch(`${supabaseUrl}/functions/v1/generate-agreement`, {`
83. L742: `try { regenData = JSON.parse(regenText); } catch (_) { /* non-JSON */ }`
84. L744: `if (!resp.ok) {`
85. L746: `console.error("[reprice-booking] Agreement regeneration failed:", agreementError);`
86. L750: `if (extensionRowId && regenData?.agreementId) {`
87. L752: `.from("booking_extensions")`
88. L761: `console.error("[reprice-booking] Agreement sync error:", e);`
89. L769: `return jsonResp({`
90. L786: `if (err instanceof AuthError) return authErrorResponse(err, corsHeaders);`
91. L787: `console.error("[reprice-booking] Error:", err);`
92. L788: `return jsonResp({ error: "Internal server error" }, 500, corsHeaders);`
93. L811: `try {`
94. L827: `if (Math.abs(difference) <= 0.5) return null;`
95. L835: `await supabase.from("audit_logs").insert({`
96. L843: `console.warn(`[reprice-booking] pricing drift on ${booking.id}:`, drift);`
97. L844: `return drift;`
98. L846: `console.error("[reprice-booking] drift check failed:", e);`
99. L847: `return null;`
100. L852: `return new Response(JSON.stringify(body), {`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `
        id, start_at, end_at, daily_rate, total_days, subtotal,
        tax_amount, total_amount, vehicle_id, user_id, status,
        driver_age_band, protection_plan, young_driver_fee,
        delivery_fee, different_dropoff_fee, upgrade_daily_fee, location_id,
        return_location_id, assigned_unit_id, original_vehicle_id, upgrade_reason
      ` |
| `booking_add_ons` | `add_on_id, quantity` |
| `booking_additional_drivers` | `driver_name, driver_age_band` |
| `system_settings` | `key, value` |
| `booking_additional_drivers` | `id, driver_age_band, young_driver_fee` |
| `booking_add_ons` | `id, quantity, price, add_on_id, add_on:add_ons(daily_rate, one_time_fee)` |
| `rental_agreements` | `id, customer_signed_at` |

### Tables written

| Table | Operation |
| --- | --- |
| `vehicle_units` | UPDATE |
| `bookings` | UPDATE |
| `booking_additional_drivers` | UPDATE |
| `booking_add_ons` | UPDATE |
| `audit_logs` | INSERT |
| `booking_extensions` | INSERT |
| `booking_extensions` | UPDATE |
| `audit_logs` | INSERT |

**RPCs called:** `release_vin_from_booking`

### External API calls

- L724: `const resp = await fetch(`${supabaseUrl}/functions/v1/generate-agreement`, {`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

- `src/components/admin/CategoryUpgradeDialog.tsx:117:      const { data, error } = await supabase.functions.invoke("reprice-booking", {`
- `src/components/admin/UnifiedVehicleManager.tsx:259:        const { data, error } = await supabase.functions.invoke("reprice-booking", {`
- `src/hooks/use-booking-modification.ts:181:      const { data, error } = await supabase.functions.invoke("reprice-booking", {`
- `src/hooks/use-booking-edit.ts:117:      const { data, error } = await supabase.functions.invoke("reprice-booking", {`
- `src/components/admin/ops/ProtectionChangePanel.tsx:52:      const { data, error } = await supabase.functions.invoke("reprice-booking", {`
- `src/components/admin/ops/VehicleUpgradePanel.tsx:145:      const { data, error } = await supabase.functions.invoke("reprice-booking", {`
- `src/components/admin/ops/VehicleUpgradePanel.tsx:184:      const { data, error } = await supabase.functions.invoke("reprice-booking", {`

### Failure behaviour / atomicity

**Atomic: NO.** 8 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `send-account-setup-link`

- **Path:** `supabase/functions/send-account-setup-link/index.ts` (230 lines)
- **Purpose (from file header):** send-account-setup-link — Staff-only: email a walk-in customer
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
11: import { validateAuth, getAdminClient, isAdminOrStaff } from "../_shared/auth.ts";
61: const bearer = (req.headers.get("Authorization") || "").replace("Bearer ", "");
63: !!bearer && bearer === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
66: const auth = await validateAuth(req);
98: const admin = getAdminClient();
183: Authorization: `Bearer ${resendKey}`,
```

### CORS

```ts
10: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
56: const corsHeaders = getCorsHeaders(req);
57: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
70: headers: { ...corsHeaders, "Content-Type": "application/json" },
77: headers: { ...corsHeaders, "Content-Type": "application/json" },
86: headers: { ...corsHeaders, "Content-Type": "application/json" },
94: headers: { ...corsHeaders, "Content-Type": "application/json" },
110: headers: { ...corsHeaders, "Content-Type": "application/json" },
145: headers: { ...corsHeaders, "Content-Type": "application/json" },
157: options: {
166: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
199: { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
68: return new Response(JSON.stringify({ error: "Unauthorized" }), {
69: status: 401,
75: return new Response(JSON.stringify({ error: "Forbidden: staff role required" }), {
76: status: 403,
82: const { bookingId } = await req.json();
84: return new Response(JSON.stringify({ error: "bookingId is required" }), {
85: status: 400,
92: return new Response(JSON.stringify({ error: "Email service not configured" }), {
93: status: 500,
108: return new Response(JSON.stringify({ error: "Booking not found" }), {
109: status: 404,
143: return new Response(JSON.stringify({ error: "No customer email on file" }), {
144: status: 400,
164: return new Response(
166: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
194: const resendBody = await resendRes.json().catch(() => ({}));
197: return new Response(
199: { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
217: return new Response(
219: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
224: return new Response(JSON.stringify({ error: "server_error", message: msg }), {
225: status: 500,
```

**Status codes returned:** 200, 400, 401, 403, 404, 500, 502

### Logic, in source order (numbered; every guard, early return and DB call)

1. L17: `if (origin && /^https?:\/\//.test(origin)) return origin;`
2. L18: `return FALLBACK_ORIGIN;`
3. L28: `return `<!DOCTYPE html>`
4. L55: `Deno.serve(async (req) => {`
5. L57: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
6. L59: `try {`
7. L65: `if (!isInternalCall) {`
8. L67: `if (!auth.authenticated || !auth.userId) {`
9. L68: `return new Response(JSON.stringify({ error: "Unauthorized" }), {`
10. L74: `if (!(await isAdminOrStaff(auth.userId))) {`
11. L75: `return new Response(JSON.stringify({ error: "Forbidden: staff role required" }), {`
12. L83: `if (!bookingId || typeof bookingId !== "string") {`
13. L84: `return new Response(JSON.stringify({ error: "bookingId is required" }), {`
14. L91: `if (!resendKey) {`
15. L92: `return new Response(JSON.stringify({ error: "Email service not configured" }), {`
16. L102: `.from("bookings")`
17. L107: `if (bErr || !booking) {`
18. L108: `return new Response(JSON.stringify({ error: "Booking not found" }), {`
19. L118: `if (booking.user_id) {`
20. L120: `.from("profiles")`
21. L124: `if (profile?.email) {`
22. L130: `if (!email && booking.customer_id) {`
23. L132: `.from("customers")`
24. L136: `if (cust?.email) {`
25. L142: `if (!email) {`
26. L143: `return new Response(JSON.stringify({ error: "No customer email on file" }), {`
27. L154: `const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({`
28. L162: `if (linkErr || !linkData?.properties?.action_link) {`
29. L163: `console.error("[send-account-setup-link] generateLink failed:", linkErr);`
30. L164: `return new Response(`
31. L180: `const resendRes = await fetch("https://api.resend.com/emails", {`
32. L195: `if (!resendRes.ok) {`
33. L196: `console.error("[send-account-setup-link] Resend error:", resendBody);`
34. L197: `return new Response(`
35. L204: `try {`
36. L205: `await admin.from("notification_logs").insert({`
37. L214: `console.warn("[send-account-setup-link] notification_logs insert failed (non-fatal):", logErr);`
38. L217: `return new Response(`
39. L223: `console.error("[send-account-setup-link] Error:", msg, e);`
40. L224: `return new Response(JSON.stringify({ error: "server_error", message: msg }), {`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, booking_code, user_id, customer_id` |
| `profiles` | `email, full_name` |
| `customers` | `email, full_name` |

### Tables written

| Table | Operation |
| --- | --- |
| `notification_logs` | INSERT |

**RPCs called:** none

### External API calls

- L180: `const resendRes = await fetch("https://api.resend.com/emails", {`
- endpoint literal: `https://api.resend.com/emails`
- endpoint literal: `https://www.c2crental.ca`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: `supabase/functions/_shared/booking-core.ts:1128`, `src/components/admin/WalkInBookingDialog.tsx:282`

### Failure behaviour / atomicity

**Atomic: NO.** 1 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `send-agreement-notification`

- **Path:** `supabase/functions/send-agreement-notification/index.ts` (292 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
8: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
20: "Authorization": `Bearer ${apiKey}`,
43: const authHeader = btoa(`${sid}:${token}`);
48: "Authorization": `Basic ${authHeader}`,
74: const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
```

### CORS

```ts
6: const corsHeaders = {
7: "Access-Control-Allow-Origin": "*",
8: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
63: if (req.method === "OPTIONS") {
64: return new Response(null, { headers: corsHeaders });
81: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
102: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
282: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
288: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
31: const data = await response.json();
58: const data = await response.json();
64: return new Response(null, { headers: corsHeaders });
76: const { bookingId, notificationType }: SendAgreementNotificationRequest = await req.json();
79: return new Response(
81: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
100: return new Response(
102: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
280: return new Response(
282: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
286: return new Response(
288: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 400, 404, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L17: `const response = await fetch("https://api.resend.com/emails", {`
2. L32: `return { ok: response.ok, data };`
3. L45: `const response = await fetch(twilioUrl, {`
4. L59: `return { ok: response.ok, data };`
5. L63: `if (req.method === "OPTIONS") {`
6. L64: `return new Response(null, { headers: corsHeaders });`
7. L67: `try {`
8. L78: `if (!bookingId || !notificationType) {`
9. L79: `return new Response(`
10. L89: `.from("bookings")`
11. L98: `if (bookingError || !booking) {`
12. L99: `console.error("Booking not found:", bookingError);`
13. L100: `return new Response(`
14. L108: `.from("profiles")`
15. L117: `if (!userEmail) {`
16. L142: `switch (notificationType) {`
17. L143: `case "agreement_ready":`
18. L170: `case "license_verified":`
19. L188: `case "payment_received":`
20. L207: `case "pickup_ready":`
21. L230: `if (resendApiKey && userEmail) {`
22. L238: `if (userPhone && !smsTo) {`
23. L239: `console.error(`[send-agreement-notification] invalid_phone: ${userPhone}`);`
24. L241: `if (twilioSid && twilioToken && twilioFrom && smsTo) {`
25. L249: `if (results.email) {`
26. L262: `if (results.sms) {`
27. L276: `if (logs.length > 0) {`
28. L277: `await supabase.from("notification_logs").insert(logs);`
29. L280: `return new Response(`
30. L285: `console.error("Error in send-agreement-notification:", error);`
31. L286: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `
        id, booking_code, start_at, end_at, status, total_amount, user_id,
        locations!bookings_location_id_fkey (name, address, phone),
        vehicles!inner (make, model, year)
      ` |
| `profiles` | `email, full_name, phone` |

### Tables written

| Table | Operation |
| --- | --- |
| `notification_logs` | INSERT |

**RPCs called:** none

### External API calls

- L17: `const response = await fetch("https://api.resend.com/emails", {`
- L45: `const response = await fetch(twilioUrl, {`
- endpoint literal: `https://api.resend.com/emails`
- endpoint literal: `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
- endpoint literal: `https://deno.land/std@0.190.0/http/server.ts`
- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: `supabase/functions/generate-agreement/index.ts:758`

### Failure behaviour / atomicity

**Atomic: NO.** 1 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `send-bank-transfer-otp`

- **Path:** `supabase/functions/send-bank-transfer-otp/index.ts` (126 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
4: import { getAdminClient, getUserOrThrow, requireRoleOrThrow, authErrorResponse } from "../_shared/auth.ts";
15: const data = encoder.encode(otp + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
25: const { userId } = await getUserOrThrow(req, corsHeaders);
26: await requireRoleOrThrow(userId, ["super_admin", "manager", "admin", "staff"], corsHeaders);
44: const supabase = getAdminClient();
99: "Authorization": `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
```

### CORS

```ts
3: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
21: const corsHeaders = getCorsHeaders(req);
22: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
25: const { userId } = await getUserOrThrow(req, corsHeaders);
26: await requireRoleOrThrow(userId, ["super_admin", "manager", "admin", "staff"], corsHeaders);
31: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
41: { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
53: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
57: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
79: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
89: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
110: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
28: const { bookingId } = await req.json();
30: return new Response(JSON.stringify({ error: "bookingId required" }),
31: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
40: return new Response(JSON.stringify({ error: "Too many code requests. Please wait a few minutes." }),
41: { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
52: return new Response(JSON.stringify({ error: "Booking not found" }),
53: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
56: return new Response(JSON.stringify({ error: "Booking already marked as paid by bank transfer" }),
57: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
78: return new Response(JSON.stringify({ error: "Failed to create OTP" }),
79: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
88: return new Response(JSON.stringify({ error: "SMS service not configured" }),
89: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
109: return new Response(JSON.stringify({ error: "Failed to send SMS" }),
110: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
113: return new Response(JSON.stringify({
117: }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
121: return new Response(JSON.stringify({ error: "Internal server error" }),
122: { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
```

**Status codes returned:** 200, 400, 404, 409, 429, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L10: `return Math.floor(100000 + Math.random() * 900000).toString();`
2. L17: `return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");`
3. L22: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
4. L24: `try {`
5. L29: `if (!bookingId || typeof bookingId !== "string") {`
6. L30: `return new Response(JSON.stringify({ error: "bookingId required" }),`
7. L39: `if (!rl.allowed) {`
8. L40: `return new Response(JSON.stringify({ error: "Too many code requests. Please wait a few minutes." }),`
9. L47: `.from("bookings")`
10. L51: `if (bookingErr || !booking) {`
11. L52: `return new Response(JSON.stringify({ error: "Booking not found" }),`
12. L55: `if (booking.paid_offline) {`
13. L56: `return new Response(JSON.stringify({ error: "Booking already marked as paid by bank transfer" }),`
14. L65: `await supabase.from("bank_transfer_otps")`
15. L70: `const { error: insertErr } = await supabase.from("bank_transfer_otps").insert({`
16. L76: `if (insertErr) {`
17. L77: `console.error("[send-bank-transfer-otp] insert error", insertErr);`
18. L78: `return new Response(JSON.stringify({ error: "Failed to create OTP" }),`
19. L87: `if (!twilioSid || !twilioAuth || !twilioFrom) {`
20. L88: `return new Response(JSON.stringify({ error: "SMS service not configured" }),`
21. L94: `const twilioRes = await fetch(`
22. L106: `if (!twilioRes.ok) {`
23. L108: `console.error("[send-bank-transfer-otp] twilio error", errText);`
24. L109: `return new Response(JSON.stringify({ error: "Failed to send SMS" }),`
25. L113: `return new Response(JSON.stringify({`
26. L119: `try { return authErrorResponse(err, getCorsHeaders(req)); } catch {`
27. L120: `console.error("[send-bank-transfer-otp] error", err);`
28. L121: `return new Response(JSON.stringify({ error: "Internal server error" }),`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, booking_code, total_amount, paid_offline` |

### Tables written

| Table | Operation |
| --- | --- |
| `bank_transfer_otps` | UPDATE |
| `bank_transfer_otps` | INSERT |

**RPCs called:** none

### External API calls

- L94: `const twilioRes = await fetch(`
- endpoint literal: `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
- endpoint literal: `https://deno.land/std@0.190.0/http/server.ts`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: `src/components/admin/MarkBankTransferPaidDialog.tsx:72`

### Failure behaviour / atomicity

**Atomic: NO.** 2 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `send-booking-email`

- **Path:** `supabase/functions/send-booking-email/index.ts` (331 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
7: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
20: "Authorization": `Bearer ${apiKey}`,
51: const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
```

### CORS

```ts
5: const corsHeaders = {
6: "Access-Control-Allow-Origin": "*",
7: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
36: if (req.method === "OPTIONS") {
37: return new Response(null, { headers: corsHeaders });
46: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
58: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
89: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
118: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
139: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
313: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
321: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
31: const data = await response.json();
37: return new Response(null, { headers: corsHeaders });
44: return new Response(
46: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
53: const { bookingId, templateType, forceResend }: SendEmailRequest = await req.json();
56: return new Response(
58: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
87: return new Response(
89: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
116: return new Response(
118: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
137: return new Response(
139: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
311: return new Response(
313: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
319: return new Response(
321: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
325: return new Response(
327: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 400, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L17: `const response = await fetch("https://api.resend.com/emails", {`
2. L32: `return { ok: response.ok, data };`
3. L36: `if (req.method === "OPTIONS") {`
4. L37: `return new Response(null, { headers: corsHeaders });`
5. L40: `try {`
6. L42: `if (!resendApiKey) {`
7. L43: `console.error("Resend API key not configured");`
8. L44: `return new Response(`
9. L55: `if (!bookingId || !templateType) {`
10. L56: `return new Response(`
11. L66: `.from("bookings")`
12. L76: `if (bookingError || !booking) {`
13. L78: `console.error(`[send-booking-email] booking lookup failed for ${bookingId}: ${detail}`, bookingError);`
14. L87: `return new Response(`
15. L95: `.from("vehicle_categories")`
16. L105: `if (!userEmail) {`
17. L106: `console.error(`[send-booking-email] no_email_on_file for booking ${booking.booking_code}`);`
18. L116: `return new Response(`
19. L128: `if (!forceResend) {`
20. L130: `.from("notification_logs")`
21. L135: `if (existing) {`
22. L137: `return new Response(`
23. L252: `switch (templateType) {`
24. L253: `case "confirmation":`
25. L263: `case "update":`
26. L271: `case "cancellation":`
27. L279: `case "reminder":`
28. L296: `await supabase.from("notification_logs").insert({`
29. L308: `if (!emailResponse.ok) {`
30. L309: `console.error("Resend error:", emailResponse.data);`
31. L311: `return new Response(`
32. L319: `return new Response(`
33. L324: `console.error("Error in send-booking-email:", error);`
34. L325: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `
        id, booking_code, start_at, end_at, status, total_amount, user_id,
        daily_rate, total_days, subtotal, tax_amount, deposit_amount, vehicle_id,
        customer_id, pickup_contact_name, pickup_contact_phone,
        locations!bookings_location_id_fkey (name, address, phone, email)
      ` |
| `vehicle_categories` | `name, image_url` |
| `notification_logs` | `id` |

### Tables written

| Table | Operation |
| --- | --- |
| `notification_logs` | INSERT |

**RPCs called:** none

### External API calls

- L17: `const response = await fetch("https://api.resend.com/emails", {`
- endpoint literal: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`
- endpoint literal: `https://api.resend.com/emails`
- endpoint literal: `https://deno.land/std@0.190.0/http/server.ts`
- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: `supabase/functions/verify-booking-otp/index.ts:66`, `supabase/functions/_shared/booking-core.ts:1103`, `supabase/functions/_shared/notifications.ts:124`, `supabase/functions/create-booking/index.ts:486`

### Failure behaviour / atomicity

**Atomic: NO.** 1 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `send-booking-notification`

- **Path:** `supabase/functions/send-booking-notification/index.ts` (502 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
9: "authorization, x-client-info, apikey, content-type",
321: const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
423: "Authorization": `Bearer ${resendApiKey}`,
455: "Authorization": "Basic " + btoa(`${twilioSid}:${twilioToken}`),
```

### CORS

```ts
6: const corsHeaders = {
7: "Access-Control-Allow-Origin": "*",
8: "Access-Control-Allow-Headers":
315: if (req.method === "OPTIONS") {
316: return new Response(null, { headers: corsHeaders });
335: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
354: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
408: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
491: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
498: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
316: return new Response(null, { headers: corsHeaders });
328: const { bookingId, stage, customMessage }: NotificationRequest = await req.json();
333: return new Response(
335: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
352: return new Response(
354: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
406: return new Response(
408: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
489: return new Response(
491: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
496: return new Response(
498: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 400, 404, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L48: `if (!loc) return "our location";`
2. L49: `return [loc.name, loc.address, loc.city].filter(Boolean).join(", ");`
3. L54: `return ``
4. L85: `switch (stage) {`
5. L86: `case "payment_received":`
6. L87: `return {`
7. L98: `case "license_approved":`
8. L99: `return {`
9. L110: `case "license_rejected":`
10. L111: `return {`
11. L123: `case "vehicle_assigned":`
12. L124: `return {`
13. L135: `case "agreement_generated":`
14. L136: `return {`
15. L150: `case "agreement_signed":`
16. L151: `return {`
17. L162: `case "checkin_complete":`
18. L163: `return {`
19. L174: `case "prep_complete":`
20. L175: `return {`
21. L186: `case "walkaround_complete":`
22. L187: `return {`
23. L198: `case "rental_activated": {`
24. L202: `return {`
25. L220: `case "return_initiated":`
26. L221: `return {`
27. L232: `case "rental_completed":`
28. L233: `return {`
29. L247: `case "deposit_released":`
30. L248: `return {`
31. L262: `case "booking_cancelled":`
32. L263: `return {`
33. L278: `return {`
34. L292: `return `<!DOCTYPE html>`
35. L315: `if (req.method === "OPTIONS") {`
36. L316: `return new Response(null, { headers: corsHeaders });`
37. L319: `try {`
38. L332: `if (!bookingId || !stage) {`
39. L333: `return new Response(`
40. L341: `.from("bookings")`
41. L350: `if (bookingError || !booking) {`
42. L351: `console.error("Booking not found:", bookingError);`
43. L352: `return new Response(`
44. L360: `if (booking.vehicle_id) {`
45. L362: `.from("vehicle_categories")`
46. L366: `if (category?.name) vehicleName = category.name;`
47. L397: `.from("notification_logs")`
48. L404: `if (recentLog && recentLog.length > 0) {`
49. L406: `return new Response(`
50. L415: `if (resendApiKey && userEmail) {`
51. L416: `try {`
52. L420: `const emailRes = await fetch("https://api.resend.com/emails", {`
53. L435: `if (!emailRes.ok) {`
54. L437: `console.error("Email API error:", errBody);`
55. L442: `console.error("Email error:", e);`
56. L447: `if (twilioSid && twilioToken && twilioPhone && userPhone) {`
57. L448: `try {`
58. L450: `const smsRes = await fetch(`
59. L467: `if (!smsRes.ok) {`
60. L469: `console.error("SMS API error:", errBody);`
61. L474: `console.error("SMS error:", e);`
62. L479: `await supabase.from("notification_logs").insert({`
63. L489: `return new Response(`
64. L495: `console.error("Notification error:", error);`
65. L496: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `
        *,
        pickup_location:locations!location_id (name, address, city),
        return_location:locations!return_location_id (name, address, city)
      ` |
| `vehicle_categories` | `name` |
| `notification_logs` | `id` |

### Tables written

| Table | Operation |
| --- | --- |
| `notification_logs` | INSERT |

**RPCs called:** none

### External API calls

- L420: `const emailRes = await fetch("https://api.resend.com/emails", {`
- L450: `const smsRes = await fetch(`
- endpoint literal: `https://api.resend.com/emails`
- endpoint literal: `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
- endpoint literal: `https://c2crental.ca`
- endpoint literal: `https://deno.land/std@0.190.0/http/server.ts`
- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

- `src/hooks/use-walkaround.ts:281:        supabase.functions.invoke("send-booking-notification", {`
- `src/domain/bookings/mutations.ts:288:    await supabase.functions.invoke("send-booking-notification", {`
- `src/lib/deposit-automation.ts:112:    await supabase.functions.invoke("send-booking-notification", {`
- `src/hooks/use-rental-agreement.ts:186:              await supabase.functions.invoke("send-booking-notification", {`
- `src/hooks/use-rental-agreement.ts:266:          await supabase.functions.invoke("send-booking-notification", {`
- `src/hooks/use-checkin.ts:252:        supabase.functions.invoke("send-booking-notification", {`
- `src/components/admin/ops/steps/StepAgreement.tsx:26:      await supabase.functions.invoke("send-booking-notification", {`
- `src/hooks/use-verification.ts:188:          await supabase.functions.invoke('send-booking-notification', {`
- `src/hooks/use-vehicle-assignment.ts:186:      supabase.functions.invoke('send-booking-notification', {`

### Failure behaviour / atomicity

**Atomic: NO.** 1 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `send-booking-otp`

- **Path:** `supabase/functions/send-booking-otp/index.ts` (277 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
9: import { getAdminClient } from "../_shared/auth.ts";
25: const data = encoder.encode(otp + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
56: const supabaseAdmin = getAdminClient();
196: "Authorization": `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
241: "Authorization": `Bearer ${resendKey}`,
```

### CORS

```ts
5: getCorsHeaders,
6: handleCorsPreflightRequest,
8: } from "../_shared/cors.ts";
32: const corsHeaders = getCorsHeaders(req);
34: if (req.method === "OPTIONS") {
35: return handleCorsPreflightRequest(req);
52: { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil((ipRateLimit.resetAt - Date.now()) / 1000)) } }
62: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
77: { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
93: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
130: { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
139: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
50: return new Response(
52: { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil((ipRateLimit.resetAt - Date.now()) / 1000)) } }
57: const { bookingId, channel }: SendOtpRequest = await req.json();
60: return new Response(
62: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
75: return new Response(
77: { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
91: return new Response(
93: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
128: return new Response(
130: { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
137: return new Response(
139: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
169: return new Response(
171: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
183: return new Response(
185: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
209: return new Response(
211: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
219: return new Response(
221: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
258: return new Response(
266: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
271: return new Response(
273: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 400, 429, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L19: `return Math.floor(100000 + Math.random() * 900000).toString();`
2. L27: `const hashArray = Array.from(new Uint8Array(hashBuffer));`
3. L28: `return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");`
4. L34: `if (req.method === "OPTIONS") {`
5. L35: `return handleCorsPreflightRequest(req);`
6. L38: `try {`
7. L48: `if (!ipRateLimit.allowed) {`
8. L50: `return new Response(`
9. L59: `if (!bookingId || !channel) {`
10. L60: `return new Response(`
11. L73: `if (!bookingRateLimit.allowed) {`
12. L75: `return new Response(`
13. L83: `.from("bookings")`
14. L88: `if (bookingError || !booking) {`
15. L90: `console.error("[send-booking-otp] Booking not found:", bookingId);`
16. L91: `return new Response(`
17. L99: `.from("profiles")`
18. L108: `if (!userPhone || !userEmail) {`
19. L110: `if (authUser?.user) {`
20. L119: `if (contactKey) {`
21. L126: `if (!contactRateLimit.allowed) {`
22. L128: `return new Response(`
23. L136: `if ((channel === "sms" && !userPhone) || (channel === "email" && !userEmail)) {`
24. L137: `return new Response(`
25. L150: `.from("booking_otps")`
26. L157: `.from("booking_otps")`
27. L167: `if (insertError) {`
28. L168: `console.error("[send-booking-otp] Failed to store OTP:", insertError);`
29. L169: `return new Response(`
30. L176: `if (channel === "sms") {`
31. L181: `if (!twilioSid || !twilioAuth || !twilioFrom) {`
32. L182: `console.error("[send-booking-otp] Twilio not configured");`
33. L183: `return new Response(`
34. L191: `const twilioResponse = await fetch(`
35. L207: `if (!twilioResponse.ok) {`
36. L208: `console.error("[send-booking-otp] Twilio error");`
37. L209: `return new Response(`
38. L217: `if (!resendKey) {`
39. L218: `console.error("[send-booking-otp] Resend not configured");`
40. L219: `return new Response(`
41. L238: `await fetch("https://api.resend.com/emails", {`
42. L258: `return new Response(`
43. L270: `console.error("[send-booking-otp] Unexpected error:", error);`
44. L271: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, user_id, booking_code` |
| `profiles` | `phone, email, full_name` |

### Tables written

| Table | Operation |
| --- | --- |
| `booking_otps` | UPDATE |
| `booking_otps` | INSERT |

**RPCs called:** none

### External API calls

- L191: `const twilioResponse = await fetch(`
- L238: `await fetch("https://api.resend.com/emails", {`
- endpoint literal: `https://api.resend.com/emails`
- endpoint literal: `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
- endpoint literal: `https://deno.land/std@0.190.0/http/server.ts`
- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

- `src/components/checkout/OtpVerification.tsx:55:      const response = await supabase.functions.invoke("send-booking-otp", {`

### Failure behaviour / atomicity

**Atomic: NO.** 2 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `send-booking-sms`

- **Path:** `supabase/functions/send-booking-sms/index.ts` (215 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
9: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
24: const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
163: const authHeader = btoa(`${twilioSid}:${twilioToken}`);
168: "Authorization": `Basic ${authHeader}`,
```

### CORS

```ts
7: const corsHeaders = {
8: "Access-Control-Allow-Origin": "*",
9: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
18: if (req.method === "OPTIONS") {
19: return new Response(null, { headers: corsHeaders });
33: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
42: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
73: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
103: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
121: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
197: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
205: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
19: return new Response(null, { headers: corsHeaders });
31: return new Response(
33: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
37: const { bookingId, templateType }: SendSmsRequest = await req.json();
40: return new Response(
42: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
71: return new Response(
73: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
101: return new Response(
103: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
119: return new Response(
121: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
178: const twilioResult = await twilioResponse.json();
195: return new Response(
197: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
203: return new Response(
205: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
209: return new Response(
211: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 400, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L18: `if (req.method === "OPTIONS") {`
2. L19: `return new Response(null, { headers: corsHeaders });`
3. L22: `try {`
4. L29: `if (!twilioSid || !twilioToken || !twilioFrom) {`
5. L30: `console.warn("Twilio credentials not configured - skipping SMS");`
6. L31: `return new Response(`
7. L39: `if (!bookingId || !templateType) {`
8. L40: `return new Response(`
9. L51: `.from("bookings")`
10. L60: `if (bookingError || !booking) {`
11. L62: `console.error(`[send-booking-sms] booking lookup failed for ${bookingId}: ${detail}`, bookingError);`
12. L71: `return new Response(`
13. L79: `.from("vehicle_categories")`
14. L89: `if (!toPhone) {`
15. L91: `console.error(`[send-booking-sms] ${reason} for booking ${booking.booking_code}`);`
16. L101: `return new Response(`
17. L112: `.from("notification_logs")`
18. L117: `if (existing) {`
19. L119: `return new Response(`
20. L145: `switch (templateType) {`
21. L146: `case "confirmation":`
22. L149: `case "update":`
23. L152: `case "cancellation":`
24. L155: `case "reminder":`
25. L165: `const twilioResponse = await fetch(twilioUrl, {`
26. L181: `await supabase.from("notification_logs").insert({`
27. L193: `if (!twilioResponse.ok) {`
28. L194: `console.error("Twilio error:", twilioResult);`
29. L195: `return new Response(`
30. L203: `return new Response(`
31. L208: `console.error("Error in send-booking-sms:", error);`
32. L209: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `
        id, booking_code, start_at, end_at, status, total_amount, user_id, vehicle_id,
        customer_id, pickup_contact_name, pickup_contact_phone,
        locations!bookings_location_id_fkey (name, address, phone)
      ` |
| `vehicle_categories` | `name` |
| `notification_logs` | `id` |

### Tables written

| Table | Operation |
| --- | --- |
| `notification_logs` | INSERT |

**RPCs called:** none

### External API calls

- L165: `const twilioResponse = await fetch(twilioUrl, {`
- endpoint literal: `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
- endpoint literal: `https://c2crental.ca`
- endpoint literal: `https://deno.land/std@0.190.0/http/server.ts`
- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: `supabase/functions/verify-booking-otp/index.ts:69`, `supabase/functions/create-walk-in-booking/index.ts:591`, `supabase/functions/create-booking/index.ts:482`, `supabase/functions/_shared/notifications.ts:125`, `supabase/functions/_shared/booking-core.ts:1107`

### Failure behaviour / atomicity

**Atomic: NO.** 1 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `send-contact-email`

- **Path:** `supabase/functions/send-contact-email/index.ts` (273 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
246: const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
```

### CORS

```ts
5: getCorsHeaders,
12: } from "../_shared/cors.ts";
18: * - Origin whitelist (no wildcard CORS)
34: const corsHeaders = getCorsHeaders(req);
36: if (req.method === "OPTIONS") {
37: return new Response(null, { headers: corsHeaders });
44: { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
60: return rateLimitResponse(ipRateLimit.resetAt, corsHeaders);
72: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
80: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
89: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
96: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `name` | JSON body | yes |
| `email` | JSON body | optional (defaulted) |
| `phone` | JSON body | UNKNOWN: no explicit guard |
| `subject` | JSON body | optional (defaulted) |
| `message` | JSON body | UNKNOWN: no explicit guard |
| `honeypot` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
37: return new Response(null, { headers: corsHeaders });
42: return new Response(
44: { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
63: const body: ContactEmailRequest = await req.json();
70: return new Response(
72: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
78: return new Response(
80: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
87: return new Response(
89: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
94: return new Response(
96: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
107: return new Response(
109: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
128: return new Response(
130: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
258: return new Response(
263: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
267: return new Response(
269: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 400, 405, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L36: `if (req.method === "OPTIONS") {`
2. L37: `return new Response(null, { headers: corsHeaders });`
3. L41: `if (req.method !== "POST") {`
4. L42: `return new Response(`
5. L50: `try {`
6. L58: `if (!ipRateLimit.allowed) {`
7. L59: `console.warn(`Rate limit exceeded for contact form from IP: ${clientIp}`);`
8. L60: `return rateLimitResponse(ipRateLimit.resetAt, corsHeaders);`
9. L67: `if (honeypot && honeypot.length > 0) {`
10. L68: `console.warn(`Honeypot triggered from IP: ${clientIp}`);`
11. L70: `return new Response(`
12. L77: `if (!name || !email || !subject || !message) {`
13. L78: `return new Response(`
14. L86: `if (!isValidEmail(sanitizedEmail)) {`
15. L87: `return new Response(`
16. L93: `if (phone && !isValidPhone(phone)) {`
17. L94: `return new Response(`
18. L106: `if (safeName.length < 2 || safeSubject.length < 3 || safeMessage.length < 10) {`
19. L107: `return new Response(`
20. L120: `if (!emailRateLimit.allowed) {`
21. L121: `console.warn(`Email rate limit exceeded for: ${sanitizedEmail}`);`
22. L122: `return rateLimitResponse(emailRateLimit.resetAt, corsHeaders);`
23. L126: `if (!resendApiKey) {`
24. L127: `console.error("RESEND_API_KEY not configured");`
25. L128: `return new Response(`
26. L247: `if (supabaseUrl && supabaseServiceKey) {`
27. L249: `await supabase.from("notification_logs").insert({`
28. L258: `return new Response(`
29. L266: `console.error("Error in send-contact-email:", error);`
30. L267: `return new Response(`

### Tables read

None.

### Tables written

| Table | Operation |
| --- | --- |
| `notification_logs` | INSERT |

**RPCs called:** none

### External API calls

- endpoint literal: `https://c4r.ca/locations`
- endpoint literal: `https://c4r.ca/search`
- endpoint literal: `https://deno.land/std@0.190.0/http/server.ts`
- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`
- endpoint literal: `https://esm.sh/resend@2.0.0`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

- `src/pages/Contact.tsx:78:      const { error } = await supabase.functions.invoke("send-contact-email", {`
- `src/pages/Subscription.tsx:215:      const { error } = await supabase.functions.invoke("send-contact-email", {`

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `send-payment-confirmation`

- **Path:** `supabase/functions/send-payment-confirmation/index.ts` (282 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
8: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
22: const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
178: "Authorization": `Bearer ${resendApiKey}`,
235: const authHeader = btoa(`${twilioSid}:${twilioToken}`);
240: "Authorization": `Basic ${authHeader}`,
```

### CORS

```ts
6: const corsHeaders = {
7: "Access-Control-Allow-Origin": "*",
8: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
16: if (req.method === "OPTIONS") {
17: return new Response(null, { headers: corsHeaders });
33: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
53: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
272: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
278: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
17: return new Response(null, { headers: corsHeaders });
28: const { bookingId }: PaymentConfirmationParams = await req.json();
31: return new Response(
33: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
51: return new Response(
53: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
189: const emailData = await emailRes.json();
250: const smsData = await smsRes.json();
270: return new Response(
272: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
276: return new Response(
278: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 400, 404, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L16: `if (req.method === "OPTIONS") {`
2. L17: `return new Response(null, { headers: corsHeaders });`
3. L20: `try {`
4. L30: `if (!bookingId) {`
5. L31: `return new Response(`
6. L41: `.from("bookings")`
7. L50: `if (bookingError || !booking) {`
8. L51: `return new Response(`
9. L59: `.from("payments")`
10. L74: `.from("profiles")`
11. L84: `if (!userEmail || !userPhone) {`
12. L86: `if (authUser?.user) {`
13. L105: `if (resendApiKey && userEmail) {`
14. L110: `.from("notification_logs")`
15. L115: `if (!existing) {`
16. L175: `const emailRes = await fetch("https://api.resend.com/emails", {`
17. L191: `await supabase.from("notification_logs").insert({`
18. L209: `if (userPhone && !smsTo) {`
19. L210: `console.error(`[send-payment-confirmation] invalid_phone: ${userPhone}`);`
20. L211: `await supabase.from("notification_logs").insert({`
21. L222: `if (twilioSid && twilioToken && twilioFrom && smsTo) {`
22. L226: `.from("notification_logs")`
23. L231: `if (!existing) {`
24. L237: `const smsRes = await fetch(twilioUrl, {`
25. L252: `await supabase.from("notification_logs").insert({`
26. L270: `return new Response(`
27. L275: `console.error("Error in send-payment-confirmation:", error);`
28. L276: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `
        id, booking_code, total_amount, deposit_amount, start_at, end_at, user_id,
        locations!bookings_location_id_fkey (name, address, phone),
        vehicles!inner (make, model, year)
      ` |
| `payments` | `amount, payment_type, status` |
| `profiles` | `email, phone, full_name` |
| `notification_logs` | `id` |
| `notification_logs` | `id` |

### Tables written

| Table | Operation |
| --- | --- |
| `notification_logs` | INSERT |
| `notification_logs` | INSERT |
| `notification_logs` | INSERT |

**RPCs called:** none

### External API calls

- L175: `const emailRes = await fetch("https://api.resend.com/emails", {`
- L237: `const smsRes = await fetch(twilioUrl, {`
- endpoint literal: `https://api.resend.com/emails`
- endpoint literal: `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
- endpoint literal: `https://deno.land/std@0.190.0/http/server.ts`
- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: none

### Failure behaviour / atomicity

**Atomic: NO.** 3 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `send-support-sms`

- **Path:** `supabase/functions/send-support-sms/index.ts` (226 lines)
- **Purpose (from file header):** Support ticket SMS to the CUSTOMER.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
20: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
49: const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
189: const authHeader = btoa(`${twilioSid}:${twilioToken}`);
194: Authorization: `Basic ${authHeader}`,
```

### CORS

```ts
18: const corsHeaders = {
19: "Access-Control-Allow-Origin": "*",
20: "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
39: headers: { ...corsHeaders, "Content-Type": "application/json" },
44: if (req.method === "OPTIONS") {
45: return new Response(null, { headers: corsHeaders });
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `ticketId` | JSON body | yes |
| `kind` | JSON body | UNKNOWN: no explicit guard |
| `ticketNumber` | JSON body | optional (defaulted) |
| `subject` | JSON body | optional (defaulted) |
| `guestPhone` | JSON body | optional (defaulted) |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
36: function json(body: unknown, status = 200) {
37: return new Response(JSON.stringify(body), {
45: return new Response(null, { headers: corsHeaders });
56: const body: SendSupportSmsRequest = await req.json();
61: return json({ error: "ticketId is required" }, 400);
87: return json({ error: "Ticket lookup failed", details: detail }, 404);
102: return json({ success: true, duplicate: true });
155: return json({ success: false, skipped: true, reason: "SMS service not configured" });
169: return json({ success: false, skipped: true, reason: "No usable phone number on file" });
200: const twilioResult = await twilioResponse.json();
215: return json({ error: "Failed to send SMS", details: twilioResult }, 500);
219: return json({ success: true, messageId: twilioResult.sid });
223: return json({ error: detail }, 500);
```

**Status codes returned:** 200

### Logic, in source order (numbered; every guard, early return and DB call)

1. L37: `return new Response(JSON.stringify(body), {`
2. L44: `if (req.method === "OPTIONS") {`
3. L45: `return new Response(null, { headers: corsHeaders });`
4. L55: `try {`
5. L60: `if (!ticketId) {`
6. L61: `return json({ error: "ticketId is required" }, 400);`
7. L70: `.from("support_tickets_v2")`
8. L77: `if (ticketError || !ticket) {`
9. L79: `console.error("[send-support-sms] ticket lookup failed:", detail);`
10. L87: `return json({ error: "Ticket lookup failed", details: detail }, 404);`
11. L95: `.from("notification_logs")`
12. L100: `if (existing) {`
13. L102: `return json({ success: true, duplicate: true });`
14. L115: `if (ticket.booking_id) {`
15. L117: `.from("bookings")`
16. L135: `if (booking?.location_id) {`
17. L137: `.from("locations")`
18. L141: `if (loc?.phone) branchPhone = loc.phone;`
19. L144: `if (!twilioSid || !twilioToken || !twilioFrom) {`
20. L145: `console.warn("[send-support-sms] Twilio not configured");`
21. L155: `return json({ success: false, skipped: true, reason: "SMS service not configured" });`
22. L158: `if (!toPhone) {`
23. L159: `console.warn(`[send-support-sms] no usable phone for ticket ${ticketNumber}`);`
24. L169: `return json({ success: false, skipped: true, reason: "No usable phone number on file" });`
25. L191: `const twilioResponse = await fetch(twilioUrl, {`
26. L213: `if (!twilioResponse.ok) {`
27. L214: `console.error("[send-support-sms] Twilio error:", twilioResult);`
28. L215: `return json({ error: "Failed to send SMS", details: twilioResult }, 500);`
29. L219: `return json({ success: true, messageId: twilioResult.sid });`
30. L222: `console.error("[send-support-sms] unexpected failure:", detail);`
31. L223: `return json({ error: detail }, 500);`

### Tables read

| Table | Selected columns |
| --- | --- |
| `notification_logs` | `id` |
| `bookings` | `id, user_id, customer_id, pickup_contact_name, pickup_contact_phone, location_id` |
| `locations` | `phone` |

### Tables written

None.

**RPCs called:** none

### External API calls

- L191: `const twilioResponse = await fetch(twilioUrl, {`
- endpoint literal: `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
- endpoint literal: `https://c2crental.ca`
- endpoint literal: `https://deno.land/std@0.190.0/http/server.ts`
- endpoint literal: `https://esm.sh/@supabase/supabase-js@2`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

- `src/hooks/use-support-v2.ts:548:            await supabase.functions.invoke("send-support-sms", {`

### Failure behaviour / atomicity

**Atomic: NO.** 0 separate write statement(s); makes external HTTP call(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `update-booking-customer`

- **Path:** `supabase/functions/update-booking-customer/index.ts` (203 lines)
- **Purpose (from file header):** update-booking-customer
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
5: * Updates the `profiles` table via service_role, with audit logging.
9: getUserOrThrow,
10: requireRoleOrThrow,
11: getAdminClient,
16: import { isStaffAccount, STAFF_ACCOUNT_WRITE_ERROR } from "../_shared/staff-account-guard.ts";
38: const { userId } = await getUserOrThrow(req, corsHeaders);
39: await requireRoleOrThrow(userId, ["super_admin", "manager", "admin", "staff", "finance", "support"], corsHeaders);
70: const admin = getAdminClient();
150: if (await isStaffAccount(admin, profileUserId)) {
```

### CORS

```ts
7: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
30: const corsHeaders = getCorsHeaders(req);
32: if (req.method === "OPTIONS") {
33: return handleCorsPreflightRequest(req);
38: const { userId } = await getUserOrThrow(req, corsHeaders);
39: await requireRoleOrThrow(userId, ["super_admin", "manager", "admin", "staff", "finance", "support"], corsHeaders);
48: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
58: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
66: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
82: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
143: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
154: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `customer` | JSON body | yes |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
42: const body: UpdateCustomerBody = await req.json();
46: return new Response(
48: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
56: return new Response(
58: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
64: return new Response(
66: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
80: return new Response(
82: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
141: return new Response(
143: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
152: return new Response(
154: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
167: return new Response(
169: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
190: return new Response(
192: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
197: return new Response(
199: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

**Status codes returned:** 200, 400, 404, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L29: `Deno.serve(async (req) => {`
2. L32: `if (req.method === "OPTIONS") {`
3. L33: `return handleCorsPreflightRequest(req);`
4. L36: `try {`
5. L45: `if (!bookingId || typeof bookingId !== "string") {`
6. L46: `return new Response(`
7. L55: `if (!customer || typeof customer !== "object") {`
8. L56: `return new Response(`
9. L63: `if (customer.email && typeof customer.email === "string" && !customer.email.includes("@")) {`
10. L64: `return new Response(`
11. L74: `.from("bookings")`
12. L79: `if (bookingError || !booking) {`
13. L80: `return new Response(`
14. L90: `.from("profiles")`
15. L99: `if (customer.full_name !== undefined) {`
16. L101: `if (newVal !== (oldProfile?.full_name ?? null)) {`
17. L107: `if (customer.email !== undefined) {`
18. L109: `if (newVal !== (oldProfile?.email ?? null)) {`
19. L115: `if (customer.phone !== undefined) {`
20. L117: `if (newVal !== (oldProfile?.phone ?? null)) {`
21. L123: `if (customer.address !== undefined) {`
22. L125: `if (newVal !== (oldProfile?.address ?? null)) {`
23. L131: `if (customer.driver_license_number !== undefined) {`
24. L133: `if (newVal !== (oldProfile?.driver_license_number ?? null)) {`
25. L140: `if (Object.keys(updatePayload).length === 0) {`
26. L141: `return new Response(`
27. L150: `if (await isStaffAccount(admin, profileUserId)) {`
28. L151: `console.error(`Blocked customer write onto staff account ${profileUserId}`);`
29. L152: `return new Response(`
30. L161: `.from("profiles")`
31. L165: `if (updateError) {`
32. L166: `console.error("Profile update error:", updateError);`
33. L167: `return new Response(`
34. L174: `await admin.from("audit_logs").insert({`
35. L185: `.from("profiles")`
36. L190: `return new Response(`
37. L195: `if (err instanceof AuthError) return authErrorResponse(err, corsHeaders);`
38. L196: `console.error("update-booking-customer error:", err);`
39. L197: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, user_id` |
| `profiles` | `full_name, email, phone, address, driver_license_number` |
| `profiles` | `full_name, email, phone, address, driver_license_number` |

### Tables written

| Table | Operation |
| --- | --- |
| `profiles` | UPDATE |
| `audit_logs` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: `src/components/admin/BookingCustomerCard.tsx:76`

### Failure behaviour / atomicity

**Atomic: NO.** 2 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `update-booking-status`

- **Path:** `supabase/functions/update-booking-status/index.ts` (477 lines)
- **Purpose (from file header):** update-booking-status — Server-side booking status transitions
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
4: * Bypasses block_sensitive_booking_updates trigger using service_role.
13: getUserOrThrow,
14: requireRoleOrThrow,
15: getAdminClient,
44: const user = await getUserOrThrow(req, corsHeaders);
45: await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin", "staff"], corsHeaders);
59: const admin = getAdminClient();
```

### CORS

```ts
9: getCorsHeaders,
10: handleCorsPreflightRequest,
11: } from "../_shared/cors.ts";
37: const corsHeaders = getCorsHeaders(req);
39: if (req.method === "OPTIONS") {
40: return new Response(null, { status: 204, headers: corsHeaders });
44: const user = await getUserOrThrow(req, corsHeaders);
45: await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin", "staff"], corsHeaders);
52: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
71: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
108: { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
164: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `newStatus` | JSON body | UNKNOWN: no explicit guard |
| `notes` | JSON body | UNKNOWN: no explicit guard |
| `bypassReason` | JSON body | UNKNOWN: no explicit guard |
| `reopen` | JSON body | UNKNOWN: no explicit guard |
| `skipNotifications` | JSON body | optional (defaulted) |
| `activationSource` | JSON body | optional (defaulted) |
| `activationReason` | JSON body | UNKNOWN: no explicit guard |
| `incompleteAtActivation` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
40: return new Response(null, { status: 204, headers: corsHeaders });
47: const { bookingId, newStatus, notes, bypassReason, reopen, skipNotifications, activationSource, activationReason, incompleteAtActivation } = await req.json();
50: return new Response(
52: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
69: return new Response(
71: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
106: return new Response(
108: { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
162: return new Response(
164: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
272: return new Response(
274: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
281: return new Response(
283: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 204, 400, 404, 422, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L33: `return STATE_ORDER.indexOf(current) >= STATE_ORDER.indexOf(required);`
2. L36: `Deno.serve(async (req) => {`
3. L39: `if (req.method === "OPTIONS") {`
4. L40: `return new Response(null, { status: 204, headers: corsHeaders });`
5. L43: `try {`
6. L49: `if (!bookingId || !newStatus) {`
7. L50: `return new Response(`
8. L63: `.from("bookings")`
9. L68: `if (fetchErr || !booking) {`
10. L69: `return new Response(`
11. L79: `if (currentStatus === "active" && newStatus === "completed") {`
12. L80: `if (!isStateAtLeast(returnState, "closeout_done")) {`
13. L82: `if (bypassReason && typeof bypassReason === "string" && bypassReason.trim().length >= 50) {`
14. L84: `await admin.from("audit_logs").insert({`
15. L98: `await admin.from("admin_alerts").insert({`
16. L106: `return new Response(`
17. L117: `if (newStatus === "completed" || newStatus === "cancelled") {`
18. L121: `if (newStatus === "active" && !reopen) {`
19. L127: `if (activationReason) {`
20. L132: `if (reopen && newStatus === "active") {`
21. L148: `if (notes) {`
22. L154: `.from("bookings")`
23. L160: `if (updateErr) {`
24. L161: `console.error("Failed to update booking status:", updateErr);`
25. L162: `return new Response(`
26. L170: `if (activationSource) auditNewData.activation_source = activationSource;`
27. L171: `if (activationReason) auditNewData.activation_reason = activationReason;`
28. L172: `if (incompleteAtActivation && Array.isArray(incompleteAtActivation) && incompleteAtActivation.length > 0) {`
29. L175: `await admin.from("audit_logs").insert({`
30. L185: `if (newStatus === "confirmed") {`
31. L186: `try {`
32. L187: `await admin.from("analytics_events").insert({`
33. L200: `console.error("Failed to insert booking_completed analytics event:", e);`
34. L205: `if (booking.assigned_unit_id) {`
35. L206: `if (newStatus === "active") {`
36. L207: `await admin.from("vehicle_units").update({ status: "on_rent" }).eq("id", booking.assigned_unit_id);`
37. L209: `await admin.from("vehicle_units").update({ status: "available" }).eq("id", booking.assigned_unit_id);`
38. L212: `console.warn(`[update-booking-status] Booking ${bookingId} (${booking.booking_code}) activated without assigned_unit_id — unit status not updated`);`
39. L222: `if (["active", "completed", "cancelled"].includes(newStatus)) {`
40. L230: `await admin.from("admin_alerts").insert({`
41. L242: `if (newStatus === "active") notificationStage = "rental_activated";`
42. L243: `else if (newStatus === "completed") notificationStage = "return_completed";`
43. L244: `else if (newStatus === "cancelled") notificationStage = "booking_cancelled";`
44. L246: `if (notificationStage && !shouldSkipNotifications) {`
45. L247: `try {`
46. L250: `? await admin.from("vehicle_categories").select("name").eq("id", booking.vehicle_id).maybeSingle()`
47. L252: `const { data: profile } = await admin.from("profiles").select("full_name").eq("id", booking.user_id).maybeSingle();`
48. L254: `await admin.functions.invoke("send-booking-notification", {`
49. L258: `await admin.functions.invoke("notify-admin", {`
50. L268: `console.error("Failed to send status notification:", e);`
51. L272: `return new Response(`
52. L277: `if (err instanceof AuthError) {`
53. L278: `return authErrorResponse(err, corsHeaders);`
54. L280: `console.error("update-booking-status error:", err);`
55. L281: `return new Response(`
56. L291: `try {`
57. L293: `.from("bookings")`
58. L298: `if (!bookingDeposit) return;`
59. L307: `if (!isAuthorized) return;`
60. L311: `if (newStatus === "completed") {`
61. L313: `.from("damage_reports")`
62. L321: `if (!hasOpenDamages) {`
63. L323: `const { error: releaseErr } = await admin.functions.invoke("wl-cancel-auth", {`
64. L326: `if (releaseErr) {`
65. L327: `console.error("Failed to release deposit hold:", releaseErr);`
66. L329: `await admin.from("audit_logs").insert({`
67. L343: `console.error("Deposit handling error:", e);`
68. L358: `await admin.from("admin_alerts").insert({`
69. L370: `try {`
70. L371: `if (newStatus === "completed") {`
71. L373: `.from("bookings")`
72. L377: `if (!fullBooking) return;`
73. L380: `.from("booking_add_ons")`
74. L386: `.from("points_settings")`
75. L397: `if (pointsToEarn > 0) {`
76. L399: `if (settings.expiration.enabled) {`
77. L405: `await admin.rpc("update_points_balance", {`
78. L417: `.from("points_ledger")`
79. L423: `if (earnEntry) {`
80. L425: `.from("points_ledger")`
81. L431: `if (!existingReverse) {`
82. L432: `await admin.rpc("update_points_balance", {`
83. L443: `console.error("Points handling error:", e);`
84. L456: `return {`
85. L473: `if (settings.earning.excludeTax) base -= taxAmount;`
86. L474: `if (settings.earning.excludeAddons) base -= addOnsTotal;`
87. L475: `return Math.max(0, Math.floor(base * settings.earning.pointsPerDollar));`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `booking_code, user_id, vehicle_id, assigned_unit_id, status, return_state` |
| `vehicle_categories` | `name` |
| `profiles` | `full_name` |
| `bookings` | `deposit_amount, deposit_status, wl_deposit_auth_status, wl_deposit_transaction_id` |
| `damage_reports` | `id, status, estimated_cost` |
| `bookings` | `total_amount, tax_amount, user_id` |
| `booking_add_ons` | `price` |
| `points_settings` | `setting_key, setting_value` |
| `points_ledger` | `points, user_id` |
| `points_ledger` | `id` |

### Tables written

| Table | Operation |
| --- | --- |
| `audit_logs` | INSERT |
| `admin_alerts` | INSERT |
| `bookings` | UPDATE |
| `audit_logs` | INSERT |
| `analytics_events` | INSERT |
| `vehicle_units` | UPDATE |
| `vehicle_units` | UPDATE |
| `admin_alerts` | INSERT |
| `audit_logs` | INSERT |
| `admin_alerts` | INSERT |

**RPCs called:** `update_points_balance`

### External API calls

None.

**Other edge functions invoked:** `notify-admin`, `send-booking-notification`, `wl-cancel-auth`

### Frontend call sites

- `src/hooks/use-bookings.ts:411:      const { data, error } = await supabase.functions.invoke("update-booking-status", {`
- `src/features/delivery/pages/Detail.tsx:579:      const { data, error } = await supabase.functions.invoke("update-booking-status", {`

### Failure behaviour / atomicity

**Atomic: NO.** 10 separate write statement(s); invokes 3 other function(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `validate-promo-code`

- **Path:** `supabase/functions/validate-promo-code/index.ts` (63 lines)
- **Purpose (from file header):** validate-promo-code
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

No auth-related identifier found in the file. Access is governed solely by `verify_jwt = true (default)`.

### CORS

```ts
15: getCorsHeaders,
16: handleCorsPreflightRequest,
18: } from "../_shared/cors.ts";
23: const corsHeaders = getCorsHeaders(req);
25: if (req.method === "OPTIONS") {
26: return handleCorsPreflightRequest(req);
32: headers: { ...corsHeaders, "Content-Type": "application/json" },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `code` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
30: new Response(JSON.stringify(body), {
39: return json({ valid: false, message: "Too many attempts. Please try again later." }, 429);
42: const body = await req.json().catch(() => ({}));
45: return json({ valid: false, message: "Please enter a code." });
50: return json({ valid: false, message: "This code isn't valid." });
53: return json({
60: return json({ valid: false, message: "Could not check that code right now." }, 500);
```

**Status codes returned:** 200

### Logic, in source order (numbered; every guard, early return and DB call)

1. L22: `Deno.serve(async (req) => {`
2. L25: `if (req.method === "OPTIONS") {`
3. L26: `return handleCorsPreflightRequest(req);`
4. L35: `try {`
5. L38: `if (!rl.allowed) {`
6. L39: `return json({ valid: false, message: "Too many attempts. Please try again later." }, 429);`
7. L44: `if (!rawCode.trim() || rawCode.length > 64) {`
8. L45: `return json({ valid: false, message: "Please enter a code." });`
9. L49: `if (!resolved) {`
10. L50: `return json({ valid: false, message: "This code isn't valid." });`
11. L53: `return json({`
12. L59: `console.error("[validate-promo-code] error", err);`
13. L60: `return json({ valid: false, message: "Could not check that code right now." }, 500);`

### Tables read

None.

### Tables written

None.

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/pages/NewCheckout.tsx:262:      const { data, error } = await supabase.functions.invoke("validate-promo-code", {`

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `verify-booking-otp`

- **Path:** `supabase/functions/verify-booking-otp/index.ts` (93 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
8: import { AuthError, authErrorResponse, getAdminClient } from "../_shared/auth.ts";
62: // P0 FIX: Use admin client's functions.invoke instead of raw fetch with service_role Bearer
63: const supabaseAdmin = getAdminClient();
```

### CORS

```ts
2: getCorsHeaders,
3: handleCorsPreflightRequest,
7: } from "../_shared/cors.ts";
12: const corsHeaders = getCorsHeaders(req);
14: if (req.method === "OPTIONS") {
15: return handleCorsPreflightRequest(req);
30: return rateLimitResponse(ipRateLimit.resetAt, corsHeaders);
38: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
53: { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
81: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
85: if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
89: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `otp` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
33: const { bookingId, otp } = await req.json();
36: return new Response(
38: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
51: return new Response(
53: { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
74: return new Response(
81: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
87: return new Response(
89: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
```

**Status codes returned:** 200, 400, 429, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L11: `Deno.serve(async (req: Request): Promise<Response> => {`
2. L14: `if (req.method === "OPTIONS") {`
3. L15: `return handleCorsPreflightRequest(req);`
4. L18: `try {`
5. L28: `if (!ipRateLimit.allowed) {`
6. L30: `return rateLimitResponse(ipRateLimit.resetAt, corsHeaders);`
7. L35: `if (!bookingId || !otp) {`
8. L36: `return new Response(`
9. L49: `if (!bookingRateLimit.allowed) {`
10. L51: `return new Response(`
11. L62: `// P0 FIX: Use admin client's functions.invoke instead of raw fetch with service_role Bearer`
12. L66: `supabaseAdmin.functions.invoke("send-booking-email", {`
13. L69: `supabaseAdmin.functions.invoke("send-booking-sms", {`
14. L72: `]).catch(console.error);`
15. L74: `return new Response(`
16. L85: `if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);`
17. L86: `console.error("[verify-booking-otp] Unexpected error:", error);`
18. L87: `return new Response(`

### Tables read

None.

### Tables written

None.

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** `send-booking-email`, `send-booking-sms`

### Frontend call sites

- `src/components/checkout/OtpVerification.tsx:101:      const response = await supabase.functions.invoke("verify-booking-otp", {`

### Failure behaviour / atomicity

**Atomic: NO.** 0 separate write statement(s); invokes 2 other function(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `void-booking`

- **Path:** `supabase/functions/void-booking/index.ts` (150 lines)
- **Purpose (from file header):** void-booking - Admin-only secure booking void operation
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
9: getUserOrThrow,
10: requireRoleOrThrow,
11: getAdminClient,
25: const { userId } = await getUserOrThrow(req, corsHeaders);
26: await requireRoleOrThrow(userId, ["super_admin", "manager", "admin"], corsHeaders);
28: const supabase = getAdminClient();
```

### CORS

```ts
7: import { getCorsHeaders } from "../_shared/cors.ts";
17: const corsHeaders = getCorsHeaders(req);
19: if (req.method === "OPTIONS") {
20: return new Response(null, { headers: corsHeaders });
25: const { userId } = await getUserOrThrow(req, corsHeaders);
26: await requireRoleOrThrow(userId, ["super_admin", "manager", "admin"], corsHeaders);
35: headers: { ...corsHeaders, "Content-Type": "application/json" },
52: headers: { ...corsHeaders, "Content-Type": "application/json" },
67: headers: { ...corsHeaders, "Content-Type": "application/json" },
133: headers: { ...corsHeaders, "Content-Type": "application/json" },
138: return authErrorResponse(err, corsHeaders);
146: headers: { ...corsHeaders, "Content-Type": "application/json" },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `reason` | JSON body | UNKNOWN: no explicit guard |
| `refundAmount` | JSON body | optional (defaulted) |
| `panelSource` | JSON body | optional (defaulted) |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
20: return new Response(null, { headers: corsHeaders });
30: const { bookingId, reason, refundAmount, panelSource } = await req.json();
33: return new Response(JSON.stringify({ error: "Missing bookingId or reason" }), {
34: status: 400,
50: return new Response(JSON.stringify({ error: "Booking not found" }), {
51: status: 404,
59: return new Response(
66: status: 409,
132: return new Response(JSON.stringify({ success: true }), {
144: return new Response(JSON.stringify({ error: message }), {
145: status: 500,
```

**Status codes returned:** 400, 404, 409, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L16: `Deno.serve(async (req) => {`
2. L19: `if (req.method === "OPTIONS") {`
3. L20: `return new Response(null, { headers: corsHeaders });`
4. L23: `try {`
5. L32: `if (!bookingId || !reason) {`
6. L33: `return new Response(JSON.stringify({ error: "Missing bookingId or reason" }), {`
7. L44: `.from("bookings")`
8. L49: `if (bookingError || !booking) {`
9. L50: `return new Response(JSON.stringify({ error: "Booking not found" }), {`
10. L58: `if (terminalStatuses.includes(booking.status)) {`
11. L59: `return new Response(`
12. L74: `.from("bookings")`
13. L82: `if (updateError) throw updateError;`
14. L85: `if (booking.assigned_unit_id) {`
15. L87: `.from("vehicle_units")`
16. L93: `await supabase.from("audit_logs").insert([{`
17. L109: `await supabase.from("admin_alerts").insert([{`
18. L119: `try {`
19. L120: `const { error: notifyErr } = await supabase.functions.invoke("send-booking-notification", {`
20. L123: `if (notifyErr) {`
21. L124: `console.error(`[void-booking] cancellation notice failed for ${booking.booking_code}`, notifyErr);`
22. L127: `console.error(`[void-booking] cancellation notice threw for ${booking.booking_code}`, err);`
23. L132: `return new Response(JSON.stringify({ success: true }), {`
24. L137: `try {`
25. L138: `return authErrorResponse(err, corsHeaders);`
26. L142: `console.error("Void booking error:", err);`
27. L144: `return new Response(JSON.stringify({ error: message }), {`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `*` |

### Tables written

| Table | Operation |
| --- | --- |
| `bookings` | UPDATE |
| `vehicle_units` | UPDATE |
| `audit_logs` | INSERT |
| `admin_alerts` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** `send-booking-notification`

### Frontend call sites

- `src/domain/bookings/mutations.ts:116:  const { error } = await supabase.functions.invoke("void-booking", {`
- `src/components/admin/CancelBookingDialog.tsx:72:      const { data, error } = await supabase.functions.invoke("void-booking", {`

### Failure behaviour / atomicity

**Atomic: NO.** 4 separate write statement(s); invokes 1 other function(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `wl-authorize`

- **Path:** `supabase/functions/wl-authorize/index.ts` (179 lines)
- **Purpose (from file header):** wl-authorize — Pre-authorization hold via Worldline/Bambora (complete: false)
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
12: import { validateAuth, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
13: import { requireBookingOwnerOrToken } from "../_shared/booking-core.ts";
35: async function persistDepositAuthorization(
36: supabase: ReturnType<typeof getAdminClient>,
87: const auth = await validateAuth(req);
89: const booking = await requireBookingOwnerOrToken(bookingId, authUserId, accessToken);
94: const supabase = getAdminClient();
148: await persistDepositAuthorization(
```

### CORS

```ts
11: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
72: const corsHeaders = getCorsHeaders(req);
73: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
83: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
119: { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
144: { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
168: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
171: if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
175: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `accessToken` | JSON body | UNKNOWN: no explicit guard |
| `token` | JSON body | UNKNOWN: no explicit guard |
| `name` | JSON body | optional (defaulted) |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
78: const { bookingId, accessToken, token, name } = await req.json();
81: return new Response(
83: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
117: return new Response(
119: { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
135: return new Response(
144: { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
160: return new Response(
168: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
173: return new Response(
175: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

**Status codes returned:** 200, 400, 402, 500, 502

### Logic, in source order (numbered; every guard, early return and DB call)

1. L31: `if (!mm || !yy || mm.length !== 2 || yy.length !== 2) return null;`
2. L32: `return `${mm}/${yy}`;`
3. L44: `const bookingUpdate = await supabase.from("bookings").update({`
4. L56: `if (bookingUpdate.error) throw bookingUpdate.error;`
5. L58: `const paymentInsert = await supabase.from("payments").insert({`
6. L68: `if (paymentInsert.error) throw paymentInsert.error;`
7. L71: `Deno.serve(async (req) => {`
8. L73: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
9. L77: `try {`
10. L80: `if (!bookingId || !token) {`
11. L81: `return new Response(`
12. L92: `if (authUserId) log.setUser(authUserId);`
13. L115: `if (!res.ok || !res.data.approved) {`
14. L117: `return new Response(`
15. L130: `if (txnType && txnType !== "PA") {`
16. L135: `return new Response(`
17. L160: `return new Response(`
18. L171: `if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);`
19. L173: `return new Response(`

### Tables read

None.

### Tables written

| Table | Operation |
| --- | --- |
| `bookings` | UPDATE |
| `payments` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/pages/NewCheckout.tsx:1052:                              const { data: authData, error: authError } = await supabase.functions.invoke("wl-authorize", { body: authBody });`
- `src/components/booking/PayNowCard.tsx:112:                  const { data: authData, error: authError } = await supabase.functions.invoke("wl-authorize", {`
- `src/components/payments/OpsPaymentAndDeposit.tsx:121:      const { data: authData, error: authError } = await supabase.functions.invoke("wl-authorize", {`

### Failure behaviour / atomicity

**Atomic: NO.** 2 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `wl-cancel-auth`

- **Path:** `supabase/functions/wl-cancel-auth/index.ts` (146 lines)
- **Purpose (from file header):** wl-cancel-auth — Void/release a pre-authorization deposit hold
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
9: import { getUserOrThrow, requireRoleOrThrow, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
21: const user = await getUserOrThrow(req, corsHeaders);
22: await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin", "staff", "finance"], corsHeaders);
39: const supabase = getAdminClient();
```

### CORS

```ts
8: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
15: const corsHeaders = getCorsHeaders(req);
16: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
21: const user = await getUserOrThrow(req, corsHeaders);
22: await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin", "staff", "finance"], corsHeaders);
29: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
51: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
59: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
69: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
78: { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
101: { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
135: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
24: const { bookingId } = await req.json();
27: return new Response(
29: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
49: return new Response(
51: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
57: return new Response(
59: { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
67: return new Response(
69: { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
76: return new Response(
78: { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
99: return new Response(
101: { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
133: return new Response(
135: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
140: return new Response(
142: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

**Status codes returned:** 200, 400, 404, 409, 422, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L14: `Deno.serve(async (req) => {`
2. L16: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
3. L20: `try {`
4. L26: `if (!bookingId) {`
5. L27: `return new Response(`
6. L42: `.from("bookings")`
7. L47: `if (bErr) {`
8. L49: `return new Response(`
9. L56: `if (booking.deposit_status === "released" || booking.deposit_status === "voided") {`
10. L57: `return new Response(`
11. L66: `if (!depositTxnId) {`
12. L67: `return new Response(`
13. L74: `if (voidAmount <= 0) {`
14. L76: `return new Response(`
15. L88: `if (!res.ok) {`
16. L96: `if (!isHoldGone) {`
17. L99: `return new Response(`
18. L110: `await supabase.from("bookings").update({`
19. L117: `await supabase.from("payments")`
20. L123: `await supabase.from("deposit_ledger").insert({`
21. L133: `return new Response(`
22. L138: `if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);`
23. L140: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `wl_deposit_transaction_id, wl_transaction_id, deposit_amount, deposit_status` |

### Tables written

| Table | Operation |
| --- | --- |
| `bookings` | UPDATE |
| `payments` | UPDATE |
| `deposit_ledger` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/lib/deposit-automation.ts:87:  const { data, error } = await supabase.functions.invoke("wl-cancel-auth", {`
- `src/components/admin/return-ops/steps/StepReturnDeposit.tsx:123:      const { data, error } = await supabase.functions.invoke("wl-cancel-auth", {`
- `src/components/admin/deposit/AccountCloseoutPanel.tsx:98:      const { data, error } = await supabase.functions.invoke("wl-cancel-auth", {`
- `src/components/admin/ops/steps/StepPayment.tsx:101:      const { data, error } = await supabase.functions.invoke("wl-cancel-auth", {`

### Failure behaviour / atomicity

**Atomic: NO.** 3 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `wl-capture`

- **Path:** `supabase/functions/wl-capture/index.ts` (334 lines)
- **Purpose (from file header):** wl-capture — Capture a previously authorized Bambora transaction.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
12: import { getUserOrThrow, requireRoleOrThrow, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
51: const user = await getUserOrThrow(req, corsHeaders);
58: await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin"], corsHeaders);
60: await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin", "staff", "finance"], corsHeaders);
73: const supabase = getAdminClient();
```

### CORS

```ts
11: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
17: function jsonResponse(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) {
20: { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
45: const corsHeaders = getCorsHeaders(req);
46: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
51: const user = await getUserOrThrow(req, corsHeaders);
58: await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin"], corsHeaders);
60: await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin", "staff", "finance"], corsHeaders);
64: return jsonResponse({ error: "bookingId is required" }, 400, corsHeaders);
82: return jsonResponse({ error: "Booking not found" }, 404, corsHeaders);
89: return jsonResponse({ error: "No rental transaction found for this booking" }, 404, corsHeaders);
93: return jsonResponse({ error: "Rental already captured" }, 409, corsHeaders);
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `amount` | JSON body | UNKNOWN: no explicit guard |
| `kind` | JSON body | UNKNOWN: no explicit guard |
| `manualOverride` | JSON body | UNKNOWN: no explicit guard |
| `reason` | JSON body | optional (defaulted) |
| `terminalReference` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
18: return new Response(
53: const { bookingId, amount: captureAmount, kind, manualOverride, reason, terminalReference } = await req.json();
```

**Status codes returned:** 

### Logic, in source order (numbered; every guard, early return and DB call)

1. L18: `return new Response(`
2. L25: `if (!data || typeof data !== "object" || !("code" in data)) return undefined;`
3. L27: `return typeof code === "number" ? code : undefined;`
4. L31: `if (!data || typeof data !== "object") return undefined;`
5. L33: `return typeof message === "string" ? message : undefined;`
6. L37: `return code === 302 || code === 319 || code === 16 || status === 404;`
7. L41: `return status === 408 || status === 429 || (typeof status === "number" && status >= 500);`
8. L44: `Deno.serve(async (req) => {`
9. L46: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
10. L50: `try {`
11. L57: `if (isManual) {`
12. L63: `if (!bookingId) {`
13. L64: `return jsonResponse({ error: "bookingId is required" }, 400, corsHeaders);`
14. L76: `.from("bookings")`
15. L81: `if (bErr || !booking) {`
16. L82: `return jsonResponse({ error: "Booking not found" }, 404, corsHeaders);`
17. L86: `if (captureKind === "rental") {`
18. L88: `if (!rentalTxnId) {`
19. L89: `return jsonResponse({ error: "No rental transaction found for this booking" }, 404, corsHeaders);`
20. L92: `if (booking.wl_auth_status === "completed") {`
21. L93: `return jsonResponse({ error: "Rental already captured" }, 409, corsHeaders);`
22. L97: `if (isManual) {`
23. L100: `await supabase.from("bookings").update({`
24. L104: `await supabase.from("payments")`
25. L109: `await supabase.from("audit_logs").insert({`
26. L124: `return jsonResponse({ success: true, kind: "rental", capturedAmount: finalAmountManual, manualOverride: true }, 200, corsHeaders);`
27. L133: `if (!res.ok) {`
28. L136: `return jsonResponse({`
29. L146: `await supabase.from("bookings").update({`
30. L150: `await supabase.from("payments")`
31. L157: `return jsonResponse({ success: true, kind: "rental", capturedAmount: finalAmount }, 200, corsHeaders);`
32. L163: `if (!depositTxnId) {`
33. L164: `return jsonResponse({ error: "No deposit authorization found for this booking" }, 404, corsHeaders);`
34. L167: `if (booking.deposit_status === "captured") {`
35. L168: `return jsonResponse({ error: "Deposit already captured" }, 409, corsHeaders);`
36. L173: `if (!Number.isFinite(finalAmount) || finalAmount <= 0) {`
37. L175: `return jsonResponse({ error: "Invalid deposit amount — cannot capture hold" }, 422, corsHeaders);`
38. L179: `if (isManual) {`
39. L183: `if (!/^[A-Za-z0-9\-_]{3,50}$/.test(normalizedReference)) {`
40. L184: `return jsonResponse({ error: "A valid terminal reference / auth number is required" }, 400, corsHeaders);`
41. L187: `if (normalizedReason.length < 5) {`
42. L188: `return jsonResponse({ error: "A reason is required for manual deposit resolution" }, 400, corsHeaders);`
43. L194: `.from("payments")`
44. L200: `if (duplicatePayment) {`
45. L201: `return jsonResponse({ error: `Terminal reference already exists: ${terminalTxnId}` }, 409, corsHeaders);`
46. L204: `const { error: insertPaymentErr } = await supabase.from("payments").insert({`
47. L215: `if (insertPaymentErr) {`
48. L217: `return jsonResponse({ error: "Failed to record terminal deposit charge" }, 500, corsHeaders);`
49. L220: `await supabase.from("payments")`
50. L226: `const { error: bookingUpdateErr } = await supabase.from("bookings").update({`
51. L234: `if (bookingUpdateErr) {`
52. L236: `return jsonResponse({ error: "Terminal charge recorded but booking update failed" }, 500, corsHeaders);`
53. L240: `.from("payments")`
54. L245: `await supabase.from("deposit_ledger").insert({`
55. L254: `await supabase.from("audit_logs").insert({`
56. L270: `return jsonResponse({`
57. L283: `if (!res.ok) {`
58. L286: `return jsonResponse({`
59. L296: `await supabase.from("bookings").update({`
60. L304: `await supabase.from("payments")`
61. L310: `.from("payments")`
62. L316: `await supabase.from("deposit_ledger").insert({`
63. L327: `return jsonResponse({ success: true, kind: "deposit", capturedAmount: finalAmount }, 200, corsHeaders);`
64. L329: `if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);`
65. L331: `return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500, corsHeaders);`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, user_id, location_id, wl_deposit_transaction_id, wl_transaction_id, deposit_amount, deposit_status, wl_auth_status, total_amount, booking_code` |
| `payments` | `id` |
| `payments` | `id` |
| `payments` | `id` |

### Tables written

| Table | Operation |
| --- | --- |
| `bookings` | UPDATE |
| `payments` | UPDATE |
| `audit_logs` | INSERT |
| `bookings` | UPDATE |
| `payments` | UPDATE |
| `payments` | INSERT |
| `payments` | UPDATE |
| `bookings` | UPDATE |
| `deposit_ledger` | INSERT |
| `audit_logs` | INSERT |
| `bookings` | UPDATE |
| `payments` | UPDATE |
| `deposit_ledger` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/components/admin/return-ops/steps/StepReturnDeposit.tsx:95:      const { data, error } = await supabase.functions.invoke("wl-capture", {`
- `src/components/admin/return-ops/steps/StepReturnDeposit.tsx:168:      const { data, error } = await supabase.functions.invoke("wl-capture", {`
- `src/components/admin/deposit/AccountCloseoutPanel.tsx:79:      const { data, error } = await supabase.functions.invoke("wl-capture", {`
- `src/components/admin/ops/steps/StepPayment.tsx:81:      const { data, error } = await supabase.functions.invoke("wl-capture", {`
- `src/components/admin/ops/steps/StepPayment.tsx:121:      const { data, error } = await supabase.functions.invoke("wl-capture", {`
- `src/components/admin/ops/steps/StepPayment.tsx:156:      const { data, error } = await supabase.functions.invoke("wl-capture", {`

### Failure behaviour / atomicity

**Atomic: NO.** 13 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `wl-create-profile`

- **Path:** `supabase/functions/wl-create-profile/index.ts` (118 lines)
- **Purpose (from file header):** wl-create-profile — Create a Worldline/Bambora payment profile (tokenized card)
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
8: import { getUserOrThrow, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
25: const user = await getUserOrThrow(req, corsHeaders);
37: const supabase = getAdminClient();
```

### CORS

```ts
7: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
19: const corsHeaders = getCorsHeaders(req);
20: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
25: const user = await getUserOrThrow(req, corsHeaders);
33: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
58: { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
66: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
90: { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
107: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
110: if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
114: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `token` | JSON body | yes |
| `name` | JSON body | optional (defaulted) |
| `email` | JSON body | optional (defaulted) |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
28: const { token, name, email } = await req.json();
31: return new Response(
33: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
56: return new Response(
58: { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
64: return new Response(
66: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
88: return new Response(
90: { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
105: return new Response(
107: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
112: return new Response(
114: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

**Status codes returned:** 200, 400, 422, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L18: `Deno.serve(async (req) => {`
2. L20: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
3. L24: `try {`
4. L30: `if (!token) {`
5. L31: `return new Response(`
6. L41: `.from("payment_profiles")`
7. L47: `if (existingProfile?.worldline_customer_code) {`
8. L55: `if (!res.ok) {`
9. L56: `return new Response(`
10. L64: `return new Response(`
11. L72: `.from("profiles")`
12. L87: `if (!res.ok) {`
13. L88: `return new Response(`
14. L97: `await supabase.from("payment_profiles").insert({`
15. L105: `return new Response(`
16. L110: `if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);`
17. L112: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `payment_profiles` | `worldline_customer_code` |
| `profiles` | `email, full_name` |

### Tables written

| Table | Operation |
| --- | --- |
| `payment_profiles` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: `supabase/functions/wl-create-profile/index.ts:22`

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `wl-debug-config`

- **Path:** `supabase/functions/wl-debug-config/index.ts` (42 lines)
- **Purpose (from file header):** wl-debug-config — Read-only Bambora merchant configuration probe
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
9: import { getUserOrThrow, requireRoleOrThrow, AuthError, authErrorResponse } from "../_shared/auth.ts";
17: const user = await getUserOrThrow(req, corsHeaders);
18: await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin", "staff", "finance"], corsHeaders);
```

### CORS

```ts
8: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
13: const corsHeaders = getCorsHeaders(req);
14: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
17: const user = await getUserOrThrow(req, corsHeaders);
18: await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin", "staff", "finance"], corsHeaders);
32: headers: { ...corsHeaders, "Content-Type": "application/json" },
35: if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
38: headers: { ...corsHeaders, "Content-Type": "application/json" },
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
30: return new Response(JSON.stringify({ environment: Deno.env.get("WORLDLINE_ENVIRONMENT"), probes }, null, 2), {
31: status: 200,
36: return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
37: status: 500,
```

**Status codes returned:** 200, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L12: `Deno.serve(async (req) => {`
2. L14: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
3. L16: `try {`
4. L21: `for (const path of ["/configuration", "/merchant", "/profiles", "/reports/configuration"]) {`
5. L22: `try {`
6. L30: `return new Response(JSON.stringify({ environment: Deno.env.get("WORLDLINE_ENVIRONMENT"), probes }, null, 2), {`
7. L35: `if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);`
8. L36: `return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {`

### Tables read

None.

### Tables written

None.

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: none

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `wl-get-profile`

- **Path:** `supabase/functions/wl-get-profile/index.ts` (85 lines)
- **Purpose (from file header):** wl-get-profile — Fetch saved payment profiles for the authenticated user
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
6: import { getUserOrThrow, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
29: const user = await getUserOrThrow(req, corsHeaders);
32: const supabase = getAdminClient();
```

### CORS

```ts
5: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
23: const corsHeaders = getCorsHeaders(req);
24: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
29: const user = await getUserOrThrow(req, corsHeaders);
43: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
74: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
77: if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
81: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
41: return new Response(
43: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
72: return new Response(
74: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
79: return new Response(
81: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

**Status codes returned:** 200, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L22: `Deno.serve(async (req) => {`
2. L24: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
3. L28: `try {`
4. L35: `.from("payment_profiles")`
5. L40: `if (!profiles || profiles.length === 0) {`
6. L41: `return new Response(`
7. L49: `for (const p of profiles) {`
8. L50: `try {`
9. L55: `if (res.ok && res.data.card) {`
10. L72: `return new Response(`
11. L77: `if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);`
12. L79: `return new Response(`

### Tables read

| Table | Selected columns |
| --- | --- |
| `payment_profiles` | `*` |

### Tables written

None.

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/components/payments/SavedCardsSelector.tsx:29:        const { data, error } = await supabase.functions.invoke("wl-get-profile");`

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `wl-pay`

- **Path:** `supabase/functions/wl-pay/index.ts` (161 lines)
- **Purpose (from file header):** wl-pay — Rental payment via Worldline/Bambora (NO AUTO-CAPTURE)
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
22: import { validateAuth, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
23: import { requireBookingOwnerOrToken } from "../_shared/booking-core.ts";
68: const auth = await validateAuth(req);
70: const booking = await requireBookingOwnerOrToken(bookingId, authUserId, accessToken);
75: const supabase = getAdminClient();
```

### CORS

```ts
21: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
53: const corsHeaders = getCorsHeaders(req);
54: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
64: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
103: { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
150: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
153: if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
157: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `bookingId` | JSON body | yes |
| `accessToken` | JSON body | UNKNOWN: no explicit guard |
| `token` | JSON body | UNKNOWN: no explicit guard |
| `name` | JSON body | optional (defaulted) |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
59: const { bookingId, accessToken, token, name } = await req.json();
62: return new Response(
64: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
91: return new Response(
103: { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
141: return new Response(
150: { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
155: return new Response(
157: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

**Status codes returned:** 200, 400, 402, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L48: `if (!mm || !yy || mm.length !== 2 || yy.length !== 2) return null;`
2. L49: `return `${mm}/${yy}`;`
3. L52: `Deno.serve(async (req) => {`
4. L54: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
5. L58: `try {`
6. L61: `if (!bookingId || !token) {`
7. L62: `return new Response(`
8. L73: `if (authUserId) log.setUser(authUserId);`
9. L89: `if (!res.ok || !res.data?.approved) {`
10. L91: `return new Response(`
11. L114: `await supabase.from("bookings").update({`
12. L124: `await supabase.from("payments").insert({`
13. L141: `return new Response(`
14. L153: `if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);`
15. L155: `return new Response(`

### Tables read

None.

### Tables written

| Table | Operation |
| --- | --- |
| `bookings` | UPDATE |
| `payments` | INSERT |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

- `src/components/payments/OpsPaymentAndDeposit.tsx:87:    const { data: payData, error: payError } = await supabase.functions.invoke("wl-pay", {`

### Failure behaviour / atomicity

**Atomic: NO.** 2 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `wl-query-txn`

- **Path:** `supabase/functions/wl-query-txn/index.ts` (30 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

No auth-related identifier found in the file. Access is governed solely by `verify_jwt = false`.

### CORS

```ts
1: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
5: const corsHeaders = getCorsHeaders(req);
6: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
13: headers: { ...corsHeaders, "Content-Type": "application/json" },
21: headers: { ...corsHeaders, "Content-Type": "application/json" },
26: headers: { ...corsHeaders, "Content-Type": "application/json" },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `transactionId` | JSON body | yes |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
9: const { transactionId } = await req.json();
11: return new Response(JSON.stringify({ error: "transactionId is required" }), {
12: status: 400,
19: return new Response(JSON.stringify({ ok: res.ok, status: res.status, data: res.data }), {
20: status: 200,
24: return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
25: status: 500,
```

**Status codes returned:** 200, 400, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L4: `Deno.serve(async (req) => {`
2. L6: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
3. L8: `try {`
4. L10: `if (!transactionId) {`
5. L11: `return new Response(JSON.stringify({ error: "transactionId is required" }), {`
6. L19: `return new Response(JSON.stringify({ ok: res.ok, status: res.status, data: res.data }), {`
7. L24: `return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {`

### Tables read

None.

### Tables written

None.

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: none

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `wl-reconcile-authorized`

- **Path:** `supabase/functions/wl-reconcile-authorized/index.ts` (166 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

```ts
32: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
```

### CORS

```ts
6: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
27: const corsHeaders = getCorsHeaders(req);
28: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
155: headers: { ...corsHeaders, "Content-Type": "application/json" },
162: headers: { ...corsHeaders, "Content-Type": "application/json" },
```

### Inputs

No request body is read — the function takes no input fields.

### Responses

```ts
153: return new Response(JSON.stringify(summary), {
154: status: 200,
160: return new Response(JSON.stringify({ success: false, error: msg, reconciled, unchanged, errors }), {
161: status: 500,
```

**Status codes returned:** 200, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L26: `Deno.serve(async (req) => {`
2. L28: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
3. L40: `try {`
4. L45: `.from("payments")`
5. L54: `if (selErr) throw selErr;`
6. L58: `for (const p of candidates ?? []) {`
7. L60: `try {`
8. L63: `if (!res.ok || !res.data) {`
9. L76: `if (!isFullyCaptured) {`
10. L86: `.from("payments")`
11. L90: `if (payUpdErr) throw payUpdErr;`
12. L94: `if (bookingAuthStatus === "authorized") {`
13. L96: `.from("bookings")`
14. L100: `if (bkUpdErr) {`
15. L101: `console.warn("[wl-reconcile-authorized] booking update failed", bkUpdErr);`
16. L106: `await supabase.from("audit_logs").insert({`
17. L128: `console.error("[wl-reconcile-authorized] error on", txnId, msg);`
18. L153: `return new Response(JSON.stringify(summary), {`
19. L159: `console.error("[wl-reconcile-authorized] fatal", msg);`
20. L160: `return new Response(JSON.stringify({ success: false, error: msg, reconciled, unchanged, errors }), {`

### Tables read

| Table | Selected columns |
| --- | --- |
| `payments` | `id, booking_id, transaction_id, amount, status, payment_type, created_at, bookings:booking_id (id, booking_code, wl_auth_status)` |

### Tables written

| Table | Operation |
| --- | --- |
| `payments` | UPDATE |
| `bookings` | UPDATE |
| `audit_logs` | INSERT |

**RPCs called:** none

### External API calls

- endpoint literal: `https://esm.sh/@supabase/supabase-js@2.45.0`

Payloads are the `body:` objects visible in the logic steps above.

**Other edge functions invoked:** none

### Frontend call sites

- `src/pages/admin/Finance.tsx:356:        const { data, error } = await supabase.functions.invoke("wl-reconcile-authorized", { body: {} });`

### Failure behaviour / atomicity

**Atomic: NO.** 3 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `wl-search-by-order`

- **Path:** `supabase/functions/wl-search-by-order/index.ts` (41 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** not listed → platform default true

### Auth requirement (enforcing code quoted)

No auth-related identifier found in the file. Access is governed solely by `verify_jwt = true (default)`.

### CORS

```ts
1: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
7: const corsHeaders = getCorsHeaders(req);
8: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
15: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
32: headers: { ...corsHeaders, "Content-Type": "application/json" },
37: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `orderNumber` | JSON body | yes |
| `startDate` | JSON body | optional (defaulted) |
| `endDate` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
11: const { orderNumber, startDate, endDate } = await req.json();
13: return new Response(
15: { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
30: return new Response(JSON.stringify({ ok: res.ok, status: res.status, data: res.data }), {
31: status: 200,
35: return new Response(
37: { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
```

**Status codes returned:** 200, 400, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L6: `Deno.serve(async (req) => {`
2. L8: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
3. L10: `try {`
4. L12: `if (!orderNumber || !startDate || !endDate) {`
5. L13: `return new Response(`
6. L30: `return new Response(JSON.stringify({ ok: res.ok, status: res.status, data: res.data }), {`
7. L35: `return new Response(`

### Tables read

None.

### Tables written

None.

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: none

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `wl-search-txns`

- **Path:** `supabase/functions/wl-search-txns/index.ts` (55 lines)
- **Purpose:** UNKNOWN: not determinable from codebase (no file header comment); see the logic steps below for what it actually does.
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

No auth-related identifier found in the file. Access is governed solely by `verify_jwt = false`.

### CORS

```ts
1: import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
5: const corsHeaders = getCorsHeaders(req);
6: if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
14: headers: { ...corsHeaders, "Content-Type": "application/json" },
46: headers: { ...corsHeaders, "Content-Type": "application/json" },
51: headers: { ...corsHeaders, "Content-Type": "application/json" },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `startId` | JSON body | yes |
| `endId` | JSON body | optional (defaulted) |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
9: const { startId, endId } = await req.json();
12: return new Response(JSON.stringify({ error: "startId and endId (numbers) are required" }), {
13: status: 400,
44: return new Response(JSON.stringify({ transactions, scanned: { startId, endId: cappedEnd } }), {
45: status: 200,
49: return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
50: status: 500,
```

**Status codes returned:** 200, 400, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L4: `Deno.serve(async (req) => {`
2. L6: `if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);`
3. L8: `try {`
4. L11: `if (!startId || !endId || typeof startId !== "number" || typeof endId !== "number") {`
5. L12: `return new Response(JSON.stringify({ error: "startId and endId (numbers) are required" }), {`
6. L23: `for (let i = startId; i <= cappedEnd; i += BATCH_SIZE) {`
7. L25: `for (let j = i; j < Math.min(i + BATCH_SIZE, cappedEnd + 1); j++) {`
8. L32: `if (!res.ok) return null; // skip 404s / errors`
9. L33: `return { id, ...(res.data as Record<string, unknown>) };`
10. L37: `for (const r of results) {`
11. L38: `if (r.status === "fulfilled" && r.value !== null) {`
12. L44: `return new Response(JSON.stringify({ transactions, scanned: { startId, endId: cappedEnd } }), {`
13. L49: `return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {`

### Tables read

None.

### Tables written

None.

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: none

### Failure behaviour / atomicity

**Atomic: yes (single write, nothing else can fail after it).**

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## `wl-webhook`

- **Path:** `supabase/functions/wl-webhook/index.ts` (143 lines)
- **Purpose (from file header):** wl-webhook — Handle Worldline/Bambora webhook callbacks
- **config.toml `verify_jwt`:** false

### Auth requirement (enforcing code quoted)

```ts
9: import { getAdminClient } from "../_shared/auth.ts";
39: const supabase = getAdminClient();
```

### CORS

```ts
8: import { getCorsHeaders } from "../_shared/cors.ts";
14: const corsHeaders = getCorsHeaders(req, true); // webhook = true
16: if (req.method === "OPTIONS") {
17: return new Response(null, { headers: corsHeaders });
35: headers: { ...corsHeaders, "Content-Type": "application/json" },
65: headers: { ...corsHeaders, "Content-Type": "application/json" },
133: headers: { ...corsHeaders, "Content-Type": "application/json" },
139: headers: { ...corsHeaders, "Content-Type": "application/json" },
```

### Inputs

| Field | Source | Required? (evidence in source) |
| --- | --- | --- |
| `transaction_id` | JSON body | optional (defaulted) |
| `id` | JSON body | optional (defaulted) |
| `event_type` | JSON body | optional (defaulted) |
| `type` | JSON body | optional (defaulted) |
| `approved` | JSON body | UNKNOWN: no explicit guard |
| `amount` | JSON body | UNKNOWN: no explicit guard |

Types are not declared for body fields (the body is parsed as untyped
JSON), so column types in `docs/01-DATABASE.md` are the effective contract.

### Responses

```ts
17: return new Response(null, { headers: corsHeaders });
23: const body = await req.json();
33: return new Response(JSON.stringify({ received: true, duplicate: true }), {
34: status: 200,
63: return new Response(JSON.stringify({ received: true, matched: false }), {
64: status: 200,
131: return new Response(JSON.stringify({ received: true }), {
132: status: 200,
137: return new Response(JSON.stringify({ error: "Processing failed" }), {
138: status: 500,
```

**Status codes returned:** 200, 500

### Logic, in source order (numbered; every guard, early return and DB call)

1. L13: `Deno.serve(async (req) => {`
2. L16: `if (req.method === "OPTIONS") {`
3. L17: `return new Response(null, { headers: corsHeaders });`
4. L22: `try {`
5. L31: `if (alreadyProcessed) {`
6. L33: `return new Response(JSON.stringify({ received: true, duplicate: true }), {`
7. L45: `.from("bookings")`
8. L50: `if (!booking) {`
9. L52: `.from("bookings")`
10. L60: `if (!booking) {`
11. L63: `return new Response(JSON.stringify({ received: true, matched: false }), {`
12. L75: `if (isDepositMatch) {`
13. L77: `if (paymentType === "PA" && paymentStatus === 1) {`
14. L79: `await supabase.from("bookings").update({`
15. L86: `await supabase.from("deposit_ledger").insert({`
16. L95: `await supabase.from("bookings").update({`
17. L102: `await supabase.from("bookings").update({`
18. L110: `if (paymentType === "P" && paymentStatus === 1) {`
19. L111: `await supabase.from("bookings").update({`
20. L116: `await supabase.from("bookings").update({`
21. L131: `return new Response(JSON.stringify({ received: true }), {`
22. L137: `return new Response(JSON.stringify({ error: "Processing failed" }), {`

### Tables read

| Table | Selected columns |
| --- | --- |
| `bookings` | `id, status, deposit_status, wl_auth_status, wl_deposit_auth_status` |
| `bookings` | `id, status, deposit_status, wl_auth_status, wl_deposit_auth_status` |

### Tables written

| Table | Operation |
| --- | --- |
| `bookings` | UPDATE |
| `deposit_ledger` | INSERT |
| `bookings` | UPDATE |
| `bookings` | UPDATE |
| `bookings` | UPDATE |
| `bookings` | UPDATE |

**RPCs called:** none

### External API calls

None.

**Other edge functions invoked:** none

### Frontend call sites

**NOT CALLED BY ANY FRONTEND CODE.** Other textual references: `supabase/functions/wl-webhook/index.ts:20`

### Failure behaviour / atomicity

**Atomic: NO.** 6 separate write statement(s). There is no database
transaction wrapper available to an edge function using the
supabase-js client, so if a later step throws, earlier writes remain
committed and the record is left in a partial state.

Errors are caught (see `catch` lines in the logic steps) and turned into
a JSON error response; caught errors do not roll back earlier writes.

---

## Summary table

| Function | Called by | Writes to | Atomic |
| --- | --- | --- | --- |
| `assign-unit-to-active-booking` | not called by frontend | audit_logs, bookings, rental_agreements, vehicle_units | no |
| `backfill-additional-drivers` | not called by frontend | booking_additional_drivers | yes |
| `calculate-fleet-costs` | not called by frontend | fleet_cost_cache | yes |
| `cancel-booking` | frontend | audit_logs, bookings, vehicle_units | no |
| `change-booking-vehicle` | frontend | audit_logs, bookings, rental_agreements, vehicle_swap_history, vehicle_units | no |
| `check-booking-payment-integrity` | frontend | admin_alerts | yes |
| `check-rental-alerts` | not called by frontend | admin_alerts | no |
| `check-ticket-escalation` | not called by frontend | admin_alerts, audit_logs, ticket_messages, tickets | no |
| `claim-delivery` | frontend | bookings | yes |
| `close-account` | frontend | audit_logs, bookings, final_invoices, payments | no |
| `confirm-admin-email` | not called by frontend | — | yes |
| `confirm-bank-transfer-paid` | not called by frontend | audit_logs, bank_transfer_otps, bookings, payments | no |
| `create-booking` | frontend | bookings, customers, notification_logs, profiles, reservation_holds | no |
| `create-guest-booking` | frontend | booking_access_tokens, bookings, customers, profiles | no |
| `create-walk-in-booking` | frontend | audit_logs, booking_add_ons, bookings, customers, delivery_statuses, profiles | no |
| `force-close-booking` | frontend | audit_logs, bookings, condition_photos, inspection_metrics, payments, vehicle_units | no |
| `generate-agreement` | frontend | audit_logs, rental_agreements | no |
| `generate-return-receipt` | frontend | audit_logs, notification_logs, receipt_events, receipts | no |
| `get-mapbox-token` | frontend | — | yes |
| `log-terminal-payment` | frontend | audit_logs, bookings, deposit_ledger, payments | no |
| `lookup-booking-pass` | frontend | — | yes |
| `manage-booking-documents` | frontend | audit_logs, booking_documents | no |
| `manage-staff` | frontend | staff_assignments, user_roles | no |
| `notify-admin` | frontend | admin_alerts, notification_logs | no |
| `notify-branch-sms` | frontend | — | no |
| `persist-booking-extras` | frontend | audit_logs, booking_add_ons, booking_additional_drivers | no |
| `reprice-booking` | frontend | audit_logs, booking_add_ons, booking_additional_drivers, booking_extensions, bookings, vehicle_units | no |
| `send-account-setup-link` | not called by frontend | notification_logs | no |
| `send-agreement-notification` | not called by frontend | notification_logs | no |
| `send-bank-transfer-otp` | not called by frontend | bank_transfer_otps | no |
| `send-booking-email` | not called by frontend | notification_logs | no |
| `send-booking-notification` | frontend | notification_logs | no |
| `send-booking-otp` | frontend | booking_otps | no |
| `send-booking-sms` | not called by frontend | notification_logs | no |
| `send-contact-email` | frontend | notification_logs | yes |
| `send-payment-confirmation` | not called by frontend | notification_logs | no |
| `send-support-sms` | frontend | — | no |
| `update-booking-customer` | not called by frontend | audit_logs, profiles | no |
| `update-booking-status` | frontend | admin_alerts, analytics_events, audit_logs, bookings, vehicle_units | no |
| `validate-promo-code` | frontend | — | yes |
| `verify-booking-otp` | frontend | — | no |
| `void-booking` | frontend | admin_alerts, audit_logs, bookings, vehicle_units | no |
| `wl-authorize` | frontend | bookings, payments | no |
| `wl-cancel-auth` | frontend | bookings, deposit_ledger, payments | no |
| `wl-capture` | frontend | audit_logs, bookings, deposit_ledger, payments | no |
| `wl-create-profile` | not called by frontend | payment_profiles | yes |
| `wl-debug-config` | not called by frontend | — | yes |
| `wl-get-profile` | frontend | — | yes |
| `wl-pay` | frontend | bookings, payments | no |
| `wl-query-txn` | not called by frontend | — | yes |
| `wl-reconcile-authorized` | frontend | audit_logs, bookings, payments | no |
| `wl-search-by-order` | not called by frontend | — | yes |
| `wl-search-txns` | not called by frontend | — | yes |
| `wl-webhook` | not called by frontend | bookings, deposit_ledger | no |

GAP: no edge function wraps its multi-table writes in a database
transaction, so any function marked *Atomic: no* above can leave partial
state (for example a booking row without its add-ons, or a payment row
without an updated booking status).

