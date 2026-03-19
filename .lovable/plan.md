

## Plan: Add Driver's License to Active Rental Customer Card

### Problem
The Customer Card on the Active Rental Detail page only shows name, phone, and email. License data exists on `profiles` table (`driver_license_number`, `driver_license_front_url`, `driver_license_back_url`) but isn't fetched or displayed.

### Changes

#### 1. Expand profile query (`src/hooks/use-active-rental-detail.ts`)
- Line 124: Add `driver_license_number, driver_license_front_url, driver_license_back_url, driver_license_status, driver_license_expiry` to the profile select
- Update the `ActiveRentalDetail` interface's `customer` type to include these fields

#### 2. Update Customer Card UI (`src/pages/admin/ActiveRentalDetail.tsx`)
- After the phone/email section, add:
  - **DL number** as a labeled field with `CreditCard` icon (always shown, "Not provided" if missing)
  - **DL image thumbnails** (front + back if available) using `SignedStorageImage` component from `driver-licenses` bucket
  - Click thumbnails to open a **full-size preview dialog** (same pattern as `OpsBookingSummary`)
  - **"No license on file"** placeholder in muted text when no license URL exists
- Add state for `showLicenseDialog` and a `Dialog` component

#### 3. No other files need changes
The `BookingCustomerCard` (used in BookingOps) already shows `driver_license_number`. The `OpsBookingSummary` sidebar already has the license dialog. This change targets the `ActiveRentalDetail` page specifically, completing coverage across all booking detail views.

### Technical Notes
- Reuse `SignedStorageImage` component already used in `OpsBookingSummary`
- License images are in the private `driver-licenses` bucket — signed URLs handled by the component
- The profile data mapping at ~line 200 needs to pass the new fields through to the `customer` object

