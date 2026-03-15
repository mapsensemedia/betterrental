

# Production Bug Fix Plan — 4 Critical Issues

## Evidence Summary

**DB state** (all 3 paid bookings):
- `3RZW932M`: wl_auth_status=completed, deposit_status=none, txn=10000000
- `FZH86F8W`: wl_auth_status=completed, deposit_status=none, txn=10000001
- `4HL5K9QV`: wl_auth_status=completed, deposit_status=none, txn=10000003

All payments are `payment_type=rental`, zero deposit payment records exist. No edge function logs available for `wl-authorize`, `wl-pay`, or `create-walk-in-booking` (logging gap is itself a concern).

---

## P1 — Deposit Hold Not Created

**Proven**: `wl-authorize` never succeeds — zero deposit payment records in DB, zero logs.

**Most likely cause**: `wl-authorize` uses `order_number: booking.booking_code` (line 53), same as `wl-pay` (line 60 in wl-pay). Bambora may reject duplicate order numbers. Additionally, the token lifecycle after first tokenization is uncertain.

**Not yet proven without logs**: exact gateway rejection reason.

### Fix (requires 1-line edge function change — justified)

**File: `supabase/functions/wl-authorize/index.ts`** line 53:
- Change `order_number: booking.booking_code` → `order_number: booking.booking_code + "-DEP"`
- This is the only way to fix this; the frontend cannot control order_number.

**File: `src/pages/NewCheckout.tsx`** lines 867-891 (onSuccess callback):
- Add structured console logging: `console.log("[checkout] deposit hold attempt", { bookingId, hasToken })` and `console.log("[checkout] deposit hold result", { error })`
- After deposit failure, show a non-blocking info toast: "Rental paid. Deposit hold will be arranged separately."

**Rollout**: Deploy edge function change first, then frontend. Rollback: revert the 1-line change.

---

## P2 — Customer Sees "Payment Failed" But Payment Succeeded

**Root cause**: When `supabase.functions.invoke()` encounters a network timeout, CORS issue, or response parsing failure, it sets `error` (FunctionsHttpError) even though the server successfully processed the payment. The UI at `WorldlineCheckout.tsx` line 233 immediately shows the error without verifying server state.

### Fix

**File: `src/components/payments/WorldlineCheckout.tsx`** lines 231-252 (the `if (error)` block):

Before displaying an error to the user, add a server-side verification step:

```typescript
if (error) {
  // Before showing error, verify if payment actually succeeded server-side
  if (bookingIdRef.current && bookingIdRef.current !== "pending") {
    const { data: booking } = await supabase
      .from("bookings")
      .select("status, wl_transaction_id")
      .eq("id", bookingIdRef.current)
      .single();
    
    if (booking?.wl_transaction_id && booking.status === "confirmed") {
      // Payment succeeded server-side despite client error
      console.warn("[WorldlineCheckout] Payment succeeded server-side despite client error");
      onSuccess({ transactionId: booking.wl_transaction_id, lastFour: "" });
      setIsProcessing(false);
      resolve();
      return;
    }
  }
  // ... existing error display logic
}
```

This is idempotent, race-safe (worst case shows success slightly late), and adds observability via the console.warn.

**Rollback**: Revert the verification block; error display returns to current behavior.

---

## P3 — Walk-in Booking Fails

**Root cause**: At `DeliveryWalkIn.tsx` line 96, `if (error) throw error` fires for any non-2xx response from the edge function. The throw jumps to the catch block at line 109, which shows the generic message "Failed to create booking". The meaningful error message (e.g., "staff role required") in the response body is never shown.

With Supabase JS SDK, when `error` is a `FunctionsHttpError`, the response body is in `error.context`, NOT in `data`. So `data?.error` at line 98 may never be reachable.

### Fix

**File: `src/pages/delivery/DeliveryWalkIn.tsx`** lines 96-111:

Replace the error handling with proper FunctionsHttpError parsing:

```typescript
if (error) {
  // Parse meaningful error from edge function response
  let errorMessage = "Failed to create booking";
  try {
    const body = await (error as any)?.context?.json?.();
    if (body?.error) {
      errorMessage = body.error === "Forbidden: staff role required"
        ? "Access denied: staff role required"
        : body.error;
    }
  } catch {
    // Fall through to generic message
  }
  toast.error(errorMessage);
  return;
}

if (data?.error) {
  toast.error(data.error === "Forbidden: staff role required"
    ? "Access denied: staff role required"
    : data.error);
  return;
}
```

**Rollback**: Revert to `if (error) throw error`.

---

## P4 — Vehicle Exchange Broken After Fleet Updates

**Root cause**: `useAvailableVehicles()` in `use-vehicle-assignment.ts` line 76 queries the **legacy `vehicles` table** (30 stale rows). The modern fleet is managed via `vehicle_units` (11 active rows). When staff adds/removes vehicles through `UnifiedVehicleManager`, the legacy table is never updated.

Additionally, `useAssignVehicle()` at line 143 updates `bookings.vehicle_id` (category-level), not `bookings.assigned_unit_id` (unit-level). This is a category assignment, which is correct for category changes but wrong for unit-level vehicle exchange.

### Fix

**File: `src/hooks/use-vehicle-assignment.ts`**:

1. **`useAvailableVehicles`** (lines 62-104): Replace the `vehicles` table query with `vehicle_units` joined to `vehicle_categories`:
   ```typescript
   const { data: units } = await supabase
     .from('vehicle_units')
     .select('id, vin, license_plate, color, status, category_id, location_id, vehicle_categories(id, name, daily_rate, image_url)')
     .eq('location_id', locationId)
     .in('status', ['available']);
   ```
   Then filter by conflict check using `bookings.assigned_unit_id` instead of `bookings.vehicle_id`.

2. **`useCheckVehicleAvailability`** (lines 20-60): This checks category-level availability via `bookings.vehicle_id` — this is correct for category checks. No change needed here.

3. **`useAssignVehicle`** (lines 107-176): The conflict check at line 127 uses `bookings.vehicle_id` (category). For unit-level assignment, add a parallel check on `bookings.assigned_unit_id`. The update at line 143 should set `assigned_unit_id` in addition to `vehicle_id` when assigning a specific unit.

**Rollback**: Revert query changes.

---

## Deployment Order

1. **P3** (walk-in error handling) — zero risk, error display only
2. **P4** (vehicle assignment query migration) — low risk, only affects assignment UI
3. **P2** (payment verification fallback) — adds resilience, no behavior change for success path
4. **P1** (edge function order_number + frontend logging) — enables deposit holds

## Files Changed

| File | Bug |
|------|-----|
| `supabase/functions/wl-authorize/index.ts` | P1 (1 line) |
| `src/pages/NewCheckout.tsx` | P1 (logging) |
| `src/components/payments/WorldlineCheckout.tsx` | P2 |
| `src/pages/delivery/DeliveryWalkIn.tsx` | P3 |
| `src/hooks/use-vehicle-assignment.ts` | P4 |

## Open Item

Edge function logs showing "No logs found" for all payment functions. This must be investigated separately — either the functions are not being invoked (unlikely given DB records), or log retention/routing is misconfigured. After P1 fix is deployed, the first test booking should confirm logs appear.

