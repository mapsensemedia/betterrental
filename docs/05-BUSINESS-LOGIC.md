# 05 — BUSINESS LOGIC

Everything in this file is taken from source. Quotes are verbatim with file
paths and line numbers. Where the code does something surprising, the actual
behaviour is documented first and a `GAP:` line follows.

---

## 1. Booking state machine

`bookings.status` is the Postgres enum `booking_status` with exactly these
labels (`docs/01-DATABASE.md` §3.1):

```
draft, pending, confirmed, active, completed, cancelled
```

### 1.1 Meaning and the code that sets each value

| Status | Operational meaning | Set by (file:line) |
| --- | --- | --- |
| `draft` | Booking row exists but is not a commitment: created by flows that need a row before money is collected. The seatbelt trigger only lets a *client* insert `draft` rows with all money fields zero (`block_sensitive_booking_inserts`, `docs/01-DATABASE.md` §5). | `supabase/functions/_shared/booking-core.ts:967` (`status: input.status || "confirmed"` — caller passes `draft`) |
| `pending` | Created and awaiting payment or staff action. | `supabase/functions/create-booking/index.ts` / `create-guest-booking` via `createBookingRecord` input; `update-booking-status/index.ts:363` writes `status: "pending"` on `admin_alerts`, not on the booking |
| `confirmed` | Payment authorised/received, rental not yet started. | `supabase/functions/wl-pay/index.ts:117` (`status: "confirmed"` alongside the rental payment insert); `supabase/functions/wl-webhook/index.ts:112-113`; `supabase/functions/create-walk-in-booking/index.ts:509`; `supabase/functions/generate-agreement/index.ts:729`; default in `booking-core.ts:967` |
| `active` | Vehicle handed over, rental running. | `supabase/functions/update-booking-status/index.ts` (`newStatus === "active"` branch, lines 200-212) |
| `completed` | Returned and closed. | `supabase/functions/update-booking-status/index.ts` (`newStatus === "completed"`); `supabase/functions/force-close-booking/index.ts:99`; `supabase/functions/close-account/index.ts:342` (invoice/receipt close path) |
| `cancelled` | Voided by staff or cancelled by the customer. | `supabase/functions/void-booking/index.ts:76` (staff); `supabase/functions/cancel-booking/index.ts:83` (customer) |

### 1.2 Entry conditions actually enforced

**Customer cancellation** — `supabase/functions/cancel-booking/index.ts:16`:

```ts
const CANCELLABLE = ["pending", "confirmed"];
```

and lines 51-73:

```ts
if (booking.user_id !== userId) { ... 403 }
if (booking.status === "cancelled") { return json({ success: true, alreadyCancelled: true }); }
if (!CANCELLABLE.includes(booking.status)) { ... 409 INVALID_STATE_TRANSITION }
```

So a customer can only move `pending|confirmed → cancelled`, only on their own
booking, and a repeat press is an idempotent success.

**active → completed** — `supabase/functions/update-booking-status/index.ts:21-33`
defines the return state order and `isStateAtLeast`, then lines 77-107:

```ts
if (currentStatus === "active" && newStatus === "completed") {
  if (!isStateAtLeast(returnState, "closeout_done")) {
    if (bypassReason && typeof bypassReason === "string" && bypassReason.trim().length >= 50) {
      ... audit_logs insert 'workflow_bypass' + admin_alerts insert ...
    } else {
      return ... 422 "Complete return workflow first (intake, evidence, issues, closeout)"
    }
  }
}
```

This is the **only** status transition guard in `update-booking-status`.

**Role guard** on the same function, lines 44-45:

```ts
const user = await getUserOrThrow(req, corsHeaders);
await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin", "staff"], corsHeaders);
```

plus branch scope at line 57: `await requireBookingLocationOrThrow(user.userId, bookingId);`

**close-account** — `supabase/functions/close-account/index.ts:122-138`:

```ts
if (booking.account_closed_at && !backfillMode) { ... 400 }
if (!closableStatuses.includes(booking.status)) { ... 409 `Cannot close account for a ${booking.status} booking` }
```

**void-booking** — admin role only; refuses already `cancelled`/`completed`
bookings (`supabase/functions/void-booking/index.ts`).

### 1.3 Allowed next states, as implemented

