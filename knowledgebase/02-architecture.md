# Architecture

## Frontend → Edge → DB Flow

### Booking Creation (Authenticated User)

```
Browser                    create-booking EF              PostgreSQL
  │                              │                            │
  ├── POST /create-booking ──────►                            │
  │   {vehicleId, dates,         │                            │
  │    addOns, totalAmount}      │                            │
  │                              ├── validateAuth(req) ───────┤
  │                              │   JWT → user_id            │
  │                              │                            │
  │                              ├── computeBookingTotals() ──┤
  │                              │   Reads: vehicles,         │
  │                              │   add_ons, system_settings,│
  │                              │   locations (fee_group)    │
  │                              │                            │
  │                              ├── |client - server| > $0.50?
  │                              │   YES → 400 PRICE_MISMATCH │
  │                              │   NO  → continue           │
  │                              │                            │
  │                              ├── INSERT bookings ─────────►
  │                              │   (service_role bypasses    │
  │                              │    trg_block_sensitive)     │
  │                              │                            │
  │                              ├── INSERT booking_add_ons ──►
  │                              │   (service_role bypasses    │
  │                              │    trg_enforce_addon_price) │
  │                              │                            │
  ◄── {bookingId, bookingCode} ──┤                            │
```

### Payment Flow (Stripe)

```
Browser                    Edge Functions              Stripe            PostgreSQL
  │                              │                      │                    │
  ├── POST /create-checkout-hold ►                      │                    │
  │   {bookingId}                │                      │                    │
  │                              ├── requireBookingOwnerOrToken()             │
  │                              │   (auth OR OTP token)│                    │
  │                              │                      │                    │
  │                              ├── booking.deposit_amount                  │
  │                              │   (from DB, not client)                   │
  │                              │                      │                    │
  │                              ├── stripe.paymentIntents.create() ──►     │
  │                              │                      │                    │
  ◄── {clientSecret} ───────────┤                      │                    │
  │                              │                      │                    │
  ├── stripe.confirmCardPayment()─────────────────────►│                    │
  │                              │                      │                    │
  │                              │   Webhook ◄──────────┤                    │
  │                              │   payment_intent.    │                    │
  │                              │   succeeded          │                    │
  │                              │                      │                    │
  │                              ├── Idempotency check ─────────────────────►
  │                              ├── INSERT payments ───────────────────────►
  │                              ├── UPDATE bookings.status ────────────────►
  │                              │   (monotonic guard)  │                    │
```

## Pricing Trust Boundaries

The system implements a **trust-no-client** pricing model:

1. **Client-side** (`src/lib/pricing.ts`): `calculateBookingPricing()` computes preview totals for UI display. This is explicitly labeled "display-only" in comments.

2. **Server-side** (`_shared/booking-core.ts`): `computeBookingTotals()` is the canonical pricing engine. It reads all prices from the database:
   - `vehicles.daily_rate` — base rate
   - `add_ons.daily_rate` / `add_ons.one_time_fee` — add-on prices
   - `system_settings` — protection rates, additional driver rates
   - `locations.fee_group` — drop-off fee tier computation

3. **Reconciliation**: `validateClientPricing()` compares `|server.total - client.total|` against a `$0.50` tolerance. If exceeded, the booking is rejected with `PRICE_MISMATCH`.

4. **Fail-closed**: If `computeBookingTotals()` throws an exception, the booking is rejected with `PRICE_VALIDATION_FAILED`. The system never falls back to client-supplied prices.

## Service Role Usage

The `SUPABASE_SERVICE_ROLE_KEY` is used exclusively in edge functions via `getAdminClient()`. It bypasses RLS and seatbelt triggers. Usage:

| Function | Why service_role is needed |
|----------|--------------------------|
| `create-booking` | Write financial fields to bookings table |
| `create-guest-booking` | Create shadow auth user + write bookings |
| `persist-booking-extras` | Write to booking_add_ons (bypasses trg_enforce_addon_price) |
| `reprice-booking` | Update booking financial fields (bypasses trg_block_sensitive) |
| `stripe-webhook` | Update booking status + insert payments |
| `void-booking` | Update booking status to cancelled |
| `create-checkout-hold` | Read booking.deposit_amount for Stripe PI amount |

## Triggers and RLS

### Seatbelt Triggers (Defense-in-Depth)

| Trigger | Table | Purpose |
|---------|-------|---------|
| `trg_block_sensitive_booking_updates` | `bookings` | Blocks non-service_role updates to: status, subtotal, tax_amount, total_amount, deposit_amount, delivery_fee, different_dropoff_fee, upgrade_daily_fee, young_driver_fee, daily_rate |
| `trg_enforce_addon_price` | `booking_add_ons` | Zeros out `price` field for non-service_role inserts/updates |
| `trg_enforce_driver_fee` | `booking_additional_drivers` | Zeros out `young_driver_fee` for non-service_role inserts/updates |

### RLS + FORCE RLS

`FORCE ROW LEVEL SECURITY` is enabled on:
- `bookings`, `payments` (financial)
- `deposit_ledger`, `deposit_jobs` (financial)
- `damage_reports`, `incident_cases`, `incident_photos`, `incident_repairs` (incident/damage)
- `rate_limits`, `booking_access_tokens` (internal auth)

This means even the table owner is subject to RLS policies. Only `service_role` bypasses.

### Policy Pattern

Most tables follow this pattern:
- Users: SELECT own rows (`auth.uid() = user_id`)
- Staff: INSERT + UPDATE (via `is_admin_or_staff(auth.uid())`)
- No DELETE for financial/incident tables (audit trail preservation)

## Auth Model

### Authenticated Users
1. Standard Supabase Auth (email/password)
2. JWT in `Authorization: Bearer <token>` header
3. `validateAuth(req)` extracts `userId` from JWT
4. Role check via `user_roles` table: `requireRoleOrThrow(userId, ["admin", "staff"])`

### Guest Users
1. Guest checkout creates a shadow auth user with random password + `is_guest: true` metadata
2. Post-booking: guest receives OTP via SMS/email
3. OTP verification mints a short-lived access token (30 min TTL)
4. Access token is used for payment flows via `requireBookingOwnerOrToken()`

### Access Token Flow
```
Guest → send-booking-otp → OTP hash stored in booking_otps
Guest → verify-booking-otp → OTP verified → access_token minted → stored in booking_access_tokens
Guest → create-checkout-hold(accessToken) → validateAccessToken() → proceed
```

## Stripe Integration

### Components
- **`create-checkout-session`**: Creates Stripe Checkout Session for full rental payment
- **`create-checkout-hold`**: Creates PaymentIntent for deposit hold ($350 minimum)
- **`create-payment-intent`**: Creates PaymentIntent for staff-initiated or partial payments
- **`stripe-webhook`**: Handles `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- **`create-deposit-hold`** / **`capture-deposit`** / **`release-deposit-hold`**: Deposit lifecycle management

### Security
- Webhook signature verification via `stripe.webhooks.constructEvent()`
- Idempotency via `stripe_webhook_events` table (event_id dedup)
- Monotonic status guard: webhooks never downgrade booking status
- Payment amounts derived from DB booking records, never from client
- Duplicate payment detection via `payments.transaction_id` partial unique index
