## Resolve admin alert for booking DC487PNL

Mark the "Rental capture failed — DC487PNL" alert as resolved so it disappears from the Finance page alerts list. The row is preserved (no delete) for audit history.

### Target alert (verified in DB)
- **id:** `b94c2772-9b9b-45db-beb0-48124fb69ba2`
- **alert_type:** `payment_pending`
- **title:** `Rental capture failed — DC487PNL`
- **current status:** `pending`
- **created:** 2026-04-27 16:14:16 UTC

### Change
Run a single data update via the insert/update tool (no schema migration):

```sql
UPDATE admin_alerts
SET status      = 'resolved',
    resolved_at = now(),
    resolved_by = auth.uid()  -- will be set to NULL since run as service role; acceptable for system resolution
WHERE id = 'b94c2772-9b9b-45db-beb0-48124fb69ba2'
  AND status <> 'resolved';
```

`resolved_by` will be left `NULL` (acceptable — column is nullable and this is a system-side resolution after manual reconciliation of transaction `10000193`).

### Not in scope
- The other 3 DC487PNL alerts (`Rental Activated`, `Booking Activated`, `New Booking`) remain untouched.
- No code changes. No schema changes. No deletion.

### Verification after apply
Re-query `admin_alerts` for `id = b94c2772-...` and confirm `status = 'resolved'` and `resolved_at` is set. The Finance page's Live Alerts panel auto-refreshes (15s) and will drop it from the pending list.