```
draft ──────► pending ──────► confirmed ──────► active ──────► completed
  │              │                 │               │
  │              └───► cancelled ◄─┘               └──► cancelled (void only)
  └──► cancelled (void only)
```

GAP: `update-booking-status` does **not** validate the *from* state for any
transition except `active → completed`. Any of
`super_admin, manager, admin, staff` can send `newStatus: "active"` for a
`draft` booking, or `newStatus: "confirmed"` for a `completed` one, and the
write succeeds. The monotonic-status rule the project relies on is therefore
enforced only in the webhook path (`wl-webhook`) and by convention in the UI,
not by this function and not by any database CHECK constraint —
`docs/01-DATABASE.md` §1 shows `bookings` has no status-transition constraint
and no trigger that compares `OLD.status` with `NEW.status`
(`block_sensitive_booking_updates` only checks *who* is writing, not *what*
the transition is).

GAP: three different functions can set `completed`
(`update-booking-status`, `force-close-booking`, `close-account`), and only
`update-booking-status` checks `return_state`. `force-close-booking` sets
`status: "completed"` (line 99) with no return-workflow requirement at all.

---

## 2. Availability logic

### 2.1 Date selection → availability decision

1. The customer picks dates in `src/components/search/*` /
   `src/contexts/RentalBookingContext.tsx` (dates persisted to storage/URL, see
   `docs/04-DATA-LAYER.md`).
2. The browse/search screen asks the database for capacity per category through
   the RPC `get_category_availability` (see `docs/01-DATABASE.md` §5 for the
   full body) — consumed by `src/hooks/use-browse-categories.ts` and
   `src/hooks/use-availability.ts`.
3. At creation time the edge function calls `check_category_availability`
   through `supabase/functions/_shared/availability.ts:26-58`:

```ts
const { data, error } = await supabaseAdmin.rpc("check_category_availability", {
  p_category_id: params.categoryId,
  p_location_id: params.locationId,
  p_start_at: params.startAt,
  p_end_at: params.endAt,
  p_exclude_hold: null,
  p_exclude_booking: params.excludeBookingId ?? null,
});
```

### 2.2 Which statuses block

From `get_category_availability` (verbatim, `docs/01-DATABASE.md` §5):

```sql
FROM bookings b, win
WHERE b.status IN ('pending', 'confirmed', 'active')
  AND (p_exclude_booking IS NULL OR b.id <> p_exclude_booking)
  AND b.start_at < win.w_end
  AND b.end_at   > win.w_start
```

- **Consume capacity:** `pending`, `confirmed`, `active`.
- **Do not consume capacity:** `draft`, `completed`, `cancelled`.
- Live checkout holds also consume capacity: `reservation_holds` where
  `status = 'active' AND expires_at > now()`.
- Units excluded from capacity by status:
  `maintenance, damage, damaged, retired, inactive, out_of_service, sold`.
- The window is padded by 30 minutes on each side (`interval '30 minutes'`).

GAP: the older helper `checkBookingConflicts`
(`supabase/functions/_shared/booking-core.ts:911-934`) uses a **different**
status list and a different overlap test:

```ts
.in("status", ["pending", "confirmed", "active", "draft"])
.lte("start_at", endAt)
.gte("end_at", startAt);
```

It counts `draft` as blocking and uses inclusive bounds, so it disagrees with
the RPC. It is dead weight in the creation path (creation uses
`getCategoryCapacity`), but any caller still using it gets a different answer.

GAP: `src/lib/availability.ts` is a third availability implementation, marked
`@deprecated` in its own header (lines 1-9) and querying the legacy `vehicles`
table with `is_available`.

### 2.3 Is the check re-run at creation, and is a row locked?

Re-run: yes. Blocking: **no.**
`supabase/functions/create-booking/index.ts:228-247`:

```ts
// Category capacity — informational only. Overbooking at the category level
// is allowed; a specific vehicle is assigned later by staff.
let isOverbooked = false;
try {
  const capacity = await getCategoryCapacity(...);
  isOverbooked = capacity.overbooked;
  if (!capacity.offered) {
    // Never block the booking: staff assign a vehicle later.
    isOverbooked = true;
  }
} catch (availErr) {
  // Never block a booking on a capacity lookup failure.
}
```

`create-guest-booking/index.ts:202-215` is identical in intent and logs
`category not stocked at this branch — proceeding as overbooking`, then flags
the row (`.update({ overbooked: true, overbooked_at: ... })`, line 437).

