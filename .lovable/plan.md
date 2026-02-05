
# Comprehensive Step-by-Step Manual Testing Documentation

## Overview

This plan creates an enhanced **MANUAL_TESTING_GUIDE.md** that replaces the existing one with extremely detailed, click-by-click instructions for testing every feature across all 5 operational panels. The new guide will be a practical "follow along" document that tells testers exactly what to do, where to click, what to enter, and what to verify.

---

## Document Structure

The new guide will be organized as follows:

```text
MANUAL_TESTING_GUIDE.md
├── Quick Reference
│   ├── Panel URLs
│   ├── Test Accounts
│   └── Stripe Test Cards
│
├── PART 1: Customer Portal Testing
│   ├── 1.1 Homepage Navigation
│   ├── 1.2 Search & Browse Flow
│   ├── 1.3 Complete Booking Flow (Step-by-Step)
│   ├── 1.4 Delivery Booking Flow
│   ├── 1.5 Post-Booking Customer Actions
│   └── 1.6 Customer Dashboard
│
├── PART 2: Admin Panel Testing
│   ├── 2.1 Navigation & Dashboard
│   ├── 2.2 Bookings Management
│   ├── 2.3 Pickup Operations (6-Step Wizard)
│   ├── 2.4 Return Operations (5-Step Wizard)
│   ├── 2.5 Fleet Management
│   ├── 2.6 Billing & Deposits
│   ├── 2.7 Incidents & Damages
│   └── 2.8 Reports & Analytics
│
├── PART 3: Ops Panel Testing
│   ├── 3.1 Workboard Overview
│   ├── 3.2 Pickups Queue
│   ├── 3.3 Active Rentals
│   ├── 3.4 Returns Queue
│   └── 3.5 Fleet View
│
├── PART 4: Delivery Panel Testing
│   ├── 4.1 Dashboard & Queue
│   ├── 4.2 Claiming Deliveries
│   ├── 4.3 Delivery Workflow
│   └── 4.4 Walk-In Booking
│
├── PART 5: Support Panel Testing
│   ├── 5.1 Ticket Queue
│   ├── 5.2 Ticket Management
│   ├── 5.3 Customer Communication
│   └── 5.4 Analytics Dashboard
│
├── PART 6: End-to-End Integration Tests
│   ├── 6.1 Complete Rental Lifecycle
│   ├── 6.2 Delivery Booking E2E
│   └── 6.3 Damage/Incident Flow
│
└── Appendices
    ├── Test Data Templates
    ├── Status Workflows
    └── Troubleshooting Guide
```

---

## Key Improvements Over Existing Guide

| Aspect | Current Guide | New Guide |
|--------|---------------|-----------|
| **Navigation** | Generic "go to page" | Exact URL + sidebar menu item name |
| **Button clicks** | "Click button" | "Click the blue 'Walk-In' button in top-right" |
| **Form inputs** | "Enter details" | Exact field names + sample values |
| **Verification** | Checklist format | Step-by-step expected results |
| **Screenshots context** | None | "You should see..." descriptions |
| **Error scenarios** | Limited | Specific error messages + recovery |

---

## Sample Content Format

Each test case will follow this detailed format:

```markdown
### TEST 1.3: Complete Booking Flow (Counter Pickup)

**What we're testing:** A customer booking a vehicle for counter pickup

**Starting point:** Homepage (https://c4r.ca/)

---

#### Step 1: Access the Search Page

1. **Look at the homepage** - You see a hero image with "C2C Rental" heading
2. **Find the search card** - Below the hero, there's a card with "Pickup Location" dropdown
3. **Click the "Pickup Location" dropdown** - A list of available locations appears
4. **Select "Miami Airport"** from the list
5. **Click the "Pickup Date" field** - A calendar picker opens
6. **Select tomorrow's date** by clicking on it
7. **Click the "Return Date" field** and select a date 3 days after pickup
8. **Click the orange "Search Vehicles" button**

**Expected Result:** Page navigates to /search with vehicle categories displayed

---

#### Step 2: Select a Vehicle Category

1. **Review the vehicle cards** - Each shows: image, name, specs (seats, fuel, transmission), daily rate
2. **Notice the badges** - Cards may show "X available" or "Select Location" if no context
3. **Click on "Economy" category card** (or any available category)
4. **A prompt appears** asking to confirm age requirement

**Expected Result:** Age confirmation dialog appears

---

[continues with detailed steps...]
```

