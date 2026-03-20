

## Root Cause

The `update-booking-status` edge function **never processes any POST requests**. Every request (including POST) returns an empty 204 response because of a broken CORS handler pattern.

### The Bug (Line 36-39 of `update-booking-status/index.ts`)

```text
Current (broken):
  const preflightResponse = handleCorsPreflightRequest(req, corsHeaders);
  if (preflightResponse) return preflightResponse;
  // ← never reached for ANY request

Correct pattern (used by all other 18+ edge functions):
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
```

`handleCorsPreflightRequest()` always returns a Response object (never null/undefined), so the `if (preflightResponse)` check is always truthy. Every POST request gets a 204 empty body. The client SDK receives `data = null`, tries to read `data.booking`, throws a TypeError, and the user sees a generic "Failed to update booking status" toast.

### Secondary Bug (Line 207)

The function inserts `status: "new"` into `admin_alerts`, but the `alert_status` enum only has: `pending`, `acknowledged`, `resolved`. This would cause a silent DB error when creating the activation alert. Fix: change `"new"` → `"pending"`.

## Fix Plan

### 1. Fix CORS handler in `update-booking-status/index.ts`
Replace the broken pattern on lines 36-39 with the standard method check used by all other functions:
```typescript
if (req.method === "OPTIONS") {
  return new Response(null, { status: 204, headers: corsHeaders });
}
```

### 2. Fix alert status enum value
Change line 207 from `status: "new"` to `status: "pending"`.

### 3. Deploy the edge function
Deploy `update-booking-status` immediately after the fix.

### 4. Improve error message in `onError`
In `src/hooks/use-bookings.ts`, surface the actual error message in the toast instead of a generic string, so staff can see what went wrong:
```typescript
onError: (error) => {
  toast.error(error?.message || "Failed to update booking status");
}
```

## Impact
- **All booking status transitions** via the ops panel and active rental detail page are broken (not just activation)
- Confirming, cancelling, completing, and reopening bookings are all affected
- This is a critical fix that restores the entire booking lifecycle

## Verification
- After deploy, staff can activate the booking from either the BookingOps handover step or the ActiveRentalDetail page
- Edge function logs will show successful invocations
- The booking status will transition from `confirmed` → `active`

