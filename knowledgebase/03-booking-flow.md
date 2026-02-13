# Booking Flow

## Overview

Two booking creation paths exist: authenticated and guest. Both converge on the same server-side pricing engine (`computeBookingTotals`) and produce identical booking records. The key difference is authentication and user account handling.

## Authenticated Booking Flow

### Call Order

```
1. Client: POST /functions/v1/create-booking
   ├── Rate limit check (5 req/min per IP)
   ├── JWT validation → userId
   ├── Input validation (vehicleId, locationId, dates, ageBand)
   ├── validateClientPricing()
   │   └── computeBookingTotals() (server-side canonical pricing)
   │       ├── Read vehicles.daily_rate
   │       ├── Read add_ons.daily_rate, one_time_fee
   │       ├── Read system_settings (protection rates, driver rates)
   │       ├── computeDropoffFee() → locations.fee_group lookup
   │       └── Return ServerPricingResult
   ├── |server.total - client.total| > $0.50? → 400 PRICE_MISMATCH
   ├── Phone sanitization + profile upsert
   ├── Hold verification (if holdId provided)
   ├── Conflict check (overlapping bookings)
   ├── INSERT bookings (service_role, server-computed totals)
   ├── INSERT booking_add_ons (service_role, server-computed prices)
   ├── INSERT booking_additional_drivers (service_role, server-computed fees)
   ├── Convert hold to "converted" (if holdId)
   └── Fire notifications (email, SMS, admin)

2. Client: POST /functions/v1/persist-booking-extras (if extras selected post-creation)
   ├── JWT validation → userId
   ├── Ownership check (booking.user_id === auth.userId)
   ├── computeBookingTotals() with extras
   ├── INSERT booking_add_ons (service_role)
   └── INSERT booking_additional_drivers (service_role)

3. Client: POST /functions/v1/create-checkout-session OR create-checkout-hold
   ├── JWT validation → userId  (or accessToken for guests)
   ├── requireBookingOwnerOrToken()
   ├── Amount from DB: booking.total_amount (checkout) or booking.deposit_amount (hold)
   └── Stripe API call → return clientSecret/sessionUrl
```

### Status Transitions

```
draft ──(pay-now selected)──► draft ──(payment succeeded)──► confirmed
  │                                                              │
  └──(pay-later selected)──► pending ──(payment succeeded)──► confirmed
                                                                 │
                                                          (staff activates)
                                                                 │
                                                              active
                                                                 │
                                                          (return completed)
                                                                 │
                                                             completed
```

## Guest Booking Flow

### Call Order

```
1. Client: POST /functions/v1/create-guest-booking
   ├── Rate limit: 3 req/5min per IP + 5 req/24h per email
   ├── Input validation (name, email, phone, vehicleId, dates)
   ├── Email/phone sanitization
   ├── validateClientPricing() (same as authenticated)
   ├── Conflict check
   ├── Find or create user:
   │   ├── Check profiles.email → existing user? Use that ID
   │   └── No match → auth.admin.createUser() with random password
   │       └── user_metadata: { is_guest: true, created_via: "guest_checkout" }
   ├── Upsert profile with name + phone
   ├── createBookingRecord() (shared helper, service_role)
   ├── createBookingAddOns() (shared helper)
   ├── createAdditionalDrivers() (shared helper)
   └── sendBookingNotifications()

2. Guest receives booking confirmation with OTP
   └── POST /functions/v1/send-booking-otp
       ├── DB-backed rate limiting (atomic RPC)
       ├── Generate 6-digit OTP
       ├── Hash with service_role key
       └── Store in booking_otps (expires in 10 min)

3. Guest verifies OTP to get access token
   └── POST /functions/v1/verify-booking-otp
       ├── verifyOtpAndMintToken()
       ├── Hash comparison
       ├── Attempt tracking (max 5 attempts, then locked)
       ├── On success: mint 30-min access token
       └── Store hash in booking_access_tokens

4. Guest proceeds to payment with access token
   └── POST /functions/v1/create-checkout-hold
       ├── requireBookingOwnerOrToken(bookingId, null, accessToken)
       └── Same Stripe flow as authenticated
```

