

## Fix PaymentStatusDot Logic with Notes-Based Pay at Pickup Detection

### Problem
The PaymentStatusDot currently uses `wlTransactionId`/`wlAuthStatus` to determine payment state, which doesn't distinguish between "customer chose pay at pickup" vs "payment expected but missing". The user wants the `notes` field (already available in booking data) and actual payments table records to drive the logic.

### Changes

**1. `src/hooks/use-bookings.ts` — Fetch payments for booking list**

Add a batch query for payments (similar to how profiles are fetched):
- After fetching bookings, collect all booking IDs
- Query `payments` table: `SELECT booking_id, status FROM payments WHERE booking_id IN (...) AND status IN ('completed', 'captured')`
- Build a `Set<string>` of booking IDs that have at least one completed/captured payment
- Add `hasPaidPayment: boolean` to each mapped booking object

**2. `src/pages/admin/Bookings.tsx` — Rewrite PaymentStatusDot**

Replace the current logic with:

1. `completed`/`cancelled` status → no dot (unchanged)
2. `booking.hasPaidPayment` is true → Green "Paid"
3. No paid payment AND `booking.notes` contains "pay at pickup" (case-insensitive) → Blue "Pay at Pickup"
4. No paid payment AND status is `confirmed`/`active` AND notes does NOT contain "pay at pickup" → Amber "Payment Pending"
5. No paid payment AND status is `pending` → Red "Unpaid"

Color updates:
- Paid: green (unchanged)
- Pay at Pickup: **blue** (was amber)
- Payment Pending: **amber** (new state)
- Unpaid: red (unchanged)

### Files
| File | Change |
|------|--------|
| `src/hooks/use-bookings.ts` | Batch-fetch payments for listed bookings, add `hasPaidPayment` field |
| `src/pages/admin/Bookings.tsx` | Rewrite PaymentStatusDot with notes-based logic and new colors |

