# C2C Car Rental Platform — Authoritative Build Prompt

> **Version:** 1.0 — Generated from live codebase analysis, 2026-02-08
> **Stack:** React 18 + Vite + TypeScript + Tailwind CSS + Supabase (Lovable Cloud) + Stripe
> **Currency:** CAD | **Region:** British Columbia, Canada

---

## Table of Contents

1. [Vision & Scope](#1-vision--scope)
2. [Roles & Permissions](#2-roles--permissions)
3. [Database Schema](#3-database-schema)
4. [Route Map](#4-route-map)
5. [Customer Flows](#5-customer-flows)
6. [Ops Panel Flows](#6-ops-panel-flows)
7. [Admin Panel Flows](#7-admin-panel-flows)
8. [Delivery Panel Flows](#8-delivery-panel-flows)
9. [Support Panel Flows](#9-support-panel-flows)
10. [Booking & Vehicle State Machines](#10-booking--vehicle-state-machines)
11. [Pricing Engine](#11-pricing-engine)
12. [Payments & Deposits](#12-payments--deposits)
13. [Notifications](#13-notifications)
14. [PDF Documents](#14-pdf-documents)
15. [Verification Gates](#15-verification-gates)
16. [Audit Logs](#16-audit-logs)
17. [Edge Cases](#17-edge-cases)
18. [Known Issues & Fixes](#18-known-issues--fixes)
19. [Acceptance Tests](#19-acceptance-tests)
20. [Migration Plan](#20-migration-plan)
21. [Repo Map](#21-repo-map)

---

## 1. Vision & Scope

C2C Car Rental is a multi-location vehicle rental platform serving the Lower Mainland of British Columbia (Surrey, Langley, Abbotsford). It provides:

- **Customer-facing** web app for searching, configuring, and booking vehicles with Stripe payment
- **Operations (Ops) panel** for daily staff workflows: pickup handover, return processing, vehicle inspection
- **Admin panel** for strategic management: fleet CRUD, pricing, users, reports, finance
- **Delivery panel** for drivers delivering vehicles to customer addresses
- **Support panel** for ticket management and customer service

### Non-Negotiable Rules

| Rule | Enforcement |
|------|-------------|
| Booking details after checkout visible only to Admin + booking owner | RLS policies on `bookings` table + client-side auth guards |
| Add-ons default OFF (additional driver never auto-added) | `selectedAddOnIds` defaults to `[]` in `RentalBookingContext` |
| "All Inclusive" protection blocks separate Premium Roadside selection | Protection `id="premium"` already includes Extended Roadside; UI must disable that add-on when premium selected |
| No phantom charges ($0 add-ons total when none selected) | `addOnsTotal` computed from selected IDs only, defaults to `0` |
| Deposit always offline/manual (CAD $350) | `MINIMUM_DEPOSIT_AMOUNT = 350` in `src/lib/pricing.ts`; deposit tracked in `payments` table as `payment_type: "deposit"` |
| Activation is final ops step (triggers SMS → Active status) | `StepHandover` component + `handover` step in `ops-steps.ts` |
| Mandatory pre-pickup photos | `StepPhotos` requires photos before handover |
| Rental agreement uses correct assigned vehicle | `generate-agreement` edge function joins `vehicle_units` → `vehicles` for make/model/year |
| Return workflow enforced (active→completed requires `closeout_done` state) | `validateReturnWorkflow()` in `src/lib/return-steps.ts` |
| Void booking admin-only with mandatory reason (20+ chars) | `void-booking` edge function checks `admin` role; `VoidBookingDialog` enforces min length |

---

## 2. Roles & Permissions

### Role Definitions

| Role | Panel Access | Key Capabilities |
|------|-------------|-----------------|
| `admin` | Admin, Ops, Support, Delivery | Full CRUD, void bookings, edit rates, manage users, view audit logs |
| `staff` | Ops, Admin (read-heavy) | Process handovers/returns, record payments, assign vehicles |
| `cleaner` | Ops | Update vehicle status, process handover/return |
| `finance` | Admin (finance views) | View payments, process refunds |
| `support` | Support | Manage tickets |
| `driver` | Delivery | View assigned deliveries, update delivery status, capture proof |

**Source:** `src/auth/capabilities.ts` — `resolveCapabilities(roles, panel)` function

### Panel Route Guards

| Panel | Guard Component | File |
|-------|----------------|------|
| Admin | `AdminProtectedRoute` | `src/components/admin/AdminProtectedRoute.tsx` |
| Ops | `OpsProtectedRoute` | `src/components/ops/OpsProtectedRoute.tsx` |
| Support | `SupportProtectedRoute` | `src/components/support/SupportProtectedRoute.tsx` |
| Delivery | `DeliveryProtectedRoute` | `src/components/delivery/DeliveryProtectedRoute.tsx` |

### Database Enforcement

- `user_roles` table: stores `(user_id, role)` pairs
- SQL function `is_admin_or_staff(uid)` used in RLS policies across all operational tables
- SQL function `has_role(uid, role)` for specific role checks (e.g., driver access)

---

## 3. Database Schema

### Core Tables

#### `bookings`
Primary rental record. One row per booking.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| booking_code | text UNIQUE | Human-readable code (e.g., `SLJN543Z`) |
| user_id | uuid | References auth user |
| vehicle_id | uuid FK→vehicles | Vehicle category booked |
| location_id | uuid FK→locations | Pickup location |
| assigned_unit_id | uuid FK→vehicle_units | Specific VIN assigned (nullable until ops assigns) |
| assigned_driver_id | uuid | For delivery bookings |
| start_at / end_at | timestamptz | Scheduled rental period |
| actual_return_at | timestamptz | When vehicle actually returned |
| status | enum | `pending`, `confirmed`, `active`, `completed`, `cancelled` |
| daily_rate | numeric | Rate at time of booking |
| total_days | integer | |
| subtotal / tax_amount / total_amount | numeric | Financial totals |
| deposit_amount | numeric | Default $350 |
| deposit_status | text | `none`, `authorized`, `hold_created`, `captured`, `released` |
| stripe_deposit_pi_id | text | Stripe PaymentIntent ID for deposit |
| young_driver_fee | numeric | $15 for 20-24 age band |
| driver_age_band | text | `20_24` or `25_70` |
| pickup_address | text | For delivery bookings |
| pickup_lat / pickup_lng | numeric | GPS coordinates for delivery |
| return_state | text | Return workflow state machine |
| handed_over_at / handed_over_by | timestamptz/uuid | Handover tracking |
| booking_source | text | `online`, `walk_in` |
| save_time_at_counter | boolean | Customer opted for counter-save |
| special_instructions | text | |

**RLS:** Owner can read/write own bookings; admin/staff can read/update all; drivers can read assigned bookings.

#### `vehicles` (Vehicle Categories/Models)
Vehicle definitions at the category level.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| make / model / year | text/int | e.g., Toyota, RAV4, 2024 |
| category | text | e.g., "MID SIZE SUV" |
| daily_rate | numeric | Base rate |
| image_url | text | Primary image |
| images_json | jsonb | Additional images array |
| features_json / specs_json | jsonb | Vehicle features and specs |
| seats | integer | Default 5 |
| fuel_type / transmission | text | Gas/Diesel/Electric/Hybrid; Automatic/Manual |
| is_available / is_featured | boolean | |
| status | text | `available`, `booked`, `maintenance`, `inactive` |
| location_id | uuid FK→locations | |

**RLS:** Publicly readable (active); admin/staff can manage.

#### `vehicle_units` (Individual VINs)
Physical vehicles with VIN numbers.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| vehicle_id | uuid FK→vehicles | Parent vehicle model |
| vin | text NOT NULL | Vehicle Identification Number |
| license_plate | text | |
| color | text | |
| current_mileage | integer | |
| tank_capacity_liters | numeric | Default 60 |
| status | text | `active`, `maintenance`, `retired` |
| acquisition_cost / acquisition_date | numeric/date | |
| annual_depreciation_amount | numeric | |
| category_id | uuid FK→vehicle_categories | |
| location_id | uuid FK→locations | |

**RLS:** Admin/staff can CRUD; drivers can view assigned units.

#### `vehicle_categories`
Category groupings with pricing.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | e.g., "MID SIZE SUV - Toyota Rav4 or Similar" |
| daily_rate | numeric | Default 50 |
| image_url | text | |
| seats / transmission / fuel_type | | |
| sort_order | integer | |
| is_active | boolean | |

#### `locations`
Rental pickup/dropoff locations.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | e.g., "Surrey Centre" |
| address / city | text | |
| lat / lng | numeric | GPS coordinates |
| hours_json | jsonb | Operating hours |
| phone / email | text | |
| is_active | boolean | |

**Hardcoded locations:** Surrey, Langley, Abbotsford (see `src/constants/rentalLocations.ts`)

#### `profiles`
Extended user profile data (NOT auth.users).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Matches auth.users.id |
| full_name / email / phone | text | |
| address | text | |
| driver_license_status | text | `none`, `on_file` |
| driver_license_front_url | text | Signed URL to license image |
| driver_license_number | text | |
| driver_license_expiry | text | |
| driver_license_uploaded_at | timestamptz | |
| is_verified | boolean | |
| membership_tier | text | Points tier |
| total_points | integer | Loyalty points balance |

#### `payments`
All financial transactions.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| booking_id | uuid FK→bookings | |
| user_id | uuid | |
| amount | numeric | |
| payment_type | text | `rental`, `deposit`, `late_fee`, `damage` |
| payment_method | text | `card`, `cash`, `offline` |
| status | text | `pending`, `completed`, `refunded`, `failed` |
| transaction_id | text | Stripe PaymentIntent ID |

#### `checkin_records`
Verification data collected during ops check-in.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| booking_id | uuid FK→bookings | One-to-one |
| identity_verified | boolean | Gov photo ID checked |
| license_name_matches | boolean | Name on license matches booking |
| license_valid | boolean | License not expired |
| license_expiry_date | text | |
| age_verified | boolean | Customer is 21+ |
| customer_dob | text | |
| check_in_status | text | `pending`, `passed`, `needs_review`, `blocked` |
| checked_in_by / checked_in_at | uuid/timestamptz | |

#### `rental_agreements`
Signed rental contracts.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| booking_id | uuid FK→bookings | |
| terms_json | jsonb | Full agreement data (vehicle, financial, policies) |
| agreement_content | text | Rendered legal text |
| status | text | `pending`, `signed`, `voided` |
| customer_signed_at | timestamptz | |
| customer_signature | text | Base64 signature data |
| signature_png_url | text | Stored signature image |
| staff_confirmed_by / staff_confirmed_at | uuid/timestamptz | |
| signed_manually | boolean | In-person signing |

#### `condition_photos`
Vehicle condition evidence.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| booking_id | uuid FK→bookings | |
| phase | text | `pickup` or `return` |
| photo_type | text | `front`, `rear`, `left`, `right`, `interior`, `fuel`, `odometer`, `damage` |
| photo_url | text | Storage URL |
| captured_by | uuid | Staff who took photo |
| notes | text | |

#### `inspection_metrics`
Odometer/fuel readings.

| Column | Type | Notes |
|--------|------|-------|
| booking_id | uuid FK→bookings | |
| phase | text | `pickup` or `return` |
| odometer | integer | |
| fuel_level | integer | Percentage (0-100) |
| exterior_notes / interior_notes | text | |
| recorded_by | uuid | |

#### `damage_reports`
Damage documentation.

| Column | Type | Notes |
|--------|------|-------|
| booking_id | uuid FK→bookings | |
| vehicle_id / vehicle_unit_id | uuid | |
| severity | enum | `minor`, `moderate`, `severe` |
| location_on_vehicle | text | |
| description | text | |
| photo_urls | jsonb | Array of photo URLs |
| estimated_cost | numeric | |
| status | text | `reported`, `reviewing`, `approved`, `repaired`, `closed` |

#### `delivery_statuses`
Delivery tracking for delivery-mode bookings.

| Column | Type | Notes |
|--------|------|-------|
| booking_id | uuid FK→bookings | One-to-one |
| status | text | `assigned`, `picked_up`, `en_route`, `delivered`, `issue` |
| location_lat / location_lng | numeric | Driver's current position |
| photo_urls | jsonb | Proof-of-delivery photos |
| notes | text | |

#### `admin_alerts`
System-generated alerts for staff attention.

| Column | Type | Notes |
|--------|------|-------|
| booking_id / vehicle_id | uuid | Context references |
| alert_type | enum | `verification_pending`, `payment_pending`, `late_return`, `damage_reported`, etc. |
| title / message | text | |
| status | enum | `pending`, `acknowledged`, `resolved` |

#### `audit_logs`
Complete audit trail.

| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid | Actor |
| action | text | e.g., `booking_voided`, `deposit_auto_released`, `checkin_completed` |
| entity_type / entity_id | text/uuid | Target entity |
| old_data / new_data | jsonb | JSON diff of changes |

#### `add_ons`
Available rental add-ons.

| Column | Type | Notes |
|--------|------|-------|
| name | text | e.g., "GPS Navigation", "Child Seat" |
| daily_rate | numeric | Per-day cost |
| one_time_fee | numeric | One-time cost (alternative to daily) |
| is_active | boolean | |

#### `booking_add_ons`
Junction table for booked add-ons.

| Column | Type | Notes |
|--------|------|-------|
| booking_id | uuid FK→bookings | |
| add_on_id | uuid FK→add_ons | |
| price | numeric | Price at time of booking |
| quantity | integer | Default 1 |

### Additional Tables

| Table | Purpose |
|-------|---------|
| `booking_additional_drivers` | Additional drivers per booking (name, age band, young driver fee) |
| `booking_otps` | OTP verification for booking access |
| `deposit_ledger` | Deposit transaction history (hold, capture, release, refund) |
| `deposit_jobs` | Async deposit operation queue |
| `final_invoices` | Generated invoices with line items |
| `receipts` | Payment receipts |
| `notification_logs` | SMS/email send history with idempotency keys |
| `stripe_webhook_events` | Webhook event deduplication |
| `maintenance_logs` | Vehicle maintenance records |
| `incident_cases` / `incident_photos` / `incident_repairs` | Incident management |
| `abandoned_carts` | Cart abandonment tracking |
| `competitor_pricing` | Competitive rate analysis |
| `fleet_cost_cache` | Pre-computed fleet cost analytics |
| `points_ledger` / `points_offers` / `points_settings` | Loyalty program |
| `membership_tiers` / `offer_redemptions` | Tier-based rewards |
| `support_tickets_v2` / `ticket_messages_v2` / `support_macros` | Support system |
| `system_settings` | Global configuration key-value store |

---

## 4. Route Map

### Customer Routes (`/`)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Index | Landing page with search widget |
| `/search` | Search | Vehicle search results with filters |
| `/compare` | Compare | Side-by-side vehicle comparison |
| `/protection` | Protection | Protection package selection |
| `/add-ons` | AddOns | Add-ons selection |
| `/checkout` | NewCheckout | Stripe checkout with pricing breakdown |
| `/auth` | Auth | Login/signup |
| `/forgot-password` | ForgotPassword | Password reset request |
| `/reset-password` | ResetPassword | Password reset form |
| `/dashboard` | Dashboard | Customer's bookings list |
| `/booking/:id` | BookingDetail | Individual booking detail |
| `/booking/confirmed` | BookingConfirmed | Post-checkout confirmation |
| `/booking/:bookingId/license` | BookingLicense | License upload |
| `/booking/:bookingId/agreement` | BookingAgreement | View/sign rental agreement |
| `/booking/:bookingId/pass` | BookingPass | Digital booking pass |
| `/booking/:bookingId/pickup` | BookingPickup | Pickup instructions |
| `/booking/:bookingId/return` | BookingReturn | Return instructions + self-mark |
| `/walkaround/:bookingId` | WalkaroundSign | Customer walkaround signing |
| `/locations` | Locations | All rental locations |
| `/location/:id` | LocationDetail | Individual location detail |
| `/about` | About | About page |
| `/contact` | Contact | Contact form |
| `/check-in` | CheckIn | Customer check-in flow |

### Admin Routes (`/admin/*`)

| Route | Page | Purpose |
|-------|------|---------|
| `/admin` | Overview | Dashboard with KPIs |
| `/admin/alerts` | Alerts | System alerts (verification, payment, late return) |
| `/admin/bookings` | Bookings | All bookings list with tabs (pickups, active, returns, completed) |
| `/admin/bookings/:bookingId` | BookingDetail | Booking detail view |
| `/admin/bookings/:bookingId/ops` | BookingOps | Full-screen ops wizard for booking |
| `/admin/billing` | Billing | Payment management |
| `/admin/fleet` | FleetManagement | Vehicle categories and units |
| `/admin/fleet/vehicle/:unitId` | VehicleUnitDetail | Individual VIN detail |
| `/admin/fleet/category/:categoryId` | CategoryDetail | Category management |
| `/admin/fleet-analytics` | FleetAnalytics | Fleet utilization analytics |
| `/admin/fleet-costs` | FleetCosts | Cost analysis per unit/category |
| `/admin/calendar` | Calendar | Booking calendar view |
| `/admin/tickets` | Tickets | Support tickets |
| `/admin/abandoned-carts` | AbandonedCarts | Cart abandonment tracking |
| `/admin/reports` | Reports | Revenue, analytics, audit logs |
| `/admin/settings` | Settings | System settings, users, roles |
| `/admin/offers` | Offers | Points/loyalty offers management |
| `/admin/incidents` | Incidents | Incident case management |
| `/admin/returns/:bookingId` | ReturnOps | Return workflow wizard |
| `/admin/active-rentals/:bookingId` | ActiveRentalDetail | Active rental monitoring |

### Ops Routes (`/ops/*`)

| Route | Page | Purpose |
|-------|------|---------|
| `/ops` | OpsWorkboard | Daily operations dashboard |
| `/ops/bookings` | OpsBookings | All bookings (ops view) |
| `/ops/pickups` | OpsPickups | Today's pickup queue |
| `/ops/active` | OpsActiveRentals | Active rental monitoring |
| `/ops/returns` | OpsReturns | Return queue |
| `/ops/fleet` | OpsFleet | Fleet status overview |
| `/ops/booking/:bookingId/handover` | BookingOps | Handover wizard |
| `/ops/return/:bookingId` | ReturnOps | Return workflow |

### Delivery Routes (`/delivery/*`)

| Route | Page | Purpose |
|-------|------|---------|
| `/delivery` | DeliveryDashboard | Driver's task list |
| `/delivery/walk-in` | DeliveryWalkIn | Walk-in delivery form |
| `/delivery/:id` | DeliveryDetail | Individual delivery task detail |

### Support Routes (`/support/*`)

| Route | Page | Purpose |
|-------|------|---------|
| `/support` | SupportTickets | Ticket management |
| `/support/analytics` | SupportAnalytics | Support metrics |

---

## 5. Customer Flows

### 5.1 Search → Configure → Checkout

**Flow:** Homepage → Search → Protection → Add-Ons → Checkout → Confirmed

1. **Homepage** (`/`, `src/pages/Index.tsx`)
   - Search widget: location dropdown, pickup/return dates+times, age band selection
   - Age bands: `20-24` (young driver, $15 surcharge) or `25-70` (standard)
   - Delivery mode toggle: "Pickup at location" or "Delivered to me"
   - Context: `RentalBookingContext` (`src/contexts/RentalBookingContext.tsx`) persists all selections

2. **Search Results** (`/search`, `src/pages/Search.tsx`)
   - Queries `vehicles` table filtered by `location_id`, `is_available`
   - Availability checked via `src/lib/availability.ts` and `src/hooks/use-availability.ts`
   - Cards show: image, make/model/year, category, daily rate, seats, transmission, fuel type
   - "Select" navigates to protection page with `selectedVehicleId` in context

3. **Protection Selection** (`/protection`, `src/pages/Protection.tsx`)
   - Four tiers defined in `src/lib/pricing.ts` → `PROTECTION_PACKAGES`:
     - **None** ($0/day, full vehicle value deductible)
     - **Basic** ($33.99/day, $800 deductible, LDW only)
     - **Smart** ($39.25/day, $0 deductible, LDW + Tire/Glass) — RECOMMENDED
     - **Premium / All Inclusive** ($49.77/day, $0 deductible, LDW + Tire/Glass + Extended Roadside)
   - **RULE:** When "All Inclusive" is selected, "Premium Roadside" add-on MUST be disabled/hidden on next page

4. **Add-Ons Selection** (`/add-ons`, `src/pages/AddOns.tsx`)
   - Reads from `add_ons` table (active items only)
   - Each add-on has `daily_rate` and/or `one_time_fee`
   - **RULE:** All add-ons default OFF. `selectedAddOnIds` starts as `[]`
   - Additional drivers: separate section with name + age band; stored in `additionalDrivers` array
   - **RULE:** Additional driver is NOT auto-added. User must explicitly add

5. **Checkout** (`/checkout`, `src/pages/NewCheckout.tsx`)
   - Full pricing breakdown using `calculateBookingPricing()` from `src/lib/pricing.ts`
   - Stripe payment via `StripeCheckoutWrapper` / `StripePaymentForm` (`src/components/checkout/`)
   - Edge function `create-checkout-session` creates Stripe Checkout Session
   - Hold created via `create-checkout-hold` edge function before payment
   - On success: `create-booking` edge function creates the booking record
   - **RULE:** `addOnsTotal` = 0 when no add-ons selected (no phantom charges)

6. **Booking Confirmed** (`/booking/confirmed`, `src/pages/booking/BookingConfirmed.tsx`)
   - Shows booking code, pickup details, next steps
   - Links to: license upload, agreement, booking pass

### 5.2 Post-Booking Customer Pages

| Page | Purpose | DB Tables |
|------|---------|-----------|
| License Upload | Customer uploads driver's license photo | `profiles` (driver_license_*) |
| Agreement | View and digitally sign rental agreement | `rental_agreements` |
| Booking Pass | Digital pass with QR code | Read from `bookings` |
| Pickup Instructions | Map, address, checklist | Read from `bookings`, `locations` |
| Return | Return instructions, self-mark returned | `bookings.customer_marked_returned_at` |

### 5.3 Customer Dashboard

- Route: `/dashboard` (`src/pages/Dashboard.tsx`)
- Shows all bookings for `auth.uid()`
- Booking stages tracked via `src/lib/booking-stages.ts` → `getCurrentStage()`
- **Visibility:** Customer sees only their own bookings (RLS enforced)

---

## 6. Ops Panel Flows

### 6.1 Pickup Handover Workflow

**Source:** `src/lib/ops-steps.ts`, `src/pages/admin/BookingOps.tsx`

Standard pickup flow (6 steps, non-linear — staff can navigate freely):

| Step | ID | Title | Completion Criteria | DB Writes |
|------|----|-------|---------------------|-----------|
| 1 | `checkin` | Customer Check-In | Gov ID ✓, License on file ✓, Name matches ✓, License not expired ✓, Age 21+ ✓ | `checkin_records` |
| 2 | `payment` | Payment & Deposit | Payment completed ✓, Deposit collected ✓ | `payments` |
| 3 | `agreement` | Rental Agreement | Agreement signed ✓ | `rental_agreements` |
| 4 | `walkaround` | Vehicle Walkaround | Staff inspection complete ✓ | `inspection_metrics` |
| 5 | `photos` | Handover Photos | Photos captured ✓ | `condition_photos` (phase=pickup) |
| 6 | `handover` | Handover & Activation | Activated ✓, SMS sent ✓, Unit assigned ✓ | `bookings.status→active`, `bookings.handed_over_at` |

**Components per step:**
- `StepCheckin` → `src/components/admin/ops/steps/StepCheckin.tsx` — Interactive checkboxes for verification, date inputs for license expiry and DOB, save/complete buttons persisting to `checkin_records`
- `StepPayment` → `src/components/admin/ops/steps/StepPayment.tsx`
- `StepAgreement` → `src/components/admin/ops/steps/StepAgreement.tsx`
- `StepWalkaround` → `src/components/admin/ops/steps/StepWalkaround.tsx`
- `StepPhotos` → `src/components/admin/ops/steps/StepPhotos.tsx`
- `StepHandover` → `src/components/admin/ops/steps/StepHandover.tsx`

**Blocking rules** (only for handover):
- Payment MUST be collected before activation
- VIN unit MUST be assigned before handover

### 6.2 Delivery Pre-Dispatch Workflow

For delivery-mode bookings, Ops handles pre-dispatch (5 steps):

| Step | ID | Title | Notes |
|------|----|-------|-------|
| 1 | `checkin` | Customer Verification | Remote verification |
| 2 | `payment` | Payment & Deposit | Must collect before vehicle leaves |
| 3 | `prep` | Vehicle Assignment | Assign VIN, prepare vehicle |
| 4 | `photos` | Pre-Delivery Photos | Condition evidence |
| 5 | `dispatch` | Dispatch to Driver | Assign driver, dispatch |

**Dispatch readiness** (`src/lib/dispatch-readiness.ts`):
- Payment hold authorized ✓
- VIN unit assigned ✓
- Minimum 4 pre-delivery photos ✓

### 6.3 Return Workflow

**Source:** `src/lib/return-steps.ts`

STRICT state machine (linear, each step requires previous completion):

```
not_started → initiated → intake_done → evidence_done → issues_reviewed → closeout_done → deposit_processed
```

| Step | ID | Title | Required State | Prerequisite State |
|------|----|-------|----------------|-------------------|
| 1 | `intake` | Return Intake | `intake_done` | `initiated` |
| 2 | `evidence` | Evidence Capture | `evidence_done` | `intake_done` |
| 3 | `issues` | Issues & Damages | `issues_reviewed` | `evidence_done` |
| 4 | `closeout` | Closeout | `closeout_done` | `issues_reviewed` |
| 5 | `deposit` | Deposit Release | `deposit_processed` | `closeout_done` |

**Workflow enforcement:** `validateReturnWorkflow()` blocks `active→completed` unless `closeout_done` reached. Admin bypass requires 50+ character justification via `isValidBypassReason()`.

**Components:** `src/components/admin/return-ops/steps/`

### 6.4 Ops Queue Pages

| Page | Route | Filter Logic |
|------|-------|-------------|
| Workboard | `/ops` | Today's tasks dashboard |
| Pickups | `/ops/pickups` | `pending` + `confirmed` bookings (ALL filter default) |
| Active Rentals | `/ops/active` | `active` bookings |
| Returns | `/ops/returns` | Active bookings near/past return date |
| Fleet | `/ops/fleet` | Vehicle unit status overview |

---

## 7. Admin Panel Flows

### 7.1 Fleet Management

**Route:** `/admin/fleet` (`src/pages/admin/FleetManagement.tsx`)

- **Vehicle Categories:** CRUD categories with name, daily rate, image, specs
- **Vehicle Units (VINs):** CRUD individual vehicles with VIN, plate, color, mileage, acquisition data
- **Unit Detail:** `/admin/fleet/vehicle/:unitId` — maintenance logs, cost tracking, depreciation
- **Category Detail:** `/admin/fleet/category/:categoryId` — pricing, units list

**Vehicle statuses:** `available`, `booked`, `maintenance`, `inactive`
**Deletion rules:** Can only delete `maintenance` or `inactive` vehicles (never `available` or `booked`)

### 7.2 Pricing Management

- Category daily rates editable in Category Detail page
- Add-ons pricing in `AddOnsPricingPanel` (`src/components/admin/AddOnsPricingPanel.tsx`)
- Protection pricing in `ProtectionPricingPanel` (`src/components/admin/ProtectionPricingPanel.tsx`)
- Fuel pricing in `src/lib/fuel-pricing.ts` (configurable market rate, 5¢ discount)

### 7.3 Booking Management

**Route:** `/admin/bookings` with tab filters (pickups, active, returns, completed)
- Search, filter by status/location/date
- Individual booking detail with full ops workflow access
- **Void Booking:** Admin-only dialog (`VoidBookingDialog.tsx`) requiring reason selection, 20+ char notes
- **Cancel Booking:** Available to staff

### 7.4 Finance Views

- **Billing:** `/admin/billing` — payments, invoices, deposit ledger
- **Reports:** `/admin/reports` — revenue analytics, audit logs
- **Fleet Costs:** `/admin/fleet-costs` — cost analysis per unit
- **Fleet Analytics:** `/admin/fleet-analytics` — utilization metrics

### 7.5 Settings

**Route:** `/admin/settings`
- System settings (key-value in `system_settings` table)
- User/role management
- Location management
- Points/loyalty settings

---

## 8. Delivery Panel Flows

**Source:** `src/features/delivery/` (feature-based architecture)

### 8.1 Driver Dashboard

**Route:** `/delivery` (`src/features/delivery/pages/Dashboard.tsx`)
- Shows assigned deliveries for current driver
- Task list with status indicators
- **Visibility:** Driver sees ONLY assigned bookings + unassigned pool bookings

### 8.2 Delivery Detail

**Route:** `/delivery/:id` (`src/features/delivery/pages/Detail.tsx`)
- Customer address, time window, vehicle details
- Status updates: `assigned` → `picked_up` → `en_route` → `delivered`
- **RULE:** Driver cannot see full finance details (RLS enforced)
- GPS tracking via location updates to `delivery_statuses`

### 8.3 On-Site Steps (Delivery Portal)

Defined in `DELIVERY_PORTAL_STEPS` (`src/lib/ops-steps.ts`):
1. Rental Agreement signing at delivery location
2. Vehicle Walkaround with customer
3. Handover Photos
4. Complete Delivery (activate rental)

### 8.4 Proof of Delivery

- Photo capture stored in `delivery_statuses.photo_urls`
- Notes field for delivery observations
- Timestamp and GPS recorded on status transitions

### 8.5 Walk-In Delivery

**Route:** `/delivery/walk-in` — for handling walk-in customers at location

---

## 9. Support Panel Flows

### 9.1 Ticket Management

**Route:** `/support` (`src/pages/support/SupportTickets.tsx`)
- `support_tickets_v2` table with `customer_id`, `status`, `priority`, `category`
- Ticket statuses: `open`, `in_progress`, `assigned`, `waiting_customer`, `resolved`, `closed`
- `ticket_messages_v2` with `message_type` (`customer_visible`, `internal_note`)
- `support_macros` for canned responses

### 9.2 Support Analytics

**Route:** `/support/analytics` — response times, resolution rates, volume

---

## 10. Booking & Vehicle State Machines

### 10.1 Booking Status Machine

```
pending → confirmed → active → completed
    ↓         ↓         ↓
 cancelled  cancelled  cancelled (with restrictions)
```

| From | Action | To | Preconditions | Side Effects | Files |
|------|--------|-----|---------------|--------------|-------|
| — | Customer completes checkout | `pending` | Stripe payment successful | Create booking, payment record, send confirmation email | `create-booking` edge fn |
| `pending` | Stripe webhook `checkout.session.completed` | `confirmed` | Payment verified | Record payment, send confirmation | `stripe-webhook` edge fn |
| `confirmed` | Staff activates at handover | `active` | Payment ✓, Unit assigned, Agreement signed | Set `handed_over_at`, send SMS | `StepHandover.tsx` |
| `active` | Return workflow completed | `completed` | `return_state = closeout_done` | Set `actual_return_at`, generate final invoice | `ReturnOps`, `close-account` edge fn |
| any | Admin voids booking | `cancelled` | Admin role, reason provided (20+ chars) | Log to audit, optional refund | `void-booking` edge fn |
| pending/confirmed | Staff cancels | `cancelled` | Staff role | Create alert if deposit held | `CancelBookingDialog.tsx` |

### 10.2 Return State Machine

```
not_started → initiated → intake_done → evidence_done → issues_reviewed → closeout_done → deposit_processed
```

Valid transitions enforced by `VALID_STATE_TRANSITIONS` in `src/lib/return-steps.ts`. Each state can only advance to the next.

### 10.3 Vehicle Unit Status

| Status | Meaning | Can Delete? |
|--------|---------|-------------|
| `active` | Available for rental | No |
| `maintenance` | Under maintenance | Yes |
| `retired` | Permanently out of fleet | Yes |

### 10.4 Deposit Status

```
none → authorized/hold_created → captured/partially_captured → released
                                                              → refunded
```

---

## 11. Pricing Engine

### Source of Truth

`src/lib/pricing.ts` → `calculateBookingPricing(input: PricingInput): PricingBreakdown`

### Formula

```
vehicleBaseTotal    = dailyRate × rentalDays
weekendSurcharge    = vehicleBaseTotal × 0.15 (if Fri/Sat/Sun pickup)
durationDiscount    = (vehicleBaseTotal + weekendSurcharge) × discountRate
vehicleTotal        = vehicleBaseTotal + weekendSurcharge - durationDiscount
protectionTotal     = protectionDailyRate × rentalDays
pvrtTotal           = $1.50 × rentalDays    (Passenger Vehicle Rental Tax)
acsrchTotal         = $1.00 × rentalDays    (Airport Concession Surcharge)
dailyFeesTotal      = pvrtTotal + acsrchTotal
youngDriverFee      = $15 one-time (if age band 20-24)
subtotal            = vehicleTotal + protectionTotal + addOnsTotal + deliveryFee + youngDriverFee + dailyFeesTotal + lateFee
pstAmount           = subtotal × 0.07  (BC Provincial Sales Tax)
gstAmount           = subtotal × 0.05  (Federal GST)
taxAmount           = pstAmount + gstAmount
total               = subtotal + taxAmount
```

### Duration Discounts

| Duration | Discount |
|----------|----------|
| 7+ days | 10% off vehicle total |
| 21+ days | 20% off vehicle total |

### Delivery Fee Tiers

| Distance | Fee |
|----------|-----|
| ≤10 km | Free |
| 11-50 km | $49 |
| >50 km | Not available |

### Late Return Fees

- 30-minute grace period
- After grace: 25% of daily rate per hour (rounded up)
- Max 24 hours (then counts as additional day)
- Source: `src/lib/late-return.ts`

### Fuel Shortage Charges

- Fuel price: Market rate ($1.85/L) minus 5¢ discount = $1.80/L
- Shortage = (pickup fuel % - return fuel %) × tank capacity
- Charge = shortage liters × $1.80/L
- Source: `src/lib/fuel-pricing.ts`

### Cancellation Fees

- Free cancellation before scheduled pickup time
- After pickup time (no-show): 1 day rental penalty
- Flat fee option: $19.99
- Source: `src/lib/rental-rules.ts`, `src/lib/checkout-policies.ts`

---

## 12. Payments & Deposits

### 12.1 Stripe Integration

**Edge Functions:**

| Function | Purpose |
|----------|---------|
| `create-checkout-session` | Creates Stripe Checkout Session for initial booking payment |
| `create-checkout-hold` | Creates temporary hold during checkout process |
| `create-payment-intent` | Creates PaymentIntent for additional charges |
| `create-deposit-hold` | Creates deposit authorization hold ($350) |
| `stripe-webhook` | Handles all Stripe webhook events with idempotency |
| `capture-deposit` | Captures held deposit funds |
| `release-deposit-hold` | Releases deposit hold back to customer |
| `process-deposit-refund` | Processes deposit refund |
| `process-deposit-jobs` | Async deposit job processor |
| `sync-deposit-status` | Syncs deposit status with Stripe |
| `get-stripe-config` | Returns publishable key to frontend |
| `send-payment-request` | Sends payment link to customer |
| `send-payment-confirmation` | Sends payment receipt |

**Webhook Events Handled:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Record payment, update booking to `confirmed` |
| `payment_intent.succeeded` | Record successful payment |
| `payment_intent.payment_failed` | Create admin alert |
| `payment_intent.amount_capturable_updated` | Update deposit hold status |
| `payment_intent.canceled` | Update deposit status |
| `charge.captured` | Record deposit capture in ledger |
| `charge.refunded` | Record refund in ledger |

**Idempotency:** All webhook events recorded in `stripe_webhook_events` table; duplicate events are skipped.

**Secrets Required:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### 12.2 Deposit Rules

| Rule | Value | Source |
|------|-------|-------|
| Standard deposit amount | $350 CAD | `MINIMUM_DEPOSIT_AMOUNT` in `src/lib/pricing.ts` |
| Collection method | Manual/offline OR Stripe hold | `StepPayment.tsx` |
| Auto-release on completion | Yes, if no open damages | `src/lib/deposit-automation.ts` |
| Manual review triggers | Open damages, cancelled with deposit | Creates `admin_alert` |
| Ledger tracking | All actions logged | `deposit_ledger` table |

### 12.3 Provider ID Storage

| ID Type | Stored In | Column |
|---------|-----------|--------|
| Stripe PaymentIntent ID (rental) | `payments.transaction_id` | text |
| Stripe PaymentIntent ID (deposit) | `bookings.stripe_deposit_pi_id` | text |
| Stripe PaymentMethod ID | `bookings.stripe_deposit_pm_id` | text |
| Stripe Charge ID | `bookings.stripe_deposit_charge_id` | text |
| Stripe Refund ID | `bookings.stripe_deposit_refund_id` | text |
| Stripe Client Secret | `bookings.stripe_deposit_client_secret` | text |
| Webhook Event ID | `stripe_webhook_events.event_id` | text |

---

## 13. Notifications

### Edge Functions

| Function | Channel | Trigger |
|----------|---------|---------|
| `send-booking-notification` | SMS/Email | Booking confirmation, check-in complete, handover, return |
| `send-booking-email` | Email | Booking confirmation email |
| `send-booking-sms` | SMS | Booking status SMS |
| `send-booking-otp` | SMS | OTP for booking verification |
| `send-agreement-notification` | SMS/Email | Agreement ready for signing |
| `send-deposit-notification` | SMS/Email | Deposit held/released/captured |
| `send-payment-confirmation` | Email | Payment receipt |
| `send-payment-request` | Email | Payment link for outstanding balance |
| `send-contact-email` | Email | Contact form submission |
| `send-support-sms` | SMS | Support ticket updates |
| `notify-admin` | Internal | Admin alert notifications |
| `confirm-admin-email` | Email | Admin user email confirmation |
| `check-rental-alerts` | Cron | Check for late returns, upcoming pickups |
| `check-ticket-escalation` | Cron | Auto-escalate unresolved tickets |

### Notification Logging

All notifications logged to `notification_logs` table with:
- `idempotency_key` (prevents duplicate sends)
- `channel` (sms/email)
- `status` (pending/sent/failed)
- `provider_id` (external provider reference)

### SMS Provider

**MISSING:** No SMS provider is explicitly configured in the codebase. The edge functions call SMS endpoints but the actual provider (Twilio/etc.) configuration needs to be verified via secrets.

### Required Secrets

- `TWILIO_ACCOUNT_SID` (if using Twilio)
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `SENDGRID_API_KEY` or email provider credentials

---

## 14. PDF Documents

### 14.1 Rental Agreement PDF

**Source:** `src/lib/pdf/rental-agreement-pdf.ts` (637 lines)

Generated by `generate-agreement` edge function, rendered client-side via `jsPDF`.

**Content sections:**
1. C2C Logo + "RENTAL AGREEMENT" header
2. Agreement number, date
3. **Renter Information:** Name, email (fallback: "Valued Customer" if email-as-name)
4. **Vehicle Information:** Category, make/model/year, VIN, plate, color, tank capacity
5. **Rental Period:** Start/end dates, total days, daily rate
6. **Pickup/Return Locations:** Name, address, city
7. **Financial Breakdown:** Vehicle subtotal, add-ons, young driver fee, PVRT, ACSRCH, subtotal, PST, GST, total, deposit
8. **Vehicle Condition at Pickup:** Odometer, fuel level (if inspection data exists)
9. **Terms & Conditions:** 15+ clauses covering age, authorized drivers, insurance, fuel policy, late fees, prohibited use, liability, smoking/pets, international travel
10. **Signature block**

**Data flow:**
- Edge function queries: `bookings` → `vehicles` → `vehicle_units` (via join for VIN/plate) → `profiles` → `locations` → `booking_add_ons` → `add_ons` → `inspection_metrics`
- Stores result in `rental_agreements.terms_json` and `rental_agreements.agreement_content`

### 14.2 Return Receipt

**Source:** `generate-return-receipt` edge function
- Generated at return completion
- Includes: rental summary, return condition, charges, fuel shortage, damage charges, deposit disposition

### 14.3 Final Invoice

**Source:** `close-account` edge function
- Generated during account closeout
- Stored in `final_invoices` table with full line items JSON
- Includes: rental charges, add-ons, late fees, damage charges, deposit held/captured/released, payments received, amount due/refunded

---

## 15. Verification Gates

### 15.1 Age Verification

| Rule | Value | Enforcement |
|------|-------|-------------|
| Minimum driver age | 20 | `MIN_DRIVER_AGE` in `src/lib/pricing.ts`; `validateDriverAge()` |
| Young driver surcharge | $15 one-time for 20-24 | `YOUNG_DRIVER_FEE = 15` |
| Standard driver | 25-70 | No surcharge |
| Maximum age | 70 | `MAX_DRIVER_AGE = 70` |
| Check-in minimum | 21 | `calculateAge()` in `use-checkin.ts`; enforced in StepCheckin |

**Where enforced:**
- Customer-side: age band selection in search widget, validated in `RentalBookingContext`
- Server-side: `create-booking` edge function validates `driverAgeBand`
- Ops: `StepCheckin` verifies DOB → age ≥ 21

### 15.2 Identity Verification

**MISSING:** No third-party ID verification service (Onfido/Jumio/Veriff/Persona) is integrated. Current implementation relies on:
- Manual staff verification during check-in (Gov photo ID check)
- Driver's license photo upload to `profiles.driver_license_front_url`
- Staff visual comparison of physical ID vs uploaded license

**Roadmap:** Integrate automated ID verification service for remote/delivery bookings.

### 15.3 Driver's License

- Profile-based (one-time, not per-booking)
- Optional at signup, mandatory at check-in
- Staff can capture/upload via `StepCheckin` upload dialog
- License number editable by staff
- Stored in `profiles` table: `driver_license_status`, `driver_license_front_url`, `driver_license_number`
- License expiry date checked during check-in via `isLicenseExpired()` from `use-checkin.ts`

---

## 16. Audit Logs

### Logged Actions

| Action | Entity Type | Triggered By |
|--------|-------------|-------------|
| `booking_created` | booking | `create-booking` edge fn |
| `booking_voided` | booking | `void-booking` edge fn |
| `booking_cancelled` | booking | Cancel dialog |
| `status_changed` | booking | Status transitions |
| `checkin_updated` / `checkin_completed` | booking | `use-checkin.ts` hooks |
| `deposit_auto_released` | payment | `deposit-automation.ts` |
| `deposit_captured` / `deposit_released` | payment | Deposit edge fns |
| `agreement_generated` / `agreement_signed` | agreement | Agreement hooks |
| `handover_completed` | booking | StepHandover |
| `return_completed` | booking | Return workflow |
| `vehicle_status_changed` | vehicle | Fleet management |

### Audit Log Fields

- `user_id` — actor who performed the action
- `action` — action name
- `entity_type` / `entity_id` — target entity
- `old_data` / `new_data` — JSON diff of changes
- `ip_address` — client IP (when available)
- `created_at` — timestamp

**Source hook:** `useAuditLog()` from `src/hooks/use-admin.ts`

---

## 17. Edge Cases

### Payment Failure
- Stripe webhook `payment_intent.payment_failed` creates `admin_alert` with type `payment_pending`
- Booking remains in `pending` status until resolved
- Staff can send payment request link via `send-payment-request` edge function

### Vehicle Unavailable After Booking
- Admin can upgrade vehicle category via `CategoryUpgradeDialog` (`src/components/admin/CategoryUpgradeDialog.tsx`)
- Original vehicle ID stored in `bookings.original_vehicle_id`
- Upgrade reason and actor logged

### Cancellation
- Free before pickup time; penalty after (1 day rate)
- Deposits require manual review alert for admin
- Refund logic in `void-booking` edge function

### Late Return
- Grace period: 30 minutes
- Fee: 25% of daily rate per hour after grace
- Customer can self-mark returned via `BookingReturn` page (within 30 min of scheduled return)
- `customer_marked_returned_at` triggers admin alert
- Late fee overrides available to admin with reason logging

### Damage Discovery
- Reported during return `issues` step
- Mandatory photo upload (`condition_photos` with `photo_type=damage`)
- `damage_reports` created with severity, location, estimated cost
- Deposit review alert created if damage charges exist
- Incident cases can be created for severe damage (`incident_cases` table)

### No-Show
- After pickup time passes with no check-in
- Staff can cancel/void with `no_show` reason
- Cancellation fee of 1 day rental applies

---

## 18. Known Issues & Fixes

### Issue 1: Customer Name Shows as Email
**Root cause:** Some `profiles.full_name` values contain email addresses (from auth signup)
**Fix implemented:** `src/lib/format-customer.ts` → `displayName()` checks for `@` and falls back to "Unknown"
**Status:** Fixed

### Issue 2: Phone Numbers Unformatted
**Root cause:** Raw digit strings stored in `profiles.phone`
**Fix implemented:** `formatPhone()` in `src/lib/format-customer.ts` formats 10/11-digit numbers as `(XXX) XXX-XXXX`
**Status:** Fixed

### Issue 3: Rental Agreement Shows Wrong Vehicle Data
**Root cause:** `generate-agreement` edge function was querying non-existent columns (`make`, `model`, `year`) from `vehicle_units` table
**Fix implemented:** Changed to join `vehicle_units` → `vehicles` via `vehicles(make, model, year)` select
**Status:** Fixed

### Issue 4: Verification Checklist Was Read-Only
**Root cause:** `StepCheckin` displayed static `VerificationItem` icons instead of interactive controls
**Fix implemented:** Replaced with checkboxes, date inputs, save/complete buttons using `useCheckInRecord`, `useCreateOrUpdateCheckIn`, `useCompleteCheckIn` hooks
**Status:** Fixed

### Issue 5: Add-On Phantom Charges
**Root cause:** **NEEDS INVESTIGATION** — If add-ons total shows $15 when none selected, check if `young_driver_fee` is being miscategorized as add-on in the breakdown display
**Fix:** Ensure checkout breakdown separates `youngDriverFee` from `addOnsTotal`. Verify `addOnsTotal` is computed from `selectedAddOnIds` array only.
**Status:** Needs verification

### Issue 6: "Inclusive" Protection Doesn't Block Premium Roadside Add-On
**Root cause:** **NEEDS IMPLEMENTATION** — No logic in add-ons page to disable "Premium/Extended Roadside" add-on when All Inclusive protection is selected
**Fix:** In add-ons page, check `selectedProtection` from context. If `id === "premium"`, disable/hide any add-on containing "roadside" in name.
**Status:** MISSING — needs implementation

---

## 19. Acceptance Tests

### Customer Flow
- [ ] Search shows vehicles filtered by location and availability
- [ ] Selecting age 20-24 adds $15 young driver fee to quote
- [ ] All add-ons default to OFF; add-ons total = $0 when none selected
- [ ] Protection selection persists through checkout
- [ ] All Inclusive protection disables Premium Roadside add-on
- [ ] Checkout shows correct line-by-line breakdown (vehicle, protection, add-ons, fees, taxes)
- [ ] Stripe payment creates booking with status `pending`
- [ ] Webhook moves booking to `confirmed` after payment verified
- [ ] Booking visible only to owner and admin/staff
- [ ] Customer can upload driver's license to profile
- [ ] Customer can view/sign rental agreement
- [ ] Customer can self-mark returned (within 30 min of scheduled return)

### Ops Flow
- [ ] Check-in step: interactive checkboxes save to `checkin_records`
- [ ] Check-in step: DOB auto-calculates age, validates ≥21
- [ ] Check-in step: license expiry auto-validates not expired
- [ ] Check-in "Complete" button only enabled when all checks pass
- [ ] Payment step shows Stripe payment status
- [ ] Deposit can be recorded as collected (manual/offline)
- [ ] Agreement can be generated and signed
- [ ] Walkaround captures odometer and fuel level
- [ ] Photos step requires photo uploads before handover
- [ ] VIN unit must be assigned before handover activation
- [ ] Handover activation sets booking to `active`, sends SMS
- [ ] Staff can navigate between steps in any order (non-linear)

### Return Flow
- [ ] Return workflow follows strict state machine (no skipping steps)
- [ ] Intake records odometer, fuel level, return time
- [ ] Evidence step captures return condition photos
- [ ] Issues step shows fuel shortage charge if applicable
- [ ] Damage reports require severity, location, description, photos
- [ ] Closeout completes return and generates invoice
- [ ] Deposit auto-released if no damages; alert created if damages exist
- [ ] Admin bypass requires 50+ character justification

### Admin Flow
- [ ] Vehicle categories CRUD with daily rate
- [ ] Vehicle units CRUD with VIN, plate, mileage
- [ ] Cannot delete vehicle with active/booked status
- [ ] Void booking requires admin role, reason selection, 20+ char notes
- [ ] All admin overrides logged to `audit_logs`
- [ ] Reports show revenue, booking volume, fleet utilization

### Delivery Flow
- [ ] Driver sees only assigned + pool deliveries
- [ ] Driver cannot see financial details
- [ ] Status transitions: assigned → picked_up → en_route → delivered
- [ ] Proof-of-delivery photos captured and stored
- [ ] Delivery does not bypass ops activation workflow

### Payment Flow
- [ ] Stripe webhook handles all events with idempotency
- [ ] Duplicate webhook events are skipped
- [ ] Payment failure creates admin alert
- [ ] Deposit hold created for $350
- [ ] Deposit captured/released via edge functions
- [ ] All deposit actions logged in `deposit_ledger`

---

## 20. Migration Plan

### Phase 1: Foundation
1. Set up Supabase with all tables, RLS policies, functions
2. Create auth system with role-based access
3. Implement `profiles` table with auto-creation trigger
4. Set up storage buckets: `driver-licenses`, `condition-photos`, `signatures`

### Phase 2: Customer Flow
1. Landing page with search widget
2. Vehicle search and filtering
3. Protection and add-ons selection
4. Checkout with Stripe integration
5. Post-booking pages (confirmation, license upload, agreement)

### Phase 3: Ops Panel
1. Panel shell with role-based routing
2. Pickup handover wizard (6 steps)
3. Check-in with interactive verification
4. Payment & deposit tracking
5. Agreement generation and signing
6. Vehicle walkaround and photo capture
7. Handover activation

### Phase 4: Return & Closeout
1. Return workflow with strict state machine
2. Evidence capture
3. Damage reporting
4. Account closeout with final invoice
5. Deposit release/capture automation

### Phase 5: Admin Panel
1. Fleet management (categories + units)
2. Pricing management
3. Booking management with void capability
4. Finance views and reports
5. Settings and user management

### Phase 6: Delivery Panel
1. Driver dashboard
2. Delivery task management
3. Proof-of-delivery capture
4. Dispatch readiness validation

### Phase 7: Support & Analytics
1. Support ticket system
2. Canned responses/macros
3. Analytics dashboards
4. Loyalty/points program

---

## 21. Repo Map

### Top 30 Most Important Files

| # | File | Purpose |
|---|------|---------|
| 1 | `src/App.tsx` | All routes, lazy loading, panel guards |
| 2 | `src/lib/pricing.ts` | Single source of truth for pricing engine (400 lines) |
| 3 | `src/lib/ops-steps.ts` | Pickup handover step definitions and completion logic |
| 4 | `src/lib/return-steps.ts` | Return workflow state machine |
| 5 | `src/auth/capabilities.ts` | Role-based capability resolver |
| 6 | `src/contexts/RentalBookingContext.tsx` | Customer booking session state |
| 7 | `src/hooks/use-checkin.ts` | Check-in record CRUD hooks + age/license validation |
| 8 | `src/hooks/use-bookings.ts` | Booking list queries |
| 9 | `src/hooks/use-rental-agreement.ts` | Agreement generation and signing |
| 10 | `src/hooks/use-payments.ts` | Payment queries and mutations |
| 11 | `src/hooks/use-condition-photos.ts` | Photo upload and retrieval |
| 12 | `src/hooks/use-damages.ts` | Damage report management |
| 13 | `src/hooks/use-deposit-ledger.ts` | Deposit transaction history |
| 14 | `src/hooks/use-walkaround.ts` | Vehicle inspection logic |
| 15 | `src/lib/pdf/rental-agreement-pdf.ts` | PDF generation for rental agreement |
| 16 | `src/lib/booking-helpers.ts` | Shared data utilities, batch queries |
| 17 | `src/lib/booking-stages.ts` | Customer-facing booking stage tracker |
| 18 | `src/lib/rental-rules.ts` | Business rules (duration, delivery, cancellation) |
| 19 | `src/lib/late-return.ts` | Late fee calculation |
| 20 | `src/lib/fuel-pricing.ts` | Fuel cost calculation |
| 21 | `src/lib/deposit-automation.ts` | Auto-release deposit on completion |
| 22 | `src/lib/dispatch-readiness.ts` | Delivery dispatch validation |
| 23 | `src/lib/checkout-policies.ts` | Legal text for checkout |
| 24 | `src/lib/format-customer.ts` | Customer name/phone formatting |
| 25 | `src/pages/admin/BookingOps.tsx` | Full-screen ops wizard container |
| 26 | `src/pages/admin/ReturnOps.tsx` | Return workflow container |
| 27 | `src/components/admin/ops/steps/StepCheckin.tsx` | Interactive check-in verification |
| 28 | `src/components/admin/ops/steps/StepHandover.tsx` | Handover activation |
| 29 | `supabase/functions/stripe-webhook/index.ts` | Stripe event handler (566 lines) |
| 30 | `supabase/functions/generate-agreement/index.ts` | Agreement data generator |

### Directory Structure

```
src/
├── auth/capabilities.ts          # Role-based authorization
├── components/
│   ├── admin/                    # Admin panel components
│   │   ├── ops/steps/            # Handover wizard steps (8 files)
│   │   ├── return-ops/steps/     # Return wizard steps
│   │   ├── deposit/              # Deposit management
│   │   ├── fleet/                # Fleet management
│   │   ├── signature/            # Signature capture
│   │   └── alerts/               # Alert management
│   ├── checkout/                 # Stripe checkout components
│   ├── delivery/                 # Delivery panel shell
│   ├── landing/                  # Homepage components
│   ├── layout/                   # App layout, sidebars
│   ├── ops/                      # Ops panel shell
│   ├── search/                   # Search results components
│   ├── shared/                   # Shared components
│   ├── support/                  # Support panel shell
│   └── ui/                       # shadcn/ui primitives
├── constants/rentalLocations.ts  # Location definitions
├── contexts/RentalBookingContext.tsx  # Customer session state
├── domain/                       # Shared domain layer
├── features/delivery/            # Delivery feature module
├── hooks/                        # 80+ custom hooks
├── integrations/supabase/        # Auto-generated types + client
├── lib/                          # Business logic utilities
│   ├── pdf/                      # PDF generators
│   ├── schemas/                  # Zod schemas
│   ├── pricing.ts                # Pricing engine
│   ├── ops-steps.ts              # Ops workflow
│   ├── return-steps.ts           # Return workflow
│   └── ...                       # Other utilities
├── pages/
│   ├── admin/                    # 34 admin pages
│   ├── booking/                  # 7 post-booking pages
│   ├── delivery/                 # 3 delivery pages
│   ├── ops/                      # 6 ops pages
│   └── support/                  # 2 support pages
supabase/
├── functions/                    # 35 edge functions
│   ├── _shared/                  # Shared auth, CORS utilities
│   ├── stripe-webhook/           # Payment webhook handler
│   ├── create-booking/           # Booking creation
│   ├── generate-agreement/       # Agreement generator
│   ├── void-booking/             # Admin void operation
│   ├── close-account/            # Account closeout
│   └── ...                       # Other functions
└── migrations/                   # Database migrations
```

### Where Key Features Live

| Feature | Location |
|---------|----------|
| Pricing calculation | `src/lib/pricing.ts` → `calculateBookingPricing()` |
| Booking status transitions | `src/lib/ops-steps.ts`, `src/lib/return-steps.ts`, webhook handlers |
| DB schema/types | `src/integrations/supabase/types.ts` (auto-generated, read-only) |
| Payment processing | `supabase/functions/stripe-webhook/`, `supabase/functions/create-checkout-session/` |
| PDF generation | `src/lib/pdf/rental-agreement-pdf.ts`, `supabase/functions/generate-agreement/` |
| Notification system | `supabase/functions/send-booking-notification/`, `send-booking-sms/`, etc. |
| File storage | Supabase Storage buckets: `driver-licenses`, `condition-photos`, `signatures` |
| Auth & roles | `src/auth/capabilities.ts`, `src/hooks/use-auth.ts`, `user_roles` table |

---

*End of C2C Car Rental Platform Build Prompt*
