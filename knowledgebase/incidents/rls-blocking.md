# Incident: RLS Blocking Legitimate Operations

## Symptoms

- Edge function returns empty results or permission denied
- Client queries return 0 rows when data exists
- Staff operations fail silently (no error, no data)

## Detection

```sql
-- Check if RLS is enabled and forced
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;
```

```sql
-- Check policies on a specific table
SELECT polname, polcmd, polroles, polqual, polwithcheck
FROM pg_policy
WHERE polrelid = 'public.bookings'::regclass;
```

```sql
-- Check DB logs for RLS violations
SELECT identifier, timestamp, event_message, parsed.error_severity
FROM postgres_logs
  CROSS JOIN unnest(metadata) AS m
  CROSS JOIN unnest(m.parsed) AS parsed
WHERE parsed.error_severity = 'ERROR'
ORDER BY timestamp DESC
LIMIT 50;
```

## Root Causes

| Cause | Detection | Fix |
|-------|-----------|-----|
| Edge function using anon key instead of service_role | Check function's Supabase client init | Use `createAdminClient()` from `_shared/auth.ts` |
| Missing SELECT policy for user's role | `pg_policy` query | Add appropriate policy |
| FORCE RLS blocking table owner | `relforcerowsecurity = true` | Expected — use service_role client |
| Policy references `auth.uid()` but function runs service-to-service | No JWT in context | Use service_role or pass JWT |

## Recovery

1. Identify which table is blocking
2. Check if the operation should use service_role (financial writes always should)
3. If it's a client-side query, verify the user has a valid JWT and the policy matches
4. If it's a new table, ensure policies were created in the migration

## Key Principle

FORCE RLS tables (bookings, payments, deposit_ledger, final_invoices, damage_reports, incident_cases, incident_photos, incident_repairs) enforce policies even for the table owner. All writes to these tables from edge functions MUST use the service_role admin client.
