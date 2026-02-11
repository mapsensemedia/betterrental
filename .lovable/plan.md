

## Vehicle Upgrade Panel, Cross-Category VIN Assignment, and Late Return Fee Overhaul

### Overview

Three interconnected changes to the Ops handover workflow:

1. A new **Upgrade Panel** visible as a full card on the handover step (not hidden in a menu), where staff can apply a flexible per-day upgrade charge
2. **Cross-category VIN assignment** allowing ops to assign any unit from any category by entering its VIN/plate or unique code, while the customer-facing view shows the originally booked category
3. **Revised late return fee structure**: 25% of daily rate per hour for the first 2 hours after the 30-minute grace period, then a full day charge from the 3rd hour onward then updated every day and customer must be notified about that.

---

### 1. Database Changes

**New columns on `bookings` table:**

| Column | Type | Purpose |
|--------|------|---------|
| `upgrade_daily_fee` | numeric, nullable, default 0 | Per-day upgrade charge set by ops staff |
| `upgrade_category_label` | text, nullable | The upgraded category name to optionally show to customer |
| `upgrade_visible_to_customer` | boolean, default false | Whether the upgrade is disclosed to the customer |
| `internal_unit_category_id` | uuid, nullable | Actual category of the assigned VIN (may differ from `vehicle_id`) |

No new tables needed. These columns extend the existing booking record.

---

### 2. Vehicle Upgrade Panel (New Component)

**File: `src/components/admin/ops/VehicleUpgradePanel.tsx`**

A new Card component placed alongside the CounterUpsellPanel on the handover step. Features:

- **Free-form daily fee input**: Number input field where ops staff enters any amount ($5 to $800+)
- **Total calculation display**: Shows `daily fee x rental days = total upgrade charge`
- **"Show to customer" toggle**: Checkbox to optionally reveal the upgraded category to the customer
- **Category label field**: If showing to customer, a text field or dropdown for the category name they see
- **Apply/Remove buttons**: Adds the upgrade fee to the booking subtotal (recalculates taxes), or removes it
- Audit log entry on apply/remove

**Placement in `OpsStepContent.tsx`:**
- Added at the `handover` step, in the "Quick Actions" section, alongside UnifiedVehicleManager and BookingEditPanel
- Also available at the `checkin` step near the CounterUpsellPanel

---

### 3. Cross-Category VIN Assignment

**Changes to `UnifiedVehicleManager.tsx`:**

- Add a "Manual VIN Entry" section: a text input where staff can type a VIN or license plate
- Search across ALL categories and locations for matching units (not just the selected category)
- When a cross-category unit is selected, store `internal_unit_category_id` on the booking to track the actual category
- The booking's `vehicle_id` (customer-facing category) remains unchanged
- Display a warning badge when assigned VIN belongs to a different category than booked

---

### 4. Late Return Fee Restructure

**Changes to `src/lib/late-return.ts`:**

Current logic: 25% of daily rate per hour (flat rate for all hours after grace period)

New logic:
- 0-30 minutes: Grace period, no charge
- 31 min to 2 hours after grace: 25% of daily rate per hour (unchanged rate, but capped at 2 billable hours)
- From 3rd hour onward: Full day charge (1x daily rate) -- replaces hourly billing entirely

Update `calculateLateReturnFeeWithRate()`:
```
if hoursLate <= 2:
  fee = hoursLate * (dailyRate * 0.25)
else:
  fee = dailyRate  // full day charge
```

**Changes to `src/lib/pricing.ts`:**

Update `calculateLateFee()` to match the same tiered logic (this is the legacy function using flat $25/hr -- update to use daily-rate-based calculation or deprecate in favor of `late-return.ts`).

**Changes to `src/lib/pdf/rental-agreement-pdf.ts`:**

Update the late fee policy text to reflect the new structure: "25% of daily rate per hour for the first 2 hours, then a full day charge thereafter."

**Changes to `getLateReturnSummary()`:**

Update the display string to describe the two-tier structure.

---

### 5. Files Modified Summary

| File | Change |
|------|--------|
| `src/components/admin/ops/VehicleUpgradePanel.tsx` | **New** -- Dedicated upgrade panel component |
| `src/components/admin/ops/OpsStepContent.tsx` | Add VehicleUpgradePanel to handover and checkin steps |
| `src/components/admin/UnifiedVehicleManager.tsx` | Add manual VIN/plate search input for cross-category assignment |
| `src/lib/late-return.ts` | Rewrite fee calculation: 2-hour threshold then full day |
| `src/lib/pricing.ts` | Update `calculateLateFee` to match new tiered structure |
| `src/lib/pdf/rental-agreement-pdf.ts` | Update late fee policy wording |
| `src/components/admin/ops/OpsBookingSummary.tsx` | Show upgrade fee line item if present |
| Database migration | Add `upgrade_daily_fee`, `upgrade_category_label`, `upgrade_visible_to_customer`, `internal_unit_category_id` columns |

