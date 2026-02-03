# C2C Rental Platform - System Overview for QA

> **Version**: 1.0  
> **Generated**: February 2026  
> **Platform URL**: https://betterrental.lovable.app

---

## 1. Product Overview

C2C Rental is a full-featured **car rental management platform** serving British Columbia, Canada. The platform enables customers to search for vehicles by category (not individual cars), select rental dates and locations, add protection packages and extras, and complete bookings online—with or without an account (guest checkout supported). Delivery service ("Bring Car to Me") is available for customers who prefer the vehicle delivered to their location.

For operators, the platform provides comprehensive admin tools to manage the complete rental lifecycle: from vehicle preparation and customer check-in, through payment collection and agreement signing, to vehicle handover, active rental monitoring, and return processing with deposit release. The system also includes fleet management, damage tracking, customer support ticketing, incident case management, and financial reporting.

---

## 2. User Roles and Portals

The platform has **three distinct portals**, each with role-based access control:

### 2.1 Customer Booking Portal

**Access**: Public (anyone can browse; account optional for checkout)

**Routes**: `/`, `/search`, `/checkout`, `/booking/*`, `/dashboard`

| Role | Access |
|------|--------|
| Anonymous | Browse vehicles, start checkout as guest |
| Authenticated Customer | Full booking, view dashboard, manage reservations |

---

### 2.2 Admin & Operations Panel

**Access**: Restricted to users with `admin`, `staff`, `cleaner`, or `finance` roles

**Route Prefix**: `/admin/*`

**Protection**: `AdminProtectedRoute` component validates `is_admin_or_staff` function

| Role | Capabilities |
|------|-------------|
| `admin` | Full access to all features |
| `staff` | Operational access (bookings, pickups, returns, fleet) |
| `cleaner` | Limited access (vehicle prep tasks) |
| `finance` | Billing, payments, deposit management |

---

### 2.3 Delivery Panel

**Access**: Restricted to users with `driver`, `staff`, or `admin` roles

**Route Prefix**: `/delivery/*`

**Protection**: `DeliveryProtectedRoute` component validates `is_driver_or_above` function

| Role | Capabilities |
|------|-------------|
| `driver` | View assigned deliveries, claim available tasks, complete handovers |
| `staff` / `admin` | All driver capabilities + assign drivers + view all deliveries |

---

### 2.4 Support Panel

**Access**: Restricted to users with `support`, `staff`, or `admin` roles

**Route Prefix**: `/support/*`

**Protection**: `SupportProtectedRoute` component validates `is_support_or_admin` function

| Role | Capabilities |
|------|-------------|
| `support` | Manage tickets, customer messaging, macros |
| `staff` / `admin` | Full support access + analytics |

---

## 3. Portal Details

### 3.1 Customer Booking Portal

#### Main Pages/Screens

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Hero section, category grid, location selector, promotions |
| Search Results | `/search` | Vehicle categories with availability + pricing |
| Protection | `/protection` | Protection package selection |
| Add-ons | `/add-ons` | Optional extras (GPS, child seats, etc.) |
| Checkout | `/checkout` | Customer details, payment, confirmation |
| Dashboard | `/dashboard` | Customer's bookings list |
| Booking Detail | `/booking/:id` | Specific booking info + actions |
| License Upload | `/booking/:bookingId/license` | Driver's license upload |
| Agreement | `/booking/:bookingId/agreement` | Digital agreement signing |
| Booking Pass | `/booking/:bookingId/pass` | Mobile booking pass with QR code |
| Pickup | `/booking/:bookingId/pickup` | Pickup day instructions |
| Return | `/booking/:bookingId/return` | Return instructions |
| Walkaround Sign | `/walkaround/:bookingId` | Customer acknowledges vehicle condition |

#### Core Actions

1. **Search for vehicles**
   - Select location (dropdown of active locations)
   - Select pickup date/time
   - Select return date/time
   - Confirm age range (21-25 or 25-70)

2. **Browse and select vehicle category**
   - View category cards with specs (seats, transmission, fuel type)
   - See daily rate
   - Compare multiple categories

