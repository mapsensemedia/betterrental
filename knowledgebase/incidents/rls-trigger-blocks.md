# Incident Playbook: RLS / Trigger Blocks Writes

## Classification
- **Severity**: High
- **Impact**: Frontend operations fail with 400/403 errors
- **SLA**: Investigate within 30 minutes

## Detection
- PATCH/POST requests to bookings returning 400
- Error message: "Client updates to booking financial/status fields are not allowed"
- Error message: "Booking financial fields can only be set via service_role"
- Error message: "Price cannot be set by non-service roles"

## Root Cause
The database has three defensive triggers:

1. **`trg_block_sensitive_booking_updates`** — Blocks client-side updates to:
   - `status`, `subtotal`, `tax_amount`, `total_amount`, `deposit_amount`
   - `delivery_fee`, `different_dropoff_fee`, `upgrade_daily_fee`
   - `young_driver_fee`, `daily_rate`

2. **`trg_block_sensitive_booking_inserts`** — Blocks client-side inserts with non-zero financial fields

3. **`trg_enforce_addon_price`** / **`trg_enforce_driver_fee`** — Blocks client-side price/fee writes on join tables

## Investigation

### Step 1: Identify the Offending Code
Check browser Network tab for the failing request:
- Which table is being written to?
- Which fields are being changed?
- Is this a client-side or edge function call?

### Step 2: Check Role Detection
The triggers check multiple role indicators:
```sql
jwt_role = current_setting('request.jwt.claim.role', true)
pg_role = current_setting('role', true)
sess_role = session_user
```
All three must indicate non-service-role for the block to trigger.

## Resolution

### If Client Code is Writing Protected Fields
This is the CORRECT behavior — the trigger is working as designed.
Fix: Move the write to an edge function that uses `getAdminClient()`.

### If Edge Function is Being Blocked
Check that the edge function uses `getAdminClient()` (service_role):
```typescript
import { getAdminClient } from "../_shared/auth.ts";
const supabase = getAdminClient(); // Uses SUPABASE_SERVICE_ROLE_KEY
```

### Known Safe Fields (Client Can Update)
These fields are NOT blocked by triggers:
- `notes`, `pickup_contact_name`, `pickup_contact_phone`
- `special_instructions`, `save_time_at_counter`
- `return_state`, `actual_return_at`
- `return_*` timestamps and completion fields

## Prevention
- ESLint rule `no-unsafe-db-writes` catches `from("bookings").update()` in frontend
- All financial/status writes must go through edge functions
- Test new features against the trigger list before deployment
