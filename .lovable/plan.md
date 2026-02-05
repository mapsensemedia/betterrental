
# Return & Inspection Module Hardening Plan

## Executive Summary

This plan addresses five key improvements to strengthen the Return & Inspection flow - already the most robust part of the system with its strict state machine. The focus is on preventing data entry errors, ensuring proper evidence capture, enforcing accountability, and consolidating customer communications.

---

## Current State Assessment

### Strengths (Already Implemented)
- **Strict state machine** in `src/lib/return-steps.ts` with enforced transitions
- **Late fee calculation** with 30-minute grace period (25% of perday price at every hour after grace period)
- **Damage reporting** integrated into Issues step with cost calculation
- **Deposit ledger** tracking all hold/release/deduct actions
- **Auto-release logic** in `src/lib/deposit-automation.ts` for clean returns
- **Customer self-return marking** for key-drop scenarios

### Identified Risks

| Risk | Impact | Current State |
|------|--------|---------------|
| Odometer has no sanity validation | Over/undercharging for mileage | Free-form number input |
| Fuel level is coarse | No 7/8, no photo proof | Slider 0-100% in 5% steps |
| Deposit withhold reason optional | Dispute vulnerability | Optional textarea |
| Invoice email timing | Customer confusion | Receipt sent during deposit step |
| No geofence for customer return | Timestamp disputes | Manual only |

---

## Implementation Plan

### 1. Odometer Validation Against Pickup

**Problem:** Staff can enter any odometer value, including typos that result in impossible readings (e.g., lower than pickup, or extreme jumps indicating data entry errors).

**Solution:** Cross-reference return odometer against pickup metrics and vehicle unit data.

**Changes:**

```text
File: src/components/admin/return-ops/steps/StepReturnIntake.tsx

1. Fetch pickup inspection metrics for comparison
2. Add validation logic:
   - Return odometer must be >= pickup odometer
   - Flag if difference > 5000 km (unusual for typical rental)
   - Show warning for extreme values but allow override with reason
3. Display pickup odometer for staff reference
```

**Validation Rules:**
- **Hard block:** Return odometer < pickup odometer
- **Soft warning:** Return odometer > (pickup + 5000 km) - requires confirmation
- **UI shows:** "Pickup odometer: X km | Expected range: X to X+500 km"

**Database:** No schema changes needed - just UI validation using existing `inspection_metrics` data.

---

### 2. Require Fuel Gauge Photo

**Problem:** Fuel level is subjective (slider value), no proof for disputes about fuel charges.

**Solution:** Add a dedicated fuel gauge photo requirement to the return evidence step.

**Changes:**

```text
File: src/hooks/use-condition-photos.ts

1. Add 'fuel_gauge' as a new PhotoType (separate from odometer_fuel combo)
   - Keep odometer_fuel for backward compatibility
   - Add fuel_gauge as optional but recommended

File: src/components/admin/return-ops/steps/StepReturnEvidence.tsx

1. Add fuel gauge photo tile to the grid
2. Add visual indicator showing pickup vs return fuel levels
3. Make fuel photo required when fuel level < pickup fuel level

File: src/components/admin/return-ops/steps/StepReturnIntake.tsx

1. Replace coarse slider with 8-step dropdown:
   - Empty (0), 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8, Full (100%)
2. Display pickup fuel level for comparison
3. Add note field for fuel discrepancy explanation
```

**Fuel Level Mapping:**
```typescript
const FUEL_LEVELS = [
  { value: 0, label: "Empty" },
  { value: 12, label: "1/8" },
  { value: 25, label: "1/4" },
  { value: 37, label: "3/8" },
  { value: 50, label: "1/2" },
  { value: 62, label: "5/8" },
  { value: 75, label: "3/4" },
  { value: 87, label: "7/8" },
  { value: 100, label: "Full" },
];
```

---

### 3. Require Reason When Withholding Deposit

**Problem:** Staff can withhold deposit funds without documenting why, creating dispute risk.

**Solution:** Make withhold reason mandatory and enforce minimum detail.

**Changes:**

```text
File: src/components/admin/return-ops/steps/StepReturnDeposit.tsx

1. Withhold reason already has validation (`!withholdReason.trim()`)
2. Enhance to require minimum 20 characters for meaningful explanation
3. Add structured reason categories dropdown:
   - Damage repair
   - Fuel refill
   - Late return fee
   - Cleaning fee
   - Traffic violation
   - Other (requires text)
4. Store both category and detailed reason
5. Display linked damage reports when "Damage repair" selected

File: src/lib/deposit-automation.ts

1. Update alert creation to include damage details when flagging for review
2. Ensure reason is passed through to all ledger entries
```

**UI Enhancement:**
```text
┌─────────────────────────────────────────┐
│ Withhold Partial Deposit                │
├─────────────────────────────────────────┤
│ Category: [Dropdown: Damage/Fuel/Late…] │
│                                         │
│ Amount: [$_____]                        │
│                                         │
│ Detailed Reason: (min 20 chars)         │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Linked Damages: [Damage #1 - $200]      │
└─────────────────────────────────────────┘
```

---

### 4. Customer Timestamp Return with Location

**Problem:** Key-drop returns rely solely on customer self-marking without location verification.

**Solution:** Capture GPS coordinates and timestamp when customer marks returned.

**Changes:**

