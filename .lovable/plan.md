

## Fix: Activity Timeline Actor Attribution

### Problem
`generate-return-receipt` hardcodes `booking.user_id` (the customer) as the actor for receipt creation, receipt events, and audit logs. For walk-in bookings, `booking.user_id` points to the customer's shadow auth profile, so the timeline incorrectly shows customer names (e.g., "MALKEET SINGH SOHAL") as the actor for ops actions they never performed.

### Changes

#### 1. `supabase/functions/generate-return-receipt/index.ts`
- Add `staffUserId?: string` to the `ReceiptRequest` interface
- Use `staffUserId || booking.user_id` for all three places that currently hardcode `booking.user_id` as the actor:
  - Line 233: `created_by` on the receipt insert
  - Line 249: `actor_user_id` on receipt_events insert
  - Line 255: `user_id` on audit_logs insert
- Also fix lines 444 and 467 (receipt email audit logs) the same way

#### 2. `supabase/functions/close-account/index.ts`
- Line 353-358: Pass `staffUserId: authResult.userId` in the body when invoking `generate-return-receipt`

#### 3. `src/components/admin/ops/OpsActivityTimeline.tsx`
- In the query function, after fetching profiles, also fetch `user_roles` for all actor user IDs
- Build a set of user IDs that have admin/staff/cleaner/finance roles
- Define a list of "ops actions" (deposit_held, deposit_released, receipt_generated, receipt_emailed, account_closed, booking_status_change, rental_activated, rental_returned, etc.)
- When mapping events: if the action is an ops action AND the actor user_id does NOT have a staff role, display the actor as **"Staff (unrecorded)"** instead of the customer's name
- Non-ops actions (booking_created, verification_submitted, photo_uploaded by customer) continue showing the customer name normally

### Summary

| File | Change |
|------|--------|
| `supabase/functions/generate-return-receipt/index.ts` | Accept `staffUserId` param; use it instead of `booking.user_id` for actor fields |
| `supabase/functions/close-account/index.ts` | Pass `staffUserId: authResult.userId` when invoking receipt generation |
| `src/components/admin/ops/OpsActivityTimeline.tsx` | Fetch user roles; show "Staff (unrecorded)" for ops events attributed to non-staff accounts |

No changes to Malkeet's account, roles, or booking data.