**No row lock is taken.** `check_category_availability` is `STABLE` and does no
`FOR UPDATE` (`docs/01-DATABASE.md` §5). The only place a lock exists is
`assign_vin_to_booking()`, which uses `FOR UPDATE SKIP LOCKED` when a physical
unit is picked. Concurrency at booking time is therefore unrestricted by
design, because overbooking is permitted.

There is a duplicate-submit guard instead
(`create-booking/index.ts:249-262`): same user + same vehicle + overlapping
dates + created within the last 10 minutes.

---

## 3. Unit assignment (`bookings.assigned_unit_id`)

### 3.1 Where it is set

| Path | Code | Effect on `vehicle_units.status` |
| --- | --- | --- |
| DB function `assign_vin_to_booking(p_category_id, p_booking_id, p_location_id)` | picks one `available` unit at the location with `FOR UPDATE SKIP LOCKED`, sets it `on_rent`, then sets `bookings.assigned_unit_id` (`docs/01-DATABASE.md` §5) | `available → on_rent` |
| `supabase/functions/assign-unit-to-active-booking/index.ts:133` | `.update({ status: "on_rent", updated_at: ... })`, with a rollback attempt at line 152 (`.update({ status: unit.status })`) | `→ on_rent` |
| `supabase/functions/change-booking-vehicle/index.ts:142,154,155` | old unit restored to `oldUnit?.status ?? "on_rent"`, new unit set `available` on the rollback branch | swap |
| `supabase/functions/reprice-booking/index.ts:429` | `await supabase.from("vehicle_units").update({ status: "on_rent" }).eq("id", assignUnitId);` during an upgrade | `→ on_rent` |
| `src/features/delivery/api/mutations.ts:91` | `.update({ status: "on_rent" })` from the driver portal | `→ on_rent` |
| `src/hooks/use-fleet-categories.ts:402,449` and `src/domain/fleet/mutations.ts:295` | staff fleet edits, including `status: "retired"` | manual |

### 3.2 Release paths

| Trigger | Code | New unit status |
| --- | --- | --- |
| Booking activated | `update-booking-status/index.ts:207` | `on_rent` |
| Booking completed or cancelled | `update-booking-status/index.ts:209` | `available` |
| Staff void | `void-booking/index.ts:88` | `available` |
| Customer cancel | `cancel-booking/index.ts:98` | `available` |
| Force close | `force-close-booking/index.ts:158` | `available` |
| DB helper | `release_vin_from_booking(p_booking_id, p_new_status default 'available')` | parameterised |

### 3.3 If it is never set

`update-booking-status/index.ts:211-212`:

```ts
} else if (newStatus === "active") {
  console.warn(`[update-booking-status] Booking ${bookingId} (${booking.booking_code}) activated without assigned_unit_id — unit status not updated`);
```

The booking still goes `active`. Nothing blocks activation without a vehicle.

GAP: an `active` booking with `assigned_unit_id = NULL` consumes category
capacity (§2.2) but no physical unit is marked `on_rent`, so the same car can be
handed to a second customer with no warning anywhere in the system except this
server log line.

GAP: unit status is written from **six** different places including two
client-side files (`src/features/delivery/api/mutations.ts`,
`src/hooks/use-fleet-categories.ts`). `vehicle_units.status` is free text — the
column has no CHECK constraint (`docs/01-DATABASE.md` §3.2), so values such as
`damage` vs `damaged` both exist in the exclusion list of
`get_category_availability`, which is direct evidence that inconsistent values
have been written historically.

---

## 4. Pricing

Two engines exist and must agree:

- **Client (quote/display):** `src/lib/pricing.ts` → `calculateBookingPricing()`
  (lines 453-539).
- **Server (authoritative):** `supabase/functions/_shared/booking-core.ts` →
  `computeBookingTotals()` (lines 524-824). Its own header at line 16 says
  `PRICING CONSTANTS (mirrors src/lib/pricing.ts)`.

### 4.1 Step order, server engine

1. **Day count** — `booking-core.ts:548-560`:

```ts
const sMs = new Date(input.startAt).getTime();
const eMs = new Date(input.endAt).getTime();
if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) throw ...
if (eMs <= sMs) throw ...
const days = Math.max(1, Math.ceil((eMs - sMs) / (1000 * 60 * 60 * 24)));
```

