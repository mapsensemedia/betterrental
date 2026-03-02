
## Fix: Unify Guest Booking Payload with Logged-In User Booking

### Problem
The guest checkout sends a **different payload shape** than the logged-in user checkout to the `create-guest-booking` edge function. Both edge functions use the same server-side pricing engine (`validateClientPricing`), but the guest payload includes extra/different fields that cause the `PRICE_MISMATCH` error.

### Key Differences Found

| Field | Logged-in flow | Guest flow | Issue |
|---|---|---|---|
| `protectionPlan` | `protection` (raw value, can be `undefined`) | `protection \|\| "none"` | Server may not match `"none"` string to a 0-rate plan correctly |
| `addOns` | `[{ addOnId, quantity }]` | `[{ addOnId, price, quantity }]` | Extra `price` field (harmless but unnecessary) |
| `deliveryFee` | `searchData.deliveryFee \|\| 0` | Conditional on delivery mode | Could send `0` vs `undefined` differently |
| Extra fields | Not sent | `dailyRate`, `totalDays`, `subtotal`, `taxAmount`, `depositAmount`, `youngDriverFee` | Server ignores these, but they add noise |

The `$253.06 vs $176.03` mismatch ($77 gap) likely stems from the `protectionPlan: "none"` string being misinterpreted by the server, or from the `deliveryFee` / `additionalDrivers` differences.

### Solution

**File: `src/pages/NewCheckout.tsx`** (lines ~424-481, the guest booking payload)

Align the guest payload to match the logged-in payload exactly:

1. **Remove redundant fields**: Delete `dailyRate`, `totalDays`, `subtotal`, `taxAmount`, `depositAmount`, `youngDriverFee` from the guest payload -- the server computes all of these.

2. **Fix `protectionPlan`**: Change `protectionPlan: protection || "none"` to `protectionPlan: protection` -- matching the logged-in flow exactly.

3. **Simplify `addOns`**: Change from `{ addOnId, price, quantity }` to `{ addOnId, quantity }` -- remove the client-computed `price` field, matching the logged-in flow.

4. **Align `deliveryFee`**: Change from `searchData.deliveryMode === "delivery" ? searchData.deliveryFee : 0` to `searchData.deliveryFee || 0` -- matching the logged-in flow.

5. **Simplify `additionalDrivers`**: Change from `{ driverName, driverAgeBand, youngDriverFee: 0 }` to `{ driverName, driverAgeBand }` -- remove the client-computed `youngDriverFee`, matching the logged-in flow.

### What This Does NOT Change
- No edge function changes
- No database changes
- No pricing engine changes
- The server-side validation and computation remain identical for both flows

### Expected Result
After this change, both guest and logged-in users will send the exact same payload shape (minus the guest-specific `firstName`/`lastName`/`email`/`phone` fields). The server will compute identical totals for identical booking configurations, eliminating the `PRICE_MISMATCH` error.
