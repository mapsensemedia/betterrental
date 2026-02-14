# Runbook: Booking Creation Failures

## Symptoms
- Customer sees "Failed to create booking" error
- Edge function `create-booking` returns 400/500
- Booking not appearing in admin panel

## Diagnosis Steps

### 1. Check Edge Function Logs
Look for `create-booking` logs in Cloud View → Edge Functions:
- `PRICE_VALIDATION_FAILED` → Server-side pricing computation threw an error
- `PRICE_MISMATCH` → Client total doesn't match server computation
- `reservation_expired` → Hold timed out before checkout completed
- `vehicle_unavailable` → Concurrent booking conflict (409)
- `age_validation_failed` → Missing/invalid driver age band

### 2. Check Rate Limiting
The endpoint allows 5 requests per 60 seconds per IP.
If customer hit the limit → 429 response with `retryAfter`.

### 3. Check Database Triggers
If booking insert fails with "Booking financial fields can only be set via service_role":
- The `trg_block_sensitive_booking_inserts` trigger is rejecting the insert
- Ensure `create-booking` uses `getAdminClient()` (service_role)
- Check if JWT claim detection is working (see `block_sensitive_booking_inserts()`)

### 4. Check Payment Flow
For "pay-now" bookings:
- Initial status is `draft`
- Booking only becomes `pending` after Stripe webhook confirms payment
- If webhook fails → booking stays as `draft` (invisible to ops)

## Resolution Actions

| Cause | Action |
|-------|--------|
| PRICE_MISMATCH | Check `pricing.ts` vs `booking-core.ts` computation |
| Hold expired | Customer must restart checkout |
| Vehicle unavailable | Check for conflicting bookings in DB |
| Rate limited | Wait for window reset |
| Trigger block | Verify edge function uses service_role |
| Webhook failure | Check `stripe-webhook` logs, verify STRIPE_WEBHOOK_SECRET |

## Prevention
- Server-side pricing is the single source of truth (PR7)
- All financial writes go through edge functions
- Client totals are validated but never stored
