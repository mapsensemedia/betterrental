

## Fix: Booking 26HDD44Y Showing Wrong Customer Name

### Root Cause (Data Issue, Not Code Bug)

Both bookings 26HDD44Y and ZM87GULY have the same `user_id` pointing to BABRU SINGH MAAN's auth account. Booking 26HDD44Y was created under the wrong user account and has no `customer_id` set.

Database state:
```text
26HDD44Y: user_id = BABRU SINGH MAAN, customer_id = NULL  ← wrong
ZM87GULY: user_id = BABRU SINGH MAAN, customer_id = BABRU ← correct
```

MALKEET SINGH SOHAL exists as a customer record (`0c2234a3-77fe-4c85-8d98-f63f0c19f2cf`, email: malkeetsohal134@gmail.com) but is not linked to this booking.

### Fix

Set `customer_id` on booking 26HDD44Y to MALKEET SINGH SOHAL's customer record. The existing display logic throughout the system (booking detail, ops panel, finance) already prioritizes `customer_id` over `user_id` for name/email/phone display.

**Database migration** (single UPDATE via edge function or migration tool):
```sql
UPDATE bookings 
SET customer_id = '0c2234a3-77fe-4c85-8d98-f63f0c19f2cf'
WHERE id = '706b4358-113b-4f9c-b457-500414e14f8a';
```

Note: The `trg_block_sensitive_booking_updates` trigger blocks direct client-side updates to bookings. `customer_id` may or may not be in the blocked columns list. If blocked, this needs to go through a migration (service_role) rather than client-side update.

### No Code Changes Needed

The display logic in `useAdminBookings`, `useBookingById`, `BookingCustomerCard`, and the Finance page all already check `customer_id` first and fall back to `user_id`. Once the data is corrected, the name will display correctly everywhere.

### Verification
- Booking 26HDD44Y shows MALKEET SINGH SOHAL
- Booking ZM87GULY still shows BABRU SINGH MAAN
- Finance, ops panel, and booking detail all reflect correct names

