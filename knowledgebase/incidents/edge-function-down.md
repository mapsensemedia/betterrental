# Incident: Edge Function Down / Unreachable

## Symptoms

- Client receives 500/502/504 errors
- Edge function logs show no invocations or crash traces
- Booking creation, payment, or OTP flows fail

## Detection

```sql
-- Check edge function HTTP logs
SELECT id, timestamp, event_message, response.status_code,
       request.method, m.function_id, m.execution_time_ms
FROM function_edge_logs
  CROSS JOIN unnest(metadata) AS m
  CROSS JOIN unnest(m.response) AS response
  CROSS JOIN unnest(m.request) AS request
WHERE m.function_id = '<function_name>'
ORDER BY timestamp DESC
LIMIT 50;
```

## Root Causes

| Cause | Detection | Fix |
|-------|-----------|-----|
| Deployment failed | No recent deployment in logs | Redeploy |
| Secret missing/expired | Logs show undefined env var | Update secret via Lovable |
| Rate limit exhaustion (in-memory) | 429 responses | Wait or restart function |
| Import error in _shared/ | Crash on first invocation | Fix import, redeploy |
| Supabase platform outage | All functions affected | Check status.supabase.com |

## Recovery

1. Check edge function logs for the specific function
2. Verify all required secrets exist (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, etc.)
3. Check for recent code changes to `_shared/` modules
4. Redeploy the function
5. Test with a curl call to verify recovery

## Escalation

If all edge functions are down simultaneously → platform-level issue. If only one function → likely a code or secret issue specific to that function.
