# 00 — OVERVIEW

Written last, after re-reading `01-DATABASE.md`, `02-EDGE-FUNCTIONS.md`,
`03-ROUTES-AND-PAGES.md`, `04-DATA-LAYER.md` and `05-BUSINESS-LOGIC.md`. This
file is a map into those five documents, not a substitute for them. Every claim
here is sourced there.

---

## 1. What this system is

C2C Car Rental. A single Vite + React 18 + TypeScript SPA served from
`c2crental.ca` (plus seven alias domains), backed by Supabase: Postgres with
row level security, Deno edge functions, storage buckets, and auth. There is no
separate application server — the SPA talks to Postgres directly through
PostgREST for reads, and to edge functions for every write that involves money,
status, or another customer's data.

Four operating branches: Surrey Newton, Langley Centre, Langley 200th Street,
Abbotsford Centre.

---

## 2. The five documents

| File | Lines | Covers |
| --- | --- | --- |
| `01-DATABASE.md` | 6178 | 65 public tables column by column, text ERD, enums, every RLS policy, all 42 database functions, all 56 triggers, dead schema |
| `02-EDGE-FUNCTIONS.md` | 8288 | Every function in `supabase/functions/` — auth model, request/response shape, tables touched, side effects, `verify_jwt` setting |
| `03-ROUTES-AND-PAGES.md` | 2067 | All 100 routes in `src/App.tsx`, guards, navigation inventory, page-by-page detail, role access matrix |
| `04-DATA-LAYER.md` | 8060 | Every hook, every mutation, duplicated logic, `src/lib` functions, generated-type drift |
| `05-BUSINESS-LOGIC.md` | 665 | Booking state machine, availability, unit assignment, the 17-step pricing formula, payment/deposit lifecycle, extensions, return/close, notifications |

---

## 3. Architecture in one page

```text
 Browser (SPA, src/)
   ├── reads  ──► PostgREST ──► Postgres tables, filtered by RLS
   ├── RPC    ──► get_category_availability, check_category_availability,
   │              check_rate_limit, has_role, is_admin_or_staff, ...
   └── writes ──► Deno edge functions (service_role) ──► Postgres
                     │
                     ├── Worldline (cards: wl-pay, wl-authorize, wl-capture, wl-webhook)
                     ├── Twilio    (all SMS)
                     ├── Resend    (all email)
                     └── Mapbox    (delivery geocoding / maps)
```

Two hard boundaries make this work:

1. **`block_sensitive_booking_updates` / `block_sensitive_booking_inserts`** —
   the browser may not write booking status or any financial column. Any such
   write must go through an edge function running as `service_role`
   (`01-DATABASE.md` §6, `05-BUSINESS-LOGIC.md` §1).
2. **`computeBookingTotals()`** in `supabase/functions/_shared/booking-core.ts`
   is the only authoritative price. Client-sent totals are re-derived and
   compared with a $0.50 tolerance, failing closed
   (`05-BUSINESS-LOGIC.md` §4.2).

---

## 4. The five flows that matter

### 4.1 Customer booking

Search/browse (category capacity from `get_category_availability`) → protection
→ extras → checkout → `create-booking` or `create-guest-booking` → server
pricing → `bookings` + `booking_add_ons` + `booking_additional_drivers` →
Worldline `wl-pay` (rental) and `wl-authorize` (deposit pre-auth) →
confirmation email/SMS + branch SMS + admin notice, guests also get an
account-setup link. Detail: `05-BUSINESS-LOGIC.md` §§2, 4, 5, 8;
`02-EDGE-FUNCTIONS.md` `create-booking`, `create-guest-booking`, `wl-pay`,
`wl-authorize`.

Overbooking is deliberate: capacity is informational and never blocks a
booking; staff assign a physical car later (`05-BUSINESS-LOGIC.md` §2.3).

### 4.2 Walk-in booking

`create-walk-in-booking` resolves or creates the customer record (email match
with a name conflict returns `customer_match_conflict` for staff to decide),
creates the booking `confirmed`, and notifies the branch. Detail:
`02-EDGE-FUNCTIONS.md` `create-walk-in-booking`.

### 4.3 Handover

Licence check → payment and deposit → additional documents → vehicle assignment
→ agreement generation and signature → walkaround → activation via
`update-booking-status` (`newStatus: "active"`), which flips the unit to
`on_rent`. Detail: `03-ROUTES-AND-PAGES.md` §3 (ops pages),
`05-BUSINESS-LOGIC.md` §§1, 3.

### 4.4 Return and close

Five-step return state machine
(`initiated → intake_done → evidence_done → issues_reviewed → closeout_done →
deposit_processed`), then `close-account` issues the final invoice and sets the
booking `completed`. `force-close-booking` is the admin escape hatch that skips
the workflow. Detail: `05-BUSINESS-LOGIC.md` §7.

### 4.5 Support

Customer raises a ticket → `support_tickets_v2` (ticket number from a database
trigger) → `trg_alert_on_new_ticket` creates an admin alert →
`trg_branch_sms_on_new_ticket` sends the branch SMS through `pg_net` and a
confirmation SMS to the customer. Detail: `01-DATABASE.md` §6,
`02-EDGE-FUNCTIONS.md` `notify-branch-sms`, `send-support-sms`.

---

## 5. Money rules, condensed

- Day count is hour-based: `ceil(hours / 24)`, minimum 1.
- Weekend surcharge 15% on Fri/Sat/Sun days, counted on the Vancouver calendar.
- Duration discounts are retired (rates are literally `0` in both engines).
- Protection is priced per group (1 / g2 minivan+standard SUV / g3 large SUV)
  from `system_settings`, with hard-coded fallbacks.
