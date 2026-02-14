# Release Readiness Checklist

## Pre-Launch Verification

### 1. Environment Variables & Secrets
- [ ] `STRIPE_SECRET_KEY` — Live mode key configured
- [ ] `STRIPE_WEBHOOK_SECRET` — Matches live webhook endpoint
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Set and not expired
- [ ] `RESEND_API_KEY` — Valid for production email sending
- [ ] `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` — Live SMS
- [ ] `MAPBOX_PUBLIC_TOKEN` — Valid for map rendering
- [ ] `VITE_SUPABASE_URL` — Points to production project
- [ ] All secrets verified in Cloud View → Settings → Secrets

### 2. Stripe Configuration
- [ ] Webhook endpoint registered: `https://<project>.supabase.co/functions/v1/stripe-webhook`
- [ ] Events subscribed: `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`
- [ ] Test transaction processed successfully in test mode
- [ ] Live mode keys swapped from test keys

### 3. Database Security
- [ ] Run `supabase--linter` — zero critical warnings
- [ ] RLS enabled on all public tables
- [ ] Confirm `trg_block_sensitive_booking_updates` is active
- [ ] Confirm `trg_block_sensitive_booking_inserts` is active
- [ ] Confirm `trg_enforce_addon_price` is active
- [ ] Confirm `trg_enforce_driver_fee` is active
- [ ] FORCE ROW LEVEL SECURITY on incident/damage tables
- [ ] No `service_role` key exposed in frontend code (ESLint guard passes)

### 4. Rate Limits
- [ ] OTP: 3 requests per 5 minutes per booking (DB-backed)
- [ ] Booking creation: 5 requests per 60 seconds per IP
- [ ] Checkout hold: 3 per minute per IP
- [ ] Guest booking: 3 per minute per IP

### 5. Permissions & Roles
- [ ] Admin users can access `/admin/*`
- [ ] Staff users can access `/ops/*`
- [ ] Support users can access `/support/*`
- [ ] Delivery drivers can access `/delivery/*`
- [ ] Regular users CANNOT access any admin/ops routes
- [ ] Unauthenticated users can browse and search vehicles

### 6. Edge Functions Deployed
- [ ] All functions in `supabase/functions/` are deployed
- [ ] Critical functions verified:
  - `create-booking`
  - `create-guest-booking`
  - `stripe-webhook`
  - `create-payment-intent`
  - `close-account`
  - `reprice-booking`
  - `void-booking`
  - `generate-agreement`

### 7. Mobile Layout
- [ ] Homepage renders correctly on 375px width
- [ ] Search page filters usable on mobile
- [ ] Checkout form fields accessible on mobile
- [ ] Admin dashboard has responsive sidebar

### 8. Backup & Recovery
- [ ] Database backup schedule configured
- [ ] Know how to rollback a migration (see knowledgebase/runbooks/)
- [ ] Edge function code in version control
- [ ] `.env` values documented (not in repo)

### 9. Monitoring & Alerting
- [ ] Edge function logs accessible in Cloud View
- [ ] Admin Debug view available at `/admin/debug/:bookingId`
- [ ] Booking pricing reconciliation visible in debug view
- [ ] Incident playbooks documented in `/knowledgebase/incidents/`

### 10. Final Smoke Test
- [ ] Complete a full booking flow (search → checkout → confirmation)
- [ ] Verify Stripe payment processes
- [ ] Verify email confirmation sent
- [ ] Verify SMS notification sent
- [ ] Verify booking appears in admin panel
- [ ] Complete a return flow (intake → evidence → closeout)
- [ ] Verify final invoice generated
- [ ] Verify deposit released/captured correctly

## Go / No-Go Decision
All items above must be checked. Any unchecked item is a blocker.