3. **Configure rental**
   - Select protection package (None, Basic, Smart, Premium)
   - Add optional extras (add-ons)
   - Choose pickup method: Station or "Bring Car to Me" (delivery)

4. **Complete checkout**
   - Provide personal info (name, email, phone)
   - Enter payment card details
   - Review pricing breakdown
   - Submit booking

5. **Post-booking actions**
   - Upload driver's license (front + back)
   - Sign rental agreement digitally
   - View booking pass / QR code
   - Acknowledge walkaround photos
   - Report issues during rental
   - Mark vehicle as returned

#### Required Inputs and Validations

| Input | Validation Rules |
|-------|------------------|
| Pickup Location | Required, must be active location |
| Pickup Date/Time | Required, cannot be in past, 30-min intervals |
| Return Date/Time | Required, must be after pickup, max 30 days |
| Age Range | Required, must select 21-25 or 25-70 |
| First Name | Required, max 100 chars |
| Last Name | Required, max 100 chars |
| Email | Required, valid email format |
| Phone | Required, 10-20 digits |
| Driver's License | Required before pickup (front + back images) |

#### Business Rules

- **Minimum rental**: 24 hours
- **Maximum rental**: 30 days
- **Minimum driver age**: 21 years
- **Young driver fee**: $20 one-time for ages 21-25
- **Cancellation policy**: Free cancellation anytime before scheduled pickup; $58.99 no-show fee if cancelled after pickup time passes
- **Deposit**: $350 standard security deposit
- **Delivery**: Free under 10km; $49 flat fee for 10-50km
- **Time intervals**: 30-minute increments (00:00 to 23:30)

---

### 3.2 Admin & Operations Panel

#### Main Pages/Screens

| Page | Route | Description |
|------|-------|-------------|
| Overview | `/admin` | Dashboard with stats, new bookings (24h), failed payments |
| Alerts | `/admin/alerts` | Pending verifications, overdue returns, issues |
| Bookings (Hub) | `/admin/bookings` | Unified operations: Pickups, Active, Returns, Completed tabs |
| Booking Detail | `/admin/bookings/:bookingId` | Full booking info |
| Booking Ops | `/admin/bookings/:bookingId/ops` | 6-step pickup wizard |
| Return Ops | `/admin/returns/:bookingId` | 5-step return wizard |
| Active Rental Detail | `/admin/active-rentals/:bookingId` | Monitor active rental |
| Fleet Management | `/admin/fleet` | Category management, vehicle units (VINs) |
| Fleet Analytics | `/admin/fleet-analytics` | Utilization, performance charts |
| Fleet Costs | `/admin/fleet-costs` | Expense tracking, depreciation |
| Category Detail | `/admin/fleet/category/:categoryId` | Manage category specs |
| Vehicle Unit Detail | `/admin/fleet/vehicle/:unitId` | VIN-level detail, maintenance logs |
| Calendar | `/admin/calendar` | Visual booking calendar |
| Incidents | `/admin/incidents` | Accident/incident case management |
| Damages | `/admin/damages` | Damage report tracking |
| Billing | `/admin/billing` | Payment management, deposit ledger |
| Reports | `/admin/reports` | Revenue analytics, add-on performance |
| Abandoned Carts | `/admin/abandoned-carts` | Recovery queue |
| Offers | `/admin/offers` | Promotional offers management |
| Settings | `/admin/settings` | System configuration |

#### Core Actions

**Booking Operations (Pickup Wizard - 6 Steps)**

1. **Pre-Arrival Preparation**
   - Complete vehicle prep checklist
   - Capture pre-inspection photos
   - Assign specific vehicle unit (VIN)

2. **Customer Check-In**
   - Verify government photo ID
   - Confirm driver's license on file
   - Validate name matches booking
   - Check license not expired
   - Verify age (21+)

3. **Payment & Deposit**
   - Confirm payment status (auto-synced if online)
   - Collect deposit (manual/offline)

4. **Rental Agreement**
   - Mark agreement as signed (in-person)

5. **Vehicle Walkaround**
   - Complete staff-only inspection checklist
   - Record odometer and fuel level

