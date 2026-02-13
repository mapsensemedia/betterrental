# Pricing Engine

## Overview

The pricing engine exists in two implementations that must remain in sync:

| Implementation | File | Purpose | Authoritative? |
|---|---|---|---|
| Client-side | `src/lib/pricing.ts` | UI preview / estimate display | NO — display only |
| Server-side | `supabase/functions/_shared/booking-core.ts` | Canonical computation for DB writes | YES — source of truth |

The server-side engine is the **only** source of truth. Client-side pricing is explicitly labeled "display-only" in code comments. If they diverge by more than $0.50, the booking is rejected.

## computeBookingTotals (Server)

**File**: `supabase/functions/_shared/booking-core.ts`, line ~426

**Signature**:
```typescript
async function computeBookingTotals(input: {
  vehicleId: string;       // vehicles.id (NOT vehicle_categories.id)
  startAt: string;
  endAt: string;
  protectionPlan?: string;
  addOns?: { addOnId: string; quantity: number }[];
  additionalDrivers?: AdditionalDriverInput[];
  driverAgeBand?: string;
  deliveryFee?: number;
  differentDropoffFee?: number;  // fallback if no location IDs
  locationId?: string;           // for server drop-off fee computation
  returnLocationId?: string;
}): Promise<ServerPricingResult>
```

**Computation steps** (in order):

### 1. Duration
```
days = ceil((endAt - startAt) / 86400000)   // minimum 1
```

### 2. Vehicle Base Rate
```
dailyRate = vehicles.daily_rate   (from DB, NOT from client)
vehicleBaseTotal = dailyRate × days
```

### 3. Weekend Surcharge
```
if pickup day is Fri/Sat/Sun (UTC):
  weekendSurcharge = vehicleBaseTotal × 0.15
```

### 4. Duration Discount
```
if days >= 21:  discount = 20% of (vehicleBaseTotal + weekendSurcharge)
elif days >= 7: discount = 10% of (vehicleBaseTotal + weekendSurcharge)
vehicleTotal = vehicleBaseTotal + weekendSurcharge - durationDiscount
```

### 5. Protection
```
protectionDailyRate = system_settings[`protection_{plan}_daily_rate`]
  fallback: { basic: 32.99, smart: 37.99, premium: 49.99 }
protectionTotal = protectionDailyRate × days
```

### 6. Add-Ons
```
For each add-on (max 10 items, quantity capped 1-10):
  dailyCost = add_ons.daily_rate × days × quantity
  oneTimeCost = add_ons.one_time_fee × quantity
  totalPrice = dailyCost + oneTimeCost

Special rule: If protectionPlan === "premium" (All Inclusive),
  filter out "Premium Roadside" / "Extended Roadside" add-ons
  (they're included in the plan)
```

### 7. Young Driver Fee
```
if driverAgeBand === "20_24":
  youngDriverFee = $15/day × days
```

### 8. Additional Drivers
```
Rates from system_settings:
  standard: additional_driver_daily_rate_standard  (default $14.99)
  young:    additional_driver_daily_rate_young      (default $19.99)

For each driver (max 5):
  fee = rate × days
```

### 9. Daily Regulatory Fees
```
PVRT = $1.50/day × days
ACSRCH = $1.00/day × days
dailyFeesTotal = PVRT + ACSRCH
```

### 10. Delivery + Drop-off Fees
```
deliveryFee = input.deliveryFee (passthrough)
differentDropoffFee = computeDropoffFee(locationId, returnLocationId)
  (or input.differentDropoffFee fallback if no location IDs)
```

### 11. Subtotal
```
subtotal = vehicleTotal + protectionTotal + addOnsTotal + youngDriverFee
         + additionalDriversTotal + dailyFeesTotal + deliveryFee
         + differentDropoffFee
```

### 12. Tax
```
PST = subtotal × 0.07
GST = subtotal × 0.05
taxAmount = PST + GST
```

### 13. Total + Deposit
```
total = subtotal + taxAmount
depositAmount = $350 (fixed, always required)
```

## validateClientPricing

**File**: `supabase/functions/_shared/booking-core.ts`, line ~639

```typescript
async function validateClientPricing(params): Promise<{
  valid: boolean;
  serverTotals: ServerPricingResult;
  error?: string;
}>
```

**Logic**:
1. Call `computeBookingTotals()` with the same inputs
2. Compare: `|server.total - client.total| > $0.50`
3. If exceeded → `{ valid: false, error: "Price mismatch: expected $X, received $Y" }`
4. If within tolerance → `{ valid: true, serverTotals: ... }`

**FAIL CLOSED**: If `computeBookingTotals()` throws, the exception propagates up. Callers (`create-booking`, `create-guest-booking`) catch it and return `400 PRICE_VALIDATION_FAILED`.

## Client-Side Preview (calculateBookingPricing)

**File**: `src/lib/pricing.ts`, line ~320

Mirrors the server logic with these differences:
- Reads rates from constants/props, not from DB
- Used for immediate UI feedback
- Includes `lateFeeAmount` parameter (for return calculations)
- Returns a `PricingBreakdown` with more granular fields (pvrtTotal, acsrchTotal, pstAmount, gstAmount)

### Keeping Them in Sync

Both files use identical constants:
```
PST_RATE = 0.07
GST_RATE = 0.05
PVRT_DAILY_FEE = 1.50
ACSRCH_DAILY_FEE = 1.00
YOUNG_DRIVER_FEE = 15
WEEKEND_SURCHARGE_RATE = 0.15
WEEKLY_DISCOUNT_THRESHOLD = 7 → 10%
MONTHLY_DISCOUNT_THRESHOLD = 21 → 20%
```

**Invariant**: Any change to pricing constants must be applied to BOTH files. The $0.50 tolerance exists to absorb minor rounding differences, not to allow intentional drift.

## Mismatch Handling

When a price mismatch is detected:

```json
{
  "error": "PRICE_MISMATCH",
  "message": "Price mismatch: expected $487.23, received $462.00",
  "serverTotal": 487.23
}
```

The client should:
1. Display the server total to the user
2. Update the displayed price
3. Ask the user to confirm the corrected amount
4. Retry the booking with the server-corrected total

This is NOT a security failure — it typically indicates the client cache was stale (e.g., admin changed a vehicle rate between page load and checkout).

## Rounding Strategy

Both implementations use `roundCents`:
```typescript
function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}
```

Each intermediate value is rounded individually to prevent floating-point drift accumulation. Tax components (PST, GST) are rounded separately, then summed.
