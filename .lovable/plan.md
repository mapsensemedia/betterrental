
# Add Drop-off Location Feature (End-to-End)

## Overview
Currently, the booking system only captures a pickup location but has no field for a different return/drop-off location. When a customer returns the car to a different dealership (Surrey, Langley, or Abbotsford), a $25 fee should apply. This feature needs to flow through the entire system: customer booking, checkout, booking summary, admin panel, ops panel, return ops, and all relevant documents (rental agreement, invoices, receipts).

## What Changes

### 1. Database: Add `return_location_id` and `different_dropoff_fee` to `bookings` table
- `return_location_id UUID` (nullable, FK to `locations.id`) -- NULL means "same as pickup"
- `different_dropoff_fee NUMERIC DEFAULT 0` -- fee charged when drop-off differs from pickup

### 2. System Settings: Admin-configurable drop-off fee
- Add a `different_dropoff_fee` key to `system_settings` table (default value: `25`)
- This allows admins to change the fee from the Settings/Pricing panel later

### 3. RentalBookingContext: Add drop-off location state
- Add `returnLocationId` and `returnLocationName` fields to `RentalSearchData`
- Add `setReturnLocation(id: string | null)` setter
- Add computed `isDifferentDropoff` and `dropoffFee` values
- Default: same as pickup (checkbox "Return to same location" checked by default)

### 4. RentalSearchCard (Customer Search Card): Add drop-off location selector
- In "Pick up at location" mode, add a "Return to same location" checkbox (checked by default) below the existing fields
- When unchecked, show a "Drop-off Location" selector with the 3 dealerships
- When a different location is selected, show a small note: "$25 different location fee applies"
- This mirrors the pattern already partially built in `GlassSearchBar.tsx`

### 5. TripContextPrompt: No change needed
- This dialog only collects pickup location, dates, and age -- drop-off is optional and can be set in the search card or checkout

### 6. BookingSummaryPanel: Display drop-off location and fee
- Show "Drop-off Location" line below the pickup location when different
- Include the $25 fee in the pricing breakdown as a separate line item

### 7. Checkout (NewCheckout.tsx): Save drop-off location to booking
- Pass `return_location_id` and `different_dropoff_fee` when inserting the booking
- Include the fee in the total calculation
- Both logged-in and guest flows need this

### 8. Edge Functions: Accept drop-off fields
- `create-booking`: Accept `returnLocationId` and `differentDropoffFee` in the request body, store in bookings table
- `create-guest-booking`: Same as above

### 9. Booking Schemas (src/lib/schemas/booking.ts): Add validation
- Add `returnLocationId` (optional UUID) and `differentDropoffFee` (optional nonnegative number) to base booking fields

### 10. Domain Layer Types (src/domain/bookings/types.ts): Add fields
- Add `returnLocationId` and `differentDropoffFee` to `BookingSummary` and `BookingDetail`
- Add `returnLocation: BookingLocation | null` joined data

### 11. Domain Queries (src/domain/bookings/queries.ts): Fetch return location
- Join `return_location_id` to the `locations` table to get the return location name/address

### 12. Admin Booking Detail (src/pages/admin/BookingDetail.tsx): Display drop-off
- Show "Drop-off Location" in the Overview tab alongside pickup location
- Show the different-dropoff fee in the Financial tab pricing breakdown

### 13. Ops Pickup Flow: Display drop-off location
- In the ops check-in step, show where the customer plans to return the car so staff can inform them of the fee

### 14. Return Ops (ReturnBookingSummary.tsx): Show expected return location
- Display the booked return location so staff can verify the car is being returned to the correct dealership
- If actual return location differs from booked, staff should be aware

### 15. Active Rental Detail (ActiveRentalDetail.tsx): Show drop-off location
- Display both pickup and planned drop-off locations in the rental details card

### 16. Rental Agreement PDF: Already has drop-off support
- The existing `rental-agreement-pdf.ts` already has a `dropoff` field in its template -- just need to pass the correct data from the booking's `return_location_id`

### 17. Invoice/Receipt PDFs: Add drop-off fee line item
- When generating invoices/receipts, include "Different drop-off location fee" as a line item if applicable

### 18. Pricing Utility (src/lib/pricing.ts): Include drop-off fee
- Add `differentDropoffFee` parameter to `calculateBookingPricing` so it flows into the subtotal

## What Does NOT Change
- Delivery panel -- as specified, delivery bookings handle their own address flow and don't need drop-off location display
- The GlassSearchBar component (unused alternative search bar) -- it already has partial drop-off logic but is not the active search component
- Database schema for `locations` table -- no changes needed

## Technical Details

### Database Migration
```sql
ALTER TABLE public.bookings 
  ADD COLUMN return_location_id UUID REFERENCES locations(id),
  ADD COLUMN different_dropoff_fee NUMERIC DEFAULT 0;

INSERT INTO public.system_settings (key, value, description)
VALUES ('different_dropoff_fee', '25', 'Fee charged when drop-off location differs from pickup')
ON CONFLICT (key) DO NOTHING;
```

### Files to Modify
- `src/contexts/RentalBookingContext.tsx` -- add return location state
- `src/components/rental/RentalSearchCard.tsx` -- add drop-off selector UI
- `src/components/rental/BookingSummaryPanel.tsx` -- display drop-off info and fee
- `src/pages/NewCheckout.tsx` -- save return_location_id to booking
- `src/lib/schemas/booking.ts` -- add validation fields
- `src/lib/pricing.ts` -- include drop-off fee in calculation
- `src/domain/bookings/types.ts` -- add type fields
- `src/domain/bookings/queries.ts` -- join return location data
- `src/pages/admin/BookingDetail.tsx` -- show drop-off info
- `src/pages/admin/ActiveRentalDetail.tsx` -- show drop-off info
- `src/components/admin/return-ops/ReturnBookingSummary.tsx` -- show return location
- `src/lib/pdf/invoice-pdf.ts` -- add drop-off fee line
- `src/lib/pdf/receipt-pdf.ts` -- add drop-off fee line
- `supabase/functions/create-booking/index.ts` -- accept and store return_location_id
- `supabase/functions/create-guest-booking/index.ts` -- accept and store return_location_id

### Fee Logic
- If `return_location_id` is NULL or equals `location_id` (pickup), fee = $0
- If `return_location_id` differs from `location_id`, fee = value from `system_settings.different_dropoff_fee` (default $25)
- Fee is included in the booking subtotal before tax calculation