6. **Handover & Activation**
   - Activate rental (changes status to "active")
   - Send confirmation SMS
   - System redirects to Active Rental monitoring

**Return Operations (Return Wizard - 5 Steps)**

1. **Return Intake**
   - Record actual return time
   - Log odometer reading
   - Record fuel level

2. **Evidence Capture**
   - Capture return condition photos (all angles)

3. **Issues & Damages**
   - Review any flags (late return, fuel shortage)
   - Report damages if found
   - Link to incident cases if needed

4. **Closeout**
   - Complete return (updates status to "completed")
   - Calculate any late fees

5. **Deposit Release**
   - Release full deposit, or
   - Withhold partial/full for damages

**Fleet Management**

- Add/edit vehicle categories (make, model, year, specs, daily rate, image)
- Add/edit vehicle units (VIN, license plate, color, acquisition cost, mileage)
- Record maintenance logs (oil change, tire rotation, repairs)
- Track vehicle expenses and depreciation

**Other Admin Actions**

- Create walk-in bookings
- Upgrade vehicle category mid-booking
- Override late fees
- Assign/reassign drivers for deliveries
- Manage support tickets (redirect to Support Panel)
- Configure system settings

#### Required Inputs and Validations

| Operation | Required Inputs |
|-----------|-----------------|
| Complete Check-In | All 5 verification flags must be checked |
| Collect Deposit | Amount must be entered, payment method selected |
| Sign Agreement | Signature capture or manual confirmation |
| Complete Walkaround | At least one inspection item checked |
| Activate Rental | All prior steps complete, unit assigned |
| Return Intake | Odometer reading, fuel level |
| Evidence Capture | Minimum photo count (exterior angles) |
| Deposit Release | Decision (release/withhold) + reason if withholding |

#### Business Rules

- **Ops workflow is gated**: Each step requires prior step completion
- **Vehicle unit required**: Cannot hand over without VIN assignment
- **Check-in blocking**: Expired license or age mismatch blocks progression
- **Late fee calculation**: $25/hour after 30-min grace period (max 24 hours)
- **Damage linkage**: Damages found at return create deposit hold
- **Audit trail**: All actions logged to `audit_logs` table

---

### 3.3 Delivery Panel

#### Main Pages/Screens

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/delivery` | Delivery queue with status tabs |
| Walk-In Booking | `/delivery/walk-in` | Create on-site booking |
| Delivery Detail | `/delivery/:bookingId` | Full delivery info + actions |

#### Portal Tabs (Status Filters)

| Tab | Description |
|-----|-------------|
| My Deliveries | Assigned to current driver |
| Available | Unassigned deliveries (claimable) |
| Pending | Assigned or unassigned, not yet en route |
| En Route | Driver picked up vehicle, heading to customer |
| Completed | Successfully delivered |
| Issue | Cancelled or problem deliveries |
| All Deliveries | (Admin/Staff only) Full queue |

#### Core Actions

1. **View assigned deliveries** - See "My Deliveries" queue
2. **Claim available delivery** - Take ownership of unassigned task
3. **Update delivery status** - Mark as "En Route", "Delivered", or "Issue"
4. **Capture GPS coordinates** - Log location during delivery
5. **Upload handover photos** - Proof of delivery
6. **Complete handover** - Finalize delivery, trigger booking progression
7. **Create walk-in booking** - For on-location customers (staff/admin)

#### Required Inputs and Validations

| Action | Required Inputs |
|--------|-----------------|
| Claim Delivery | None (just button click) |
| Mark En Route | Current location (auto-captured) |
| Complete Handover | At least one handover photo |
| Walk-In Booking | All standard booking fields + customer info |

#### Business Rules

- **Delivery booking definition**: Booking has delivery enabled OR pickup_address is not null
- **Driver assignment**: Only one driver per delivery
- **Real-time sync**: Status updates broadcast via Supabase Realtime
- **Location tracking**: Coordinates logged at each status change
- **Walk-in minimum**: 24-hour minimum rental for staff-created bookings

---

### 3.4 Support Panel

#### Main Pages/Screens

| Page | Route | Description |
|------|-------|-------------|
| Tickets | `/support` | Ticket queue with status filters |
| Analytics | `/support/analytics` | Support metrics and performance |

#### Core Actions

1. **View ticket queue** - Filter by status (Open, In Progress, Waiting Customer, Resolved, Closed)
2. **Assign tickets** - Take ownership or assign to team member
3. **Send customer messages** - Respond to customer inquiries
4. **Add internal notes** - Staff-only notes on ticket
5. **Use macros** - Quick response templates
6. **Attach files** - Add documents/images to ticket
7. **Change status** - Progress ticket through workflow
8. **Close ticket** - Mark as resolved/closed

#### Required Inputs and Validations

| Action | Required Inputs |
|--------|-----------------|
| Send Message | Message body (non-empty) |
| Change Status | New status selection |
| Close Ticket | Resolution summary (optional but recommended) |

#### Business Rules

- **Ticket IDs**: Format `TKT-XXXXXX`
- **Status flow**: Open → In Progress → Waiting Customer → Resolved → Closed
- **Assignment**: Tickets can be reassigned at any time
- **Escalation**: Not defined (manual process)

---

## 4. End-to-End Booking Flow

### 4.1 Customer Booking Phase

```
Customer Actions                          System Actions
─────────────────                         ──────────────
1. Visit homepage                         → Display locations + categories
2. Select location + dates + age          → Validate inputs
3. Click "Search"                         → Check availability
4. Browse vehicle categories              → Show available categories with pricing
5. Select category                        → Add to cart, create reservation hold
6. Select protection package              → Update pricing
7. Add optional extras                    → Update pricing
8. Choose pickup method                   → If delivery: show address input
9. Enter customer details                 → Validate email, phone, name
10. Enter payment info                    → Validate card, create payment intent
11. Submit booking                        → Process payment, create booking
                                          → Send confirmation email + SMS
                                          → Create admin notification
