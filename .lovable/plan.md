## Goal
Regenerate the rental agreement for booking `949A8FYR` (id `4df24cbf-aa1e-4a15-a606-19b978cf0424`) so it picks up the new "Weekend Surcharge" line, while:
- Keeping the existing signed agreement record (`3990e709-…`) intact for audit history.
- Carrying the existing signature (PNG, vector JSON, method, device info, timestamps, signed_manually flags) onto the new agreement so the customer does not have to re-sign.
- Sending no notifications to the customer.

## Why this needs a code change
The current `generate-agreement` edge function refuses to create a second agreement when a non-voided one already exists (lines 354–370), and it has no mechanism to copy a prior signature onto a freshly generated agreement. We need a controlled, one-shot path that:
1. Allows regeneration when a flag is passed.
2. Marks the prior agreement as `superseded` (a non-destructive status that keeps the row visible in history) instead of voiding it.
3. Copies the signature fields from the prior agreement onto the new row so the new PDF renders signed.

## Changes

### 1. `supabase/functions/generate-agreement/index.ts`
- Accept two new request flags:
  - `forceRegenerate: boolean` — bypasses the "already exists" early return.
  - `copySignatureFromLatest: boolean` — after creating the new agreement, copy from the most recent prior signed agreement: `customer_signature`, `signature_png_url`, `signature_vector_json`, `signature_method`, `signature_device_info`, `signature_workstation_id`, `customer_signed_at`, `customer_ip_address`, `signed_manually`, `signed_manually_by`, `signed_manually_at`, and set the new agreement's `status = 'confirmed'`.
- When `forceRegenerate` is true:
  - Find any existing non-voided agreement for the booking.
  - Update its status to `'superseded'` (keeps row, hides it from active flows).
  - Proceed to create the new agreement record.
- Always honour `suppressNotifications: true` for this call (existing logic already does).
- Log an `audit_logs` entry with action `agreement_regenerated_with_signature_copy`, recording both the old and new agreement IDs.

### 2. Run the regeneration once
Call the deployed function:
```
POST /functions/v1/generate-agreement
{
  "bookingId": "4df24cbf-aa1e-4a15-a606-19b978cf0424",
  "forceRegenerate": true,
  "copySignatureFromLatest": true,
  "suppressNotifications": true
}
```

### 3. Verify
- Query `rental_agreements` for booking `4df24cbf-…` and confirm there are now two rows: the original (status `superseded`) and the new one (status `confirmed`, with copied signature fields and a populated `terms_json.financial.weekendSurcharge`).
- Open the booking in the admin view and confirm the regenerated agreement PDF shows the Weekend Surcharge line.

## Out of scope
- No bulk regeneration of other historical agreements.
- No modification to financial totals — totals in `bookings` are unchanged; this is presentation only.
- Customer is not notified (existing notification suppression flag is honoured).