- Daily regulatory fees: PVRT $1.50 + ACSRCH $1.00 per day.
- Young driver surcharge $15/day for the `20_24` band.
- Tax: PST 7% + GST 5% on the subtotal.
- Card processing fee: tiered, computed on the **pre-tax** subtotal, added after
  tax, never itself taxed.
- Deposit is a flat $350 and never derived from the total.
- Drop-off fee from `locations.fee_group`: $0 same group, $50 Surrey↔Langley,
  $75 for any Abbotsford pairing.

Full step-by-step with quoted code: `05-BUSINESS-LOGIC.md` §4.

---

## 6. Access control, condensed

- Roles live in `user_roles` (separate table, checked through the
  `SECURITY DEFINER` functions `has_role`, `is_super_admin`,
  `is_admin_or_staff`, `is_support_or_admin`, `is_active_staff`).
- Branch scope lives in `staff_assignments` and is checked by
  `can_access_location` / `requireBookingLocationOrThrow`.
- Router guards (`AdminProtectedRoute`, `SupportProtectedRoute`,
  `DeliveryProtectedRoute`, `OpsProtectedRoute`) check **only** `user_roles`,
  never the assigned location (`03-ROUTES-AND-PAGES.md` §4).
- `/booking/:id`, `/dashboard`, `/check-in`, `/walkaround/:bookingId` have no
  router guard at all; they rely on RLS and edge-function checks.
- `FORCE ROW LEVEL SECURITY` is on the financial, incident and internal tables
  (`01-DATABASE.md` §4).

---

## 7. The gaps that carry the most risk

Ranked by blast radius. Each is documented with code at the reference given.

1. **Booking status transitions are unvalidated.** `update-booking-status`
   guards only `active → completed`. Any staff role can set any other status
   from any state; no constraint or trigger checks the transition.
   → `05-BUSINESS-LOGIC.md` §1.3
2. **A booking can be `active` with no vehicle.** Activation without
   `assigned_unit_id` logs a warning and proceeds; no unit is marked `on_rent`,
   so the same car can be handed out twice.
   → `05-BUSINESS-LOGIC.md` §3.3
3. **Extensions change the money without creating a charge.** `reprice-booking`
   raises `total_amount`, regenerates the agreement, and never inserts a
   payment row or re-checks availability.
   → `05-BUSINESS-LOGIC.md` §6
4. **`payments.payment_type` and `payments.status` are unconstrained free
   text**, and `NULL` is treated as revenue in one calculation and excluded in
   another. Revenue-versus-deposit separation rests entirely on string
   comparisons.
   → `05-BUSINESS-LOGIC.md` §5.1
5. **Three disagreeing availability implementations**: the RPC,
   `checkBookingConflicts` (counts `draft`, inclusive bounds), and the
   deprecated `src/lib/availability.ts` on the legacy `vehicles` table.
   → `05-BUSINESS-LOGIC.md` §2.2
6. **No edge function is transactional.** Booking creation writes the booking,
   then add-ons, then drivers, then notifications; a mid-sequence failure
   leaves a priced booking with missing extras.
   → `02-EDGE-FUNCTIONS.md` per-function side-effect tables,
   `05-BUSINESS-LOGIC.md` §9.9
7. **Two pricing engines, duplicated constants.** `src/lib/pricing.ts` and
   `_shared/booking-core.ts` reimplement the same formula; the client one adds
   late fees to the subtotal, the server one has no late-fee input.
   → `05-BUSINESS-LOGIC.md` §4.3
8. **Deposit columns on `final_invoices` are written as zeros** at close,
   independent of `deposit_ledger` and `bookings.deposit_status`.
   → `05-BUSINESS-LOGIC.md` §7
9. **Inconsistent driver-age vocabulary**: band `20_24`, constant
   `MIN_DRIVER_AGE = 21`, and a third value `21_25` accepted only on
   `booking_additional_drivers`.
   → `05-BUSINESS-LOGIC.md` §4.1
10. **`vehicle_units.status` is unconstrained free text**, evidenced by the
    availability RPC excluding both `damage` and `damaged`, and it is written
    from six places including two client files.
    → `05-BUSINESS-LOGIC.md` §3.3
11. **Router guards ignore branch scope**; location isolation for managers
    depends on edge functions and RLS, not on routing.
    → `03-ROUTES-AND-PAGES.md` §4
12. **A database function embeds a project URL and anon key as SQL literals**
    (`notify_branch_on_new_ticket`), so a notification path depends on values
    baked into SQL rather than secrets.
    → `01-DATABASE.md` §5

---

## 8. Where to start reading, by question

| Question | Read |
| --- | --- |
| What does this column mean? | `01-DATABASE.md` §1 |
| Who can read or write this table? | `01-DATABASE.md` §4 |
| What happens automatically on insert/update? | `01-DATABASE.md` §6 |
| What does this endpoint do and who may call it? | `02-EDGE-FUNCTIONS.md`, alphabetical by function |
| What page is this URL, and who can see it? | `03-ROUTES-AND-PAGES.md` §§1, 4 |
| Where does this screen get its data? | `04-DATA-LAYER.md` §1 |
| Why is this number what it is? | `05-BUSINESS-LOGIC.md` §4 |
| Why did this booking change state? | `05-BUSINESS-LOGIC.md` §1 |
| Who was texted, and why? | `05-BUSINESS-LOGIC.md` §8 |
| What is likely to break? | §7 above, then the referenced `GAP:` lines |