Hour-based ceiling: ≤24 h = 1 day, >24 h = 2 days, and date-only strings are
rejected so the engine cannot silently undercharge.

2. **Daily rate source** — `booking-core.ts:566-592`: try `vehicles.daily_rate`
   by id, else `vehicle_categories.daily_rate` by id, else
   `throw new Error(\`Invalid vehicle: ${input.vehicleId}\`)`. A staff override
   replaces it:

```ts
if (input.overrideDailyRate !== undefined && input.overrideDailyRate > 0) {
  dailyRate = input.overrideDailyRate;
}
```

3. **Vehicle line, weekend surcharge, duration discount** — lines 594-603:

```ts
const vehicleBaseTotal = roundCents(dailyRate * days);
const weekendDayCount = countWeekendDaysInRange(input.startAt, days);
const weekendSurcharge = weekendDayCount > 0
  ? roundCents(dailyRate * weekendDayCount * WEEKEND_SURCHARGE_RATE) : 0;
const afterSurcharge = roundCents(vehicleBaseTotal + weekendSurcharge);
const discountRate = getDurationDiscount(days);           // always 0
const durationDiscount = roundCents(afterSurcharge * discountRate);
const vehicleTotal = roundCents(afterSurcharge - durationDiscount);
```

`WEEKEND_SURCHARGE_RATE = 0.15` (line 22); weekend = Fri/Sat/Sun counted on
`America/Vancouver` (lines 474-508). Duration discounts are retired:
`WEEKLY_DISCOUNT_RATE = 0`, `MONTHLY_DISCOUNT_RATE = 0` (lines 24-27).

4. **Protection** — lines 605-634. Group is derived from the category *name*:

```ts
if (catUpper.includes("LARGE") && catUpper.includes("SUV")) groupPrefix = "protection_g3";
else if (catUpper.includes("MINIVAN") || (catUpper.includes("STANDARD") && catUpper.includes("SUV"))) groupPrefix = "protection_g2";
```

then the rate is read live from `system_settings` (`${groupPrefix}_${plan}_rate`),
falling back to hard-coded defaults:

```ts
protection:    { basic: 32.99, smart: 37.99, premium: 49.99 },
protection_g2: { basic: 52.99, smart: 57.99, premium: 69.99 },
protection_g3: { basic: 64.99, smart: 69.99, premium: 82.99 },
```

`protectionTotal = roundCents(protectionDailyRate * days)`.

5. **Add-ons** — lines 636-696. Max 10 add-ons, quantity clamped to 1..10,
   prices always from `add_ons` (`daily_rate`, `one_time_fee`), never from the
   client. With `protectionPlan === "premium"`, add-ons whose name contains
   `roadside` plus `premium`/`extended` are dropped (lines 643-664).

6. **Fuel add-on** — lines 680-686 with helpers at 70-95:

```ts
const MARKET_FUEL_PRICE_PER_LITER = 1.85;
const FUEL_DISCOUNT_CENTS = 5;
const OUR_FUEL_PRICE_PER_LITER = MARKET_FUEL_PRICE_PER_LITER - FUEL_DISCOUNT_CENTS / 100;
const TANK_SIZES = { economy: 45, compact: 50, midsize: 55, fullsize: 65, suv: 75, "large-suv": 90, minivan: 75, premium: 70, luxury: 80, default: 60 };
```

7. **Young driver surcharge** — line 699:

```ts
const youngDriverFee = input.driverAgeBand === "20_24" ? roundCents(YOUNG_DRIVER_FEE * days) : 0;
```

`YOUNG_DRIVER_FEE = 15` (line 21).

GAP: the band label is `"20_24"` while the client constant is
`MIN_DRIVER_AGE = 21` (`src/lib/pricing.ts:58`) and the comment on line 18 says
"aged 21-24". The database CHECK on `bookings.driver_age_band` allows
`'20_24','25_70'` and `booking_additional_drivers.driver_age_band` allows
`'20_24','21_25','25_70'` (`docs/01-DATABASE.md` §1) — three vocabularies for
the same concept, and `'21_25'` is accepted only on additional drivers.

8. **Additional drivers** — lines 701-732. Rates read live from
   `system_settings` with defaults `stdRate = 14.99`, `youngRate = 19.99`, max 5
   drivers, fee = `rate * days`.

