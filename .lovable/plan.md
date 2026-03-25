

## Fix Booking F6WHEWHJ Data Linkage

### Current State

| Booking | user_id points to | customer_id | Status |
|---------|-------------------|-------------|--------|
| 26HDD44Y | MALKEET SINGH SOHAL | MALKEET SINGH SOHAL | Already correct |
| ZM87GULY | BABRU SINGH MAAN | BABRU SINGH MAAN | Already correct |
| F6WHEWHJ | BABRU SINGH MAAN | NULL | **Wrong — should be AERISH MEHNDIRATTA** |

Booking F6WHEWHJ was created under Babru's auth account but actually belongs to AERISH MEHNDIRATTA (aerishmehndiratta2004@gmail.com). It has no `customer_id` set, so all name/license/profile data falls back to Babru.

### Fix — Two database updates on F6WHEWHJ

1. Set `user_id` to Aerish's profile ID (`caa64717-40be-4e03-8c14-0648642fc8fd`) so license, verification, and profile data resolve correctly.

2. Set `customer_id` to Aerish's customer record (`f731bf96-89af-4d68-8fe1-1cb8bb4303e0`) so name/email/phone display correctly across all views.

```sql
UPDATE bookings 
SET user_id = 'caa64717-40be-4e03-8c14-0648642fc8fd',
    customer_id = 'f731bf96-89af-4d68-8fe1-1cb8bb4303e0'
WHERE id = 'b201f55f-3669-4606-be11-4e7973ab9449'
  AND booking_code = 'F6WHEWHJ';
```

### No Code Changes Needed

The display logic throughout the system (booking detail, ops panel, finance, active rentals) already prioritizes `customer_id` for name and `user_id` for license/profile. Correcting these two fields fixes everything downstream.

### Verification
- F6WHEWHJ shows AERISH MEHNDIRATTA everywhere (booking list, ops panel, finance)
- Driver's license shows Aerish's license (#30165003), not Babru's
- 26HDD44Y still shows MALKEET SINGH SOHAL (unchanged)
- ZM87GULY still shows BABRU SINGH MAAN (unchanged)
- No other bookings affected

