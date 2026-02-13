# Incident: Pricing Mismatch (400 PRICE_MISMATCH)

## Symptoms

- Customer sees "Price mismatch" error during checkout
- Edge function returns `400` with `error: "PRICE_MISMATCH"`
- Booking creation fails

## Detection

```sql
-- Check edge function logs for mismatch details
-- Search for: [price-validation] MISMATCH
```

```sql
-- Verify current vehicle rate vs what client sent
SELECT id, name, daily_rate FROM vehicles WHERE id = '<vehicle_id>';
```

```sql
-- Check system_settings for protection rates
SELECT key, value FROM system_settings
WHERE key LIKE 'protection_%_daily_rate';
```

## Root Causes

| Cause | Frequency | Fix |
|-------|-----------|-----|
| Admin changed vehicle daily_rate between page load and checkout | Common | Client retry with server total |
| Protection rate changed in system_settings | Occasional | Client retry |
| Add-on rate changed in add_ons table | Occasional | Client retry |
| Drop-off fee discrepancy (client cached stale location data) | Occasional | Client retry |
| Constant drift between `src/lib/pricing.ts` and `_shared/booking-core.ts` | Rare (bug) | Code fix: sync constants |
| Floating-point rounding divergence exceeding $0.50 | Very rare | Code fix: audit roundCents usage |

## Recovery Steps

1. **No DB recovery needed** — booking was never created (fail-closed)
2. Client should display the `serverTotal` from the error response
3. Client retries with updated total
4. If recurring, check for constant drift between client/server pricing files

## Escalation

- If mismatches exceed 5/hour → likely a config change was deployed. Check `system_settings` and `vehicles.daily_rate` recent updates
- If constants are out of sync → code deployment required

## Permanent Fix

Ensure both files share identical constants:
```
PST_RATE = 0.07, GST_RATE = 0.05
PVRT_DAILY_FEE = 1.50, ACSRCH_DAILY_FEE = 1.00
YOUNG_DRIVER_FEE = 15, WEEKEND_SURCHARGE_RATE = 0.15
WEEKLY_DISCOUNT_THRESHOLD = 7 → 10%
MONTHLY_DISCOUNT_THRESHOLD = 21 → 20%
```

Files: `src/lib/pricing.ts` and `supabase/functions/_shared/booking-core.ts`
