# Ops Panel

## Overview

The ops panel (`BookingOpsDrawer`) is the primary staff interface for managing booking lifecycles. It is rendered as a drawer/sheet component accessible from the admin bookings list.

## Key Components

### BookingOpsDrawer

**File**: `src/components/admin/BookingOpsDrawer.tsx`

The main container that orchestrates all ops workflows. Contains:
- Booking summary (desktop + mobile variants)
- Step-based workflow (check-in, dispatch, handover, return)
- Accordion sections for counter upsell, booking edit, modification

### FinancialBreakdown

**File**: `src/components/admin/ops/FinancialBreakdown.tsx`

Deterministic, DB-driven itemized breakdown. Displays:
- Vehicle rental (daily rate × days)
- Weekend surcharge (if applicable)
- Duration discount (weekly/monthly)
- Protection plan cost
- Add-ons (fetched from `booking_add_ons` join `add_ons`)
- Additional drivers (from `booking_additional_drivers`)
- Young driver fee
- Daily regulatory fees (PVRT + ACSRCH)
- Delivery fee
- Drop-off fee
- Upgrade fee (if applicable)
- Subtotal, tax breakdown (PST + GST), total
- Payment history (from `payments` table)

Used in:
- `OpsBookingSummary.tsx` — Desktop ops view
- `MobileBookingSummary.tsx` — Mobile ops view

### CounterUpsellPanel

**File**: `src/components/admin/ops/CounterUpsellPanel.tsx`

Allows staff to add/remove add-ons at the counter before or during a rental. All mutations route through `persist-booking-extras` edge function.

**Available when**: Booking status is `pending` or `confirmed`.

**Flow**:
1. Staff selects an add-on from the available list
2. Client calls `persist-booking-extras` with `action: "upsell-add"`, `addOnId`, `quantity`
3. Edge function computes server-side price, persists to `booking_add_ons`
4. Edge function invokes `reprice-booking` to update booking totals
5. UI refetches booking data to show updated totals

### BookingModificationPanel

**File**: `src/components/admin/ops/BookingModificationPanel.tsx`

Allows staff to extend or shorten rental duration. Calls `reprice-booking` with `operation: "modify"`.

### BookingEditPanel

**File**: `src/components/admin/ops/BookingEditPanel.tsx`

Allows staff to edit non-financial booking fields (notes, pickup details, etc.). Uses standard Supabase client (not edge function) because non-financial fields are not blocked by seatbelt triggers.

## Staff Permissions

### Role-Based Access

| Role | Capabilities |
|------|-------------|
| `admin` | Full access: void bookings, manage all settings, all staff capabilities |
| `staff` | Ops workflows: check-in, dispatch, handover, return, upsell, modify duration, upgrade |
| `cleaner` | Limited: vehicle condition reporting |
| `finance` | Limited: financial reports, payment views |

### Role Enforcement

- **Edge functions**: `requireRoleOrThrow(userId, ["admin", "staff"])` — checked server-side
- **Client-side**: `useUserRole()` hook controls UI visibility, but is NOT a security boundary
- **Database**: `is_admin_or_staff(auth.uid())` function used in RLS policies

## Repricing Flows

All repricing goes through the `reprice-booking` edge function. The ops panel triggers repricing in these scenarios:

### 1. Duration Modification
```
Staff changes end_at → BookingModificationPanel
  → POST reprice-booking { operation: "modify", newEndAt }
  → Recomputes: dailyRate × newDays, protection, fees, taxes
  → Updates: end_at, total_days, subtotal, tax_amount, total_amount
  → Audit log: booking_modified
```

### 2. Counter Upsell (Add)
```
Staff adds add-on → CounterUpsellPanel
  → POST persist-booking-extras { action: "upsell-add", addOnId, quantity }
  → Server computes add-on price from DB
  → Upserts booking_add_ons row
  → Calls reprice-booking { operation: "modify", newEndAt: current }
  → Recomputes totals with new add-on included
  → Audit log: booking_addon_upsell_add
```

### 3. Counter Upsell (Remove)
```
Staff removes add-on → CounterUpsellPanel
  → POST persist-booking-extras { action: "upsell-remove", bookingAddOnId }
  → Deletes booking_add_ons row
  → Calls reprice-booking
  → Recomputes totals without removed add-on
  → Audit log: booking_addon_upsell_remove
```

### 4. Vehicle Upgrade
```
Staff upgrades vehicle → Upgrade panel
  → POST reprice-booking { operation: "upgrade", upgradeDailyFee, assignUnitId }
  → Adds upgrade_daily_fee × days to subtotal
  → Optionally reassigns vehicle unit
  → Audit log: upgrade_fee_applied / vehicle_upgrade_with_unit
```

## Ops Workflows

### Check-In Flow
1. Customer arrives → Staff opens ops drawer
2. Verify identity (license, age)
3. Record timing (early/on-time/late arrival)
4. Create `checkin_records` entry

### Dispatch Flow
1. Assign driver from available pool
2. Set dispatch window
3. Track driver status (en_route, arrived, picked_up)
4. Update `delivery_tasks`

### Handover Flow
1. Record pre-rental condition (photos, odometer, fuel)
2. ID check (if required)
3. Payment verification
4. Mark handover complete
5. Activate booking (status → `active`)

### Return Flow
1. Customer marks return (customer-facing)
2. Staff completes return intake
3. Post-rental condition assessment
4. Damage review (if issues found)
5. Evidence collection
6. Account closure (final invoice generation)
