

## Plan: Tighten Walk-In Customer Identity Management

### 1. Edge Function: Smarter customer matching + hard guards
**File**: `supabase/functions/create-walk-in-booking/index.ts`

- Accept new optional param `forceNewCustomer: boolean` from the client
- Change step 5 (customer find-or-create):
  - If `forceNewCustomer === true`: always INSERT a new customer record, skip matching
  - Otherwise: match by `email` AND `full_name` (case-insensitive). If email matches but name differs, return a `customer_match_conflict` response with the existing customer's details so the UI can prompt staff
  - Never update/overwrite existing customer records
- Add hard guard before booking insert: fail with 400 if `!customerId`
- Add hard guard: fail with 400 if `!auth.userId` (created_by)
- Return `existingCustomerMatch` in the response when email matches but name differs, so the dialog can show the confirmation UI

### 2. UI: Duplicate customer confirmation in WalkInBookingDialog
**File**: `src/components/admin/WalkInBookingDialog.tsx`

- Add state for `customerMatchConflict` (existing customer info returned by edge function)
- Add state for `forceNewCustomer: boolean`
- On form submit: if edge function returns `customer_match_conflict`, show an inline confirmation panel:
  - "Existing customer found: **[Name]** ([email], [phone])"
  - Two buttons: **"Yes, use this customer"** / **"No, create new customer"**
  - "Yes" re-submits with the existing customer ID
  - "No" re-submits with `forceNewCustomer: true`
- Pass `forceNewCustomer` and optional `useCustomerId` through to the edge function body

### 3. Database constraint
**Migration SQL**:
```sql
ALTER TABLE bookings 
ADD CONSTRAINT walkin_requires_customer_id 
CHECK (booking_source != 'walk_in' OR customer_id IS NOT NULL);
```

### Summary

| Change | File |
|--------|------|
| Email+name matching, `forceNewCustomer` flag, hard guards, conflict response | `create-walk-in-booking/index.ts` |
| Customer match confirmation UI | `WalkInBookingDialog.tsx` |
| DB constraint: walk-ins must have customer_id | Migration |

