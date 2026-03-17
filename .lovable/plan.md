

## Plan: Fix Customer Name Display Across 5 Query Paths

All 11 bookings have correct `customer_id` in the database. The fix is to add customer lookup logic to every query path that currently reads names only from `profiles`.

### Summary of Changes

Each affected query gets the same 3-line addition pattern:
1. Collect `customer_id` values from bookings
2. Batch-fetch from `customers` table
3. Prefer `customersMap.get(customer_id)` over `profilesMap.get(user_id)`

### File 1: `src/hooks/use-bookings.ts`

**`useAdminBookings` (~line 108-170)**
- After fetching profiles, also fetch customers for bookings that have `customer_id`
- In the mapping (line 165), override `fullName`/`email`/`phone` from customers when `customer_id` is present

**`useBookingById` (~line 207-251)**
- After fetching `profileData`, if `data.customer_id` exists, fetch the customer record from `customers`
- Merge customer name/email/phone into the returned `profiles` object so downstream components (OpsBookingSummary, BookingCustomerCard) pick it up automatically
- Keep profile's driver license fields unchanged

### File 2: `src/pages/admin/Reconciliation.tsx` (~line 143-196)

- Add `customer_id` to the bookings select (line 146)
- After building `profileMap`, batch-fetch customers for bookings with `customer_id`
- Line 188: change to `customersMap.get(b.customer_id) || profileMap.get(b.user_id) || "Unknown"`

### File 3: `src/pages/admin/Billing.tsx`

Three queries:

**Invoices query (~line 189-228)**
- Add `customer_id` to the booking select embed (line 193-200)
- After building `profileMap`, fetch customers for bookings with `customer_id`
- Line 224: prefer customer record over profile

**Receipts query (~line 240-300)**
- Same: add `customer_id` to booking select, fetch customers, prefer customer at line 295

**Payments query (~line 305-393)**
- Add `customer_id` to WL booking selects (lines 319, 328) and manual payment booking embed (line 824)
- After building `profileMap`, batch-fetch all customer_ids from all booking sources
- Lines 353, 372, 391: prefer customer record over profile

### File 4: `src/pages/admin/Finance.tsx`

Five queries follow the same pattern:

**Overview payments query (~line 278-299)**: Add `customer_id` to bookings select, fetch customers, prefer at line 297

**WL supplement query (~line 318-393)**: Add `customer_id` to WL rental/deposit selects, fetch customers, prefer at lines 370/390

**Invoices query (~line 731-759)**: Same as Billing invoices

**Receipts query (~line 768-813)**: Same as Billing receipts

**Combined payments query (~line 818-890)**: Same as Billing payments — add `customer_id` to all 3 booking selects, fetch customers, prefer customer name

### File 5: `src/components/admin/ops/OpsBookingSummary.tsx`

No changes needed. This component reads `booking.profiles` which comes from `useBookingById`. Once that hook merges customer data into the profiles object, OpsBookingSummary, BookingCustomerCard, and all downstream components will automatically display the correct name.

### Helper Pattern (inline, not extracted)

Each query adds ~8 lines:

```text
// After profileMap is built:
const customerIds = [...new Set(bookings.map(b => b.customer_id).filter(Boolean))];
const { data: customersData } = customerIds.length > 0
  ? await supabase.from("customers").select("id, full_name, email, phone").in("id", customerIds)
  : { data: [] };
const customersMap = new Map((customersData || []).map(c => [c.id, c]));

// In mapping: prefer customersMap.get(b.customer_id) over profileMap.get(b.user_id)
```

### Files Modified

| File | Queries Updated |
|------|----------------|
| `src/hooks/use-bookings.ts` | `useAdminBookings`, `useBookingById` |
| `src/pages/admin/Reconciliation.tsx` | reconciliation-ledger query |
| `src/pages/admin/Billing.tsx` | invoices, receipts, payments queries |
| `src/pages/admin/Finance.tsx` | overview payments, WL supplement, invoices, receipts, combined payments queries |

No changes to OpsBookingSummary, BookingCustomerCard, profiles table, or payment records.

