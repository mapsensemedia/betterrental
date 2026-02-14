# Incident Playbook: Payments Not Updating Bookings

## Classification
- **Severity**: Critical
- **Impact**: Customers pay but bookings remain in draft/pending
- **SLA**: Investigate within 15 minutes

## Detection
- Multiple bookings stuck in `draft` status despite completed payments
- Customer complaints about payment taken but no confirmation
- Gap between `payments` table entries and booking status updates

## Investigation Checklist

### Step 1: Edge Function Health
Check `stripe-webhook` function logs for errors:
- Signature verification failures
- Database connection issues
- Timeout errors

### Step 2: Webhook Delivery
Check Stripe Dashboard → Developers → Webhooks for:
- Failed delivery attempts (red indicators)
- Retry queue depth
- Last successful delivery timestamp

### Step 3: Database State
```sql
-- Find bookings with payments but wrong status
SELECT b.booking_code, b.status, p.status as payment_status, p.amount
FROM bookings b
JOIN payments p ON p.booking_id = b.id
WHERE b.status = 'draft' AND p.status = 'completed'
ORDER BY p.created_at DESC;
```

### Step 4: Idempotency Check
```sql
-- Check for duplicate transaction IDs
SELECT transaction_id, COUNT(*) 
FROM payments 
GROUP BY transaction_id 
HAVING COUNT(*) > 1;
```

## Resolution

### Automated Recovery
Re-send failed webhook events from Stripe Dashboard:
1. Go to Developers → Webhooks → select endpoint
2. Find failed events
3. Click "Resend" for each failed event

### Manual Recovery
For each stuck booking:
1. Verify payment exists in Stripe
2. Update booking status based on payment type:
   - Deposit payment → set status to `pending`
   - Full rental payment → set status to `confirmed`
3. Record in audit_logs

## Post-Incident
- Verify STRIPE_WEBHOOK_SECRET hasn't been rotated
- Check edge function deployment status
- Review rate limits on webhook endpoint
- Add monitoring alert for draft bookings older than 30 minutes