---

## Technical Details

### Panel Routes Reference

| Panel | URL | Access |
|-------|-----|--------|
| Customer Homepage | `/` | Public |
| Search | `/search` | Public |
| Checkout | `/checkout` | Public |
| Customer Dashboard | `/dashboard` | Authenticated |
| **Admin Panel** | `/admin` | Admin role |
| Admin Bookings | `/admin/bookings` | Admin role |
| Admin Fleet | `/admin/fleet` | Admin role |
| Admin Billing | `/admin/billing` | Admin role |
| Admin Incidents | `/admin/incidents` | Admin role |
| **Ops Panel** | `/ops` | Staff/Admin role |
| Ops Pickups | `/ops/pickups` | Staff/Admin role |
| Ops Returns | `/ops/returns` | Staff/Admin role |
| **Delivery Panel** | `/delivery` | Driver role |
| **Support Panel** | `/support` | Support/Staff/Admin role |

### Admin Sidebar Menu Items (in order)
1. Alerts (badge count)
2. Dashboard
3. Bookings
4. Fleet
5. Incidents
6. Fleet Costs
7. Fleet Analytics
8. Analytics
9. Calendar
10. Billing
11. Support
12. Offers
13. Settings

### Ops Sidebar Menu Items
1. Workboard
2. Bookings
3. Pickups
4. Active Rentals
5. Returns
6. Fleet

---

## Test Coverage Matrix

### Customer Portal (15 tests)
- Homepage load and navigation
- Search with location/dates
- Search without location (browse mode)
- Protection package selection
- Add-ons selection
- Guest checkout flow
- Authenticated checkout flow
- Delivery mode booking
- Counter pickup booking
- Payment success
- Payment failure handling
- Post-booking license upload
- Agreement signing
- Booking pass viewing
- Customer dashboard navigation

### Admin Panel (25 tests)
- Dashboard overview stats
- Walk-in booking creation
- Booking search by code
- Booking detail view
- 6-step pickup wizard (each step)
- Active rental monitoring
- 5-step return wizard (each step)
- Category CRUD operations
- Vehicle unit CRUD operations
- Incident creation
- Damage report creation
- Billing receipts
- Deposit capture/release
- Reports generation
- Settings modification

### Ops Panel (10 tests)
- Workboard counts accuracy
- Pickups queue filtering
- Active rentals view
- Returns queue
- Fleet status view
- Booking handover process
- Return processing

### Delivery Panel (8 tests)
- My deliveries view
- Available deliveries view
- Claiming a delivery
- Starting delivery
- GPS capture
- Handover completion
- Walk-in booking

### Support Panel (8 tests)
- Ticket queue view
- Ticket filtering
- Creating new ticket
- Replying to ticket
- Using macros
- Ticket escalation
- Ticket closure
- Analytics dashboard

---

## Implementation

I will create a comprehensive **MANUAL_TESTING_GUIDE.md** file (~1500+ lines) that completely replaces the existing guide with:

1. **Exact click-by-click instructions** for every test
2. **Sample data** to enter in forms
3. **Expected results** after each action
4. **Visual cues** ("You should see...", "The button is located...")
5. **Error scenarios** with expected messages
6. **Integration test scripts** combining multiple flows

---

## File Changes

| File | Action |
|------|--------|
| `MANUAL_TESTING_GUIDE.md` | Complete rewrite with detailed step-by-step instructions |

The new guide will serve as a complete walkthrough that even non-technical testers can follow to validate all platform functionality.
