# C2C Rental — Business Logic Design Document

> **Version:** 2.0  
> **Last Updated:** February 2026  
> **Audience:** Business stakeholders, product managers, operations leads  
> **Scope:** Business rules, workflows, calculations, panel options, and policies only — no engineering or implementation details.

---

## Table of Contents

1. [Goal & Scope](#1-goal--scope)
2. [Core Entities & Definitions](#2-core-entities--definitions)
3. [Roles & Permissions](#3-roles--permissions)
4. [Platform Panels — Complete Option Reference](#4-platform-panels--complete-option-reference)
5. [Booking Lifecycle & State Machine](#5-booking-lifecycle--state-machine)
6. [Pricing & Calculation Rules](#6-pricing--calculation-rules)
7. [Payments & Refunds](#7-payments--refunds)
8. [Ops Panel — Pickup Workflow (Step-by-Step)](#8-ops-panel--pickup-workflow-step-by-step)
9. [Ops Panel — Return Workflow (Step-by-Step)](#9-ops-panel--return-workflow-step-by-step)
10. [Delivery Panel — Delivery Workflow (Step-by-Step)](#10-delivery-panel--delivery-workflow-step-by-step)
11. [Support Panel — Ticket Workflow (Step-by-Step)](#11-support-panel--ticket-workflow-step-by-step)
12. [Admin Settings & Governance](#12-admin-settings--governance)
13. [Edge Cases & Exception Handling](#13-edge-cases--exception-handling)
14. [KPIs & Operational Reporting](#14-kpis--operational-reporting)
15. [Worked Pricing Examples](#15-worked-pricing-examples)
16. [Assumptions](#16-assumptions)

---

## 1. Goal & Scope

### What Problems the Platform Solves

C2C Rental (c4r.ca) is a **car rental platform** serving the Lower Mainland of British Columbia (Surrey, Langley, Abbotsford). It provides:

- **For customers:** An online booking flow to search, select, and reserve rental vehicles with transparent pricing, protection plans, and optional delivery service.
- **For operations staff:** A centralized Ops Panel to manage the full rental lifecycle — from customer check-in through vehicle handover to return and closeout.
- **For delivery drivers:** A dedicated Delivery Portal to manage vehicle deliveries to customer locations.
- **For administrators:** A strategic dashboard covering fleet management, billing, incident tracking, reporting, and platform configuration.
- **For support agents:** A dedicated Support Panel for ticket-based customer communications and dispute resolution.

### Who Uses It

| Role | Panel | Description |
|------|-------|-------------|
| **Customer** | Customer Portal | Browse vehicles, book rentals, manage bookings, view receipts, mark returns |
| **Ops Staff** | Ops Panel | Handle day-to-day rental operations: check-in, handover, returns, vehicle prep |
| **Delivery Driver** | Delivery Portal | Execute vehicle deliveries: walkaround, agreement signing, handover at customer location |
| **Admin** | Admin Dashboard | Strategic oversight: fleet, billing, incidents, reports, user management, settings |
| **Finance** | Admin Dashboard (Billing module) | Payment tracking, deposit management, invoice generation, revenue reporting |
| **Support** | Support Panel | Customer ticket management, communications, dispute resolution, macro-based replies |

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
A reservation tying a customer to a vehicle category at a location for a date range. Key attributes: booking code (C2CXXXXXX), status, daily rate, total amount, protection plan, add-ons, driver age band, notes, and delivery address (if applicable).

### Reservation Hold
A temporary lock (approximately 10 minutes) placed on a vehicle during checkout to prevent double-booking. Expires automatically if not converted to a booking.

### Payment
A Stripe-processed payment captured at checkout via Stripe-hosted Checkout redirect. The payment is **auto-captured** — there is no separate authorization/capture step. The booking is created in Draft status and promoted to Pending only upon successful payment.

### Security Deposit
A **separate charge** of **$350 CAD** (minimum, admin-configurable). Deposits are handled independently from the rental payment — staff may collect deposits via separate payment request links sent to the customer or in-person at the counter. Deposits are not authorization holds.

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
A customer service case (TKT-XXXXXX) with status tracking, category classification, priority levels, and strict separation between public messages and private staff notes.

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

| Object / Action | Customer | Ops Staff | Delivery Driver | Admin | Finance | Support |
|-----------------|----------|-----------|-----------------|-------|---------|---------|
| **Bookings** | | | | | | |
| View own bookings | ✅ | — | — | — | — | — |
| View all bookings | — | ✅ | Own deliveries only | ✅ | ✅ (read-only) | ✅ (via ticket context) |
| Create booking | ✅ (online) | — | — | ✅ (walk-in) | — | — |
| Modify booking (dates/vehicle/protection) | — | ✅ (pre-active only) | — | ✅ | — | — |
| Extend active rental | — | ✅ | — | ✅ | — | — |
| Cancel booking | ✅ (pre-pickup) | ✅ | — | ✅ | — | — |
| Void booking | — | — | — | ✅ (with reason + audit) | — | — |
| Activate rental | — | ✅ | ✅ (at delivery) | ✅ | — | — |
| Complete rental (return) | — | ✅ | — | ✅ | — | — |
| **Payments** | | | | | | |
| View payment history | Own only | ✅ | — | ✅ | ✅ | — |
| Send payment request link | — | — | — | ✅ | ✅ | — |
| **Deposits** | | | | | | |
| View deposit status | Own only | ✅ | — | ✅ | ✅ | — |
| Release deposit | — | — | — | ✅ | ✅ | — |
| Capture deposit (damage/fees) | — | — | — | ✅ (requires Ops evidence) | — | — |
| Withhold deposit (partial) | — | ✅ (with category + reason) | — | ✅ | — | — |
| **Damage Reports** | | | | | | |
| Create damage report | — | ✅ | ✅ | ✅ | — | — |
| Review/approve damage | — | — | — | ✅ | — | — |
| **Invoices** | | | | | | |
| View invoice | Own only | ✅ | — | ✅ | ✅ | — |
| Generate final invoice | — | — | — | ✅ | ✅ | — |
| **Vehicles** | | | | | | |
| View fleet | — | ✅ (own location) | — | ✅ | — | — |
| Assign/unassign VIN | — | ✅ | — | ✅ | — | — |
| Change vehicle status | — | ✅ | — | ✅ | — | — |
| Create/edit categories | — | — | — | ✅ | — | — |
| **Support Tickets** | | | | | | |
| Create ticket | ✅ | ✅ | — | ✅ | — | ✅ |
| Reply (public to customer) | ✅ | — | — | ✅ | — | ✅ |
| Add internal note | — | ✅ | — | ✅ | ✅ | ✅ |
| Close ticket | — | — | — | ✅ | — | ✅ |
| Escalate ticket | — | — | — | ✅ | — | ✅ |
| **Settings** | | | | | | |
| Manage pricing/fees | — | — | — | ✅ | — | — |
| Manage user roles | — | — | — | ✅ | — | — |
| View audit logs | — | — | — | ✅ | ✅ (read-only) | — |

### Role Definitions

- **Admin:** Full strategic control across all modules. Access restricted to users with the `admin` role.
- **Ops Staff (`staff` role):** Restricted to the Ops Panel and Delivery Panel. Handles day-to-day rental operations.
- **Delivery Driver (`driver` role):** Access to the Delivery Portal only. Can view assigned deliveries, perform handovers, and activate rentals at customer locations. **Cannot self-claim unassigned tasks** — assignment is done by Ops staff only.
- **Finance (`finance` role):** Read access to billing, payments, deposits, and invoices. Can send payment requests and generate invoices.
- **Support (`support` role):** Access to the Support Panel. Can manage tickets, communicate with customers, and escalate issues.
- **Cleaner (`cleaner` role):** Limited role for vehicle preparation tasks (future use).

---

## 4. Platform Panels — Complete Option Reference

### 4.1 Admin Dashboard (`/admin`)

The Admin Dashboard is the strategic management console. It contains the following sidebar navigation options:

| Menu Item | Route | What It Does |
|-----------|-------|--------------|
| **Alerts** | `/admin/alerts` | Shows action-required notifications: pending verifications, new bookings, cancellations, damage reports, overdue returns. Badge shows unread count. |
| **Dashboard** | `/admin` | Overview page with key stats (New bookings in 24h, Active rentals, Today's pickups, Today's returns, Pending alerts). Contains quick links, a "Walk-In Booking" button, and a "How to Use" guide tab. |
| **Bookings** | `/admin/bookings` | Read-only list of all reservations with search and filter by status. Clicking a booking opens detail view with financial summary, timeline, and an "Open in Operations" button for actionable bookings. |
| **Fleet** | `/admin/fleet` | Vehicle category management: create/edit categories, manage daily rates, images, specs. Sub-tabs: Overview, By Category, By Vehicle, Category Management, Utilization, Performance Comparison, Competitor Pricing, Cost Tracking. |
| **Incidents** | `/admin/incidents` | High-level incident summary dashboard: open cases, major severity counts, linked support tickets. Each incident links to its ticket in the Support Panel for operational handling. |
| **Fleet Costs** | `/admin/fleet-costs` | Vehicle-level cost tracking: maintenance costs, depreciation, cost-per-mile, lifecycle summaries. |
| **Fleet Analytics** | `/admin/fleet-analytics` | Utilization rates, revenue-per-vehicle, profitability analysis across categories and time periods. |
| **Analytics** | `/admin/reports` | Business metrics and reports: revenue analytics, conversion funnels, booking trends, financial dashboards. |
| **Calendar** | `/admin/calendar` | Visual schedule view of all bookings on a timeline. Shows pickup/return dates across locations. |
| **Billing** | `/admin/billing` | Financial records with tabs: **Receipts** (generate/view receipts), **Payments** (all transactions with status), **Deposits** (security deposit records and "Process Return" action). Badge shows pending items. |
| **Support** | `/admin/tickets` | Quick access to the Support Panel from the Admin sidebar. Links to the ticket management interface. Badge shows open ticket count. |
| **Offers** | `/admin/offers` | Points-based rewards and loyalty program management. |
| **Settings** | `/admin/settings` | Platform configuration (see Section 12 for full details). |

**Top Bar Features:**
- **Search bar:** Search bookings by code (auto-uppercased)
- **Date filter:** Today / Next 24h / This Week / All Time
- **User menu:** Settings link, Sign Out
- **Panel switch:** "Ops Panel" link (visible if user has ops access)

**Dashboard "How to Use" Guide** contains 4 sections:
1. Section 1 — Customer Booking Guide (how customers book)
2. Section 2 — Admin/Ops Full Workflow (incoming booking → confirmation → operations → pickups → active rentals → returns → billing)
3. Section 3 — Status Glossary (what each menu item represents)
4. Section 4 — Important Notes (deposit amount, ID verification, agreement signing)

### 4.2 Ops Panel (`/ops`)

The Ops Panel is the day-to-day operational console for staff handling rentals. It contains:

| Menu Item | Route | What It Does |
|-----------|-------|--------------|
| **Workboard** | `/ops` | Real-time operational dashboard: today's pickups, expected returns (including overdue), active rentals, and urgent alerts. Includes a universal search bar for finding bookings by code, customer name, email, or phone number. |
| **All Bookings** | `/ops/bookings` | Searchable list of all reservations. Filter by status, location, date. Clicking a booking opens the full-screen operational workflow wizard. |
| **Pickups** | `/ops/pickups` | Upcoming handovers. Defaults to "All" filter, includes both `pending` and `confirmed` bookings. Time buckets: Today / Tomorrow / This Week / Later. Cards show full dates, times, vehicle names, delivery vs. counter indicators. |
| **Active Rentals** | `/ops/active` | Currently on-road vehicles. Shows remaining time, consumed time, rental details. Click to open detail panel where staff can flag issues, contact customer, SMS customer, initiate return. |
| **Returns** | `/ops/returns` | Incoming returns. Opens the Return Console — a 5-step sequential workflow (see Section 9). |
| **Fleet Status** | `/ops/fleet` | Vehicle availability overview by location. Shows unit statuses (Available, On Rent, Maintenance, Damage). |

**Top Bar Features:**
- **Quick Search:** Search by booking code (auto-navigates to handover), customer name, or phone
- **Location Filter:** All queues support location filtering (Surrey, Langley, Abbotsford) via a shared OpsLocationFilter component
- **User menu:** Sign Out

**All Ops queues** support filtering by location via URL parameters, ensuring staff can scope operations to a single branch.

### 4.3 Support Panel (`/support`)

The Support Panel is a dedicated hub for customer communications and ticket management, separate from the Admin Dashboard.

| Menu Item | Route | What It Does |
|-----------|-------|--------------|
| **Tickets** | `/support` | Main ticket management interface. List of all tickets with search, category filter, priority filter. Click a ticket to open detail sheet with conversation thread, customer info, booking context card, and action buttons. |
| **Analytics** | `/support/analytics` | Support performance metrics: ticket volume, resolution times, agent performance, category breakdown. |

**Sidebar Queue Filters:**
- **New** — Unassigned/unworked tickets
- **In Progress** — Actively being handled
- **Waiting** — Waiting on customer response
- **Escalated** — Elevated priority tickets
- **Urgent** — Flagged as urgent across all statuses

**Ticket Detail Sheet Actions:**
- Assign to me (auto-moves from New → In Progress)
- Reply as customer-visible message or internal note (defaults to internal note)
- Change status (New, In Progress, Waiting Customer, Escalated, Closed)
- Escalate (requires escalation note)
- Close (requires mandatory resolution note)
- Insert macro (templated response with variable substitution: `{customer_name}`, `{booking_code}`)
- View linked booking summary card (status, dates, vehicle, location, late fee estimate)

**Creating a New Ticket requires:**
- Subject, description, category, priority
- Optional: urgent flag, guest email/phone/name
- Optional: link to booking or incident

**Top Bar Features:**
- Open ticket count badge
- Admin Dashboard link (if user has admin access)
- User menu with logout

### 4.4 Delivery Portal (`/delivery`)

The Delivery Portal is for drivers executing vehicle deliveries at customer locations.

| Menu Item | Route | What It Does |
|-----------|-------|--------------|
| **Dashboard** | `/delivery` | Shows deliveries assigned to the logged-in driver, filtered by portal status tabs: Pending, Active, Completed, Issue. Admin/staff see all deliveries. |
| **Delivery Detail** | `/delivery/:bookingId` | Full delivery execution workflow with step-by-step handover checklist. |

**Dashboard Tabs:**
- **Pending** — Assigned but not yet picked up/en route
- **Active** — Currently being delivered (en route, arrived)
- **Completed** — Successfully delivered and activated
- **Issue** — Deliveries with problems

**Key Restriction:** Drivers cannot self-claim tasks from a pool. All driver assignment is done exclusively by Ops staff in the Operations panel.

### 4.5 Customer Portal (Public Website)

The customer-facing website includes:

| Page | Route | What It Does |
|------|-------|--------------|
| **Home** | `/` | Landing page with search widget, featured vehicles, value propositions |
| **Search** | `/search` | Vehicle browsing with date/location filters, category cards, pricing display |
| **Locations** | `/locations` | All branch locations with addresses, hours, maps |
| **Location Detail** | `/location/:id` | Individual location page with details and available vehicles |
| **Protection** | `/protection` | Protection plan comparison page |
| **Add-Ons** | `/addons` | Add-on extras listing |
| **Checkout** | `/checkout` | Booking checkout: driver info, add-on selection, protection selection, pricing breakdown, payment via Stripe redirect |
| **My Bookings** | `/dashboard` | Customer booking management: view bookings, mark returns, view receipts |
| **About / Contact** | `/about`, `/contact` | Company info and contact form |
| **Auth** | `/auth` | Login/signup/forgot password |

---

## 5. Booking Lifecycle & State Machine

### Booking States

```
Draft → Pending → Confirmed → Active → Completed
                                    ↘ Cancelled (from any pre-active state)
                                       Voided (admin only, from any state)
```

| State | Description | Who Triggers | What's Locked |
|-------|-------------|-------------|---------------|
| **Draft** | Created at checkout, invisible to Ops. Awaiting Stripe payment. | System (on checkout) | Nothing visible yet |
| **Pending** | Payment captured successfully. Visible to Ops. Awaiting staff review and prep. | System (on successful Stripe webhook) | Vehicle category reserved |
| **Confirmed** | Staff has reviewed and accepted. Vehicle prep in progress. | Ops Staff | Pricing finalized (unless modified by Ops pre-active) |
| **Active** | Vehicle handed over, rental in progress. | Ops Staff or Delivery Driver | Core booking parameters locked (dates, vehicle, pricing). Only extensions allowed. |
| **Completed** | Vehicle returned, closeout done, deposit processed. | Ops Staff (after return workflow) | Everything locked. Read-only archive. |
| **Cancelled** | Booking cancelled before activation. | Customer (pre-pickup) or Admin | Deposit review triggered |
| **Voided** | Admin-only hard cancellation with mandatory reason (20+ chars) and audit trail. | Admin only | Triggers alert + audit log |

### Allowed State Transitions

| From | To | Triggered By | Conditions |
|------|----|-------------|------------|
| Draft | Pending | System | Stripe payment succeeds (webhook confirmation) |
| Pending | Confirmed | Ops Staff | Booking reviewed |
| Confirmed | Active | Ops/Driver | All handover prerequisites met (payment, agreement, walkaround, VIN assigned) |
| Active | Completed | Ops Staff | Return workflow completed (state = `closeout_done`). Admin bypass requires 50+ char justification + triggers alert. |
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

## 6. Pricing & Calculation Rules

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
- **After grace:** 25% of daily rate per hour (rounded up to nearest hour)
- **Maximum:** 24 hours of late fees (then treated as additional rental day)

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

## 7. Payments & Refunds

### Payment Model

The platform uses a **Stripe-hosted Checkout redirect** for rental payments with **auto-capture**. There are **no authorization holds** — payments are captured immediately upon successful checkout.

### Payment Flow

1. **Checkout:** Customer is redirected to Stripe Checkout. Payment is **auto-captured** on success.
2. **Booking Promotion:** Successful payment promotes booking from `Draft` → `Pending` via Stripe webhook.
3. **Unpaid bookings** (`Draft` status) are invisible to Ops staff and do not appear in any operational queue.
4. If Stripe session initialization fails, the temporary booking and add-ons are automatically cleaned up to prevent ghost records.

### Security Deposit Rules

| Rule | Detail |
|------|--------|
| **Default amount** | $350 CAD |
| **Minimum amount** | $350 CAD (business rule: deposit is ALWAYS required, never zero) |
| **Configurable by** | Admin only |
| **How collected** | Separately from rental payment — via payment request link sent to customer or collected in-person at counter |
| **When released** | Upon successful closeout with no damages |
| **Partial capture conditions** | Damage, late fees, fuel shortage, cleaning |
| **Approval required** | Ops evidence required before admin can capture for damages |

> **Important:** The platform does **NOT** use Stripe authorization holds for deposits. Deposits are collected as separate payments. Staff can send a payment request link via email for the customer to pay the deposit remotely.

### Deposit Lifecycle

```
Deposit Requested → Deposit Collected → [Rental Active] → Closeout
                                                            ├─ No damages → Release full deposit
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

### Failure Handling

| Scenario | Behavior |
|----------|----------|
| Stripe payment fails at checkout | Booking remains in Draft (invisible to Ops). Temporary booking auto-cleaned. Customer notified. |
| Payment link fails | Staff re-sends payment request via email. |
| Insufficient funds (post-rental) | Outstanding balance tracked. Separate payment request sent via email link. |
| Customer card expired during rental | Staff sends new payment request link for updated card. |

### Refunds

- Refunds are processed through the admin panel
- Cancellation refunds: full refund if before pickup, minus $19.99 fee if after pickup time
- Damage deposit: refund amount determined after incident case resolution

---

## 8. Ops Panel — Pickup Workflow (Step-by-Step)

The pickup workflow is a **6-step process** accessed from the Ops Panel. Staff can navigate freely between steps (non-linear), but certain critical items block activation.

### Step 1: Customer Check-In

**Purpose:** Verify customer identity and eligibility.

**Actions:**
- Verify government photo ID (checkbox: Gov ID Verified)
- Verify driver's license is on file and not expired (checkbox with expiry date input)
- Confirm name on ID matches the booking name (checkbox: Name Matches)
- Verify age: minimum 21 for standard check-in; 20 allowed with young driver fee (auto-calculated from DOB)
- **Staff can re-edit verification details after check-in is marked complete** (unlockable for corrections)

**Available at this step (counter operations):**
- **Edit Booking Details:** Modify pickup/return dates, times, rental duration. Triggers automatic financial recalculation.
- **Change Vehicle Category:** Select a different category with live price impact calculation. "Charge for this change" toggle allows staff discretion on whether to update pricing.
- **Assign/Change VIN:** Two-step flow — (1) select category, (2) assign specific VIN from available units at the location.
- **Change Protection Plan:** Switch between None, Basic, Smart, All Inclusive with automatic pricing update.
- **Counter Upsell:** Offer add-ons available for the rental duration.

**Completion criteria:** All 5 checkboxes verified (Gov ID, License on file, Name matches, License not expired, Age verified).

### Step 2: Payment & Deposit

**Purpose:** Confirm payment and deposit status.

**Actions:**
- Verify rental payment received (auto-syncs if paid online via Stripe)
- Verify or collect security deposit
- If deposit not yet collected: staff sends payment request link or collects in-person

**Completion criteria:** Payment complete AND deposit collected.

### Step 3: Rental Agreement

**Purpose:** Formalize the rental contract.

**Actions:**
- Generate rental agreement document (single 8.5×11 page)
- Customer signs agreement in-person
- Digital signature captured and embedded as PNG image
- Mark agreement as signed

**Completion criteria:** Agreement marked as signed.

### Step 4: Vehicle Walkaround

**Purpose:** Record baseline vehicle condition for comparison at return.

**Actions:**
- **Staff-only** inspection (no customer signature required)
- **Mandatory:** Record fuel level (1/8 increments: Empty, 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8, Full)
- **Mandatory:** Record odometer reading
- Complete inspection checklist
- **Blocks step completion until fuel AND odometer are recorded**

**Completion criteria:** Inspection complete, fuel level recorded, odometer recorded.

### Step 5: Handover Photos

**Purpose:** Capture photographic evidence of vehicle condition before handover.

**Actions:**
- Upload vehicle condition photos (exterior and interior)
- Tag photos by type (front, rear, left, right, interior, etc.)
- Add optional notes per photo

**Completion criteria:** Minimum photo count met.

### Step 6: Handover & Activation

**Purpose:** Complete the handover and start the rental.

**Prerequisites (hard blocks — cannot proceed without these):**
- ✅ Payment collected (hard block — cannot override)
- ✅ Vehicle unit (VIN) assigned
- ✅ Agreement signed
- ✅ Walkaround completed with fuel + odometer

**Actions:**
- Hand over keys to customer
- Send handover SMS to customer with booking details
- Activate rental → booking status transitions to **Active**
- Vehicle unit status transitions to **On Rent**

**Also available at handover step (Quick Actions):**
- Change vehicle (UnifiedVehicleManager)
- Edit booking details

---

## 9. Ops Panel — Return Workflow (Step-by-Step)

The return process follows a **strict sequential state machine** — each step MUST be completed before the next can begin. Steps are locked until their prerequisite is met.

### State Machine

```
not_started → initiated → intake_done → evidence_done → issues_reviewed → closeout_done → deposit_processed
```

| Current State | Next State | What Must Happen |
|---------------|------------|-----------------|
| not_started | initiated | Return opened (auto-initiates) |
| initiated | intake_done | Step 1 completed |
| intake_done | evidence_done | Step 2 completed |
| evidence_done | issues_reviewed | Step 3 completed |
| issues_reviewed | closeout_done | Step 4 completed |
| closeout_done | deposit_processed | Step 5 completed |

### Step 1: Return Intake

**Purpose:** Record the vehicle's return condition baseline.

**Actions:**
- Record actual return time
- Record return odometer reading
  - **Hard block:** Return odometer < pickup odometer → entry rejected (prevents data errors)
  - **Warning (non-blocking):** Jump > 5,000 km → flagged for review
- Record return fuel level (1/8 increments)
  - If return fuel < pickup fuel → **fuel gauge photo required**

**Completion criteria:** Odometer reading recorded.

**Unlocks:** Step 2 (Evidence Capture).

### Step 2: Evidence Capture

**Purpose:** Photograph the vehicle's return condition.

**Actions:**
- Capture return condition photos (minimum 4 for exception returns)
- Document vehicle state upon return

**For normal returns:** Photos are optional but recommended.
**For exception returns (damage/incidents):** Minimum 4 photos required.

**Completion criteria:** Photos complete (or marked as N/A for normal returns).

**Unlocks:** Step 3 (Issues & Damages).

### Step 3: Issues & Damages

**Purpose:** Review issues and document any damages.

**Actions:**
- Review any flags or issues
- Report damages (each requires: severity, location on vehicle, description, mandatory photo uploads)
- Report incidents (opens the Create Incident dialog: incident type, severity, description, vehicle info)
- Approve/override/waive late fees (if applicable)
  - Late fee override requires minimum 10-character reason
  - Late fee displayed in real-time with calculated amount
- Mark issues as reviewed

**Creating a damage report automatically:**
- Flags booking as exception (`return_is_exception = true`)
- Adds exception reason
- Inserts withhold entry in deposit ledger (severity-based amount)
- Suspends financial closeout until incident resolved
- Generates a high-priority support ticket

**Creating an incident from this step automatically:**
- Links to booking and vehicle
- Generates a high-priority support ticket

**Completion criteria:** Issues reviewed and marked complete.

**Unlocks:** Step 4 (Closeout).

### Step 4: Closeout

**Purpose:** Finalize charges and complete the rental.

**Actions:**
- Review all charges: rental, add-ons, late fees, fuel shortage
- **Fuel shortage charge** calculated: `(shortage % × tank capacity in liters) × fuel rate per liter`
  - Uses VIN-specific tank capacity when available, category default as fallback
  - Fuel rate: admin-configured market rate minus $0.05 discount
- Generate final invoice
- Complete the return → booking status transitions to **Completed**
- Vehicle unit status transitions to **Available**

**Workflow enforcement:** Active → Completed is **blocked** unless return state = `closeout_done`. Admin bypass requires 50+ character justification and triggers an alert.

**Completion criteria:** Return completed.

**Unlocks:** Step 5 (Deposit Release).

### Step 5: Deposit Release

**Purpose:** Process the security deposit.

**Actions:**
- **No open damages:** Release full deposit + notify customer
- **Damages present:** Create admin alert for manual review
- **Partial withhold:** Requires category (Damage, Fuel, Late, Cleaning, Other) + reason (20+ chars)
- Consolidated email sent to customer with receipt + deposit status after deposit decision finalized

**Completion criteria:** Deposit processed (released, withheld, or captured).

**After completion:** Staff redirected to Returns queue.

### Late Return Handling (within Return Workflow)

1. System automatically flags bookings past their scheduled return time
2. **Grace period:** 30 minutes — no fee applied
3. **After grace:** Fee calculated at 25% of daily rate per hour (rounded up)
4. Late fee displayed in real-time on the Ops dashboard and in linked support tickets
5. At closeout (Step 3), staff must explicitly approve/override/waive the late fee
6. Any adjustment requires a mandatory reason (minimum 10 characters)
7. This is a prerequisite for completing the return — late fee must be addressed

---

## 10. Delivery Panel — Delivery Workflow (Step-by-Step)

Delivery bookings follow a **two-phase workflow** split between the Ops Panel and Delivery Portal.

### Phase 1: Pre-Dispatch (Ops Panel — 5 Steps)

Staff in the Ops Panel prepare and dispatch the vehicle.

#### Step 1: Customer Verification (auto-completed for deliveries)
- Intake is auto-completed upon opening a delivery booking
- Staff start at customer verification

#### Step 2: Payment & Deposit
- Collect full payment and deposit before vehicle leaves the depot
- Verify payment received (auto-syncs if online)
- Collect deposit via payment link or in-person

#### Step 3: Ready Line
- Complete prep checklist (vehicle readiness, cleanliness)
- Capture minimum 4 pre-delivery condition photos
- Record fuel level
- Record odometer reading
- Maintenance check
- **Lock pricing snapshot** — freezes protection, add-ons, and totals to prevent price drift during delivery
- Assign VIN to booking

**Completion criteria:** Unit assigned, checklist complete, photos complete (min 4), fuel recorded, odometer recorded, pricing locked.

#### Step 4: Dispatch to Driver
- Assign driver from available delivery staff (**Ops-only — drivers cannot self-claim**)
- Set delivery window (start/end times)
- Dispatch vehicle

**Blocking rule:** Driver must be assigned before dispatch.

**Dispatch readiness validation — ALL must be true:**
1. ✅ Payment collected
2. ✅ Vehicle unit (VIN) assigned
3. ✅ Minimum 4 pre-delivery condition photos uploaded

#### Step 5: Ops Backup Activation
- Available **only** if the delivery driver cannot activate the rental on-site
- Requires: delivery evidence (photos + ID check) + mandatory audit reason
- Creates audit log entry for backup activation

### Phase 2: On-Site (Delivery Portal — 4 Steps)

The delivery driver performs these steps at the customer's location.

#### Step 1: Rental Agreement
- Customer signs rental agreement at the delivery location
- Digital signature captured

#### Step 2: Vehicle Walkaround
- Complete vehicle inspection with customer present
- Record fuel level and odometer

#### Step 3: Handover Photos
- Capture handover photos at the delivery location
- Document vehicle condition at time of delivery

#### Step 4: Complete Delivery
- Hand over keys to customer
- Activate rental → booking status transitions to **Active**
- Vehicle unit status transitions to **On Rent**

### Delivery Status Tracking

```
Unassigned → Assigned → Picked Up → En Route → Arrived → Delivered
                                                          ↘ Issue
                                                          ↘ Cancelled
```

- **Arrived:** Tracks driver arrival at customer location (timestamps driver arrival)
- Dispatching transitions booking context from Ops Panel to Delivery Portal
- All status transitions are timestamped with GPS coordinates

### Missed Delivery / No-Show
- If customer is not available at scheduled delivery time: booking flagged as "Issue"
- Standard no-show cancellation fee ($19.99) may apply
- Vehicle returned to depot; booking requires manual resolution

---

## 11. Support Panel — Ticket Workflow (Step-by-Step)

### 11.1 Ticket Lifecycle

```
New → In Progress → Waiting Customer → Escalated → Closed
                                ↗ (auto re-opens if customer replies)
```

| Status | Description | Who Can Set |
|--------|-------------|-------------|
| **New** | Ticket created, unassigned | System (auto) |
| **In Progress** | Agent assigned and working | Support/Admin (auto on assign) |
| **Waiting Customer** | Awaiting customer response | Support/Admin |
| **Escalated** | Elevated for senior review | Support/Admin (requires escalation note) |
| **Closed** | Resolved and archived | Support/Admin (requires resolution note) |

### 11.2 Ticket Categories

| Category | Description |
|----------|-------------|
| Billing | Payment issues, refund requests, invoice questions |
| Booking | Reservation changes, cancellation requests, date modifications |
| Operations | Pickup/return issues, vehicle condition concerns |
| Damage | Damage disputes, damage report questions |
| Incident | Accident reports, theft, major incidents |
| Website Bug | Technical issues with the platform |
| General | Other inquiries |

### 11.3 Ticket Priority Levels

| Priority | Label | Use Case |
|----------|-------|----------|
| Low | Low | General inquiries, non-urgent questions |
| Medium | Medium | Standard requests (default) |
| High | High | Time-sensitive issues, financial disputes |

Additionally, any ticket can be flagged as **Urgent** (cross-cutting flag independent of priority).

### 11.4 Ticket Creation

**Staff-created tickets require:**
- Subject (mandatory)
- Description (mandatory)
- Category (default: General)
- Priority (default: Medium)
- Optional: Urgent flag
- Optional: Guest email, phone, name (for non-registered users)
- Optional: Link to booking or incident

**Auto-generated tickets are created when:**
- A damage report is filed → category: Damage, priority: High
- An incident/accident is reported → category: Incident, priority: High
- Customer submits a dispute → category based on dispute type

### 11.5 Communication Rules

- **Strict separation** between public (customer-visible) messages and private (internal) staff notes
- Staff replies **default to internal notes** — agent must explicitly toggle to send a customer-visible message
- **Customer replies to a closed ticket automatically re-open it** (status reverts from Closed)
- Closing a ticket **requires a mandatory internal resolution note** — cannot close without it

### 11.6 Ticket Escalation

**Manual Escalation:**
- Any support agent or admin can escalate a ticket
- Escalation requires a mandatory **escalation note** explaining why
- Status changes to "Escalated"
- Escalation timestamp and escalating agent are recorded

**Automatic Escalation:**
- **Normal → High priority:** Automatically escalated after **24 hours** unresolved
- **High → Urgent:** Automatically escalated after **12 hours** unresolved
- Escalation is tracked with: `escalated_at`, `escalated_from` (original priority), `escalation_count`
- **Urgent unresolved tickets trigger admin alerts** for immediate visibility on the Admin dashboard

**Escalation check runs periodically** to evaluate all open tickets against the time thresholds.

### 11.7 Macro System

- Pre-defined response templates available for common scenarios
- Macros support variable substitution:
  - `{customer_name}` → customer's full name
  - `{booking_code}` → linked booking code
- Macros are categorized (matching ticket categories)
- Inserting a macro auto-switches the reply mode to customer-visible (not internal note)

### 11.8 Booking Context in Tickets

When a ticket is linked to a booking, the ticket detail view displays a **compact booking summary card** containing:
- Booking status
- Pickup and return dates
- Vehicle category
- Location
- Daily rate
- Real-time late fee estimate (if applicable)

This provides agents with immediate operational context without navigating away from the support interface.

### 11.9 Support Actions on Bookings

**Support staff CAN:**
- View booking details and late fee estimates in ticket context
- Add notes to bookings
- Request cancellation or refund (requires admin approval)
- Escalate to admin
- Link incidents/damage reports to tickets

**Support staff CANNOT:**
- Directly modify booking parameters (dates, vehicle, pricing)
- Process payments or refunds directly
- Override operational decisions
- Access Ops or Admin panels (unless they also have those roles)

### 11.10 Dispute Resolution Flow

1. Customer raises dispute (via ticket, phone, or email)
2. Support agent reviews evidence: walkaround photos, return photos, inspection records, audit logs
3. If damage dispute: compare pickup vs. return condition photos
4. Agent adds internal notes with findings
5. If unresolvable at support level: escalate to admin (with escalation note)
6. Admin makes final decision on deposit capture/release
7. Customer notified of resolution via customer-visible message
8. Ticket closed with mandatory resolution note

---

## 12. Admin Settings & Governance

### 12.1 Settings Page — Complete Options

The Admin Settings page (`/admin/settings`) contains the following configuration sections:

| Section | What It Configures |
|---------|-------------------|
| **Notification Preferences** | Toggle email alerts, SMS alerts (requires setup), overdue return alerts, damage report alerts |
| **Protection Package Pricing** | Daily rates, deductibles, and discount labels for each protection tier (Basic, Smart, All Inclusive). Empty rates disable that tier. |
| **Add-Ons & Pricing** | Toggle add-ons active/inactive, set daily rates and one-time fees for extras (Child Seat, GPS, Roadside, Fuel Service, etc.) |
| **Loyalty Points Settings** | Configure points earn rates, redemption rules, point values |
| **Membership Tiers Management** | Create/edit membership tiers with names, colors, icons, minimum point thresholds, benefits, sort order |
| **User Roles Management** | Search users by email, assign/remove roles (admin, staff, cleaner, finance, support, driver) |
| **Card View Password** | Set password protection for viewing sensitive card information |
| **Cart Recovery Settings** | Enable/disable abandoned cart tracking, set abandonment threshold (minutes), auto follow-up toggle (coming soon) |

### 12.2 Configurable Parameters

| Setting | Default | Who Can Change |
|---------|---------|---------------|
| Security deposit amount | $350 CAD | Admin |
| Protection plan pricing (daily rates, deductibles, discount labels) | See Section 6 | Admin |
| Add-on pricing (daily rates, one-time fees) | Per add-on | Admin |
| Fuel market rate | $1.85/L | Admin |
| Late return fee rate | 25% of daily rate/hr | Admin |
| Late return grace period | 30 minutes | Admin |
| Cancellation fee | $19.99 | Admin |
| Young driver fee | $15 | Admin |
| Maximum rental duration | 30 days | Admin |
| Delivery radius | 50 km | Admin |
| PVRT daily fee | $1.50 | Admin |
| ACSRCH daily fee | $1.00 | Admin |
| Weekend surcharge rate | 15% | Admin |
| Duration discount thresholds | 7 days (10%), 21 days (20%) | Admin |
| Cart abandonment threshold | 30 minutes | Admin |

**Validation:** Admin panel prevents saving zero or empty rates for active pricing items.

### 12.3 Change Control

- **Settings changes apply to new bookings only** — existing bookings retain their original pricing
- Delivery bookings lock pricing via a `pricing_snapshot` at the Ready Line stage
- Protection plan rate changes are reflected immediately in search results and checkout for new bookings

### 12.4 User Role Management

- Admin Settings include a "User Roles" management panel
- Search users by email
- Assign/remove roles: admin, staff, cleaner, finance, support, driver
- Role assignments govern access across Admin, Ops, Support, and Delivery portals

### 12.5 Audit Log Requirements

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
| Ticket escalation | Actor, escalation note, timestamp |
| Ticket closure | Actor, resolution note |

---

## 13. Edge Cases & Exception Handling

### 13.1 Customer Cancels Before Pickup
- **Free cancellation** if before scheduled pickup time
- Deposit returned if already collected
- Cancellation confirmation email sent
- Vehicle status returns to Available

### 13.2 Customer Cancels After Pickup Time (No-Show)
- **$19.99 CAD** flat cancellation fee charged
- Deposit requires manual admin review (alert created)
- Admin decides on deposit release/capture

### 13.3 Vehicle Unavailable Last Minute
- Ops staff can modify booking to different vehicle category
- "Charge for this change" toggle allows staff discretion on price updates
- If no alternative available: booking cancelled with full refund
- Admin alert generated

### 13.4 Customer Wants Extension While Active
- Staff processes extension through dedicated modification panel
- Return date extended, pricing recalculated automatically
- Audit log captures old/new dates and price changes
- Full parameter edits blocked (only return date can be extended)

### 13.5 Early Return
- Customer may return vehicle before scheduled end date
- **No refund for unused days** (Assumption)
- Actual return time recorded; closeout proceeds normally

### 13.6 Damage Reported During Rental (While Active)
- Customer or staff creates damage report
- Booking flagged as exception automatically
- Incident case opened if severe
- Financial closeout suspended until incident reviewed
- Deposit withhold entry created (severity-based amount)

### 13.7 Damage Reported at Return
- Documented during return Evidence Capture and Issues & Damages steps
- Photo evidence mandatory
- Deposit auto-withheld based on severity
- Final settlement suspended pending incident resolution
- High-priority support ticket auto-generated

### 13.8 Multiple Drivers
- Additional drivers added as booking add-on (explicit selection required)
- Each additional driver requires: name, age band verification, young driver fee if aged 20–24
- **Driver removal:** Allowed pre-active only

### 13.9 Add-On Selection Rules
- **No add-on should ever be forced** without explicit customer consent
- "Additional Driver" is never auto-added
- All add-ons default to OFF during selection
- All Inclusive protection disables Premium Roadside add-on automatically

### 13.10 Price Mismatch Prevention
- Single pricing function is the source of truth for all calculations
- Same formula used across search, checkout, booking details, and invoicing
- Delivery bookings lock pricing at Ready Line stage via snapshot
- Any modification triggers full recalculation using the central pricing engine
- Itemized receipts show every line item transparently

### 13.11 Customer Self-Return (Key Drop)
- Customer can mark vehicle as "returned" via their dashboard
- Available starting 30 minutes before scheduled return time
- Captures timestamp and GPS coordinates
- Does NOT complete the booking — staff must still perform return workflow
- Prevents location disputes

### 13.12 Odometer Validation at Return
- **Hard block:** Return reading < pickup reading (impossible, prevents data entry error)
- **Warning:** Jump > 5,000 km (flags for review but allows proceeding)

### 13.13 Fuel Shortage Charge
- Comparison: return fuel level vs. pickup fuel level
- If return < pickup: charge calculated as `(shortage % × tank capacity in liters) × fuel rate per liter`
- Fuel rate: admin-configured market rate with discount ($0.05 below market)
- Uses VIN-specific tank capacity when available, category default as fallback

### 13.14 Vehicle Status Transitions

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

---

## 14. KPIs & Operational Reporting

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

## 15. Worked Pricing Examples

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
| Security deposit (separate) | | $350.00 |

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
| Security deposit (separate) | | $350.00 |

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
| Security deposit (separate) | | $350.00 |

**At Return — Damage Discovery:**
1. Staff creates damage report: **Moderate severity**, bumper dent, estimated cost $400
2. System auto-withholds **$250** from deposit (moderate tier)
3. Booking flagged as exception
4. Admin alert created: "Deposit Requires Damage Review"
5. High-priority support ticket auto-generated
6. Admin reviews evidence (photos, damage report)
7. Admin approves capture of $250 from $350 deposit
8. Remaining $100 released to customer
9. Final invoice generated and emailed with deposit status

**Deposit Outcome:**
| Action | Amount |
|--------|--------|
| Original deposit | $350.00 |
| Captured for damage | −$250.00 |
| Released to customer | $100.00 |

---

## 16. Assumptions

1. **A-1:** Early returns do not receive refunds for unused rental days.
2. **A-2:** SLA target for support first response is 2 business hours; auto-escalation at 24 hours (Normal→High) and 12 hours (High→Urgent).
3. **A-3:** Cleaning buffer between rentals defaults to 2 hours per vehicle.
4. **A-4:** Reservation holds expire after approximately 10 minutes if not converted.
5. **A-5:** Fuel market rate ($1.85/L) and discount ($0.05 below market) are updated periodically by admin — no automated feed.
6. **A-6:** Mystery Car assignment is random from available inventory at the location.
7. **A-7:** The $19.99 no-show/cancellation fee is a flat fee regardless of booking value.
8. **A-8:** Debit/prepaid card rejection is enforced at checkout.
9. **A-9:** All financial amounts are in Canadian Dollars (CAD).
10. **A-10:** Delivery is only available within the Lower Mainland service area.
11. **A-11:** Loyalty points system exists but specific earn/burn rules are not yet fully defined.
12. **A-12:** Blackout dates are not currently enforced but listed as configurable.
13. **A-13:** The "Bring Car to Me" delivery feature operates during standard business hours only.
14. **A-14:** The platform does NOT use Stripe authorization holds. Payments are auto-captured at checkout. Deposits are collected as separate charges.
