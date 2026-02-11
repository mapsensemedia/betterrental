

## Fix: Young Additional Driver Fee - Admin to Customer Flow

### Problem
The admin panel already has a field to set the young additional driver rate (in the Protection Pricing panel under "Driver Fees"), but this fee is never applied on the customer-facing Add-Ons page. When a user selects an additional driver with age band 20-24, no young driver surcharge is added -- the `calculateAdditionalDriversCost` function hardcodes `youngDriverFees: 0`.

### Changes Required

#### 1. Update `AdditionalDriversCard` (`src/components/rental/AdditionalDriversCard.tsx`)
- Fetch `youngAdditionalDriverDailyRate` from the `useDriverFeeSettings` hook (already imported but unused for young fee)
- Display the young driver surcharge note next to the 20-24 age option
- Show per-driver cost breakdown when a young driver is selected (base fee + young surcharge)
- Update the total display to include young driver fees

#### 2. Update `calculateAdditionalDriversCost` function (same file)
- Accept `youngDriverDailyRate` as a parameter
- Count drivers with `ageBand === "20_24"` and multiply by the young rate and rental days
- Return the correct `youngDriverFees` and updated `total`

#### 3. Update all callers of `calculateAdditionalDriversCost`
- **`BookingSummaryPanel.tsx`**: Pass `youngAdditionalDriverDailyRate` from the existing `useDriverFeeSettings` hook
- **`AddOns.tsx`**: Pass the young driver rate so the extras page total is correct
- **`NewCheckout.tsx`**: Pass the young driver rate so the checkout total is correct

### Technical Details

**`calculateAdditionalDriversCost` updated signature:**
```
function calculateAdditionalDriversCost(
  drivers: AdditionalDriver[],
  rentalDays: number,
  baseDriverFee: number,
  youngDriverFee: number
): { baseFees: number; youngDriverFees: number; total: number }
```

**Calculation logic:**
- `baseFees = drivers.length * baseDriverFee * rentalDays`
- `youngDriverFees = youngDriverCount * youngDriverFee * rentalDays`
- `total = baseFees + youngDriverFees`

**UI enhancement in AdditionalDriversCard:**
- When a driver selects 20-24, show a small note: "+ $X.XX/day young driver surcharge"
- The card header total updates to reflect both base + young fees

### Files Modified
1. `src/components/rental/AdditionalDriversCard.tsx` -- core fix
2. `src/components/rental/BookingSummaryPanel.tsx` -- pass young rate
3. `src/pages/AddOns.tsx` -- pass young rate
4. `src/pages/NewCheckout.tsx` -- pass young rate

### No Impact On
- Admin settings panel (already works correctly)
- Protection pricing logic
- Primary renter young driver fee (separate system)
- Edge functions / booking creation logic