## Hold Flow

The hold flow (`reservation_holds` table) is optional and used for real-time availability locking during checkout:

```
1. Client requests hold (not via edge function — direct DB insert with RLS)
   └── INSERT reservation_holds { vehicle_id, user_id, status: "active", expires_at: +15min }

2. create-booking checks hold validity:
   ├── Hold exists for user + booking vehicle?
   ├── Hold not expired? (expires_at > now())
   ├── If expired → update status to "expired", return 400
   └── If valid → proceed with booking

3. On successful booking:
   └── UPDATE reservation_holds SET status = "converted"

4. On conflict (vehicle booked by another):
   └── UPDATE reservation_holds SET status = "expired"
```

## create-booking (Detailed)

**File**: `supabase/functions/create-booking/index.ts`

**Auth**: JWT required (validates via `validateAuth()`)

**Rate limit**: 5 requests per minute per IP

**Input fields accepted** (from request body):
- `holdId` (optional), `vehicleId`, `locationId`, `startAt`, `endAt`
- `userPhone`, `driverAgeBand` (required: "20_24" or "25_70")
- `protectionPlan`, `addOns` (only `{addOnId, quantity}` — price ignored)
- `additionalDrivers` (only `{driverName, driverAgeBand}` — fee ignored)
- `notes`, `deliveryFee`, `returnLocationId`
- `totalAmount` (client-side total — used ONLY for mismatch check)
- `paymentMethod` ("pay-now" → draft, "pay-later" → pending)
- Pickup/delivery fields

**Security invariant**: ALL financial fields in the INSERT come from `serverTotals`, never from the request body.

**Failure states**:
- `401` — Missing/invalid JWT
- `400` — Missing required fields, invalid age band
- `400 PRICE_VALIDATION_FAILED` — `computeBookingTotals()` threw an exception (fail-closed)
- `400 PRICE_MISMATCH` — Server total differs from client total by >$0.50
- `400 reservation_expired` — Hold expired or not found
- `409 vehicle_unavailable` — Conflicting booking exists
- `429` — Rate limited
- `500 booking_failed` — DB insert failed

## persist-booking-extras

**File**: `supabase/functions/persist-booking-extras/index.ts`

**Purpose**: Persists `booking_add_ons` and `booking_additional_drivers` using service_role (required to bypass seatbelt triggers). Supports two modes:

1. **Checkout flow** (default): Authenticated user persists all extras at once. Ownership check: `booking.user_id === auth.userId`.

2. **Staff upsell** (`action: "upsell-add"` or `"upsell-remove"`): Staff adds/removes individual add-ons at the counter. Requires `isAdminOrStaff()`. After mutation, invokes `reprice-booking` to update booking totals.

**Upsell-add flow**:
1. Validate add-on exists and is active
2. Read existing booking_add_ons + additional_drivers for full pricing context
3. Merge new add-on into existing set
4. `computeBookingTotals()` with full context
5. Upsert booking_add_ons row (server-computed price)
6. Audit log with old/new data
7. Invoke `reprice-booking` to update booking totals

## reprice-booking

**File**: `supabase/functions/reprice-booking/index.ts`

**Auth**: Admin/staff only (`requireRoleOrThrow`)

**Operations**:

| Operation | Purpose | Fields Updated |
|-----------|---------|----------------|
| `modify` | Extend/shorten rental duration | `end_at`, `total_days`, `subtotal`, `tax_amount`, `total_amount`, `young_driver_fee`, `different_dropoff_fee` |
| `upgrade` | Apply vehicle upgrade daily fee | `upgrade_daily_fee`, `subtotal`, `tax_amount`, `total_amount`, optional unit assignment |
| `remove_upgrade` | Remove upgrade fee | `upgrade_daily_fee → 0`, recalculated totals |

All operations:
1. Read current booking + add-ons total + protection rate + drop-off fee
2. Recompute totals via local `computeTotals()` function
3. UPDATE bookings with new financial fields (service_role)
4. INSERT audit_logs with old/new data snapshot
