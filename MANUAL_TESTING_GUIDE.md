# C2C Rental Platform - Manual Testing Guide

> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Platform:** C2C Car Rental Management System

---

## Table of Contents

1. [Introduction & Setup](#introduction--setup)
2. [Test Account Setup](#test-account-setup)
3. [Panel 1: Customer Portal Testing](#panel-1-customer-portal-testing)
4. [Panel 2: Admin Panel Testing](#panel-2-admin-panel-testing)
5. [Panel 3: Delivery Panel Testing](#panel-3-delivery-panel-testing)
6. [Panel 4: Support Panel Testing](#panel-4-support-panel-testing)
7. [Panel 5: Ops Panel Testing](#panel-5-ops-panel-testing)
8. [Integration Testing](#integration-testing)
9. [Edge Cases & Error Scenarios](#edge-cases--error-scenarios)
10. [Appendices](#appendices)

---

## Introduction & Setup

### Purpose
This guide provides comprehensive test cases for manually verifying all functionality across the C2C Rental Platform's five panels: Customer Portal, Admin, Delivery, Support, and Ops.

### Testing Prerequisites

Before testing, ensure:

| Requirement | Details |
|-------------|---------|
| **Locations** | At least 1 active location exists |
| **Categories** | At least 1 vehicle category with units |
| **Vehicle Units** | At least 2 units per category (for availability testing) |
| **Test Users** | Accounts with each role: admin, staff, driver, support |
| **Stripe Test Mode** | Enabled with test API keys |

### Stripe Test Cards

| Card Number | Behavior |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 3220` | 3D Secure required |
| `4000 0000 0000 9995` | Declined |
| `4000 0025 0000 3155` | Requires authentication |

**Expiry:** Any future date (e.g., 12/28)  
**CVC:** Any 3 digits (e.g., 123)  
**ZIP:** Any 5 digits (e.g., 12345)

---

## Test Account Setup

### Required Test Accounts

Create these accounts before testing:

| Role | Email Pattern | Access |
|------|---------------|--------|
| Admin | `admin@test.com` | Full admin panel access |
| Staff | `staff@test.com` | Ops + limited admin |
| Driver | `driver@test.com` | Delivery panel only |
| Support | `support@test.com` | Support panel only |
| Customer | `customer@test.com` | Customer portal |

### Assigning Roles

Roles are assigned in the `user_roles` table:
1. User signs up via `/auth`
2. Admin assigns role via database or admin settings

---

## Panel 1: Customer Portal Testing

### TC-C01: Homepage & Navigation

**Priority:** High  
**Route:** `/`

**Test Steps:**
1. Navigate to homepage
   - Hero section displays with search bar
   - Vehicle categories grid loads
   - Trust strip shows (24/7 support icons)
   - Featured vehicles display

2. Click navigation links
   - Logo → Home
   - "Browse Vehicles" → Search page
   - "Locations" → Locations page
   - "Sign In" → Auth page

**Verification Points:**
- [ ] Page loads without console errors
- [ ] All images load properly
- [ ] Mobile responsive (test at 375px width)
- [ ] Dark/light theme toggle works

---

### TC-C02: Search & Browse

**Priority:** High  
**Route:** `/search`

**Test Steps:**
1. Enter search criteria:
   - Select location from dropdown
   - Pick pickup date (tomorrow)
   - Pick return date (3 days later)
   - Click "Search"

2. Verify results page:
   - Available categories display
   - Daily rate shown per category
   - "Select" button on each card
   - Filters work (if available)

3. Click on a vehicle category:
   - Modal opens with details
   - Specifications displayed (seats, transmission, fuel)
   - "Book Now" button visible

**Verification Points:**
- [ ] Only available categories show
- [ ] Pricing matches category daily_rate
- [ ] Past dates are disabled
- [ ] Return date cannot be before pickup

---

### TC-C03: Booking Flow (Guest Checkout)

**Priority:** High  
**Route:** `/search` → `/checkout`

**Preconditions:** Not logged in

**Test Steps:**
1. Complete search and select a vehicle
2. On vehicle selection, click "Book Now"
3. Choose protection package:
   - Basic (included)
   - Standard (+$X/day)
   - Premium (+$X/day)
4. Add optional extras:
   - GPS Navigator
   - Child Seat
   - Additional Driver
5. Enter customer details:
   - First Name, Last Name
   - Email, Phone
   - Driver age band selection
6. Enter delivery OR pickup:
   - **Pickup:** Select location
   - **Delivery:** Enter address, see fee calculated
7. Payment section:
   - Enter Stripe test card
   - See total breakdown
   - Click "Confirm Booking"
8. Booking confirmation:
   - Success page displays
   - Booking code shown (C2CXXXXXXX)
   - Email confirmation sent

**Verification Points:**
- [ ] Guest can complete booking without account
- [ ] Protection changes update total
- [ ] Add-ons correctly add to total
- [ ] Tax calculated correctly (if applicable)
- [ ] Booking code generated
- [ ] Confirmation email received

---

### TC-C04: Booking Flow (Authenticated)

**Priority:** High  
**Route:** `/auth` → `/search` → `/checkout`

**Preconditions:** Valid customer account

**Test Steps:**
1. Log in at `/auth`
2. Complete booking flow (same as TC-C03)
3. Verify:
   - Customer info pre-filled
   - Points balance shown (if applicable)
   - Option to redeem points
4. After booking:
   - Appears in customer dashboard
   - Can view booking details

**Verification Points:**
- [ ] Login persists through booking
- [ ] Customer data pre-populated
- [ ] Booking linked to user account
- [ ] Dashboard shows booking

---

### TC-C05: Delivery Booking

**Priority:** High  
**Route:** `/checkout` (with delivery selected)

**Test Steps:**
1. During checkout, select "Delivery" option
2. Enter delivery address:
   - Start typing → autocomplete suggestions
   - Select an address
3. Verify delivery fee:
   - Fee calculated based on distance
   - Added to total
4. Complete booking
5. Check booking details include:
   - Delivery address
   - Delivery fee line item

**Verification Points:**
- [ ] Address autocomplete works
- [ ] Delivery fee displays
- [ ] Fee added to total correctly
- [ ] Confirmation shows delivery details

---

### TC-C06: Post-Booking Customer Actions

**Priority:** Medium  
**Route:** `/booking/:id/*`

**Preconditions:** Active booking exists

**Test Steps:**
1. Access booking via email link or dashboard
2. Upload driver license:
   - Navigate to license upload step
   - Upload front image
   - Upload back image
   - Submit
3. View/Sign rental agreement:
   - Agreement text displays
   - Signature capture works
   - Submit signature
4. View booking pass:
   - QR code displays
   - Booking details shown
   - Can download/screenshot

**Verification Points:**
- [ ] License upload accepts images
- [ ] Agreement signature captured
- [ ] QR code generates correctly
- [ ] Pass shows accurate details

---

### TC-C07: Customer Dashboard

**Priority:** Medium  
**Route:** `/dashboard`

**Preconditions:** Logged in customer with bookings

**Test Steps:**
1. Navigate to dashboard
2. View active bookings:
   - Current/upcoming rentals display
   - Status badges accurate
3. View past bookings:
   - Completed rentals listed
   - Can view receipt
4. Account settings:
   - Update profile info
   - Change password (if available)

**Verification Points:**
- [ ] All bookings display
- [ ] Status is accurate
- [ ] Receipt accessible for completed

---

### TC-C08: Error Handling

**Priority:** Medium  
**Routes:** Various

**Test Steps:**
1. Search with no availability:
   - Select dates with no units
   - Verify "No vehicles available" message

2. Payment failure:
   - Use declined card `4000 0000 0000 9995`
   - Verify error message displays
   - Can retry with valid card

3. Session timeout:
   - Wait for session to expire
   - Attempt action
   - Redirected to login

4. Invalid routes:
   - Navigate to `/nonexistent`
   - 404 page displays

**Verification Points:**
- [ ] Graceful error messages
- [ ] No raw error codes shown
- [ ] Recovery path clear

---

## Panel 2: Admin Panel Testing

**Access:** `/admin/*`  
**Required Role:** admin

---

### TC-A01: Dashboard Overview

**Priority:** High  
**Route:** `/admin`

**Test Steps:**
1. Log in as admin
2. View dashboard:
   - Today's pickups count
   - Today's returns count
   - Active rentals count
   - Pending alerts count
3. Click on stat cards:
   - Navigate to respective sections

**Verification Points:**
- [ ] Counts match actual data
- [ ] Quick links work
- [ ] Realtime updates (if applicable)

---

### TC-A02: Alerts Management

**Priority:** High  
**Route:** `/admin/alerts`

**Test Steps:**
1. View alerts list:
   - Pending verifications
   - Late returns
   - Overdue deposits
2. Click on alert:
   - Details expand/modal opens
3. Acknowledge alert:
   - Click "Acknowledge"
   - Status updates
4. Resolve alert:
   - Take action
   - Mark as resolved

**Verification Points:**
- [ ] Alerts categorized correctly
- [ ] Timestamps accurate
- [ ] Status changes persist

---

### TC-A03: Bookings Hub

**Priority:** High  
**Route:** `/admin/bookings`

**Test Steps:**
1. View bookings list:
   - All bookings display
   - Status filters work
   - Search by code works
2. Click on booking:
   - Details page opens
   - Customer info shown
   - Vehicle info shown
   - Timeline displays
3. Create walk-in booking:
   - Click "New Booking"
   - Complete walk-in form
   - Booking created

**Verification Points:**
- [ ] Filters reduce list correctly
- [ ] Search finds booking by code
- [ ] Walk-in creates valid booking

---

### TC-A04: Pickup Ops Wizard (6 Steps)

**Priority:** Critical  
**Route:** `/admin/booking/:id/ops`

**Preconditions:** Confirmed booking ready for pickup

**Test Steps:**

**Step 1: Prep**
1. Open booking ops wizard
2. Assign vehicle unit:
   - Select from available units
   - Confirm assignment
3. Complete prep checklist:
   - Check all items
   - Save progress

**Step 2: Payment**
1. View payment status:
   - Authorization hold status
   - Deposit amount
2. If no hold exists:
   - Use "Create Hold" to authorize
   - Verify Stripe PaymentIntent created

**Step 3: Photos**
1. Upload pre-rental photos:
   - Front, Back, Sides
   - Interior
   - Odometer
2. Mark section complete

**Step 4: Agreement**
1. Generate rental agreement:
   - Click "Generate Agreement"
   - PDF created
2. Capture signature:
   - Use signature pad
   - Save signature
3. Send to customer (optional):
   - Email agreement

**Step 5: Check-In**
1. Verify customer identity:
   - Review license upload
   - Mark verified
2. Age verification:
   - Confirm age matches license
3. Record arrival time

**Step 6: Handover**
1. Record odometer reading
2. Record fuel level
3. Complete handover:
   - Click "Complete Handover"
   - Status changes to "Active"
   - Vehicle unit → "on_rent"

**Verification Points:**
- [ ] Each step blocks until previous complete (where required)
- [ ] Unit assignment updates database
- [ ] Payment authorization verified
- [ ] Photos upload successfully
- [ ] Agreement generates
- [ ] Signature captures
- [ ] Check-in verifications work
- [ ] Handover changes booking to Active
- [ ] Vehicle unit status changes to on_rent

---

### TC-A05: Active Rental Monitoring

**Priority:** High  
**Route:** `/admin/active-rentals`

**Test Steps:**
1. View active rentals list:
   - All "Active" bookings display
   - Customer and vehicle info shown
2. Click on rental:
   - Detail view opens
   - Return due date shown
3. Monitor for late returns:
   - Past-due rentals highlighted
   - Alert generated (if applicable)

**Verification Points:**
- [ ] Only active rentals shown
- [ ] Late returns flagged
- [ ] Can access return ops from here

---

### TC-A06: Return Ops Wizard (5 Steps)

**Priority:** Critical  
**Route:** `/admin/booking/:id/return`

**Preconditions:** Active rental

**Test Steps:**

**Step 1: Intake**
1. Start return process:
   - Click "Start Return"
2. Record return metrics:
   - Odometer reading
   - Fuel level
3. Note any exceptions:
   - Late return?
   - Damage visible?

**Step 2: Evidence**
1. Upload post-rental photos:
   - All angles
   - Any damage close-ups
2. Compare with pre-rental photos

**Step 3: Issues**
1. Review for issues:
   - Damage found? Create report
   - Cleaning needed?
   - Traffic violations?
2. Document any findings

**Step 4: Fees**
1. Calculate additional fees:
   - Late return fee (auto-calculated)
   - Fuel charge
   - Damage charges
2. Review total due

**Step 5: Closeout**
1. Review final invoice:
   - All line items
   - Total amount
2. Process deposit:
   - Release full (no issues)
   - Partial capture (for fees)
   - Full capture (for damages)
3. Complete return:
   - Click "Complete Return"
   - Status → Completed
   - Unit → Available

**Verification Points:**
- [ ] Mileage captured updates vehicle unit
- [ ] Photos upload correctly
- [ ] Damage reports create
- [ ] Fees calculate correctly
- [ ] Deposit processed via Stripe
- [ ] Booking status → Completed
- [ ] Vehicle unit → Available

---

### TC-A07: Fleet Management

**Priority:** High  
**Route:** `/admin/fleet`

**Test Steps:**
1. View fleet overview:
   - Total vehicles count
   - Available/On-rent/Maintenance counts
2. Navigate tabs:
   - Overview
   - Utilization
   - Performance
   - Costs
3. View vehicle details:
   - Click on vehicle unit
   - History displays
   - Maintenance log shows

**Verification Points:**
- [ ] Counts accurate
- [ ] Charts render
- [ ] Unit details accessible

---

### TC-A08: Category Management

**Priority:** High  
**Route:** `/admin/fleet/categories`

**Test Steps:**
1. View categories list
2. Create new category:
   - Click "Add Category"
   - Enter name, description
   - Set daily rate
   - Upload image
   - Save
3. Edit category:
   - Click existing category
   - Modify details
   - Save changes
4. Disable category:
   - Toggle active status
   - Category hidden from customer search

**Verification Points:**
- [ ] CRUD operations work
- [ ] Image uploads
- [ ] Rate changes reflect

---

### TC-A09: Vehicle Unit Management

**Priority:** High  
**Route:** `/admin/fleet/units` or `/admin/vehicles/:id`

**Test Steps:**
1. View units list
2. Add new unit:
   - Click "Add Unit"
   - Select category
   - Enter VIN
   - Enter license plate
   - Set location
   - Save
3. Edit unit:
   - Update mileage
   - Change status
   - Update location
4. View unit history:
   - Rental history
   - Maintenance logs
   - Expense records

**Verification Points:**
- [ ] Units linked to categories
- [ ] Status changes persist
- [ ] History displays correctly

---

### TC-A10: Incidents & Damages

**Priority:** High  
**Route:** `/admin/incidents`, `/admin/damages`

**Test Steps:**
1. View incidents list:
   - Active cases display
   - Severity indicators
2. Create incident:
   - Click "New Incident"
   - Select booking/vehicle
   - Enter details
   - Set severity
   - Save
3. Update incident:
   - Add photos
   - Update status
   - Record repair costs
4. View damages:
   - Damage reports list
   - Linked to bookings

**Verification Points:**
- [ ] Incidents create tickets (auto)
- [ ] Photos attach to incidents
- [ ] Status workflow works
- [ ] Costs tracked

---

### TC-A11: Billing & Deposits

**Priority:** High  
**Route:** `/admin/billing`

**Test Steps:**
1. View deposits tab:
   - Pending holds
   - Captured deposits
   - Released deposits
2. Capture deposit:
   - Select booking
   - Enter amount
   - Enter reason
   - Capture
3. Release deposit:
   - Select booking with hold
   - Release full amount
4. View payment history:
   - All payments listed
   - Stripe transaction IDs

**Verification Points:**
- [ ] Deposit status accurate
- [ ] Capture processes via Stripe
- [ ] Release processes via Stripe
- [ ] Ledger entries created

---

### TC-A12: Reports & Analytics

**Priority:** Medium  
**Route:** `/admin/analytics`, `/admin/reports`

**Test Steps:**
1. View analytics dashboard:
   - Revenue charts
   - Utilization metrics
   - Booking trends
2. Select date ranges:
   - Filter updates data
3. Export reports:
   - Click export button
   - File downloads

**Verification Points:**
- [ ] Charts render with data
- [ ] Filters work
- [ ] Export produces valid file

---

### TC-A13: Offers Management

**Priority:** Medium  
**Route:** `/admin/offers`

**Test Steps:**
1. View offers list
2. Create offer:
   - Set discount type (% or $)
   - Set validity dates
   - Set requirements
   - Save
3. Edit offer:
   - Modify terms
   - Activate/deactivate
4. Track redemptions:
   - View usage count

**Verification Points:**
- [ ] Offers create correctly
- [ ] Date validation works
- [ ] Redemptions tracked

---

### TC-A14: Settings

**Priority:** Medium  
**Route:** `/admin/settings`

**Test Steps:**
1. View settings sections:
   - Add-ons pricing
   - Points configuration
   - Membership tiers
2. Modify add-on pricing:
   - Change daily rate
   - Save
3. Configure points:
   - Earn rate
   - Redemption value
   - Save

**Verification Points:**
- [ ] Settings persist
- [ ] Changes reflect in bookings

---

## Panel 3: Delivery Panel Testing

**Access:** `/delivery/*`  
**Required Role:** driver

---

### TC-D01: Dashboard & Queue

**Priority:** High  
**Route:** `/delivery`

**Test Steps:**
1. Log in as driver
2. View delivery dashboard:
   - Available deliveries (unassigned)
   - My deliveries (assigned to me)
   - Completed today
3. Filter by status:
   - Pending
   - En Route
   - Completed

**Verification Points:**
- [ ] Only delivery bookings show
- [ ] Filters work correctly
- [ ] Real-time updates (if enabled)

---

### TC-D02: Claim Delivery

**Priority:** High  
**Route:** `/delivery`

**Preconditions:** Unassigned delivery exists

**Test Steps:**
1. Find unassigned delivery
2. Click "Claim"
3. Confirm assignment:
   - Delivery moves to "My Deliveries"
   - Status updates

**Verification Points:**
- [ ] Only drivers can claim
- [ ] Assignment persists
- [ ] Booking updated with driver_id

---

### TC-D03: Delivery Workflow

**Priority:** High  
**Route:** `/delivery/:id`

**Test Steps:**
1. Open claimed delivery
2. View customer details:
   - Name
   - Phone
   - Delivery address
3. Start delivery:
   - Click "Start Delivery"
   - Status → En Route
4. Capture GPS location:
   - Allow location access
   - Position logged
5. Update status:
   - At location
   - Waiting for customer

**Verification Points:**
- [ ] Customer info visible
- [ ] Status updates save
- [ ] GPS captures (if enabled)

---

### TC-D04: Handover Completion

**Priority:** High  
**Route:** `/delivery/:id`

**Preconditions:** At delivery location

**Test Steps:**
1. Complete handover checklist:
   - Customer present
   - ID verified
   - Keys handed over
2. Upload handover photos:
   - Vehicle at location
   - Customer receipt
3. Capture signature:
   - Customer signs on device
4. Complete handover:
   - Click "Complete"
   - Status → Completed

**Verification Points:**
- [ ] Checklist enforced
- [ ] Photos upload
- [ ] Signature saves
- [ ] Booking updated to Active

---

### TC-D05: Walk-In Booking

**Priority:** Medium  
**Route:** `/delivery/walk-in`

**Test Steps:**
1. Start walk-in booking:
   - Customer arrives at location
2. Enter details:
   - Customer info
   - Vehicle selection
   - Dates
3. Process payment:
   - Card authorization
4. Complete walk-in:
   - Vehicle handed over

**Verification Points:**
- [ ] Creates valid booking
- [ ] Payment authorized
- [ ] Handover complete

---

## Panel 4: Support Panel Testing

**Access:** `/support/*`  
**Required Role:** support, staff, or admin

---

### TC-S01: Ticket Queue

**Priority:** High  
**Route:** `/support/tickets`

**Test Steps:**
1. Log in as support
2. View ticket queue:
   - New tickets
   - In progress
   - Closed
3. Sort/filter:
   - By priority
   - By category
   - By date

**Verification Points:**
- [ ] All tickets display
- [ ] Filters work
- [ ] Priority visible

---

### TC-S02: Ticket Management

**Priority:** High  
**Route:** `/support/tickets/:id`

**Test Steps:**
1. Open a ticket
2. View details:
   - Customer info
   - Linked booking (if any)
   - Category
   - Priority
3. Update status:
   - New → In Progress
   - In Progress → Closed
4. Assign to agent:
   - Select assignee
   - Save

**Verification Points:**
- [ ] Status changes persist
- [ ] Assignment works
- [ ] Audit log updated

---

### TC-S03: Customer Communication

**Priority:** High  
**Route:** `/support/tickets/:id`

**Test Steps:**
1. Send message to customer:
   - Type in message box
   - Click send
   - Message appears in thread
2. Add internal note:
   - Toggle to internal
   - Add note
   - Note visible to staff only
3. View message history:
   - Thread displays correctly
   - Timestamps accurate

**Verification Points:**
- [ ] Messages send
- [ ] Customer receives (email)
- [ ] Internal notes hidden from customer

---

### TC-S04: Macros & Templates

**Priority:** Medium  
**Route:** `/support/tickets/:id`

**Test Steps:**
1. Open ticket response
2. Click "Macros" or template picker
3. Select a template:
   - Text populates
4. Modify if needed
5. Send

**Verification Points:**
- [ ] Macros list loads
- [ ] Template inserts correctly
- [ ] Can edit before sending

---

### TC-S05: Analytics Dashboard

**Priority:** Medium  
**Route:** `/support/analytics`

**Test Steps:**
1. View support metrics:
   - Open tickets
   - Average response time
   - Resolution time
   - Tickets by category
2. Select date range:
   - Metrics update

**Verification Points:**
- [ ] Metrics calculate correctly
- [ ] Charts render
- [ ] Date filter works

---

## Panel 5: Ops Panel Testing

**Access:** `/ops/*`  
**Required Role:** admin, staff, cleaner

---

### TC-O01: Workboard

**Priority:** High  
**Route:** `/ops`

**Test Steps:**
1. Log in as staff
2. View workboard:
   - Today's pickups
   - Today's returns
   - Quick actions
3. Click on task:
   - Opens booking ops

**Verification Points:**
- [ ] Shows today's tasks only
- [ ] Counts accurate
- [ ] Navigation works

---

### TC-O02: Pickups Queue

**Priority:** High  
**Route:** `/ops/pickups`

**Test Steps:**
1. View pickups list:
   - Confirmed bookings
   - Ready for pickup
2. Search by code:
   - Enter booking code
   - Results filter
3. Open pickup ops:
   - Click on booking
   - Ops wizard opens

**Verification Points:**
- [ ] Only pickup-ready bookings show
- [ ] Search works
- [ ] Links to ops wizard

---

### TC-O03: Active Rentals

**Priority:** High  
**Route:** `/ops/active`

**Test Steps:**
1. View active rentals:
   - All rentals on the road
   - Return due dates
2. Identify late returns:
   - Highlighted in red
3. Access return process:
   - Click "Start Return"

**Verification Points:**
- [ ] Active rentals accurate
- [ ] Late returns highlighted
- [ ] Return link works

---

### TC-O04: Returns Queue

**Priority:** High  
**Route:** `/ops/returns`

**Test Steps:**
1. View returns list:
   - Due today
   - Overdue
   - Recently returned
2. Start return:
   - Click on booking
   - Return wizard opens

**Verification Points:**
- [ ] Due dates accurate
- [ ] Overdue flagged
- [ ] Wizard accessible

---

### TC-O05: Fleet View

**Priority:** Medium  
**Route:** `/ops/fleet`

**Test Steps:**
1. View fleet status:
   - Available units
   - On rent
   - In maintenance
2. Quick status check:
   - See unit locations
   - Current assignments

**Verification Points:**
- [ ] Status counts accurate
- [ ] Units filterable

---

### TC-O06: Booking Operations

**Priority:** High  
**Route:** `/ops/booking/:id/handover`

**Test Steps:**
1. Access via workboard or search
2. Complete pickup workflow:
   - Same as TC-A04
3. Complete return workflow:
   - Same as TC-A06

**Verification Points:**
- [ ] Same functionality as admin
- [ ] UI optimized for speed
- [ ] Quick navigation

---

## Integration Testing

### IT-01: Complete Rental Lifecycle

**Priority:** Critical

**Test Steps:**
1. **Customer creates booking** (TC-C03)
2. **Admin processes pickup** (TC-A04)
   - All 6 steps complete
   - Status: Active
3. **Monitor active rental** (TC-A05)
4. **Admin processes return** (TC-A06)
   - All 5 steps complete
   - Deposit released
   - Status: Completed
5. **Verify vehicle available** again

**Verification Points:**
- [ ] Full lifecycle completes
- [ ] All statuses accurate
- [ ] Vehicle returns to pool

---

### IT-02: Delivery Booking E2E

**Priority:** High

**Test Steps:**
1. Customer books with delivery
2. Driver claims delivery (TC-D02)
3. Driver delivers vehicle (TC-D03)
4. Driver completes handover (TC-D04)
5. Customer returns vehicle
6. Admin processes return

**Verification Points:**
- [ ] Delivery fee charged
- [ ] Driver assignment works
- [ ] Handover completes properly

---

### IT-03: Payment Flow (Stripe)

**Priority:** Critical

**Test Steps:**
1. Customer reaches checkout
2. Enter test card
3. Authorization hold created:
   - PaymentIntent status: requires_capture
   - Deposit amount: held
4. On return:
   - No issues: full release
   - Issues: partial capture
5. Verify Stripe dashboard:
   - Charges/refunds match

**Verification Points:**
- [ ] Hold created correctly
- [ ] Capture amount accurate
- [ ] Refund processes
- [ ] Stripe IDs logged

---

### IT-04: Damage & Incident Flow

**Priority:** High

**Test Steps:**
1. During return, report damage (TC-A06)
2. Damage report created
3. Support ticket auto-created
4. Deposit partially captured
5. Incident case created (if severe)
6. Track repair status

**Verification Points:**
- [ ] Damage → Ticket link works
- [ ] Deposit captures for damage
- [ ] Incident creates from damage

---

### IT-05: Support Ticket Flow

**Priority:** Medium

**Test Steps:**
1. Customer has issue
2. Ticket created (manual or auto)
3. Support responds
4. Issue resolved
5. Ticket closed

**Verification Points:**
- [ ] Full ticket lifecycle
- [ ] Notifications sent
- [ ] Audit trail complete

---

## Edge Cases & Error Scenarios

### EC-01: Double Booking Prevention

**Test:** Try to book same unit twice for overlapping dates  
**Expected:** Second booking fails or shows unavailable

---

### EC-02: Late Return Fees

**Test:** Return vehicle after due date  
**Expected:** Late fee auto-calculated and applied

---

### EC-03: Concurrent Unit Assignment

**Test:** Two admins assign same unit simultaneously  
**Expected:** One succeeds, one gets error

---

### EC-04: Payment Failure Recovery

**Test:** Card declines during checkout  
**Expected:** User can retry with different card

---

### EC-05: Session Expiry

**Test:** Leave checkout idle for extended time  
**Expected:** Session expires gracefully, can restart

---

### EC-06: Network Failure

**Test:** Disconnect network during photo upload  
**Expected:** Error shown, can retry

---

## Appendices

### Appendix A: Test Data Templates

**Customer Info:**
```
First Name: Test
Last Name: Customer
Email: testcustomer@example.com
Phone: +1 (555) 123-4567
DOB: 1990-01-15
```

**Address:**
```
123 Main Street
Miami, FL 33101
USA
```

**Driver License:**
```
License #: D123456789
State: Florida
Expiry: 2028-12-31
```

---

### Appendix B: Status Workflows

**Booking Status Flow:**
```
pending_payment → confirmed → active → completed
                     ↓
                 cancelled
                     ↓
                   voided
```

**Deposit Status Flow:**
```
pending → authorized → captured/released
             ↓
          expired
```

**Vehicle Unit Status Flow:**
```
available → on_rent → available
    ↓          ↓
maintenance ← returned_needs_inspection
```

---

### Appendix C: Troubleshooting

| Issue | Solution |
|-------|----------|
| Payment fails | Check Stripe test mode, use test card |
| Photos don't upload | Check file size (<5MB), format (JPG/PNG) |
| Unit not available | Check existing bookings, unit status |
| Can't access panel | Verify user role assignment |
| Booking code not found | Check exact code, case-sensitive |

---

## Test Execution Log

Use this template to track test execution:

| Test ID | Date | Tester | Result | Notes |
|---------|------|--------|--------|-------|
| TC-C01 | | | Pass/Fail | |
| TC-C02 | | | Pass/Fail | |
| ... | | | | |

---

**End of Manual Testing Guide**
