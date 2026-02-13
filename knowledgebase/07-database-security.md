# Database Security

## Row Level Security (RLS)

RLS is enabled on ALL tables in the public schema. This means every query from the client (using anon or authenticated roles) is filtered by RLS policies.

### FORCE ROW LEVEL SECURITY

`FORCE ROW LEVEL SECURITY` is enabled on the following tables, meaning RLS applies even to table owners:

| Table | Category | Migration |
|-------|----------|-----------|
| `bookings` | Financial | `20260212234839` |
| `payments` | Financial | `20260212234839` |
| `deposit_ledger` | Financial | implicit |
| `deposit_jobs` | Financial | implicit |
| `damage_reports` | Incident | `20260213033141` |
| `incident_cases` | Incident | `20260213033141` |
| `incident_photos` | Incident | `20260213033141` |
| `incident_repairs` | Incident | `20260213033141` |
| `rate_limits` | Internal | `20260213001241` |
| `booking_access_tokens` | Internal | implicit |

**Why FORCE RLS?**: Without `FORCE`, a table owner (the database user that created the table) bypasses RLS policies entirely. Since Supabase's `postgres` role owns the tables, and some administrative tools or superuser connections use this role, `FORCE RLS` ensures that even those connections are subject to policy checks. Only `service_role` (used by edge functions) bypasses FORCE RLS.

## Seatbelt Triggers

Seatbelt triggers are fail-closed triggers that `RAISE EXCEPTION` to prevent unauthorized writes. They check `current_setting('request.jwt.claim.role', true)` — if it's not `service_role`, the write is blocked.

### trg_block_sensitive_booking_updates

**Table**: `bookings`  
**Event**: BEFORE UPDATE  
**Function**: `public.block_sensitive_booking_updates()`  
**Migration**: `20260212234839`

**Protected columns**:
- `status` — Booking lifecycle state
- `subtotal` — Pre-tax total
- `tax_amount` — Combined PST + GST
- `total_amount` — Final total
- `deposit_amount` — Security deposit
- `delivery_fee` — Delivery charge
- `different_dropoff_fee` — Drop-off fee
- `upgrade_daily_fee` — Vehicle upgrade surcharge
- `young_driver_fee` — Under-25 surcharge
- `daily_rate` — Base vehicle rate

**Behavior**: If any of these columns change in an UPDATE and the JWT role is not `service_role`, the trigger raises:
```
Client updates to booking financial/status fields are not allowed
```

**Design intent**: The client (anon or authenticated role) can update non-financial booking fields (e.g., notes, pickup_contact_name) but cannot modify pricing or status. All financial and status changes must go through edge functions that use service_role.

### trg_enforce_addon_price

**Table**: `booking_add_ons`  
**Event**: BEFORE INSERT OR UPDATE  
**Function**: `public.enforce_addon_price()`  
**Migration**: `20260213001241`

**Behavior**: For non-service_role:
```sql
NEW.price := 0;
RETURN NEW;
```

The trigger doesn't reject the write — it silently zeros the price. This means even if a client somehow inserts a booking_add_ons row, the price will be $0. Only service_role (via `persist-booking-extras` or `create-booking`) can set the actual computed price.

### trg_enforce_driver_fee

**Table**: `booking_additional_drivers`  
**Event**: BEFORE INSERT OR UPDATE  
**Function**: `public.enforce_driver_fee()`  
**Migration**: `20260213001241`

**Behavior**: For non-service_role:
```sql
NEW.young_driver_fee := 0;
RETURN NEW;
```

Same silent-zero pattern as addon price trigger.

## RLS Policy Pattern

### Financial Tables (No DELETE)

For `payments`, `deposit_ledger`, and similar financial tables:
```sql
-- Staff INSERT + UPDATE only, no DELETE
CREATE POLICY "Staff can insert payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can update payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (is_admin_or_staff(auth.uid()))
  WITH CHECK (is_admin_or_staff(auth.uid()));

-- No DELETE policy → rows are immutable for audit
```

### Incident Tables (No DELETE)

For `damage_reports`, `incident_cases`, `incident_repairs`, `incident_photos`:
```sql
-- Staff INSERT + UPDATE + SELECT only
CREATE POLICY "Staff can insert ..." FOR INSERT ...;
CREATE POLICY "Staff can update ..." FOR UPDATE ...;
CREATE POLICY "Staff can select ..." FOR SELECT ...;
-- No DELETE policy → audit trail preserved
```

### Booking-Related Tables

For `booking_add_ons`, `booking_additional_drivers`:
```sql
-- User DELETE was explicitly removed (migration 20260213001241)
DROP POLICY IF EXISTS "Users can delete their own booking add-ons";
```

Users can only read their own add-ons. Staff can INSERT + UPDATE. DELETE is through service_role only (via edge functions with audit logging).

## Audit Logging

**Table**: `audit_logs`

| Column | Purpose |
|--------|---------|
| `action` | Operation name (e.g., `booking_voided`, `booking_addon_upsell_add`, `booking_modified`) |
| `entity_type` | Table name (e.g., `booking`) |
| `entity_id` | Primary key of affected row |
| `user_id` | Staff member who performed the action |
| `old_data` | JSON snapshot of previous values |
| `new_data` | JSON snapshot of new values |
| `ip_address` | Client IP (when available) |
| `created_at` | Timestamp |

**Logged operations**:
- `booking_voided` — Via `void-booking`
- `booking_addon_upsell_add` — Via `persist-booking-extras` upsell-add
- `booking_addon_upsell_remove` — Via `persist-booking-extras` upsell-remove
- `booking_modified` — Via `reprice-booking` modify
- `upgrade_fee_applied` — Via `reprice-booking` upgrade
- `vehicle_upgrade_with_unit` — Via `reprice-booking` upgrade with unit assignment
- `upgrade_fee_removed` — Via `reprice-booking` remove_upgrade

## Table Security Matrix

| Table | RLS | FORCE RLS | Seatbelt Trigger | User DELETE | Staff DELETE |
|-------|-----|-----------|------------------|-------------|-------------|
| bookings | ✅ | ✅ | trg_block_sensitive | ❌ | ❌ |
| payments | ✅ | ✅ | — | ❌ | ❌ |
| deposit_ledger | ✅ | ✅ | — | ❌ | ❌ |
| booking_add_ons | ✅ | — | trg_enforce_addon_price | ❌ | ❌ (service_role only) |
| booking_additional_drivers | ✅ | — | trg_enforce_driver_fee | ❌ | ❌ |
| damage_reports | ✅ | ✅ | — | ❌ | ❌ |
| incident_cases | ✅ | ✅ | — | ❌ | ❌ |
| incident_photos | ✅ | ✅ | — | ❌ | ❌ |
| incident_repairs | ✅ | ✅ | — | ❌ | ❌ |
| rate_limits | ✅ | — | — | ❌ | ❌ (service_role only) |
| booking_access_tokens | ✅ | — | — | ❌ | ❌ |
| audit_logs | ✅ | — | — | ❌ | ❌ |

## Atomic Operations

### Rate Limiting
The `check_rate_limit` RPC function uses `INSERT ... ON CONFLICT DO UPDATE` for atomic rate limit checks, preventing race conditions under concurrent OTP requests.

### VIN Assignment
The `release_vin_from_booking` RPC uses `FOR UPDATE SKIP LOCKED` for atomic VIN deallocation.

### Payment Deduplication
A partial unique index on `payments(transaction_id)` prevents duplicate payment records from concurrent webhook deliveries.
