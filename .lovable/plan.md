

## Fix: Booking 26HDD44Y Showing Wrong User Data

### Root Cause

Booking `26HDD44Y` has `user_id = 1e297685` (Babru Singh Maan's auth account) instead of `user_id = 8b1f8a54` (Malkeet Singh Sohal's auth account). Both bookings share the same `user_id`, so all profile-sourced data (name fallback, driver's license, verification status) shows Babru's information on Malkeet's booking.

The `customer_id` was previously fixed to point to Malkeet's customer record, which corrected the name display in some views. However, the license data, verification status, and any profile-dependent queries still pull from Babru's profile because they use `user_id`.

**Database state:**
```text
26HDD44Y: user_id = 1e297685 (Babru) ← WRONG
          customer_id = 0c2234a3 (Malkeet) ← correct
          
Malkeet's actual profile: 8b1f8a54 (license #7740521, status on_file)
Babru's profile:          1e297685 (license #09592452, status on_file)
```

### Fix — Single Data Correction

**Database migration** to update the `user_id` on booking 26HDD44Y to Malkeet's correct profile:

```sql
UPDATE bookings 
SET user_id = '8b1f8a54-4639-4c28-b4f2-b09465c66363'
WHERE id = '706b4358-113b-4f9c-b457-500414e14f8a'
  AND booking_code = '26HDD44Y';
```

`user_id` is not in the trigger's blocked columns list, so this update is safe. Using a migration ensures it runs as `service_role`.

### What This Fixes

- **Name display**: All views (active rental detail, ops panel, finance) will now resolve Malkeet's profile name correctly
- **Driver's license**: License number changes from `09592452` (Babru) to `7740521` (Malkeet), and license front image shows Malkeet's document
- **Verification status**: Profile verification reflects Malkeet's actual status
- **No code changes needed**: All hooks (`use-active-rental-detail`, `use-bookings`, `StepCheckin`, `OpsBookingSummary`) already query `profiles` by `booking.user_id` — correcting the `user_id` fixes everything downstream

### No Code Changes

No frontend or backend code needs modification. The existing display logic correctly uses `user_id` for profile/license lookups and `customer_id` for name fallback. The issue is purely a data linkage error.

### Verification
- Booking 26HDD44Y shows MALKEET SINGH SOHAL everywhere
- License number shows 7740521 (Malkeet's)
- License image shows Malkeet's document, not Babru's
- Booking ZM87GULY still shows BABRU SINGH MAAN correctly
- No other bookings are affected