9. **Daily regulatory fees** — line 735:
   `dailyFeesTotal = roundCents((PVRT_DAILY_FEE + ACSRCH_DAILY_FEE) * days)`
   with `PVRT_DAILY_FEE = 1.50`, `ACSRCH_DAILY_FEE = 1.00`.

10. **Delivery fee** — lines 737-756. Server re-derives it and takes the
    maximum, so it can only correct an undercharge:

```ts
const deliveryFee = derivedDeliveryFee != null
  ? roundCents(Math.max(clientDeliveryFee, derivedDeliveryFee)) : clientDeliveryFee;
```

11. **Drop-off fee** — lines 757-760, always recomputed from location ids via
    `computeDropoffFee` → `locations.fee_group` (lines 433-469):
    same group `0`, `langley|surrey` `50`, `abbotsford|langley` and
    `abbotsford|surrey` `75`.

12. **Subtotal** — lines 762-766:

```ts
const subtotal = roundCents(
  vehicleTotal + protectionTotal + addOnsTotal + youngDriverFee +
  additionalDriversTotal + dailyFeesTotal + deliveryFee + differentDropoffFee
);
```

13. **Tax** — lines 768-771: `pst = subtotal * 0.07`, `gst = subtotal * 0.05`,
    `taxAmount = pst + gst`, each rounded.

14. **Processing fee** — lines 773-775: computed on the **pre-tax** subtotal and
    never itself taxed (`getProcessingFeeRate`, `computeProcessingFee` in
    `_shared/processing-fee.ts`).

15. **Gross total** — line 778: `grossTotal = subtotal + taxAmount + processingFee`.

16. **Deposit** — line 781: `let depositAmount = MINIMUM_DEPOSIT_AMOUNT;`
    (`= 350`, line 30). Never derived from the total.

17. **QA promo** — lines 783-794. A single secret code
    (`TEST_PROMO_CODE`, 99% off, `TEST_PROMO_PERCENT_OFF = 37`… actually
    line 37: `export const TEST_PROMO_PERCENT_OFF = 99;`) reduces both the
    total and the deposit hold. Invalid/expired codes are silently ignored.

### 4.2 Client-sent totals

`validateClientPricing` (lines 832-907) recomputes everything server-side and
compares with `PRICE_MISMATCH_TOLERANCE = 0.50` (line 68), widened by the
tax-inclusive delivery-fee correction. On mismatch it logs the full breakdown
and returns `valid: false`. It fails **closed**.

### 4.3 Snapshot vs live rates — proof

Rates are read **live at compute time** and then **snapshotted onto the booking
row**. Proof, `booking-core.ts:946-987` (`createBookingRecord`):

```ts
daily_rate: serverTotals.dailyRate,
total_days: serverTotals.days,
subtotal: serverTotals.subtotal,
tax_amount: serverTotals.taxAmount,
processing_fee: serverTotals.processingFee,
processing_fee_rate: serverTotals.processingFeeRate,
deposit_amount: serverTotals.depositAmount,
total_amount: serverTotals.total,
young_driver_fee: serverTotals.youngDriverFee,
weekend_surcharge: serverTotals.weekendSurcharge,
duration_discount: serverTotals.durationDiscount,
```

Protection and add-on **rates** are not snapshotted as rates; only their
resulting amounts land in `booking_add_ons.price` and in the booking subtotal.
Any later re-run of the engine (repricing, extension, close-account) re-reads
`system_settings` and `add_ons` and therefore uses today's rates, not the rates
in force when the booking was made.

GAP: the client engine and server engine are two separate implementations of
the same 17 steps with duplicated constants. `src/lib/pricing.ts:492` treats
`driverAgeBand === "20_24"` identically, but the client engine adds
`lateFeeAmount` into the subtotal (line 500) while the server engine has no
late-fee input at all — late fees on the server side are handled only in the
close/invoice path.

---

## 5. Payment and deposit lifecycle

The distinguishing field is `payments.payment_type`. Every consumer filters on
it; there is no other marker.

