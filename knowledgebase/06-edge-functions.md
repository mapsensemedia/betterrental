# Edge Functions Reference

## Shared Modules (`_shared/`)

| Module | Purpose |
|--------|---------|
| `auth.ts` | JWT validation, role enforcement, admin client factory |
| `booking-core.ts` | Pricing engine, booking CRUD helpers, OTP/access-token logic, drop-off fee computation |
| `cors.ts` | Origin-whitelisted CORS, in-memory rate limiting, input sanitization |
| `idempotency.ts` | Webhook/notification dedup via `notification_logs` table |
| `notifications.ts` | Idempotent notification dispatcher (email + SMS) |
| `rate-limit-db.ts` | Atomic DB-backed rate limiting via `check_rate_limit` RPC |

---

## create-booking

**Purpose**: Create a booking for an authenticated user.

**Auth**: JWT required. `validateAuth(req)` extracts userId.

**Rate limit**: 5 req/min per IP (in-memory).

**DB writes**: `bookings` (INSERT), `booking_add_ons` (INSERT), `booking_additional_drivers` (INSERT), `profiles` (UPSERT phone), `reservation_holds` (UPDATE if holdId).

**Security**: All financial fields from `computeBookingTotals()`. Client `totalAmount` used only for mismatch check. Fail-closed on pricing errors.

---

## create-guest-booking

**Purpose**: Create a booking for an unauthenticated user (guest checkout).

**Auth**: None required. Creates shadow auth user.

**Rate limit**: 3 req/5min per IP + 5 req/24h per email.

**DB writes**: `auth.users` (admin.createUser), `profiles` (UPSERT), `bookings` (INSERT), `booking_add_ons`, `booking_additional_drivers`.

**Security**: Same server-side pricing as `create-booking`. Shadow user gets random 40+ char password. Email rate limiting prevents abuse.

---

## persist-booking-extras

**Purpose**: Persist add-ons and additional drivers using service_role (bypasses seatbelt triggers).

**Auth**: JWT required. Two modes:
- **Checkout mode**: User must own the booking
- **Upsell mode** (`action: "upsell-add"` / `"upsell-remove"`): Requires admin/staff role

**DB writes**: `booking_add_ons` (INSERT/UPDATE/DELETE), `booking_additional_drivers` (INSERT), `audit_logs` (INSERT for upsell actions).

**Security**: Prices computed server-side. Audit trail for all staff upsell operations. Invokes `reprice-booking` after upsell mutations to update booking totals.

---

## reprice-booking

**Purpose**: Server-side recalculation of booking financial fields.

**Auth**: Admin/staff only (`requireRoleOrThrow`).

**Operations**:
- `modify`: Change `end_at`, recalculate totals for new duration
- `upgrade`: Apply upgrade daily fee, optionally assign different vehicle unit
- `remove_upgrade`: Remove upgrade fee, recalculate

**DB writes**: `bookings` (UPDATE financial fields), `audit_logs` (INSERT), optionally `vehicle_units` (UPDATE status).

**Security**: All pricing recomputed from DB values. Full old/new data in audit log.

---

## create-checkout-session

**Purpose**: Create Stripe Checkout Session for full rental payment.

**Auth**: JWT OR access token (guest). Verified via `requireBookingOwnerOrToken()`.

**DB reads**: `bookings` (total_amount — amount from DB, not client), `profiles`, `vehicles`.

**Security**: Amount is `booking.total_amount` from DB. License expiry validation against rental end date. Stripe customer upsert.

---

## create-checkout-hold

**Purpose**: Create Stripe PaymentIntent for deposit hold.

**Auth**: JWT OR access token (guest). Verified via `requireBookingOwnerOrToken()`.

**DB reads**: `bookings` (deposit_amount), `profiles`.

**Security**: Amount is `booking.deposit_amount` from DB. Idempotent — checks for existing active PaymentIntent before creating new one.

---

## create-payment-intent

**Purpose**: Create PaymentIntent for authenticated payments (staff-initiated or customer).

**Auth**: JWT required. Ownership or staff check.

**DB reads**: `bookings` (total_amount), `payments` (sum completed rentals).

**Security**: Amount = `booking.total_amount - sum(completed_payments)`. Staff may `overrideAmount` but it's capped to amount due. Integer cents computation eliminates float drift. Blocks cancelled/completed bookings.

---

## stripe-webhook

**Purpose**: Handle inbound Stripe webhook events.

**Auth**: Stripe signature verification (`stripe.webhooks.constructEvent`).

**Events handled**:
- `checkout.session.completed` → Insert payment, update booking status
- `payment_intent.succeeded` → Insert payment, update booking status
- `payment_intent.payment_failed` → Insert failed payment record
- `charge.refunded` → Insert negative-amount refund payment

**Security**: 
- Idempotent via `stripe_webhook_events` table (event_id dedup)
- Duplicate payment detection via `payments.transaction_id`
- Monotonic status guard: never downgrades booking status
- Card details extracted from PaymentIntent for booking record

---

## void-booking

**Purpose**: Admin-only booking cancellation.

**Auth**: Admin role only (`requireRoleOrThrow(userId, ["admin"])`).

**Lifecycle guard**: Cannot void `cancelled` or `completed` bookings (409).

**DB writes**: `bookings` (UPDATE status → cancelled), `vehicle_units` (release if assigned), `audit_logs` (INSERT with old/new data), `admin_alerts` (INSERT).

---

## send-booking-otp

**Purpose**: Issue OTP for guest booking verification.

**Auth**: None (guest endpoint).

**Security**: DB-backed atomic rate limiting via `check_rate_limit` RPC. OTP hashed with service_role key before storage. 10-minute expiry.

---

## verify-booking-otp

**Purpose**: Verify OTP and mint short-lived access token.

**Auth**: None (guest endpoint).

**Security**: Max 5 attempts before lockout. On success: revokes all existing tokens for booking, mints new 30-min token. Token hash stored in `booking_access_tokens`.

---

## send-booking-email / send-booking-sms

**Purpose**: Send transactional notifications.

**Auth**: Service-to-service (service_role key in Authorization header).

---

## notify-admin

**Purpose**: Send admin notifications for new bookings and events.

**Auth**: Service-to-service.

---

## generate-agreement / generate-return-receipt

**Purpose**: Generate rental agreement PDFs and return receipt documents.

**Auth**: JWT or service-to-service.

---

## get-mapbox-token / get-stripe-config

**Purpose**: Return public configuration tokens to the client.

**Auth**: None (public endpoints). Return only publishable keys.

---

## check-rental-alerts

**Purpose**: Periodic check for late returns, expiring deposits, etc.

**Auth**: Service-to-service (typically cron-invoked).

---

## create-deposit-hold / capture-deposit / release-deposit-hold

**Purpose**: Deposit lifecycle management via Stripe.

**Auth**: `capture-deposit` and `release-deposit-hold` require JWT (verify_jwt = true).

---

## close-account

**Purpose**: Close/settle a completed booking account.

**Auth**: JWT required (verify_jwt = true).

---

## calculate-fleet-costs

**Purpose**: Compute fleet cost analytics.

**Auth**: JWT required (verify_jwt = true).

---

## send-contact-email / send-support-sms

**Purpose**: Contact form and support messaging.

**Auth**: None (public endpoints with rate limiting).

---

## backfill-additional-drivers

**Purpose**: One-time migration function to backfill additional driver records.

**Auth**: None (migration utility).

---

## claim-delivery / check-ticket-escalation

**Purpose**: Delivery task management and support ticket escalation.