```text
File: src/hooks/use-late-return.ts

1. Enhance markReturned mutation to capture:
   - Timestamp (already captured)
   - GPS coordinates (new)
   - Device info (optional)

File: src/pages/Dashboard.tsx (Customer Dashboard)

1. Add geolocation request when customer clicks "Mark as Returned"
2. Show confirmation modal with location permission request
3. Store coordinates in booking record
4. Display "Marked returned at [time] near [location]" confirmation
```

**Database Migration:**
```sql
ALTER TABLE bookings 
ADD COLUMN customer_return_lat DECIMAL(10,8),
ADD COLUMN customer_return_lng DECIMAL(11,8),
ADD COLUMN customer_return_address TEXT;
```

**Privacy Note:** Location is only captured at the moment of return marking with explicit user action.

---

### 5. Consolidate Communications - Invoice After Deposit

**Problem:** Receipt email is sent during deposit processing, but if partial withholding occurs, customer may receive receipt before final deposit decision, causing confusion.

**Current Flow:**
1. Closeout step → status = completed
2. Deposit step → release/withhold decision
3. Receipt generated + emailed during deposit step
4. Deposit notification sent separately

**Solution:** Ensure receipt and deposit notification are sent together AFTER deposit decision.

**Changes:**

```text
File: src/components/admin/return-ops/steps/StepReturnDeposit.tsx

1. Receipt generation already happens after deposit action (correct)
2. Add explicit sequencing:
   a. Process deposit hold/release via Stripe
   b. Add ledger entry
   c. Generate receipt
   d. Send consolidated email with both receipt AND deposit status
3. Remove separate deposit notification when receipt is sent
4. Add "skip email" option for edge cases

File: supabase/functions/generate-return-receipt/index.ts

1. Include deposit status section in receipt email (already present)
2. Add explicit deposit summary with action taken
3. Merge deposit notification content into receipt email
4. Only send separate deposit notification if receipt generation fails
```

**Consolidated Email Structure:**
```text
Subject: "Your Rental Receipt & Deposit Status - [Booking Code]"

┌────────────────────────────────────────┐
│ C2C RENTAL - RETURN CONFIRMATION       │
├────────────────────────────────────────┤
│ ✓ Your rental is complete              │
│                                        │
│ VEHICLE: 2024 Toyota Camry             │
│ DATES: Feb 1-5, 2025                   │
│                                        │
│ ── CHARGES ──────────────────────────  │
│ Rental: $200.00                        │
│ Add-ons: $50.00                        │
│ Tax: $30.00                            │
│ TOTAL PAID: $280.00                    │
│                                        │
│ ── DEPOSIT ──────────────────────────  │
│ Deposit Held: $350.00                  │
│ Withheld: $0.00                        │
│ Released: $350.00 ✓                    │
│                                        │
│ Your deposit has been released and     │
│ will appear in 5-10 business days.     │
└────────────────────────────────────────┘
```

---

## Technical Implementation Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/return-ops/steps/StepReturnIntake.tsx` | Odometer validation, fuel dropdown, pickup reference |
| `src/components/admin/return-ops/steps/StepReturnEvidence.tsx` | Fuel gauge photo slot |
| `src/components/admin/return-ops/steps/StepReturnDeposit.tsx` | Mandatory reason with category, consolidated comms |
| `src/hooks/use-condition-photos.ts` | Add fuel_gauge photo type |
| `src/hooks/use-late-return.ts` | GPS capture for customer return |
| `src/pages/Dashboard.tsx` | Geolocation prompt for return marking |
| `src/pages/admin/ReturnOps.tsx` | Fetch pickup metrics for comparison |
| `supabase/functions/generate-return-receipt/index.ts` | Enhanced email with deposit status |

### Database Migration

```sql
-- Add fields for customer return location
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS customer_return_lat DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS customer_return_lng DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS customer_return_address TEXT;

-- Add withhold category to deposit_ledger
ALTER TABLE deposit_ledger
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add fuel photo type to condition_photos enum (if using enum)
-- Note: Current system uses TEXT for photo_type, no migration needed
```

---

## Validation Rules Summary

### Odometer Validation
```typescript
const validateReturnOdometer = (returnReading: number, pickupReading: number) => {
  if (returnReading < pickupReading) {
    return { valid: false, error: "Return odometer cannot be less than pickup" };
  }
  
  const difference = returnReading - pickupReading;
  if (difference > 5000) {
    return { valid: true, warning: `Unusual mileage: ${difference} km. Confirm this is correct.` };
  }
  
  return { valid: true };
};
```

### Deposit Withhold Validation
```typescript
const validateWithholdReason = (reason: string, category: string) => {
  if (!category) return { valid: false, error: "Select a category" };
  if (!reason || reason.trim().length < 20) {
    return { valid: false, error: "Reason must be at least 20 characters" };
  }
  return { valid: true };
};
```

---

## Risk Mitigation

| Original Risk | Mitigation | Confidence |
|--------------|------------|------------|
| Odometer typos | Cross-validation against pickup + warnings | High |
| Fuel disputes | Photo proof + granular levels | High |
| Deposit disputes | Mandatory categorized reasons | High |
| Timestamp disputes | GPS coordinates on customer mark | Medium |
| Email confusion | Single consolidated receipt/deposit email | High |

---

## Implementation Order

1. **Odometer validation** - Highest impact, prevents billing errors
2. **Deposit reason requirement** - Protects against disputes
3. **Fuel level improvements** - Better granularity + photo
4. **Consolidated communications** - Better customer experience
5. **Customer GPS return** - Nice-to-have for disputes

Each step can be implemented and tested independently.