12. Receive booking code                  → Display confirmation page
13. Upload driver's license               → Store in verification-documents bucket
14. Sign rental agreement (optional)      → Generate PDF, store signature
```

### 4.2 Admin/Ops Handling Phase (Pickup)

```
Staff Actions                             System Actions
─────────────────                         ──────────────
1. View Pickups queue                     → Show bookings with pickup today
2. Open booking ops wizard                → Load 6-step workflow
3. Complete vehicle prep                  → Log prep checklist, upload photos
4. Assign vehicle unit (VIN)              → Link booking to specific unit
5. Customer arrives                       → Check-in step becomes available
6. Verify ID + license + age              → Validate all checkboxes
7. Collect deposit                        → Record in deposit_ledger
8. Mark agreement signed                  → Log signature capture
9. Complete walkaround                    → Record odometer, fuel, inspection
10. Activate rental                       → Change status: confirmed → active
                                          → Send "rental started" SMS
                                          → Redirect to Active Rental page
```

### 4.3 Delivery Assignment and Completion (if delivery booking)

```
Staff/Driver Actions                      System Actions
────────────────────                      ──────────────
1. Booking created with delivery          → Create delivery_statuses record
                                          → Status: "unassigned"
2. Driver views Available tab             → Show unassigned deliveries
3. Driver claims delivery                 → Update assigned_driver_id
                                          → Status: "assigned"
4. Driver picks up vehicle from hub       → Driver marks "En Route"
                                          → Log GPS coordinates
5. Driver arrives at customer location    → Display delivery details
6. Driver captures handover photos        → Upload to condition-photos bucket
7. Driver completes handover              → Status: "delivered"
                                          → Booking progresses to standard ops
```

### 4.4 Return Phase

```
Staff Actions                             System Actions
─────────────────                         ──────────────
1. Customer returns vehicle               → Return ops wizard opens
2. Record return time + odometer + fuel   → Calculate if late
3. Capture return photos                  → Store in condition-photos bucket
4. Review issues/damages                  → Create damage_reports if needed
                                          → Create incident_cases if severe
5. Complete closeout                      → Status: active → completed
6. Release/withhold deposit               → Update deposit_ledger
                                          → Send deposit notification
7. Return complete                        → Booking archived
                                          → Vehicle available for next rental
