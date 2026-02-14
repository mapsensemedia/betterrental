# Runbook: Stripe Webhook Not Firing

## Symptoms
- "Pay Now" bookings stuck in `draft` status
- No payment records appearing in `payments` table
- Customer completed Stripe checkout but booking not confirmed

## Diagnosis Steps

### 1. Check Webhook Endpoint
The webhook URL should be:
```
https://bsvsveoaihtbsteqikvp.supabase.co/functions/v1/stripe-webhook
```

### 2. Check Edge Function Logs
Look for `stripe-webhook` function logs:
- `Webhook signature verification failed` → STRIPE_WEBHOOK_SECRET mismatch
- `Event already processed` → Idempotency working correctly (not an error)
- `Booking not found` → Metadata missing `booking_id`

### 3. Check Stripe Dashboard
In Stripe Dashboard → Developers → Webhooks:
- Verify endpoint is active
- Check for failed delivery attempts
- Look at event payload for correct metadata

### 4. Verify Secrets
Ensure `STRIPE_WEBHOOK_SECRET` in Cloud secrets matches the Stripe webhook signing secret.

## Resolution Actions

| Cause | Action |
|-------|--------|
| Wrong webhook secret | Update STRIPE_WEBHOOK_SECRET in Cloud secrets |
| Endpoint not registered | Add webhook endpoint in Stripe Dashboard |
| Missing booking metadata | Check `create-checkout-session` edge function |
| Edge function down | Redeploy `stripe-webhook` function |
| Duplicate event | Normal — idempotency guard working |

## Manual Recovery
If a payment was received but booking not updated:
1. Find the payment in Stripe Dashboard
2. Get the `booking_id` from payment metadata
3. Use admin panel to manually update booking status
4. Add audit log entry explaining manual intervention

## Prevention
- Webhook signing secret must match between Stripe and Cloud
- Always include `booking_id` in Stripe session metadata
- Partial unique index on `payments(transaction_id)` prevents duplicates
