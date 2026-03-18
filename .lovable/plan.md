

## Issues Found

### Issue 1: Back button navigates to non-existent route
In `ActiveRentalDetail.tsx` line 126, the back route for admin context is `/admin/active-rentals` — but no such list route exists in `App.tsx`. Only `/admin/active-rentals/:bookingId` is defined.

### Issue 2: Deposit shows as uncollected
In `use-active-rental-detail.ts`, the payments query (line 148-152) filters for `status = 'completed'` only. The deposit check at line 190 then looks for `payment_type = 'deposit'` among those results. But security deposits use `authorized` status (not `completed`), so they're always filtered out.

---

## Plan

### 1. Fix back navigation in ActiveRentalDetail.tsx
**File**: `src/pages/admin/ActiveRentalDetail.tsx` (line 126)

Change the admin back route from `/admin/active-rentals` to `/admin/bookings?tab=active`.

### 2. Fix deposit status detection in use-active-rental-detail.ts
**File**: `src/hooks/use-active-rental-detail.ts` (lines 189-192)

Instead of relying on the payments query (which filters `status = 'completed'`), check the booking's own `deposit_status` field or `wl_deposit_transaction_id`. The booking object already has these fields from the `select(*)` query.

Change `hasDepositPayment` to:
```ts
const hasDepositPayment = 
  booking.deposit_status === 'authorized' || 
  booking.deposit_status === 'captured' || 
  booking.deposit_status === 'released' ||
  (paymentsRes.data || []).some(
    (p: any) => p.payment_type === "deposit"
  ) ||
  !!booking.wl_deposit_transaction_id;
```

This considers a deposit "held" if the booking has any deposit lifecycle state (authorized, captured, released) or a deposit transaction ID — matching the existing pattern used in `BookingOpsDrawer.tsx` and `use-payment-deposit.ts`.

### Files to modify
- `src/pages/admin/ActiveRentalDetail.tsx` — 1 line change (back route)
- `src/hooks/use-active-rental-detail.ts` — ~5 line change (deposit check logic)