```

---

## 5. Statuses Used in the System

### 5.1 Booking Status

| Status | Description |
|--------|-------------|
| `pending` | Booking created but not yet confirmed (rarely used - most bookings start as confirmed) |
| `confirmed` | Booking confirmed, awaiting pickup |
| `active` | Rental in progress (vehicle handed over) |
| `completed` | Rental finished, vehicle returned |
| `cancelled` | Booking cancelled by customer or admin |

### 5.2 Delivery Status

| Status | Description |
|--------|-------------|
| `unassigned` | Delivery booking created, no driver assigned |
| `assigned` | Driver assigned, not yet picked up vehicle |
| `picked_up` | Driver has vehicle, heading to pickup location |
| `en_route` | Driver en route to customer |
| `delivered` | Vehicle successfully delivered to customer |
| `cancelled` | Delivery cancelled |
| `issue` | Problem with delivery |

### 5.3 Delivery Portal Status (UI Grouping)

| Portal Status | Maps From |
|---------------|-----------|
| `pending` | unassigned, assigned |
| `en_route` | picked_up, en_route |
| `completed` | delivered |
| `issue` | cancelled, issue |

### 5.4 Alert Type

| Alert Type | Description |
|------------|-------------|
| `verification_pending` | License needs verification |
| `payment_pending` | Payment not yet collected |
| `cleaning_required` | Vehicle needs cleaning |
| `damage_reported` | Damage report filed |
| `late_return` | Vehicle overdue |
| `hold_expiring` | Reservation hold about to expire |
| `return_due_soon` | Return imminent (reminder) |
| `overdue` | Rental past return date |
| `customer_issue` | Customer reported problem |
| `emergency` | Urgent situation |

### 5.5 Alert Status

| Status | Description |
|--------|-------------|
| `pending` | Needs attention |
| `acknowledged` | Seen but not resolved |
| `resolved` | Issue addressed |

### 5.6 Damage Severity

| Severity | Description |
|----------|-------------|
| `minor` | Small scratches, dings |
| `moderate` | Noticeable damage, needs repair |
| `severe` | Major damage, vehicle may be undrivable |

### 5.7 Damage Report Status

| Status | Description |
|--------|-------------|
| `reported` | Damage logged |
| `reviewing` | Under assessment |
| `approved` | Repair approved |
| `repaired` | Repair completed |
| `closed` | Case closed |

### 5.8 Ticket Status

| Status | Description |
|--------|-------------|
| `open` | New ticket |
| `in_progress` | Being worked on |
| `assigned` | Assigned to staff member |
| `waiting_customer` | Awaiting customer response |
| `resolved` | Issue resolved |
| `closed` | Ticket closed |

### 5.9 Verification Status

| Status | Description |
|--------|-------------|
| `pending` | Document uploaded, awaiting review |
| `verified` | Document approved |
| `rejected` | Document rejected |

### 5.10 Return State (State Machine)

| State | Description |
|-------|-------------|
| `not_started` | Return not initiated |
| `initiated` | Return process started |
| `intake_done` | Return time/odometer recorded |
| `evidence_done` | Return photos captured |
| `issues_reviewed` | Damages/issues assessed |
| `closeout_done` | Return completed |
| `deposit_processed` | Deposit released/withheld |

### 5.11 Incident Case Status

| Status | Description |
|--------|-------------|
| `open` | Incident reported |
| `investigating` | Under investigation |
| `estimate_pending` | Awaiting repair estimate |
| `repair_in_progress` | Vehicle being repaired |
| `claim_submitted` | Insurance claim filed |
| `closed` | Case resolved |

---

## 6. Access Restrictions and Role-Based Permissions

### 6.1 Role Definitions

| Role | Description |
|------|-------------|
| `admin` | Full system access |
| `staff` | Operational access (bookings, fleet, returns) |
| `finance` | Financial operations (billing, deposits, payments) |
| `cleaner` | Vehicle preparation tasks only |
| `support` | Customer support ticket management |
| `driver` | Delivery operations |

### 6.2 Portal Access Matrix

| Portal | Roles with Access |
|--------|-------------------|
| Customer Portal | All (public) |
| Admin Panel | admin, staff, cleaner, finance |
| Support Panel | admin, staff, support |
| Delivery Panel | admin, staff, driver |

### 6.3 Database Functions for Access Control

| Function | Purpose |
|----------|---------|
| `is_admin_or_staff(user_id)` | Admin panel access |
| `is_support_or_admin(user_id)` | Support panel access |
| `is_driver_or_above(user_id)` | Delivery panel access |
| `has_role(user_id, role)` | Generic role check |

### 6.4 Row Level Security (RLS)

- All tables have RLS enabled
- Customers can only read their own data
- Admin/Staff can read all operational data
- Write operations restricted by role
- Service role key used for internal operations (edge functions)

---

## 7. Known Limitations and Incomplete Features

### 7.1 Current Limitations

| Limitation | Impact |
|------------|--------|
| **No offline support** | App requires internet connection |
| **Single currency (CAD)** | Cannot support other currencies |
| **Single timezone (Pacific)** | All times assumed PT |
| **No multi-tenancy** | Single rental company only |
| **No mobile native app** | Web responsive only (no iOS/Android app) |
| **No telematics integration** | Manual vehicle updates only |
| **No AI recommendations** | Basic category search only |
| **Limited reporting** | Basic analytics, no custom reports |

### 7.2 Technical Debt / Incomplete Areas

| Area | Status |
|------|--------|
| **Automated testing** | Playwright E2E specs exist but not comprehensive |
| **i18n (internationalization)** | Hardcoded English strings |
| **Error handling** | Inconsistent patterns in some areas |
| **Loading states** | Missing in some admin screens |
| **Component size** | Some components exceed 500 lines |

### 7.3 Features Marked as Not Defined

| Feature | Status |
|---------|--------|
| **Ticket escalation** | No defined escalation workflow |
| **Custom pricing rules** | No dynamic pricing engine |
| **Customer reviews** | Not implemented |
| **Loyalty program** | Points system exists but limited |
| **Franchise/multi-location** | Single location architecture |

---

## 8. Pricing Reference

### 8.1 Standard Fees

| Fee | Amount |
|-----|--------|
| Young Driver Fee (21-25) | $20 one-time |
| Security Deposit | $350 |
| Late Fee | $25/hour (30-min grace, max 24h) |
| No-Show Fee | $58.99 |
| Delivery (under 10km) | Free |
| Delivery (10-50km) | $49 |

### 8.2 Tax Rates (BC, Canada)

| Tax | Rate |
|-----|------|
| PST (Provincial) | 7% |
| GST (Federal) | 5% |
| **Total** | **12%** |

### 8.3 Daily Regulatory Fees

| Fee | Amount |
|-----|--------|
| PVRT (Passenger Vehicle Rental Tax) | $1.50/day |
| ACSRCH (Airport Surcharge) | $1.00/day |

### 8.4 Duration Discounts

| Duration | Discount |
|----------|----------|
| 7+ days | 10% off |
| 21+ days | 20% off |

### 8.5 Weekend Surcharge

| Condition | Surcharge |
|-----------|-----------|
| Pickup Fri/Sat/Sun | 15% on vehicle rate |

---

## 9. Vehicle Categories

| Category | Description | Seats |
|----------|-------------|-------|
| Mystery Car | Budget tier, random assignment | 5 |
| Economy | Nissan Versa or similar | 5 |
| Mid Size | Toyota Corolla or similar | 5 |
| Full Size | Toyota Camry or similar | 5 |
| Mid Size SUV | Toyota RAV4 or similar | 5 |
| SUV | Ford Edge or similar | 5 |
| Minivan | Chrysler Pacifica or similar | 7 |
| Large SUV | Dodge Durango or similar | 7 |

---

## 10. External Integrations

| Service | Purpose | Required Secret |
|---------|---------|-----------------|
| Stripe | Payment processing | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET |
| Twilio | SMS notifications | TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER |
| Resend | Email notifications | RESEND_API_KEY |
| Mapbox | Maps & geocoding | MAPBOX_PUBLIC_TOKEN |

---

*Document generated for QA purposes. Contact development team for clarifications.*
