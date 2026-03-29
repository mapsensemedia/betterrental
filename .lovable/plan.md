

## Fix: Missing Payment Record for Booking QJ8FV9BR

### Root Cause

The booking has a total of $432.62 but only one payment of $220.92 was recorded (TERM-0010050020). The remaining $211.70 was collected at the terminal but never logged. The invoice correctly computed `amount_due = 432.62 - 220.92 = 211.70` — the invoice logic is not broken, the data is incomplete.

No damage charges are inflating the total — `damage_charges = 0` on the invoice.

### Fix Steps

**1. Insert missing payment record** (data operation)

Insert into `payments`:
- `booking_id`: `b51b91d9-c1e0-4f5c-a57e-b4e3f7dd723d`
- `amount`: 211.70
- `payment_type`: rental
- `payment_method`: terminal
- `status`: completed
- `transaction_id`: `TERM-MANUAL-QJ8FV9BR` (distinguishable as retroactive entry)
- `user_id`: `3eaebda3-a6e3-4cb7-898c-9542976f3203`
- `location_id`: from booking

**2. Update invoice INV-2026-01019** (data operation)

Update `final_invoices` where `id = 35452711-4800-4ebb-982f-b6d7ffe44112`:
- `payments_received`: 432.62
- `amount_due`: 0

### What Does NOT Change
- No code changes needed
- Grand total stays $432.62
- No invoice regeneration needed — just update the two numeric fields
- No damage charges to remove (already 0)

### Verification
- Invoice shows $0.00 amount due
- No red outstanding balance
- Finance totals include the full $432.62