| Money movement | Handling function | Row written | Counts as |
| --- | --- | --- | --- |
| Online rental charge (card, Worldline) | `supabase/functions/wl-pay/index.ts:114-132` | `bookings` UPDATE (`wl_transaction_id`, `wl_auth_status`, `status: "confirmed"`, card fields) + `payments` INSERT `payment_type: "rental"`, `payment_method: "card"`, `status` `completed` when Worldline returns type `P`, otherwise `authorized` | revenue |
| Deposit pre-authorisation | `supabase/functions/wl-authorize/index.ts:44-68` | `bookings` UPDATE (`wl_deposit_transaction_id`, `wl_deposit_auth_status: "authorized"`, `deposit_status: "authorized"`, `deposit_amount`, `deposit_authorized_at`, card fields) + `payments` INSERT `payment_type: "deposit"`, `status: "authorized"` | deposit, never revenue |
| Deposit capture (incl. terminal deposit) | `supabase/functions/wl-capture/index.ts:101-215` | `payments` INSERT `payment_type: "deposit"`, `payment_method: "terminal"`, `status: "completed"`, `transaction_id: TERM-DEP-<reference>` with a duplicate check at 193-202 returning 409 | deposit |
| Deposit void / release | `wl-cancel-auth`, `release` paths + `deposit_ledger` | `deposit_ledger`, `bookings.deposit_status` | deposit |
| Terminal rental payment | `supabase/functions/log-terminal-payment/index.ts:111-159` | reads existing `payment_type = "rental"` sums, inserts `payments` with `payment_type: "rental"`, `status: "completed"` | revenue |
| Bank transfer / offline | `supabase/functions/confirm-bank-transfer-paid/index.ts:117-120` | `payments` UPDATE `status: "completed"` filtered `payment_type.is.null,payment_type.neq.deposit`; `bookings.paid_offline` drives `recompute_invoice_totals()` | revenue |
| Manual staff entry | `src/pages/admin/Billing.tsx:405,424` | `payments` INSERT with explicit `payment_type: "rental"` or `"deposit"` | per type |
| Refund | no automated Worldline refund path exists in `supabase/functions/` | — | UNKNOWN: not determinable from codebase (refunds are performed outside the app) |
| Webhook confirmation | `supabase/functions/wl-webhook/index.ts:112-113` | `bookings` UPDATE `wl_auth_status: "completed"`, `status: "confirmed"`; idempotency via `webhook_events` | revenue |

### 5.1 How revenue is separated from deposits

Every aggregation filters `payment_type`:

- `supabase/functions/close-account/index.ts:303`
  `.filter((p: any) => p.payment_type === "rental" || p.payment_type === "additional")`
- `supabase/functions/persist-booking-extras/index.ts:762`
  `(p.payment_type || "rental") !== "deposit" &&` — note the **default to
  `"rental"`** when the column is null.
- `public.recompute_invoice_totals()` (`docs/01-DATABASE.md` §5):

```sql
WHERE booking_id = p_booking_id
  AND status IN ('completed', 'captured')
  AND COALESCE(payment_type, '') <> 'deposit';
```

GAP: `payments.payment_type` has **no CHECK constraint**
(`docs/01-DATABASE.md` §3.2), and the codebase uses at least four values:
`rental`, `deposit`, `additional`, plus `NULL`. Two different fallbacks exist
for `NULL` — `persist-booking-extras` treats it as `rental`, `close-account`
excludes it (it only accepts `rental`/`additional`). A null-typed payment is
therefore revenue in one calculation and invisible in another.

GAP: `payments.status` likewise has no constraint; `authorized`, `completed`,
`captured` and `failed` all appear. `recompute_invoice_totals` counts
`completed` and `captured` only, so an `authorized`-but-not-captured rental
charge is money the customer has committed that no invoice reflects.

---

## 6. Extension logic

Handled by `supabase/functions/reprice-booking/index.ts`.

- **Rate used** — the stored rate is carried forward, not today's rate:
  line 213 `overrideDailyRate: effectiveDailyRate` and line 253
  `overrideDailyRate: storedDailyRate` for the "old" recompute.
- **Delta-only charging** — lines 226-282: the engine is run twice (old dates,
  new dates) and only the difference is applied:

```ts
deltaSubtotal = roundCents( ... );                    // line 259
const newBase = roundCents(Math.max(baseStored + deltaSubtotal, 0));   // line 282
```

  and `deltaInfo` (lines 339-341) reports `deltaSubtotal` and
  `deltaTotal = finalTotal - booking.total_amount`.
- **Extension detection** — line 162:
  `const isExtension = !!newEndAt && new Date(newEndAt) > new Date(booking.end_at);`
- **Availability** — not checked. There is no `getCategoryCapacity` or
  `check_category_availability` call anywhere in `reprice-booking`.
