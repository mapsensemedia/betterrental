# C2C Rental — Business Logic Design Document

> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Audience:** Business stakeholders, product managers, operations leads  
> **Scope:** Business rules, workflows, calculations, and policies only — no engineering or implementation details.

---

## Table of Contents

1. [Goal & Scope](#1-goal--scope)
2. [Core Entities & Definitions](#2-core-entities--definitions)
3. [Roles & Permissions](#3-roles--permissions)
4. [Booking Lifecycle & State Machine](#4-booking-lifecycle--state-machine)
5. [Pricing & Calculation Rules](#5-pricing--calculation-rules)
6. [Payments, Holds, Capture & Refunds](#6-payments-holds-capture--refunds)
7. [Ops Panel Business Workflows](#7-ops-panel-business-workflows)
8. [Delivery Panel Business Workflows](#8-delivery-panel-business-workflows)
9. [Support & Disputes](#9-support--disputes)
10. [Admin Settings & Governance](#10-admin-settings--governance)
11. [Edge Cases & Exception Handling](#11-edge-cases--exception-handling)
12. [KPIs & Operational Reporting](#12-kpis--operational-reporting)
13. [Worked Pricing Examples](#13-worked-pricing-examples)
14. [Assumptions](#14-assumptions)
15. [Open Questions](#15-open-questions)

---

## 1. Goal & Scope

### What Problems the Platform Solves

C2C Rental (c4r.ca) is a **car rental platform** serving the Lower Mainland of British Columbia (Surrey, Langley, Abbotsford). It provides:

- **For customers:** An online booking flow to search, select, and reserve rental vehicles with transparent pricing, protection plans, and optional delivery service.
- **For operations staff:** A centralized Ops Panel to manage the full rental lifecycle — from customer check-in through vehicle handover to return and closeout.
- **For delivery drivers:** A dedicated Delivery Portal to manage vehicle deliveries to customer locations.
- **For administrators:** A strategic dashboard covering fleet management, billing, incident tracking, reporting, and platform configuration.

### Who Uses It

| Role | Panel | Description |
|------|-------|-------------|
| **Customer** | Customer Portal | Browse vehicles, book rentals, manage bookings, view receipts, mark returns |
| **Ops Staff** | Ops Panel | Handle day-to-day rental operations: check-in, handover, returns, vehicle prep |
| **Delivery Driver** | Delivery Portal | Execute vehicle deliveries: walkaround, agreement signing, handover at customer location |
| **Admin** | Admin Dashboard | Strategic oversight: fleet, billing, incidents, reports, user management, settings |
| **Finance** | Admin Dashboard (Billing module) | Payment tracking, deposit management, invoice generation, revenue reporting |
| **Support** | Admin Dashboard (Support module) | Customer communications, ticket management, dispute resolution |

---

## 2. Core Entities & Definitions

### Customer
A registered user who rents vehicles. Key attributes: full name, email, phone, driver's license status, verification status, loyalty points.

### Vehicle Category
A class of vehicle (e.g., Economy, Midsize SUV, Minivan) with a daily rate, image, and specifications (seats, fuel type, transmission). Customers book a *category*, not a specific car.

### Vehicle Unit (VIN)
A specific physical car identified by VIN and license plate, belonging to a category. Has a status (Available, On Rent, Maintenance, Damage), assigned location, current mileage, and tank capacity.

### Location
A physical branch (Surrey, Langley, Abbotsford) with address, coordinates, contact details, and operating hours.

### Booking
A reservation tying a customer to a vehicle category at a location for a date range. Key attributes: booking code, status, daily rate, total amount, protection plan, add-ons, driver age band, notes, and delivery address (if applicable).

### Reservation Hold
A temporary lock (typically 10 minutes) placed on a vehicle during checkout to prevent double-booking. Expires automatically if not converted to a booking.

### Payment Authorization
A Stripe-based payment hold placed at checkout. The amount is authorized but not captured until pickup/return.

### Security Deposit
A mandatory hold of **$350 CAD** (minimum, admin-configurable) placed on the customer's credit card at checkout. Released upon successful return with no damages, or partially/fully captured with Ops approval if issues arise.

### Charges
Any financial line item: rental fee, protection plan, add-ons, regulatory fees, young driver surcharge, late return fee, fuel shortage charge, damage charge.

### Add-Ons
Optional extras the customer can select: Child Seat, GPS, Additional Driver, Premium Roadside Assistance, Fuel Service, etc. Each has a daily rate or one-time fee. **No add-on is ever auto-selected** — all require explicit customer consent.

### Protection Plan
A damage/liability coverage package selected at checkout. Four tiers:

| Plan | Daily Rate | Deductible | Includes |
|------|-----------|------------|----------|
| No Extra Protection | $0 | Full vehicle value | Nothing extra |
| Basic Protection | $33.99 | Up to $800 | Loss Damage Waiver |
| Smart Protection (Recommended) | $39.25 | $0 | LDW + Tire & Glass |
| All Inclusive | $49.77 | $0 | LDW + Tire & Glass + Extended Roadside |

> **Conflict Rule:** "All Inclusive" protection is mutually exclusive with the "Premium Roadside" add-on. Selecting All Inclusive automatically disables the roadside add-on.

### Delivery Order
A booking flagged for vehicle delivery to the customer's address instead of branch pickup. Has a delivery fee based on distance tiers and follows a separate operational workflow.

### Support Ticket
A customer service case (TKT-XXXXXX) with status tracking, category classification, and strict separation between public messages and private staff notes.

### Damage Report
A documented record of vehicle damage with severity (Minor, Moderate, Severe), location on vehicle, description, photo evidence, and estimated cost.

### Incident Case
A comprehensive case for accidents, theft, or major incidents. Links to a booking, vehicle, and optional insurance claim. Automatically generates a high-priority support ticket.

### Late Fee
An hourly charge applied when a vehicle is returned after the scheduled return time, following a 30-minute grace period.

### Invoice (Final)
A settlement document generated at return/closeout showing all charges, payments received, deposit actions, and the net amount due or refunded.

### Rental Agreement
A single-page legal document (8.5×11) signed at pickup or delivery, capturing renter details, vehicle info, financial terms, and terms & conditions.

---

## 3. Roles & Permissions

### Permission Matrix

| Object / Action | Customer | Ops Staff | Delivery Driver | Admin | Finance |
|-----------------|----------|-----------|-----------------|-------|---------|
| **Bookings** | | | | | |
| View own bookings | ✅ | — | — | — | — |
| View all bookings | — | ✅ | Own deliveries only | ✅ | ✅ (read-only) |
| Create booking | ✅ (online) | — | — | ✅ (walk-in) | — |
| Modify booking (dates/vehicle/protection) | — | ✅ (pre-active only) | — | ✅ | — |
| Extend active rental | — | ✅ | — | ✅ | — |
| Cancel booking | ✅ (pre-pickup) | ✅ | — | ✅ | — |
| Void booking | — | — | — | ✅ (with reason + audit) | — |
| Activate rental | — | ✅ | ✅ (at delivery) | ✅ | — |
| Complete rental (return) | — | ✅ | — | ✅ | — |
| **Payments** | | | | | |
| View payment history | Own only | ✅ | — | ✅ | ✅ |
| Send payment request | — | — | — | ✅ | ✅ |
| **Deposits** | | | | | |
| View deposit status | Own only | ✅ | — | ✅ | ✅ |
| Release deposit | — | — | — | ✅ | ✅ |
| Capture deposit (damage/fees) | — | — | — | ✅ (requires Ops evidence) | — |
| Withhold deposit (partial) | — | ✅ (with category + reason) | — | ✅ | — |
| **Damage Reports** | | | | | |
| Create damage report | — | ✅ | ✅ | ✅ | — |
| Review/approve damage | — | — | — | ✅ | — |
| **Invoices** | | | | | |
| View invoice | Own only | ✅ | — | ✅ | ✅ |
| Generate final invoice | — | — | — | ✅ | ✅ |
| **Vehicles** | | | | | |
| View fleet | — | ✅ (own location) | — | ✅ | — |
| Assign/unassign VIN | — | ✅ | — | ✅ | — |
| Change vehicle status | — | ✅ | — | ✅ | — |
| Create/edit categories | — | — | — | ✅ | — |
| **Support Tickets** | | | | | |
| Create ticket | ✅ | ✅ | — | ✅ | — |
| Reply (public) | ✅ | ✅ | — | ✅ | — |
| Add internal note | — | ✅ | — | ✅ | ✅ |
| Close ticket | — | ✅ | — | ✅ | — |
| **Settings** | | | | | |
| Manage pricing/fees | — | — | — | ✅ | — |
| Manage user roles | — | — | — | ✅ | — |
| View audit logs | — | — | — | ✅ | ✅ (read-only) |

### Role Definitions

- **Admin:** Full strategic control across all modules. Access restricted to users with the `admin` role.
- **Ops Staff (`staff` role):** Restricted to the Ops Panel and Delivery Panel. Handles day-to-day rental operations.
- **Delivery Driver (`driver` role):** Access to the Delivery Portal only. Can claim deliveries, perform handovers, and activate rentals at customer locations.
- **Finance (`finance` role):** Read access to billing, payments, deposits, and invoices. Can send payment requests and generate invoices.
- **Support (`support` role):** Access to the support ticket system. Can manage tickets and communicate with customers.
- **Cleaner (`cleaner` role):** Limited role for vehicle preparation tasks (future use).

---

## 4. Booking Lifecycle & State Machine

### Booking States

```
Draft → Pending → Confirmed → Active → Completed
                                    ↘ Cancelled (from any pre-active state)
                                       Voided (admin only, from any state)
```

| State | Description | Who Triggers | What's Locked |
|-------|-------------|-------------|---------------|
| **Draft** | Created at checkout, invisible to Ops. Awaiting Stripe payment authorization. | System (on checkout) | Nothing visible yet |
| **Pending** | Payment authorized. Visible to Ops. Awaiting staff review and prep. | System (on successful payment) | Vehicle category reserved |
| **Confirmed** | Staff has reviewed and accepted. Vehicle prep in progress. | Ops Staff | Pricing finalized (unless modified by Ops pre-active) |
| **Active** | Vehicle handed over, rental in progress. | Ops Staff or Delivery Driver | Core booking parameters locked (dates, vehicle, pricing). Only extensions allowed. |
| **Completed** | Vehicle returned, closeout done, deposit processed. | Ops Staff (after return workflow) | Everything locked. Read-only archive. |
| **Cancelled** | Booking cancelled before activation. | Customer (pre-pickup) or Admin | Deposit review triggered |
| **Voided** | Admin-only hard cancellation with mandatory reason (20+ chars) and audit trail. | Admin only | Triggers alert + audit log |

### Allowed State Transitions

| From | To | Triggered By | Conditions |
|------|----|-------------|------------|
| Draft | Pending | System | Stripe authorization succeeds |
| Pending | Confirmed | Ops Staff | Booking reviewed |
| Confirmed | Active | Ops/Driver | All handover prerequisites met (payment, agreement, walkaround, VIN assigned) |
| Active | Completed | Ops Staff | Return workflow completed (state = `closeout_done`). Admin bypass requires 50+ char justification. |
| Pending/Confirmed | Cancelled | Customer/Admin | Cancellation reason required |
| Any | Voided | Admin only | Reason selection + 20+ char notes + audit log |

### Notifications at Each Transition

| Transition | Customer Notification | Internal Notification |
|------------|----------------------|----------------------|
| → Pending | Booking confirmation email + SMS | — |
| → Confirmed | — | Ops queue updated |
| → Active | Handover SMS with booking details | Admin notification |
| → Completed | Final receipt email + deposit status | — |
| → Cancelled | Cancellation confirmation email | Admin alert (persistent dashboard notification) |
| → Voided | Void notification email | Audit log entry + admin alert |

---

## 5. Pricing & Calculation Rules

### Base Rental Rate

```
Vehicle Base Total = Daily Rate × Number of Rental Days
```

- **Minimum rental:** 1 day
- **Maximum rental:** 30 days
- Currency: **CAD** (Canadian Dollars), displayed as `$XX.XX CAD`
- Distance: **Unlimited kilometres** included

### Weekend Surcharge

- **Rate:** 15% surcharge on the vehicle base total
- **Applies when:** Pickup date falls on Friday, Saturday, or Sunday
- **Applied to:** Vehicle rental portion only (not add-ons or fees)

### Duration Discounts

| Duration | Discount | Applied To |
|----------|----------|------------|
| 7+ days | 10% off | Vehicle total (after weekend surcharge) |
| 21+ days | 20% off | Vehicle total (after weekend surcharge) |

### Regulatory Fees (Per Day)

| Fee | Amount | Description |
|-----|--------|-------------|
| PVRT | $1.50/day | Passenger Vehicle Rental Tax |
| ACSRCH | $1.00/day | Airport Concession/Surcharge |

### Taxes (British Columbia)

| Tax | Rate |
|-----|------|
| PST (Provincial Sales Tax) | 7% |
| GST (Goods and Services Tax) | 5% |
| **Combined** | **12%** |

Taxes apply to the **subtotal** (all charges before tax).

### Young Driver Surcharge

- **Fee:** $15 CAD (one-time)
- **Applies to:** Drivers aged 20–24
- **Minimum driver age:** 20
- **Maximum driver age:** 70

### Protection Plans

Rates are managed dynamically via admin settings. Default rates:

| Plan | Daily Rate | Deductible |
|------|-----------|------------|
| None | $0.00 | Full vehicle value |
| Basic | $33.99 | Up to $800 |
| Smart (Recommended) | $39.25 | $0 |
| All Inclusive | $49.77 | $0 |

**Protection Total = Protection Daily Rate × Rental Days**

**Conflict Rules:**
- "All Inclusive" is mutually exclusive with "Premium Roadside" add-on
- If All Inclusive is selected, Premium Roadside must be automatically disabled
- Rates with `original_rate > daily_rate` show strikethrough pricing with discount badge
- Empty rates in admin settings disable that protection tier

### Add-Ons

- Each add-on has either a **daily rate** or a **one-time fee**
- **No add-on is ever auto-selected** — all require explicit customer consent
- "Additional Driver" is never auto-added to a booking
- Maximum 10 add-ons per booking, maximum quantity 10 per add-on

### Delivery Fees

| Distance | Fee |
|----------|-----|
| 0–10 km | Free |
| 11–50 km | $49 CAD |
| > 50 km | Not available |

### Cancellation Fees

- **Before pickup time:** Free cancellation
- **After pickup time (no-show):** $19.99 CAD flat fee

### Late Return Fees

- **Grace period:** 30 minutes (no charge)
- **After grace:** $25 CAD per hour (rounded up to nearest hour)
- **Maximum:** 24 hours of late fees (then treated as additional rental day)
- **Alternative calculation:** 25% of daily rate per hour (used in return workflow)

### Mystery Car

- **Base fee:** $30 CAD
- Customer receives a random vehicle from available inventory

### Included with Every Booking

- Third-party insurance
- 24/7 Roadside Assistance Hotline
- Unlimited kilometres
- Extended Roadside Protection

### Pricing Formula

```
Vehicle Base Total        = Daily Rate × Days
Weekend Surcharge         = Vehicle Base Total × 15% (if Fri/Sat/Sun pickup)
Duration Discount         = (Vehicle Base + Weekend Surcharge) × Discount Rate
Vehicle Total             = Vehicle Base + Weekend Surcharge − Duration Discount

Protection Total          = Protection Daily Rate × Days
Add-Ons Total             = Sum of all selected add-ons
Delivery Fee              = Per distance tier
Young Driver Fee          = $15 (if age 20–24)
Daily Fees Total          = (PVRT $1.50 + ACSRCH $1.00) × Days
Late Fee                  = Calculated at return

Subtotal                  = Vehicle Total + Protection + Add-Ons + Delivery
                            + Young Driver Fee + Daily Fees + Late Fee

PST                       = Subtotal × 7%
GST                       = Subtotal × 5%
Tax Amount                = PST + GST

Total                     = Subtotal + Tax Amount
```

---

## 6. Payments, Holds, Capture & Refunds

### Payment Model

The platform uses a **Stripe-hosted Checkout redirect** for rental payments with **auto-capture**. Security deposits are handled separately.

### Payment Flow

1. **Checkout:** Customer is redirected to Stripe Checkout. Payment is auto-captured on success.
2. **Booking Promotion:** Successful payment promotes booking from `Draft` → `Pending`.
3. **Unpaid bookings** (`Draft` status) are invisible to Ops staff.

### Security Deposit Rules

| Rule | Detail |
|------|--------|
| **Default amount** | $350 CAD |
| **Minimum amount** | $350 CAD (business rule: deposit is ALWAYS required, never zero) |
| **Configurable by** | Admin only |
| **When placed** | At checkout (hold created on customer's card) |
| **When released** | Upon successful closeout with no damages |
| **Partial capture conditions** | Damage, late fees, fuel shortage, cleaning |
| **Approval required** | Ops evidence required before admin can capture for damages |

### Deposit Lifecycle

```
Hold Created → [Rental Active] → Closeout
                                    ├─ No damages → Auto-release full deposit
                                    ├─ Damages found → Admin alert for manual review
                                    └─ Cancelled → Admin alert for manual review
```

### Deposit Withholding (Partial Capture)

When staff partially withhold a deposit, they must provide:
- **Category** (Damage, Fuel, Late, Cleaning, Other)
- **Reason** (minimum 20 characters)

Severity-based auto-withhold on damage report creation:
- Minor damage: $100
- Moderate damage: $250
- Severe damage: $500

### Card Rules

- **Debit and prepaid cards are NOT accepted** — credit cards only
- Primary driver's name must match the cardholder name
- Only the last 4 digits of the card are stored (PCI compliance)
- Card on file is used for subsequent charges (late fees, fuel, damage)

### Failure Handling

| Scenario | Behavior |
|----------|----------|
| Authorization fails | Booking remains in Draft (invisible to Ops). Customer notified. |
| Capture fails | Admin alert created. Staff must follow up manually. |
| Expired authorization | Admin alert created. Staff sends new payment request via email link. |
| Insufficient funds (post-rental) | Outstanding balance tracked. Separate payment request sent via email. |
| Partial capture fails | Alert created with amount details. Manual resolution required. |

### Refunds

- Refunds are processed through the admin panel
- Cancellation refunds: full refund if before pickup, minus $19.99 fee if after pickup time
- Damage deposit: refund amount determined after incident case resolution

---

## 7. Ops Panel Business Workflows

### 7.1 Standard Pickup Flow (6 Steps)

#### Step 1: Customer Check-In
- Verify government photo ID
- Verify driver's license is on file and not expired
- Confirm name matches booking
- Verify age (minimum 21 for check-in; 20 allowed with young driver fee)
- **Ops staff can modify booking parameters at this step:** dates, times, duration, vehicle category, protection plan
- Modifications trigger automatic financial recalculation

#### Step 2: Payment & Deposit
- Verify rental payment received (auto-syncs if paid online)
- Collect or verify security deposit hold
- Deposit is manual/offline if not already held

#### Step 3: Rental Agreement
- Generate rental agreement document
- Customer signs agreement (in-person)
- Agreement is a single 8.5×11 page with structured layout
- Digital signatures embedded as PNG images

#### Step 4: Vehicle Walkaround
- **Staff-only** inspection (no customer signature required)
- **Mandatory recordings:** Fuel level and odometer reading (blocks completion until recorded)
- Inspection persisted as baseline for return comparison
- Fuel levels recorded in 1/8 increments (Empty, 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8, Full)

#### Step 5: Handover Photos
- Capture vehicle condition photos before handover
- Minimum photo requirement for evidence

#### Step 6: Handover & Activation
- **Prerequisites before activation:**
  - Payment must be collected (hard block — cannot override)
  - Vehicle unit (VIN) must be assigned
  - Agreement signed
  - Walkaround completed with fuel + odometer
- Hand over keys to customer
- Send handover SMS to customer
- Booking status transitions to **Active**
- Vehicle unit status transitions to **On Rent**

### 7.2 Return & Closeout Flow (5-Step State Machine)

The return process follows a **strict sequential state machine** — each step must be completed before the next can begin.

```
not_started → initiated → intake_done → evidence_done → issues_reviewed → closeout_done → deposit_processed
```

#### Step 1: Return Intake
- Record actual return time
- Record return odometer reading
  - **Hard block:** Return odometer < pickup odometer (prevents entry errors)
  - **Warning:** Jump > 5,000 km (flags for review but doesn't block)
- Record return fuel level (1/8 increments)
  - If return fuel < pickup fuel: **fuel gauge photo required**

#### Step 2: Evidence Capture
- Capture return condition photos
- Document vehicle state upon return

#### Step 3: Issues & Damages
- Review any flags or issues
- Report damages (mandatory photo uploads)
- Each damage report requires: severity, location on vehicle, description, photos
- **Creating a damage report automatically:**
  - Flags booking as exception (`return_is_exception = true`)
  - Adds exception reason
  - Inserts withhold entry in deposit ledger (severity-based amount)
  - Suspends financial closeout until incident resolved

#### Step 4: Closeout
- Review all charges (rental, add-ons, late fees, fuel shortage)
- Generate final invoice
- **Fuel shortage charge:** Calculated by comparing return vs. pickup fuel level using VIN-specific tank capacity and admin-configured fuel market rate
- **Late fee approval:** Staff must explicitly approve, override, or waive. Override requires minimum 10-character reason.
- Booking status → **Completed**
- Vehicle unit status → **Available**

**Workflow enforcement:** Active → Completed transition is **blocked** unless `return_state = closeout_done`. Admin bypass requires 50+ character justification and triggers an alert.

#### Step 5: Deposit Release
- **No open damages:** Auto-release full deposit + notify customer
- **Damages present:** Create admin alert for manual review
- **Partial withhold:** Requires category + reason (20+ chars)
- Consolidated email sent with receipt + deposit status after deposit decision finalized

### 7.3 Late Return Handling

1. System automatically flags bookings past their scheduled return time
2. **Grace period:** 30 minutes — no fee applied
3. **After grace:** Fee calculated at 25% of daily rate per hour (rounded up)
4. Late fee displayed in real-time on Ops dashboard and in support tickets
5. At closeout, staff must explicitly approve/override/waive the late fee
6. Any adjustment requires a mandatory reason (minimum 10 characters)

### 7.4 Vehicle Status Transitions

| From | To | Triggered By | Condition |
|------|----|-------------|-----------|
| Available | On Rent | System | Booking activated (handover complete) |
| On Rent | Available | System | Booking completed or cancelled |
| Available | Maintenance | Ops/Admin | Manual status change |
| Available | Damage | System | Damage report created |
| Maintenance | Available | Ops/Admin | Maintenance completed |
| Damage | Available | Admin | Damage case resolved |

**Deletion rules:**
- Vehicles with status "Available" or "Booked" **cannot** be deleted
- Vehicles with status "Maintenance" or "Inactive" **can** be deleted

### 7.5 Booking Modifications (Pre-Active)

Ops staff can modify from the Customer Check-In step:
- Pickup/return dates and times
- Rental duration
- Vehicle category (with live price impact calculation)
- Protection plan
- All modifications trigger automatic subtotal and tax recalculation

### 7.6 Rental Extensions (Active Bookings)

- Staff can extend the return date for active bookings
- Uses a dedicated modification panel
- Triggers automated pricing update and audit logging
- Full parameter edits are restricted once active to preserve contract integrity

---

## 8. Delivery Panel Business Workflows

### 8.1 Eligibility

- Maximum delivery distance: 50 km from branch
- Delivery fee: Free ≤10 km, $49 for 11–50 km
- Customer provides delivery address at checkout
- Available during operational hours only

### 8.2 Delivery Booking Lifecycle

Delivery bookings follow a **two-phase workflow** split between Ops and Delivery:

#### Phase 1: Pre-Dispatch (Ops Panel)

| Step | Description |
|------|-------------|
| **1. Customer Verification** | Verify ID, license, and contact details remotely |
| **2. Payment & Deposit** | Collect full payment and deposit hold before vehicle leaves depot |
| **3. Ready Line** | Prep checklist, photos (min 4), fuel/odometer recording, maintenance check, **lock pricing snapshot** |
| **4. Dispatch to Driver** | Assign driver, schedule delivery window, dispatch vehicle |
| **5. Ops Backup Activation** | Available only if driver cannot activate; requires delivery evidence (photos + ID check) + mandatory audit reason |

**Intake is auto-completed** for delivery bookings upon opening.

**Ready Line pricing lock:** Moving to "Ready for Dispatch" captures a `pricing_snapshot` that freezes protection, add-ons, and totals, preventing price drift during remaining phases.

#### Phase 2: On-Site (Delivery Portal)

| Step | Description |
|------|-------------|
| **1. Rental Agreement** | Customer signs agreement at delivery location |
| **2. Vehicle Walkaround** | Complete vehicle inspection with customer |
| **3. Handover Photos** | Capture final photos at delivery location |
| **4. Complete Delivery** | Hand over keys and activate rental |

### 8.3 Dispatch Readiness Validation

Before a vehicle can be dispatched, ALL of the following must be true:
1. ✅ Payment hold authorized (deposit status is authorized/hold_created/captured)
2. ✅ Vehicle unit (VIN) assigned
3. ✅ Minimum 4 pre-delivery condition photos uploaded

**Admin bypass** is available but creates an audit log and a `verification_pending` alert.

### 8.4 Delivery Status Tracking

```
Unassigned → Assigned → Picked Up → En Route → Arrived → Delivered
                                                          ↘ Issue
                                                          ↘ Cancelled
```

- **Arrived:** Tracks driver arrival at customer location
- Dispatching transitions booking context from Ops Panel to Delivery Portal

### 8.5 Proof Requirements

- **ID Check:** Driver verifies customer identity at delivery
- **Photos:** Handover photos captured at delivery location
- **Timestamps:** All status transitions are timestamped
- **GPS:** Driver location recorded at key transitions

### 8.6 Missed Delivery / No-Show

- If customer is not available at scheduled delivery time: booking flagged as issue
- Standard no-show cancellation fee ($19.99) may apply
- Vehicle returned to depot; booking requires manual resolution

---

## 9. Support & Disputes

### 9.1 Ticket System

- Tickets identified by code: **TKT-XXXXXX**
- **Statuses:** New → In Progress → Waiting Customer → Escalated → Closed
- **Categories:** Billing, Booking, Operations, Damage, Incident, Website Bug

### 9.2 Communication Rules

- **Strict separation** between public customer messages and private staff notes
- Staff replies default to **internal notes** (must explicitly choose to send to customer)
- If a customer replies to a closed ticket, it **automatically re-opens**
- Closing a ticket requires a **mandatory internal resolution note**

### 9.3 Auto-Generated Tickets

| Trigger | Ticket Type | Priority |
|---------|-------------|----------|
| Damage report created | Damage ticket | High |
| Incident/accident reported | Incident ticket | High |
| Customer dispute | Dispute ticket | Normal |

### 9.4 Support Actions on Bookings

Support staff can:
- View booking details and late fee estimates in ticket context
- Add notes to bookings
- Request cancellation or refund (requires admin approval)
- Escalate to admin

Support staff **cannot**:
- Directly modify booking parameters
- Process payments or refunds
- Override operational decisions

### 9.5 Dispute Resolution Flow

1. Customer raises dispute (via ticket or phone)
2. Support reviews evidence (photos, inspection records, audit logs)
3. If damage dispute: Ops provides walkaround photos + return photos as evidence
4. Escalation to admin if unresolved
5. Admin makes final decision on deposit capture/release
6. Customer notified of resolution
7. Ticket closed with mandatory resolution note

### 9.6 SLA Rules

- **Assumption:** Target first response within 2 business hours
- **Assumption:** Escalation threshold: 24 hours without response
- Macro system available for templated responses
- Dedicated analytics dashboard for ticket metrics

---

## 10. Admin Settings & Governance

### 10.1 Configurable Settings

| Setting | Default | Who Can Change |
|---------|---------|---------------|
| Security deposit amount | $350 CAD | Admin |
| Protection plan pricing (daily rates, deductibles, discount labels) | See Section 5 | Admin |
| Add-on pricing (daily rates, one-time fees) | Per add-on | Admin |
| Fuel market rate | $1.85/L | Admin |
| Late return fee rate | $25/hr | Admin |
| Late return grace period | 30 minutes | Admin |
| Cancellation fee | $19.99 | Admin |
| Young driver fee | $15 | Admin |
| Maximum rental duration | 30 days | Admin |
| Delivery radius | 50 km | Admin |
| PVRT daily fee | $1.50 | Admin |
| ACSRCH daily fee | $1.00 | Admin |
| Weekend surcharge rate | 15% | Admin |
| Duration discount thresholds | 7 days (10%), 21 days (20%) | Admin |

**Validation:** Admin panel prevents saving zero or empty rates for active pricing items.

### 10.2 Change Control

- **Settings changes apply to new bookings only** — existing bookings retain their original pricing
- Delivery bookings lock pricing via a `pricing_snapshot` at the Ready Line stage
- Protection plan rate changes are reflected immediately in search results and checkout for new bookings

### 10.3 User Role Management

- Admin Settings include a "User Roles" management panel
- Search users by email
- Assign/remove roles: admin, staff, cleaner, finance, support, driver
- Role assignments persist to the `user_roles` table
- Govern access across Admin, Ops, and Delivery portals

### 10.4 Audit Log Requirements

The following actions **must** be recorded in the audit log:

| Action | Details Captured |
|--------|-----------------|
| Booking status change | Who, when, from/to status, reason |
| Booking voided | Actor, reason, old data |
| Deposit released/captured/withheld | Actor, amount, reason, category |
| Vehicle unit assigned/unassigned | Actor, booking, unit |
| Vehicle status change | Actor, from/to status |
| Vehicle category/upgrade change | Actor, old/new category, price impact |
| Damage report created | Reporter, severity, estimated cost |
| Payment recorded | Amount, type, method |
| Rental extension | Actor, old/new dates, price change |
| Late fee override/waiver | Actor, original fee, new fee, reason |
| Settings changed | Actor, setting key, old/new value |
| Role assigned/removed | Actor, target user, role |
| Booking modification | Actor, fields changed, old/new values |
| Ops backup activation | Actor, reason, evidence provided |

---

## 11. Edge Cases & Exception Handling

### 11.1 Customer Cancels Before Pickup
- **Free cancellation** if before scheduled pickup time
- Deposit hold released automatically
- Cancellation confirmation email sent
- Vehicle status returns to Available

### 11.2 Customer Cancels After Pickup Time (No-Show)
- **$19.99 CAD** flat cancellation fee charged
- Deposit requires manual admin review (alert created)
- Admin decides on deposit release/capture

### 11.3 Vehicle Unavailable Last Minute
- Ops staff can modify booking to different vehicle category
- "Charge for this change" toggle allows staff discretion on price updates
- If no alternative available: booking cancelled with full refund
- Admin alert generated

### 11.4 Customer Wants Extension While Active
- Staff processes extension through dedicated modification panel
- Return date extended, pricing recalculated automatically
- Audit log captures old/new dates and price changes
- Full parameter edits blocked (only return date can be extended)

### 11.5 Early Return
- Customer may return vehicle before scheduled end date
- **No refund for unused days** (Assumption — see Open Questions)
- Actual return time recorded; closeout proceeds normally

### 11.6 Damage Reported During Rental (While Active)
- Customer or staff creates damage report
- Booking flagged as exception automatically
- Incident case opened if severe
- Financial closeout suspended until incident reviewed
- Deposit withhold entry created (severity-based amount)

### 11.7 Damage Reported at Return
- Documented during return Evidence Capture and Issues & Damages steps
- Photo evidence mandatory
- Deposit auto-withheld based on severity
- Final settlement suspended pending incident resolution
- High-priority support ticket auto-generated

### 11.8 Multiple Drivers
- Additional drivers added as booking add-on (explicit selection required)
- Each additional driver requires:
  - Name
  - Age band verification
  - Young driver fee if aged 20–24
- **Driver removal:** Allowed pre-active only

### 11.9 Add-On Selection Rules
- **No add-on should ever be forced** without explicit customer consent
- "Additional Driver" is never auto-added
- All add-ons default to OFF during selection
- All Inclusive protection disables Premium Roadside add-on automatically

### 11.10 Price Mismatch Prevention
- Single pricing function is the source of truth for all calculations
- Same formula used across search, checkout, booking details, and invoicing
- Delivery bookings lock pricing at Ready Line stage via snapshot
- Any modification triggers full recalculation using the central pricing engine
- Itemized receipts show every line item transparently

### 11.11 Customer Self-Return (Key Drop)
- Customer can mark vehicle as "returned" via their dashboard
- Available starting 30 minutes before scheduled return time
- Captures timestamp and GPS coordinates
- Does NOT complete the booking — staff must still perform return workflow
- Prevents location disputes

### 11.12 Odometer Validation at Return
- **Hard block:** Return reading < pickup reading (impossible, prevents data entry error)
- **Warning:** Jump > 5,000 km (flags for review but allows proceeding)

### 11.13 Fuel Shortage Charge
- Comparison: return fuel level vs. pickup fuel level
- If return < pickup: charge calculated as `(shortage % × tank capacity in liters) × fuel rate per liter`
- Fuel rate: admin-configured market rate with discount ($0.05 below market)
- Uses VIN-specific tank capacity when available, category default as fallback

---

## 12. KPIs & Operational Reporting

### Fleet Metrics
- **Utilization rate:** % of fleet on rent vs. available
- **Revenue per vehicle per day**
- **Maintenance cost per unit**
- **Damage rate:** % of rentals with damage reports
- **Total miles driven** per vehicle/category

### Booking Metrics
- **Conversion rate:** Searches → bookings
- **Cancellation rate:** Cancelled / total bookings
- **Late return rate:** % of bookings returned late
- **Average rental duration**
- **Bookings by source** (online, walk-in, delivery)

### Financial Metrics
- **Total revenue** (rental + add-ons + protection + fees)
- **Revenue breakdown:** By category (rental, protection, add-ons, delivery, fees, late charges)
- **Average booking value**
- **Deposit capture rate:** % of deposits partially/fully captured
- **Outstanding balances**

### Operational Metrics
- **Average time-to-closeout:** Time from return to completed
- **Delivery success rate:** Completed deliveries / total delivery orders
- **Average handover time**
- **Support ticket volume** and resolution time

### Customer Metrics
- **Repeat customer rate**
- **Abandoned cart rate** and recovery
- **Dispute rate:** % of bookings with disputes

---

## 13. Worked Pricing Examples

### Example 1: Normal 3-Day Booking (Weekday Pickup)

| Line Item | Calculation | Amount |
|-----------|-------------|--------|
| Vehicle rental | $65/day × 3 days | $195.00 |
| Weekend surcharge | N/A (weekday pickup) | $0.00 |
| Duration discount | N/A (< 7 days) | $0.00 |
| Smart Protection | $39.25/day × 3 days | $117.75 |
| PVRT | $1.50/day × 3 days | $4.50 |
| ACSRCH | $1.00/day × 3 days | $3.00 |
| Young driver fee | N/A (driver age 30) | $0.00 |
| **Subtotal** | | **$320.25** |
| PST (7%) | $320.25 × 0.07 | $22.42 |
| GST (5%) | $320.25 × 0.05 | $16.01 |
| **Total** | | **$358.68** |
| Security deposit (hold) | | $350.00 |

### Example 2: 5-Day Booking with Late Return (2 Hours Late)

| Line Item | Calculation | Amount |
|-----------|-------------|--------|
| Vehicle rental | $75/day × 5 days | $375.00 |
| Weekend surcharge | Pickup on Saturday: $375 × 15% | $56.25 |
| Duration discount | N/A (< 7 days) | $0.00 |
| Basic Protection | $33.99/day × 5 days | $169.95 |
| Child Seat add-on | $10/day × 5 days | $50.00 |
| PVRT | $1.50/day × 5 days | $7.50 |
| ACSRCH | $1.00/day × 5 days | $5.00 |
| Young driver fee | Driver age 22 | $15.00 |
| **Late return fee** | 2 hrs late (after 30-min grace): $75 × 25% × 2 | **$37.50** |
| **Subtotal** | | **$716.20** |
| PST (7%) | $716.20 × 0.07 | $50.13 |
| GST (5%) | $716.20 × 0.05 | $35.81 |
| **Total** | | **$802.14** |
| Security deposit (hold) | | $350.00 |

### Example 3: Damage + Deposit Capture (Ops Approval Required)

**Scenario:** 4-day rental, moderate damage discovered at return.

| Line Item | Calculation | Amount |
|-----------|-------------|--------|
| Vehicle rental | $85/day × 4 days | $340.00 |
| All Inclusive Protection | $49.77/day × 4 days | $199.08 |
| PVRT | $1.50/day × 4 days | $6.00 |
| ACSRCH | $1.00/day × 4 days | $4.00 |
| **Subtotal** | | **$549.08** |
| PST (7%) | $549.08 × 0.07 | $38.44 |
| GST (5%) | $549.08 × 0.05 | $27.45 |
| **Rental Total** | | **$614.97** |
| Security deposit (hold) | | $350.00 |

**At Return — Damage Discovery:**
1. Staff creates damage report: **Moderate severity**, bumper dent, estimated cost $400
2. System auto-withholds **$250** from deposit (moderate tier)
3. Booking flagged as exception
4. Admin alert created: "Deposit Requires Damage Review"
5. Admin reviews evidence (photos, damage report)
6. Admin approves capture of $250 from $350 deposit
7. Remaining $100 released to customer
8. Final invoice generated and emailed with deposit status

**Deposit Outcome:**
| Action | Amount |
|--------|--------|
| Original hold | $350.00 |
| Captured for damage | −$250.00 |
| Released to customer | $100.00 |

---

## 14. Assumptions

1. **A-1:** Early returns do not receive refunds for unused rental days.
2. **A-2:** SLA target for support first response is 2 business hours; escalation at 24 hours without response.
3. **A-3:** Cleaning buffer between rentals defaults to 2 hours per vehicle.
4. **A-4:** Reservation holds expire after approximately 10 minutes if not converted.
5. **A-5:** Fuel market rate ($1.85/L) and discount ($0.05 below market) are updated periodically by admin — no automated feed.
6. **A-6:** Mystery Car assignment is random from available inventory at the location.
7. **A-7:** The $19.99 no-show/cancellation fee is a flat fee regardless of booking value.
8. **A-8:** Debit/prepaid card rejection is enforced at checkout. Server-side BIN lookup may be needed for full detection (currently client-side pattern matching only).
9. **A-9:** All financial amounts are in Canadian Dollars (CAD).
10. **A-10:** Delivery is only available within the Lower Mainland service area.
11. **A-11:** Loyalty points system exists but specific earn/burn rules are not yet defined.
12. **A-12:** Blackout dates are not currently enforced but listed as configurable.
13. **A-13:** The "Bring Car to Me" delivery feature operates during standard business hours only.

---

## 15. Open Questions

1. **OQ-1:** Should early returns receive a partial refund for unused days, or is the full rental amount non-refundable?
2. **OQ-2:** What are the specific SLA targets for support response times? Are they different by ticket category or priority?
3. **OQ-3:** Should the fuel market rate be updated via an external feed, or is manual admin update sufficient?
4. **OQ-4:** What are the exact loyalty/points earn and redemption rules?
5. **OQ-5:** Are there blackout dates or seasonal pricing adjustments planned?
6. **OQ-6:** Should debit card detection use a server-side BIN database for more accurate rejection, or is client-side detection sufficient?
7. **OQ-7:** What is the exact cancellation fee for delivery no-shows vs. standard no-shows? Is it the same $19.99?
8. **OQ-8:** Is there a maximum number of rental extensions allowed for a single booking?
9. **OQ-9:** Should there be a maximum total damage capture from deposits, or can the full $350 be captured?
10. **OQ-10:** Are there specific insurance requirements or third-party integrations planned for incident/claims management?
11. **OQ-11:** Should the 25% of daily rate per hour late fee calculation be used, or the flat $25/hr rate? Both exist in the system. Which takes precedence?
12. **OQ-12:** What happens if a customer's card expires during an active rental? Is there a process to request updated card details?
13. **OQ-13:** Are there plans for corporate/fleet accounts with negotiated rates?
14. **OQ-14:** What is the process for handling vehicles that are totaled in an accident?
