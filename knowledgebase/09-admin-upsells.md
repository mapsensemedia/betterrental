# Admin Upsells

## Overview

Admin upsells allow staff to add or remove add-ons from a booking at the counter, after the initial booking has been created. This is a critical revenue feature — staff can offer upgrades (child seat, GPS, insurance) when the customer arrives.

## Why Client Writes Were Removed

Originally, the client could directly INSERT/UPDATE `booking_add_ons` rows using the authenticated Supabase client. This was removed for two reasons:

1. **Price manipulation**: A client could insert a `booking_add_ons` row with `price: 0` or any arbitrary value. There was no server-side validation.

2. **Financial integrity**: The `total_amount` on the booking would not automatically update when add-ons were added/removed client-side. This created drift between the sum of line items and the booking total.

The fix was threefold:
- **Remove client DELETE policy** on `booking_add_ons` (migration `20260213001241`)
- **Add `trg_enforce_addon_price` trigger** that zeros out price for non-service_role inserts
- **Route all mutations through `persist-booking-extras` edge function** which uses service_role and computes prices server-side

## persist-booking-extras: upsell-add

**Endpoint**: `POST /functions/v1/persist-booking-extras`

**Request body**:
```json
{
  "bookingId": "uuid",
  "action": "upsell-add",
  "addOnId": "uuid",
  "quantity": 1
}
```

**Flow**:

1. **Auth + Role Check**: Requires authenticated user with admin/staff role via `isAdminOrStaff()`.

2. **Validate Add-On**: Checks `add_ons` table for matching ID where `is_active = true`.

3. **Build Full Context**: Reads ALL existing `booking_add_ons` and `booking_additional_drivers` for this booking. This is necessary because `computeBookingTotals()` needs the complete picture to compute correct totals.

4. **Merge**: If the add-on already exists, its quantity is replaced. If new, it's appended.

5. **Compute Price**: Calls `computeBookingTotals()` with the full merged set. Extracts the specific add-on's computed price from `serverTotals.addOnPrices`.

6. **Exclusion Check**: If the pricing engine filtered out this add-on (e.g., Premium Roadside is excluded when All Inclusive protection is selected), returns `409 ADDON_EXCLUDED`.

7. **Persist**: Upserts the `booking_add_ons` row with the server-computed price.

8. **Audit**: Inserts to `audit_logs`:
   ```json
   {
     "action": "booking_addon_upsell_add",
     "entity_type": "booking",
     "entity_id": "booking_uuid",
     "old_data": { "addOnId": "...", "quantity": 1, "price": 29.99 },
     "new_data": { "addOnId": "...", "addOnName": "Child Seat", "quantity": 2, "computedPrice": 59.98 }
   }
   ```

9. **Reprice**: Invokes `reprice-booking` edge function to update the booking's `subtotal`, `tax_amount`, and `total_amount`.

## persist-booking-extras: upsell-remove

**Request body**:
```json
{
  "bookingId": "uuid",
  "action": "upsell-remove",
  "bookingAddOnId": "row_uuid"   // OR
  "addOnId": "add_on_uuid"       // either identifier works
}
```

**Flow**:

1. **Auth + Role Check**: Same as upsell-add.

2. **Find Row**: Looks up the `booking_add_ons` row by either `id` (row PK) or `add_on_id`.

3. **Capture Old Data**: Saves `{ addOnId, quantity, price }` for audit before deletion.

4. **Delete**: Removes the `booking_add_ons` row.

5. **Audit**: Inserts to `audit_logs` with `action: "booking_addon_upsell_remove"`, `old_data` populated, `new_data: null`.

6. **Reprice**: Same as upsell-add — invokes `reprice-booking` to recalculate totals.

## Repricing After Upsell

The `invokeRepriceBooking()` helper function calls `reprice-booking` with:
```json
{
  "bookingId": "uuid",
  "operation": "modify",
  "newEndAt": "current_end_at",  // unchanged
  "reason": "upsell_reprice"
}
```

This passes through the original `Authorization` header so the staff user's JWT is used for the role check in `reprice-booking`.

**Why invoke via HTTP instead of importing directly?**: The `reprice-booking` function has its own audit logging and uses `computeTotals()` (a local function that mirrors `computeBookingTotals` but reads existing add-ons from DB). Invoking it as a separate function ensures:
1. Consistent audit trail for all repricing operations
2. Single code path for total recalculation
3. The booking's `updated_at` timestamp is set

## Edge Cases

### Premium Roadside + All Inclusive
If a booking has "All Inclusive" (premium) protection, the pricing engine automatically excludes "Premium Roadside" and "Extended Roadside" add-ons. If staff tries to upsell one of these, they get `409 ADDON_EXCLUDED`.

### Duplicate Add-On
If the add-on already exists on the booking, `upsell-add` updates the existing row rather than inserting a duplicate. The audit log captures both old and new values.

### Concurrent Upsells
If two staff members upsell the same booking simultaneously, each `persist-booking-extras` call will independently read the current state, compute prices, and invoke reprice. The last reprice wins, but both add-ons will be persisted correctly because the upsert is per-add-on-id. The final total will reflect both add-ons.