- **Payment** — not collected. The function updates `bookings` totals and
  writes `audit_logs`; no `payments` row is inserted and no Worldline call is
  made.
- **Agreement** — regenerated. Lines 696-746:

```ts
// Keep the rental agreement in sync: when the billed days or the total change,
// the stored agreement is stale (it still shows the pre-change figures).
const resp = await fetch(`${supabaseUrl}/functions/v1/generate-agreement`, { ...
  ...(extensionInfo ? { agreementType: "extension" } : {}),
```

  with `agreementRegenerated` / `agreementError` reported back to the caller.

GAP: an extension increases `total_amount` without creating any receivable
record. The only way the extra money is noticed is the invoice
`amount_due` recomputation (`recompute_invoice_totals`) at close time, or a
staff member reading the delta from the response. Nothing prevents a vehicle
being extended into a window where every unit of the class is already
committed, because availability is not consulted.

---

## 7. Return and close logic

The state machine lives in `src/lib/return-steps.ts:2`:

```
not_started → initiated → intake_done → evidence_done → issues_reviewed → closeout_done → deposit_processed
```

and is mirrored server-side in `update-booking-status/index.ts:21-33`. The
database enforces the value set with `check_return_state`
(`docs/01-DATABASE.md` §1) but **not** the ordering.

| # | Step | `requiredState` | `prerequisiteState` | Enforced where |
| --- | --- | --- | --- | --- |
| 1 | Return Intake (time, odometer, fuel) | `intake_done` | `initiated` | client only (`src/lib/return-steps.ts:36-45`) |
| 2 | Evidence Capture (photos) | `evidence_done` | `intake_done` | client only |
| 3 | Issues & Damages | `issues_reviewed` | `evidence_done` | client only |
| 4 | Closeout | `closeout_done` | `issues_reviewed` | client, **plus** the server gate on `active → completed` |
| 5 | Deposit Release | `deposit_processed` | `closeout_done` | client only |

- **Skippable:** steps 1-3 and 5 are ordered by client code only. The one
  server-side requirement is `isStateAtLeast(returnState, "closeout_done")`
  before `completed`, and even that is bypassable with a ≥50-character
  `bypassReason`, which writes an `audit_logs` `workflow_bypass` row and a
  `⚠️ Workflow Bypassed` alert.
- **force-close-booking** ignores the workflow entirely
  (`force-close-booking/index.ts:99` sets `completed`; 158 frees the unit;
  173-184 completes the rental payment and `wl_auth_status`).
- **close-account** builds the final invoice: reads protection group, add-ons,
  drivers, fees, late fees (lines 192-308), inserts `final_invoices` with
  `status: "issued"` and `deposit_held/captured/released` initialised to 0
  (lines 309-327), and sets the booking `completed` (line 342). Guarded by
  `account_closed_at` and `closableStatuses` (lines 122-138).

GAP: deposit release is step 5, *after* closeout, but `close-account` writes
`deposit_held: 0, deposit_captured: 0, deposit_released: 0` on the invoice
regardless of what `deposit_ledger` and `bookings.deposit_status` actually say.
The invoice's deposit columns are therefore not a record of the deposit.

---

## 8. Notifications

Dispatcher: `supabase/functions/send-booking-notification/index.ts`. Its
`Stage` union (lines 12-26) is the complete list of customer lifecycle
messages:

```ts
"payment_received" | "license_approved" | "license_rejected" | "vehicle_assigned"
| "agreement_generated" | "agreement_signed" | "checkin_complete" | "prep_complete"
| "walkaround_complete" | "rental_activated" | "return_initiated"
| "rental_completed" | "deposit_released" | "booking_cancelled"
```

Each stage produces `{ subject, sms, emailBody }` from `getStageContent()`
(line 78), using the shared booking summary block (line 53) and the shared
formatters in `_shared/sms-format.ts` (`BRAND`, `fmtDateVan`, `fmtDateTimeVan`,
`fmtMoney`, `getBookingContactPhone`). Recipients are resolved by
`resolveBookingContact()` in `_shared/notify-log.ts` (customer record →
profile → pickup contact), phone normalised through `_shared/phone.ts`
(`toE164`). Duplicate sends are prevented (line ~405
`Duplicate notification prevented …`) using `notification_logs.idempotency_key`.

