

## Close Booking 76SH95PZ

**Booking found**: `c1a94307-138b-444d-919e-6c6eacd2ec20`, currently `active`, with deposit status `authorized` (terminal deposit `TERM-DEP-0010020020`).

### Actions

1. **Call `force-close-booking` edge function** with:
   - `bookingId`: `c1a94307-138b-444d-919e-6c6eacd2ec20`
   - `actualReturnAt`: `2026-03-15T17:00:00-04:00` (Sunday March 15, 5:00 PM Eastern)
   - `adminNote`: "Payment received via terminal. Deposit hold (TERM-DEP-0010020020) authorized — release manually via Bambora portal. Closed outside standard return flow."

2. This will:
   - Set status to `completed`
   - Set `return_state` to `closeout_done`
   - Release vehicle unit `3c813c12-0082-4063-96e1-b6520016f78d` back to `available`
   - Write audit log entry
   - **NOT** trigger deposit release or payment processing (as intended)

The deposit remains in `authorized` state for manual release through the Bambora portal.

