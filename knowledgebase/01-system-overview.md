# System Overview

## Platform Description

A production car-rental platform serving the British Columbia (Canada) market. Customers browse vehicles, configure rentals (protection, add-ons, delivery), and pay via Stripe. Staff manage bookings through an ops panel with full lifecycle controls including activation, vehicle upgrades, returns, and account closure.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      BROWSER (React/Vite)                   │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Checkout  │  │ Booking Mgmt │  │ Admin Ops Panel    │    │
│  │ Flow      │  │ (Customer)   │  │ (Staff/Admin)      │    │
│  └─────┬─────┘  └──────┬───────┘  └─────────┬──────────┘    │
│        │               │                    │               │
│        ▼               ▼                    ▼               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Supabase JS Client (anon key)              │   │
│  │  - RLS-filtered reads                                │   │
│  │  - Seatbelt triggers block financial writes          │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE EDGE FUNCTIONS                   │
│  (Deno runtime, service_role key)                           │
│                                                             │
│  create-booking        create-guest-booking                 │
│  persist-booking-extras    reprice-booking                   │
│  create-checkout-session   create-checkout-hold              │
│  create-payment-intent     stripe-webhook                   │
│  void-booking              send-booking-email/sms           │
│  notify-admin              generate-agreement               │
│  ...30+ functions                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ service_role
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     POSTGRESQL (Supabase)                    │
│                                                             │
│  RLS + FORCE RLS on all sensitive tables                    │
│  Seatbelt triggers: block_sensitive_booking_updates,        │
│    enforce_addon_price, enforce_driver_fee                  │
│  Booking code generation trigger                            │
│  Audit logging via audit_logs table                         │
│  Atomic rate limiting via check_rate_limit RPC              │
│  VIN assignment via release_vin_from_booking RPC            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     STRIPE (External)                       │
│  Checkout Sessions, PaymentIntents, Webhooks                │
│  Deposit holds, refunds                                     │
└─────────────────────────────────────────────────────────────┘
```

## Trust Boundaries

| Boundary | Trusted Side | Untrusted Side | Enforcement |
|----------|-------------|----------------|-------------|
| Client ↔ Edge | Edge functions | Browser client | Server-side price computation, JWT validation |
| Edge ↔ DB | service_role writes | anon/authenticated reads | RLS + FORCE RLS, seatbelt triggers |
| Client ↔ DB | Read-only (RLS filtered) | All client writes to financial fields | `trg_block_sensitive_booking_updates` rejects non-service_role |
| Stripe ↔ Edge | Webhook signature verification | Raw webhook payload | `stripe.webhooks.constructEvent()` |
| Guest ↔ System | OTP-minted access tokens | Unauthenticated requests | Rate limiting (IP + email), OTP attempt limits |

## Client vs Server Responsibilities

### Client is responsible for:
- **Display-only pricing preview** (`src/lib/pricing.ts`) — used to show estimated totals in the UI
- Authentication state management
- Form validation (client-side, duplicated server-side)
- Navigating the checkout flow

### Client is explicitly NOT trusted for:
- Any pricing or financial values — all are recomputed server-side
- Booking status transitions
- Add-on prices, driver fees, delivery fees
- Payment amounts (derived from DB booking records)

### Server (Edge Functions) is responsible for:
- **Canonical price computation** via `computeBookingTotals()` in `_shared/booking-core.ts`
- Price validation against client-sent totals (fail-closed)
- All booking creation and financial field updates
- Payment amount determination (from DB, never from client)
- Rate limiting, OTP issuance/verification, access token minting
- Notification dispatch (email, SMS, admin alerts)

## Why Edge Functions Exist

Edge functions exist because **the client cannot be trusted with financial data**. Specifically:

1. **Server-side price computation**: The client shows estimated prices for UX, but all booking financial fields (`subtotal`, `tax_amount`, `total_amount`, `deposit_amount`, etc.) are computed by `computeBookingTotals()` on the server. The client total is compared against the server total — if it differs by more than $0.50, the booking is rejected.

2. **Database trigger bypass**: Seatbelt triggers (`trg_block_sensitive_booking_updates`, `trg_enforce_addon_price`, `trg_enforce_driver_fee`) reject any non-service_role attempt to write financial fields. Edge functions use service_role to legitimately write these fields.

3. **Stripe integration**: Secret keys must not exist in the client. Edge functions hold `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

4. **Guest authentication**: Guest users get OTP-based access tokens that are minted and validated server-side.

5. **Audit trail**: All sensitive operations (void, reprice, upsell) are logged to `audit_logs` with full old/new data snapshots.

## Security Model Summary

- **Authentication**: Supabase Auth (email/password). Guest users get shadow accounts with random passwords.
- **Authorization**: `user_roles` table with `admin`, `staff`, `cleaner`, `finance` roles. Edge functions use `requireRoleOrThrow()`.
- **RLS**: Enabled on all tables. `FORCE ROW LEVEL SECURITY` on financial/incident/damage tables.
- **Seatbelt triggers**: Fail-closed triggers that RAISE EXCEPTION if non-service_role attempts to modify financial fields.
- **Rate limiting**: Dual-layer — in-memory per-instance (`_shared/cors.ts`) and atomic DB-backed (`_shared/rate-limit-db.ts` via `check_rate_limit` RPC).
- **CORS**: Origin-whitelisted, not wildcard (except Stripe webhooks).
- **Idempotency**: Webhook deduplication via `stripe_webhook_events` table + `notification_logs` for notification dedup.
- **Input sanitization**: Email normalization, phone sanitization, string length truncation on all user inputs.