| Event | Trigger site | Channel(s) | Recipient | Sending function |
| --- | --- | --- | --- | --- |
| Booking confirmation | `_shared/booking-core.ts:1102-1124` (`sendBookingNotifications`) | email + SMS | customer | `send-booking-email`, `send-booking-sms` |
| Branch operations alert (new booking) | `booking-core.ts:1112` | SMS | branch recipient per location (fallback list) | `notify-branch-sms` |
| Admin new-booking notice | `booking-core.ts:1116` | email | admins | `notify-admin` |
| Guest account setup link | `booking-core.ts:1127-1129` (`if (params.isGuest)`) | email | guest customer | `send-account-setup-link` |
| Payment confirmation | `supabase/functions/send-payment-confirmation/index.ts` (splits rental vs deposit at lines 65-69) | SMS/email | customer | `send-payment-confirmation` |
| Agreement generated / signed | `send-agreement-notification`, `generate-agreement` | email/SMS | customer | `send-agreement-notification` |
| Cancellation | `cancel-booking/index.ts:121-123` → `stage: "booking_cancelled"`, dispatched after the HTTP reply via `EdgeRuntime.waitUntil` (lines 151-157) | SMS + email | customer | `send-booking-notification` |
| Support ticket to branch | `notify-branch-sms` (`type: "ticket"`) and DB trigger `trg_branch_sms_on_new_ticket` → `notify_branch_on_new_ticket()` via `pg_net` | SMS | branch | `notify-branch-sms` |
| Support ticket confirmation to customer | `notify_branch_on_new_ticket()` also calls `send-support-sms` with `kind: 'created'` when `created_by_type = 'customer'` | SMS | customer | `send-support-sms` |
| Guest OTP | `send-booking-otp` / `verify-booking-otp` | SMS/email | guest | those functions |
| Bank transfer OTP | `send-bank-transfer-otp` | SMS | customer | that function |
| Contact form | `send-contact-email` | email | company | that function |
| Rental alerts (late, expiring) | `check-rental-alerts` | `admin_alerts` rows | staff | that function |

Failures are recorded rather than swallowed — `booking-core.ts:1072-1085`
inserts a `notification_logs` row with `status: "failed"` for every failed
invoke.

GAP: `notify_branch_on_new_ticket()` embeds a Supabase URL and an anon key as
literals in the function body (`docs/01-DATABASE.md` §5), so the notification
path depends on values stored in SQL rather than in secrets.

---

## 9. Gaps: code versus the UI, and data-inconsistency risks

1. **Status transitions are unguarded** (§1.3). Any staff role can jump a
   booking to any status except the one guarded transition
   `active → completed`. The UI presents an ordered flow the server does not
   enforce.
2. **`active` with no vehicle** (§3.3). Activation without `assigned_unit_id`
   only logs a warning; no unit is marked `on_rent`.
3. **Three availability implementations disagree** (§2.2): the RPC
   (`pending/confirmed/active`), `checkBookingConflicts` (adds `draft`,
   inclusive bounds), and the deprecated `src/lib/availability.ts` (legacy
   `vehicles.is_available`).
4. **Extensions charge nothing** (§6). `total_amount` grows; no payment row,
   no availability re-check.
5. **`payment_type` / `payments.status` are unconstrained free text** (§5.1),
   with two contradictory treatments of `NULL`.
6. **Deposit figures on `final_invoices` are hard-coded to 0** at close
   (§7).
7. **Two pricing engines with duplicated constants** (§4.3); the client engine
   adds late fees into the subtotal, the server engine has no late-fee input.
8. **Age-band vocabulary is inconsistent** (§4.1 step 7): `20_24` label,
   `MIN_DRIVER_AGE = 21`, and an extra `21_25` value permitted only on
   `booking_additional_drivers`.
9. **No edge function is transactional** (see `docs/02-EDGE-FUNCTIONS.md`
   summary table). Booking creation writes `bookings`, then
   `booking_add_ons`, then `booking_additional_drivers`, then notifications; a
   failure between them leaves a priced booking whose extras rows are missing,
   which is exactly the failure mode the `createBookingAddOns` /
   `createAdditionalDrivers` error logging at `booking-core.ts:1027-1055`
   exists to detect.
10. **Overbooking is deliberate** (§2.3) and correct per the product rule, but
    combined with gaps 2 and 4 there is no downstream control that guarantees a
    physical car exists for every `active` rental.
