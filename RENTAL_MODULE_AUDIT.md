# Rental Module Comprehensive Audit

**Audit Date:** 2026-02-02  
**Auditor:** Senior Full-Stack Engineer + QA Lead  
**Scope:** End-to-end rental module analysis

---

## Table of Contents
1. [System Map](#1-system-map)
2. [Flow Diagrams](#2-flow-diagrams)
3. [Dependency Map](#3-dependency-map)
4. [Top 15 Refactor Targets](#4-top-15-refactor-targets)
5. [Duplicate Logic Inventory](#5-duplicate-logic-inventory)
6. [Architecture Recommendations](#6-architecture-recommendations)

---

## 1. System Map

### 1.1 Customer-Facing Pages

| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| Index | `/` | Landing page with search | ✅ Active |
| Search | `/search` | Browse vehicle categories | ✅ Active |
| Protection | `/protection` | Select protection package | ✅ Active |
| AddOns | `/add-ons` | Select extras/add-ons | ✅ Active |
| NewCheckout | `/checkout` | Complete booking | ✅ Active |
| BookingDetail | `/booking/:id` | View booking details | ✅ Active |
| Dashboard | `/dashboard` | Customer booking history | ✅ Active |
| BookingConfirmed | `/booking/confirmed` | Post-booking confirmation | ✅ Active |
| BookingLicense | `/booking/:id/license` | Upload driver license | ✅ Active |
| BookingAgreement | `/booking/:id/agreement` | Sign rental agreement | ✅ Active |
| BookingPass | `/booking/:id/pass` | Digital boarding pass | ✅ Active |
| BookingPickup | `/booking/:id/pickup` | Pickup instructions | ✅ Active |
| BookingReturn | `/booking/:id/return` | Return instructions | ✅ Active |
| WalkaroundSign | `/walkaround/:id` | Customer walkaround sign | ✅ Active |

### 1.2 Admin Pages

| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| Overview | `/admin` | Dashboard overview | ✅ Active |
| Bookings | `/admin/bookings` | Unified operations hub | ✅ Active |
| BookingDetail | `/admin/bookings/:id` | Booking details | ✅ Active |
| BookingOps | `/admin/bookings/:id/ops` | Handover workflow | ✅ Active |
| ActiveRentalDetail | `/admin/active-rentals/:id` | Monitor active rental | ✅ Active |
| ReturnOps | `/admin/returns/:id` | Return processing | ✅ Active |
| FleetManagement | `/admin/fleet` | Fleet categories & VINs | ✅ Active |
| FleetAnalytics | `/admin/fleet-analytics` | Fleet performance | ✅ Active |
| Calendar | `/admin/calendar` | Booking calendar | ✅ Active |
| Alerts | `/admin/alerts` | Admin notifications | ✅ Active |
| Incidents | `/admin/incidents` | Incident management | ✅ Active |
| Billing | `/admin/billing` | Payment management | ✅ Active |
| AbandonedCarts | `/admin/abandoned-carts` | Recovery tracking | ✅ Active |

### 1.3 Redirected/Deprecated Routes

| Old Route | Redirects To | Reason |
|-----------|--------------|--------|
| `/admin/pickups` | `/admin/bookings?tab=pickups` | Consolidated |
| `/admin/active-rentals` | `/admin/bookings?tab=active` | Consolidated |
| `/admin/returns` | `/admin/bookings?tab=returns` | Consolidated |
| `/admin/history` | `/admin/bookings?tab=completed` | Consolidated |
| `/admin/inventory` | `/admin/fleet` | Renamed |
| `/vehicle/:id` | `/search` | Category-based now |

### 1.4 Core Hooks (58 Total)

**Booking & Rental:**
- `use-bookings.ts` - Admin booking CRUD
- `use-availability.ts` - Vehicle availability checks
- `use-browse-categories.ts` - Customer category browsing
- `use-fleet-categories.ts` - Admin category management (⚠️ Overlaps)
- `use-vehicle-categories.ts` - Category CRUD (⚠️ Duplicate of fleet-categories)
- `use-vehicles.ts` - Legacy vehicle queries
- `use-vehicle-units.ts` - VIN management
- `use-hold.ts` - Reservation holds

**Operations:**
- `use-checkin.ts` - Check-in records
- `use-handovers.ts` - Handover tracking
- `use-returns.ts` - Return processing
- `use-return-state.ts` - Return state machine
- `use-ops-next-step.ts` - Ops workflow guidance

**Fleet:**
- `use-fleet-analytics.ts` - Fleet metrics
- `use-fleet-cost-analysis.ts` - Cost tracking
- `use-maintenance-logs.ts` - Maintenance records
- `use-vehicle-expenses.ts` - Expense tracking
- `use-vehicle-prep.ts` - Prep checklists
- `use-damages.ts` - Damage reports
- `use-incidents.ts` - Incident cases

**Payments:**
- `use-payments.ts` - Payment records
- `use-payment-deposit.ts` - Deposit management
- `use-deposit-ledger.ts` - Deposit transactions
- `use-receipts.ts` - Receipt generation

**Customer:**
- `use-auth.ts` - Authentication
- `use-license-upload.ts` - License uploads
- `use-verification.ts` - Identity verification
- `use-rental-agreement.ts` - Agreement signing
- `use-walkaround.ts` - Walkaround inspection

### 1.5 Utility Libraries

| File | Purpose | Lines | Complexity |
|------|---------|-------|------------|
| `pricing.ts` | Central pricing calculations | 356 | Medium |
| `rental-rules.ts` | Business rules (durations, fees) | 205 | Medium |
| `booking-routes.ts` | Status-based routing | 83 | Low |
| `booking-stages.ts` | Workflow stages | 165 | Medium |
| `ops-steps.ts` | Ops workflow steps | 252 | High |
| `return-steps.ts` | Return state machine | 226 | High |
| `availability.ts` | Availability checks | 264 | Medium |
| `fuel-pricing.ts` | Fuel service pricing | ~100 | Low |
| `deposit-automation.ts` | Deposit job handling | ~150 | Medium |
| `checkout-policies.ts` | Checkout validation | ~80 | Low |

### 1.6 Edge Functions (24 Total)

**Booking Flow:**
- `create-booking` - Authenticated booking creation
- `create-guest-booking` - Guest checkout
- `create-checkout-session` - Stripe checkout
- `create-payment-intent` - Payment processing
- `stripe-webhook` - Stripe events handler

**Notifications:**
- `send-booking-email` - Email confirmations
- `send-booking-sms` - SMS notifications
- `send-booking-otp` - OTP verification
- `verify-booking-otp` - OTP validation
- `notify-admin` - Admin alerts
- `send-agreement-notification` - Agreement reminders
- `send-deposit-notification` - Deposit alerts
- `send-payment-request` - Payment reminders
- `send-payment-confirmation` - Payment receipts

**Operations:**
- `generate-agreement` - Rental agreement PDF
- `generate-return-receipt` - Return receipt
- `check-rental-alerts` - Scheduled alert checks
- `process-deposit-jobs` - Deposit queue
- `process-deposit-refund` - Refund processing
- `calculate-fleet-costs` - Fleet cost analysis

**Utility:**
- `get-mapbox-token` - Map token provider
- `send-contact-email` - Contact form
- `confirm-admin-email` - Admin email verification

---

## 2. Flow Diagrams

### 2.1 Customer Booking Flow

```
Landing (/) 
    │ GlassSearchBar
    ▼
Search (/search)
    │ Select Category
    ▼
Protection (/protection)
    │ Select Package
    ▼
AddOns (/add-ons)
    │ Select Extras
    ▼
Checkout (/checkout)
    ├─ Guest: create-guest-booking edge function
    └─ Logged in: Direct Supabase insert
    ▼
BookingConfirmed (/booking/confirmed)
    │ Redirect to license/pass
    ▼
[Post-Booking Customer Journey]
    ├── License Upload (/booking/:id/license)
    ├── Agreement Sign (/booking/:id/agreement)
    ├── Pass View (/booking/:id/pass)
    └── Pickup/Return Info
```

### 2.2 Admin Operations Flow (BookingOps)

```
Bookings Hub (/admin/bookings)
    │ Status: pending/confirmed
    ▼
BookingOps (/admin/bookings/:id/ops)
    │
    ├─ Step 1: Prep
    │   └── Checklist + Pre-inspection photos
    │
    ├─ Step 2: Check-In
    │   └── Verify ID, license, age
    │
    ├─ Step 3: Payment
    │   └── Auto-sync or manual deposit
    │
    ├─ Step 4: Agreement
    │   └── Manual in-person signing
    │
    ├─ Step 5: Walkaround
    │   └── Staff inspection checklist
    │
    └─ Step 6: Handover
        └── Activate rental → Move to Active
        ▼
ActiveRentalDetail (/admin/active-rentals/:id)
```

### 2.3 Return Operations Flow (ReturnOps)

```
Active Rental
    │ "Process Return" action
    ▼
ReturnOps (/admin/returns/:id)
    │ State: not_started → initiated
    │
    ├─ Step 1: Intake
    │   └── Time, odometer, fuel → intake_done
    │
    ├─ Step 2: Evidence
    │   └── Return photos → evidence_done
    │
    ├─ Step 3: Issues
    │   └── Review flags/damages → issues_reviewed
    │
    ├─ Step 4: Closeout
    │   └── Complete return → closeout_done (status: completed)
    │
    └─ Step 5: Deposit
        └── Release/withhold → deposit_processed
```

### 2.4 Fleet Management Flow

```
FleetManagement (/admin/fleet)
    │
    ├── Categories Tab
    │   ├── Create/Edit Category
    │   └── Manage VINs per category
    │
    ├── Units Tab
    │   ├── All VINs across categories
    │   └── Status management
    │
    └── Analytics Tab
        ├── Utilization rates
        └── Cost tracking
```

---

## 3. Dependency Map

### 3.1 Customer Checkout Dependencies

```
NewCheckout.tsx
├── Context: RentalBookingContext
├── Hooks:
│   ├── useCategory (or useVehicle for legacy)
│   ├── useAddOns
│   ├── useAuth
│   ├── useSaveAbandonedCart
│   └── useMarkCartConverted
├── Libs:
│   ├── pricing.ts (calculateBookingPricing)
│   ├── rental-rules.ts (formatTimeDisplay)
│   └── checkout-policies.ts
├── Edge Functions:
│   ├── create-guest-booking (guest flow)
│   ├── create-checkout-session (Stripe)
│   └── send-booking-* (notifications)
└── Tables:
    ├── bookings (write)
    ├── booking_add_ons (write)
    ├── booking_additional_drivers (write)
    ├── profiles (read/write)
    └── vehicle_categories (read)
```

### 3.2 Admin Bookings Hub Dependencies

```
Bookings.tsx
├── Hooks:
│   ├── useAdminBookings
│   ├── usePendingAlertsCount
│   └── useRealtimeSubscriptions
├── Libs:
│   ├── booking-routes.ts (getBookingRoute)
│   └── pricing.ts (status styles)
└── Tables:
    ├── bookings (read)
    ├── profiles (read)
    ├── locations (read)
    └── vehicle_categories (read)
```

### 3.3 Database Tables Accessed

| Table | Read By | Write By |
|-------|---------|----------|
| bookings | All flows | checkout, ops, returns |
| booking_add_ons | Detail views | checkout |
| booking_additional_drivers | Detail views | checkout |
| vehicle_categories | Browse, checkout | Admin fleet |
| vehicle_units | Ops, fleet | Ops assignment |
| profiles | All | Auth, checkout |
| payments | Billing, ops | Payment hooks |
| deposit_ledger | Ops | Deposit automation |
| condition_photos | Ops, returns | Photo upload |
| rental_agreements | Ops | Agreement signing |
| checkin_records | Ops | Check-in step |
| inspection_metrics | Ops, returns | Walkaround |
| damage_reports | Returns, fleet | Return issues |
| admin_alerts | Alerts page | Status changes |
| audit_logs | Reports | All mutations |

---

## 4. Top 15 Refactor Targets

### 🔴 Critical (Must Fix)

#### 1. **Duplicate Category Hooks** ⚠️ HIGH PRIORITY
**Files:** 
- `use-vehicle-categories.ts` (251 lines)
- `use-fleet-categories.ts` (464 lines)
- `use-browse-categories.ts` (145 lines)

**Problem:** Three separate hooks for category management with overlapping functionality:
- `useVehicleCategories` - Basic CRUD
- `useFleetCategories` - Enhanced CRUD with VIN operations
- `useBrowseCategories` - Customer-facing availability

**Impact:** Inconsistent data fetching, potential cache conflicts, maintenance burden.

**Recommendation:** Consolidate into single `use-categories.ts` with:
- `useCategories()` - Base query
- `useCategoriesWithAvailability(locationId, dates)` - Customer
- `useCategoryMutations()` - Admin CRUD

---

#### 2. **Legacy `vehicles` Table vs `vehicle_categories` System** ⚠️ HIGH PRIORITY
**Files:** 
- `src/lib/availability.ts` - Still queries `vehicles` table
- `src/hooks/use-vehicles.ts` - Still queries `vehicles` table
- Edge functions - Mixed usage

**Problem:** The system has migrated to category-based booking but legacy code still queries the old `vehicles` table directly. The `availability.ts` library doesn't use the category system.

**Impact:** Availability checks may not reflect actual VIN availability.

**Recommendation:** 
- Migrate `availability.ts` to use `vehicle_units` + `vehicle_categories`
- Deprecate `use-vehicles.ts` in favor of category hooks
- Mark `vehicles` table as legacy in schema

---

#### 3. **Duplicate Booking Creation Logic** ⚠️ HIGH PRIORITY
**Files:**
- `NewCheckout.tsx` (lines 284-345) - Direct Supabase insert for logged-in users
- `create-guest-booking/index.ts` - Edge function for guests
- `create-booking/index.ts` - Edge function with hold system

**Problem:** Three different code paths for creating bookings:
1. Direct insert in NewCheckout for authenticated users
2. Guest booking edge function
3. Hold-based booking edge function (appears unused)

**Impact:** Logic drift, inconsistent validation, notification gaps.

**Recommendation:** 
- Route ALL bookings through a single `create-booking` edge function
- Remove direct Supabase inserts from frontend
- Deprecate hold-based flow if unused

---

### 🟠 Important (Should Fix)

#### 4. **Large Context File**
**File:** `RentalBookingContext.tsx` (390 lines)

**Problem:** Monolithic context handling search, delivery, add-ons, and additional drivers.

**Recommendation:** Split into:
- `SearchContext` - Dates, location, delivery mode
- `SelectionContext` - Vehicle, add-ons, drivers
- Keep `RentalBookingContext` as orchestrator

---

#### 5. **Duplicate Status Badge Styling**
**Files:**
- `pricing.ts` - `BOOKING_STATUS_STYLES`, `DAMAGE_STATUS_STYLES`
- `StatusBadge.tsx` - Hardcoded styles
- Various components - Inline badge styling

**Recommendation:** Centralize ALL status styling in `pricing.ts` and use single `StatusBadge` component everywhere.

---

#### 6. **Inconsistent Pricing Calculation Entry Points**
**Files:**
- `BookingSummaryPanel.tsx` - Calculates inline
- `NewCheckout.tsx` - Uses `calculateBookingPricing`
- `TotalBar.tsx` - Receives pre-calculated
- Admin views - Mixed approaches

**Recommendation:** Always use `calculateBookingPricing()` from `pricing.ts` at the data layer (hooks), pass breakdown to components.

---

#### 7. **ops-steps.ts vs booking-stages.ts Overlap**
**Files:**
- `booking-stages.ts` - 15 stages for full lifecycle
- `ops-steps.ts` - 6 steps for ops workflow

**Problem:** Two different stage systems that partially overlap but serve different purposes.

**Recommendation:** 
- `booking-stages.ts` → Customer-facing lifecycle
- `ops-steps.ts` → Internal ops workflow
- Document the distinction clearly

---

### 🟡 Moderate (Nice to Have)

#### 8. **Unused Imports in Multiple Files**
**Example Files:**
- Various pages with unused React hooks
- Components importing unused icons

**Recommendation:** Run ESLint `no-unused-vars` check and clean up.

---

#### 9. **Large Admin Pages**
**Files:**
- `NewCheckout.tsx` (1074 lines) - Extract form sections
- `BookingOps.tsx` - Extract step components
- `FleetManagement.tsx` - Extract tab content

**Recommendation:** Break into smaller, focused components.

---

#### 10. **Duplicate Toast Implementations**
**Files:**
- `use-toast.ts` (shadcn)
- `sonner` library

**Problem:** Two toast systems available.

**Recommendation:** Standardize on one (sonner is simpler, use it consistently).

---

#### 11. **Hardcoded Location Fallback**
**File:** `NewCheckout.tsx` (line 268)
```typescript
locationId = "a1b2c3d4-1111-4000-8000-000000000001"; // Downtown Hub
```

**Recommendation:** Fetch default location from config or fail gracefully.

---

#### 12. **Mixed camelCase/snake_case in API Responses**
**Files:** Edge functions return camelCase, Supabase returns snake_case

**Recommendation:** Standardize on camelCase in all edge function responses, transform at hook layer.

---

#### 13. **Inconsistent Error Handling**
**Files:** Various hooks and edge functions

**Problem:** Some use toast, some throw, some return null.

**Recommendation:** Standardize error handling pattern:
- Hooks: Return `{ data, error, isLoading }`
- Edge functions: Always return JSON with `error` field
- UI: Central error boundary + toast

---

#### 14. **Orphaned Components**
**Potential Files to Audit:**
- `VehicleCard.tsx`, `VehicleDetailsModal.tsx` - May be unused after category migration
- Legacy booking components

**Recommendation:** Search for unused components and remove.

---

#### 15. **Missing Test Coverage**
**Current:** E2E tests exist but no unit tests for:
- `pricing.ts` calculations
- `ops-steps.ts` state machine
- `return-steps.ts` state machine

**Recommendation:** Add unit tests for critical business logic.

---

## 5. Duplicate Logic Inventory

| Pattern | Occurrences | Files | Action |
|---------|-------------|-------|--------|
| Category fetching | 3 hooks | use-*-categories.ts | Consolidate |
| Booking creation | 3 paths | checkout, edge functions | Unify |
| Status styling | 4+ places | Various | Centralize |
| Price calculation | 3+ places | Components | Use central fn |
| Date formatting | 10+ places | Various | Use date-fns utils |
| Vehicle→Category mapping | 5+ places | Hooks, components | Create mapper |
| Notification sending | 3 edge fns per type | Edge functions | Consider queue |

---

## 6. Architecture Recommendations

### 6.1 Short-Term (This Sprint)

1. **Unify category hooks** into single `use-categories.ts`
2. **Route all booking creation** through edge function
3. **Add unit tests** for `pricing.ts` and state machines
4. **Remove hardcoded fallbacks** with proper error handling

### 6.2 Medium-Term (Next Sprint)

1. **Migrate availability.ts** to category/VIN system
2. **Deprecate vehicles table** with migration plan
3. **Split RentalBookingContext** into focused contexts
4. **Standardize error handling** across all hooks

### 6.3 Long-Term (Backlog)

1. **Extract shared libs** for potential micro-frontend
2. **Add OpenAPI spec** for edge functions
3. **Implement proper queue** for notifications
4. **Create design system tokens** for all status badges

---

## Appendix A: Files by Size (Candidates for Splitting)

| File | Lines | Recommendation |
|------|-------|----------------|
| NewCheckout.tsx | 1074 | Split form sections |
| RentalBookingContext.tsx | 390 | Split contexts |
| use-fleet-categories.ts | 464 | Merge with others |
| pricing.ts | 356 | OK - keep as single source |
| availability.ts | 264 | Needs category migration |
| ops-steps.ts | 252 | OK - well structured |
| use-vehicle-categories.ts | 251 | Merge into fleet |
| return-steps.ts | 226 | OK - state machine |
| rental-rules.ts | 205 | OK - business rules |

---

## Appendix B: Edge Function Dependencies

```
create-guest-booking
├── _shared/cors.ts (validation, rate limiting)
├── _shared/auth.ts (admin client)
├── send-booking-email (fire-and-forget)
├── send-booking-sms (fire-and-forget)
└── notify-admin (fire-and-forget)

create-booking
├── _shared/cors.ts
├── _shared/auth.ts (requires auth)
├── send-booking-sms
├── send-booking-email
└── notify-admin

stripe-webhook
├── payment status updates
└── send-payment-confirmation
```

---

**End of Audit Document**
