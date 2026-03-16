

## Fix: Edge Function `update-booking-status` Broken Auth + Activate NQWRN79T

### Root Cause

The `update-booking-status` edge function has a critical bug on **lines 42-43**:

```typescript
const user = await getUserOrThrow(req);           // missing corsHeaders param
await requireRoleOrThrow(user.id, ["admin", "staff"]); // user.id is UNDEFINED
```

Two problems:
1. `getUserOrThrow` returns `{ userId, email }` but the code accesses `user.id` — which is `undefined`
2. Both auth calls are missing the `corsHeaders` argument, so error responses lack CORS headers — the browser sees a CORS failure and silently swallows the error

This means **every activation attempt through the UI has been failing silently**. The previous activations only worked because they were done via direct SQL migrations.

### Changes

#### 1. Fix `supabase/functions/update-booking-status/index.ts` (lines 42-43)

```typescript
// Before
const user = await getUserOrThrow(req);
await requireRoleOrThrow(user.id, ["admin", "staff"]);

// After
const user = await getUserOrThrow(req, corsHeaders);
await requireRoleOrThrow(user.userId, ["admin", "staff"], corsHeaders);
```

Also fix line 118 (`user.id` → `user.userId`), line 161 (`user.id` → `user.userId`), line 168 (`user.id` → `user.userId`), and line 171 (`user.id` → `user.userId`) — all references to `user.id` need to become `user.userId`.

#### 2. Activate booking NQWRN79T via database migration

Since the edge function is currently broken, activate the booking directly:
- Update `bookings` status to `active`, set `activated_at`, `activation_source = 'ops_manual'`
- Update assigned vehicle unit to `on_rent`
- Insert audit log entry

#### 3. Deploy the fixed edge function

After code changes, deploy `update-booking-status` so future UI activations work correctly.

