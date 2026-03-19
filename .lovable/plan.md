## Plan: Display Driver's License in Ops Panel

### Problem

The customer's driver's license is stored on the `profiles` table (`driver_license_front_url`, `driver_license_status: on_file`, `driver_license_number: 04979966`) and is already fetched by `useBookingById`. However:

1. **Customer card in summary sidebar** — Shows the license status badge but has no styling for `on_file` (only handles `verified`, `pending`, `rejected`). No way to click and view the actual license image.
2. `**LicenseReviewCard**` — Built to read from `verification_requests` table, which has zero records for this booking. The component is never imported anywhere in the ops panel.
3. `**StepCheckin**` — Already queries profile license fields and shows the license image/upload UI, but only within the Check-in step. If the operator is on a different step, they can't see the license.

### Changes

#### 1. Customer card license section (`src/components/admin/ops/OpsBookingSummary.tsx`)

- Add styling for `on_file` status (emerald/green badge like `verified`)
- Make the license badge/row clickable — when clicked, open a dialog showing the license image from `booking.profiles.driver_license_front_url`
- Show license number if available
- Use signed URL hook for the image (same pattern as `StepCheckin`)

#### 2. Add license preview dialog to `OpsBookingSummary`

- Small inline dialog/popover that shows the license image at full size
- Shows license number and expiry if available
- Reuse the `useSignedStorageUrl` hook if the URL is a storage path, or display directly if it's already a signed URL (current data shows it's already a full signed URL)

### No other files need changes

The `LicenseReviewCard` is designed for `verification_requests` workflow (a different flow). The profile-based license data is the correct source for this booking. The `StepCheckin` component already handles license display within its own step — this change makes it visible from the summary sidebar at all times.  
  


## Plan: Fix Stale "Needs Activation" Badge After Rental Activation

### Problem

The `ActiveRentalDetail` page `/ops/rental/:bookingId`) reads booking data from the `useActiveRentalDetail` hook (query key: `["active-rental-detail", bookingId]`). When the "Activate Rental" button triggers `useUpdateBookingStatus`, the mutation's `onSuccess` invalidates many query keys but **not** `["active-rental-detail"]`. This means the page continues displaying the stale `confirmed` status and "Needs Activation" badge even after a successful activation.

Additionally, the `ActiveRentalDetail` page has a `window.location.reload()` hack in its activation handler as a workaround, which is unreliable and causes a full page reload. The `BookingOps` page navigates to `/ops/rental/:bookingId` after activation, but by the time it arrives, the stale cache may still be served.

### Database Check

The booking VJU2QNQ6 currently shows `status: confirmed` and `activated_at: null` in the database, confirming it has not yet been successfully activated. The compliance steps are green but activation hasn't been executed yet (or failed silently due to a network/auth issue).

### Changes

#### 1. Add missing query invalidation `src/hooks/use-bookings.ts`)

In `useUpdateBookingStatus`'s `onSuccess`, add invalidation for the `active-rental-detail` query key so the `ActiveRentalDetail` page re-fetches after any status change.

#### 2. Remove `window.location.reload()` hack `src/pages/admin/ActiveRentalDetail.tsx`)

In the activation dialog's `onSuccess`, replace `window.location.reload()` with just `refetchBooking()` — the query invalidation from step 1 will handle refreshing `rental` data. After successful activation, navigate to the same page (or let the invalidation trigger a re-render) so the badge updates to "Active" without a full page reload.

### Technical Details

- **Query key to add**: `["active-rental-detail"]` in `useUpdateBookingStatus`'s `onSuccess` callback

- **No edge function changes** — the `update-booking-status` function correctly sets `status: "active"` with all activation fields

- **No database changes needed**

&nbsp;

&nbsp;