
# Data Cleanup and Manual Testing Documentation Plan

## Overview

This plan addresses two key requirements:
1. **Data Cleanup**: Remove all booking-related data to enable fresh testing
2. **Manual Testing Guide**: Comprehensive documentation covering all 4 panels and their features

---

## Part 1: Database Data Cleanup

### Tables to Clear (in dependency order)

Based on the database schema analysis, the following tables need to be cleared. Due to foreign key constraints, they must be deleted in a specific order:

**Tier 1 - Leaf tables (no dependencies on them):**
- `ticket_messages` - Messages within support tickets
- `ticket_attachments` - Files attached to tickets
- `ticket_audit_log` - Ticket activity logs
- `incident_photos` - Photos for incident cases
- `incident_repairs` - Repair records for incidents
- `condition_photos` - Pre/post rental photos
- `inspection_metrics` - Odometer, fuel readings
- `booking_add_ons` - Add-ons linked to bookings
- `booking_additional_drivers` - Additional drivers
- `booking_otps` - OTP verification records
- `checkin_records` - Check-in verification data
- `delivery_status_log` - Delivery history log
- `deposit_ledger` - Deposit transactions
- `deposit_jobs` - Background deposit jobs
- `notification_logs` - SMS/email logs
- `points_ledger` - Points transactions
- `offer_redemptions` - Offer usage records
- `verification_requests` - Document verification
- `rental_agreements` - Signed agreements
- `receipts` + `receipt_events` - Return receipts
- `final_invoices` - Final invoice records
- `stripe_webhook_events` - Webhook processing log

**Tier 2 - Mid-level tables:**
- `payments` - Payment records
- `delivery_statuses` - Current delivery state
- `damage_reports` - Damage records
- `admin_alerts` - System alerts
- `audit_logs` (WHERE entity_type = 'booking') - Booking-related audit logs

**Tier 3 - Incident and Support tables:**
- `support_tickets_v2` - Support tickets (some linked to bookings)
- `incident_cases` - Incident/accident cases

**Tier 4 - Core booking table:**
- `bookings` - Main booking records

**Tables to PRESERVE:**
- `profiles` - User accounts (keep for testing)
- `user_roles` - Role assignments
- `vehicle_categories` - Fleet categories
- `vehicle_units` - Physical vehicles (reset status to 'available')
- `locations` - Rental locations
- `add_ons` - Available add-ons
- `points_settings` - Points configuration
- `membership_tiers` - Loyalty tiers
- `points_offers` - Offers catalog
- `maintenance_logs` - Keep vehicle history
- `vehicle_expenses` - Keep expense records
- `abandoned_carts` - Can be cleared
- `competitor_pricing` - Keep pricing data

### SQL Cleanup Script

```sql
-- ============================================
-- BOOKING DATA CLEANUP SCRIPT
-- Execute in Lovable Cloud > Run SQL
-- ============================================

-- TIER 1: Leaf tables
DELETE FROM ticket_messages;
DELETE FROM ticket_attachments;
DELETE FROM ticket_audit_log;
DELETE FROM incident_photos;
DELETE FROM incident_repairs;
DELETE FROM condition_photos;
DELETE FROM inspection_metrics;
DELETE FROM booking_add_ons;
DELETE FROM booking_additional_drivers;
DELETE FROM booking_otps;
DELETE FROM checkin_records;
DELETE FROM delivery_status_log;
DELETE FROM deposit_ledger;
DELETE FROM deposit_jobs;
DELETE FROM notification_logs;
DELETE FROM points_ledger;
DELETE FROM offer_redemptions;
DELETE FROM verification_requests;
DELETE FROM rental_agreements;
DELETE FROM receipt_events;
DELETE FROM receipts;
DELETE FROM final_invoices;
DELETE FROM stripe_webhook_events;

-- TIER 2: Mid-level
DELETE FROM payments;
DELETE FROM delivery_statuses;
DELETE FROM damage_reports;
DELETE FROM admin_alerts;
DELETE FROM audit_logs WHERE entity_type = 'booking';

-- TIER 3: Support/Incidents (booking-linked)
DELETE FROM support_tickets_v2 WHERE booking_id IS NOT NULL;
DELETE FROM incident_cases WHERE booking_id IS NOT NULL;

-- TIER 4: Core bookings
DELETE FROM bookings;

-- TIER 5: Abandoned carts (optional)
DELETE FROM abandoned_carts;

-- Reset vehicle units to available
UPDATE vehicle_units SET status = 'available';

-- Reset user points balance (optional)
UPDATE profiles SET points_balance = 0;
```

---

## Part 2: Manual Testing Documentation

### Document Structure

I will create a comprehensive **MANUAL_TESTING_GUIDE.md** file organized as follows:

```text
MANUAL_TESTING_GUIDE.md
├── Introduction & Setup
├── Test Account Setup
├── Panel 1: Customer Portal Testing
│   ├── TC-C01: Homepage & Navigation
│   ├── TC-C02: Search & Browse
│   ├── TC-C03: Booking Flow (Guest)
│   ├── TC-C04: Booking Flow (Authenticated)
│   ├── TC-C05: Delivery Booking
│   ├── TC-C06: Post-Booking Actions
│   ├── TC-C07: Customer Dashboard
│   └── TC-C08: Error Handling
├── Panel 2: Admin Panel Testing
│   ├── TC-A01: Dashboard Overview
│   ├── TC-A02: Alerts Management
│   ├── TC-A03: Bookings Hub
│   ├── TC-A04: Pickup Ops Wizard (6 Steps)
│   ├── TC-A05: Active Rental Monitoring
│   ├── TC-A06: Return Ops Wizard (5 Steps)
│   ├── TC-A07: Fleet Management
│   ├── TC-A08: Category Management
│   ├── TC-A09: Vehicle Unit Management
│   ├── TC-A10: Incidents & Damages
│   ├── TC-A11: Billing & Deposits
│   ├── TC-A12: Reports & Analytics
│   ├── TC-A13: Offers Management
│   └── TC-A14: Settings
├── Panel 3: Delivery Panel Testing
│   ├── TC-D01: Dashboard & Queue
│   ├── TC-D02: Claim Delivery
│   ├── TC-D03: Delivery Workflow
│   ├── TC-D04: Handover Completion
│   └── TC-D05: Walk-In Booking
├── Panel 4: Support Panel Testing
│   ├── TC-S01: Ticket Queue
│   ├── TC-S02: Ticket Management
│   ├── TC-S03: Customer Communication
│   ├── TC-S04: Macros & Templates
│   └── TC-S05: Analytics Dashboard
├── Panel 5: Ops Panel Testing
│   ├── TC-O01: Workboard
│   ├── TC-O02: Pickups Queue
│   ├── TC-O03: Active Rentals
│   ├── TC-O04: Returns Queue
│   ├── TC-O05: Fleet View
│   └── TC-O06: Booking Operations
├── Integration Testing
│   ├── IT-01: Complete Rental Lifecycle
│   ├── IT-02: Delivery Booking E2E
│   ├── IT-03: Payment Flow (Stripe)
│   ├── IT-04: Damage & Incident Flow
│   └── IT-05: Support Ticket Flow
├── Edge Cases & Error Scenarios
└── Appendices
    ├── A: Test Data Templates
    ├── B: Status Workflows
    └── C: Troubleshooting
```

### Test Case Format

Each test case will include:

```text
## TC-XXX: Test Case Title

**Priority:** High/Medium/Low
**Preconditions:** Required setup
**Test Steps:**
1. Step description
   - Expected result
2. Step description
   - Expected result

**Verification Points:**
- [ ] Checkpoint 1
- [ ] Checkpoint 2

**Notes:** Additional context
```

### Key Test Scenarios by Panel

**Customer Portal (15+ test cases)**
- Search with various date combinations
- All protection packages
- All add-on combinations
- Guest vs authenticated checkout
- Delivery vs pickup modes
- License upload flow
- Agreement signing
- Booking pass QR code
- Return marking

**Admin Panel (25+ test cases)**
- 6-step pickup wizard complete flow
- 5-step return wizard complete flow
- Each step validation and blocking conditions
- Fleet CRUD operations
- Category management
- Vehicle unit assignment
- Deposit capture/release
- Damage reporting
- Incident case management
- Walk-in booking creation
- Category upgrade mid-booking

**Delivery Panel (8+ test cases)**
- Queue filtering by status
- Claiming available deliveries
- Status progression
- GPS capture
- Photo upload
- Handover completion
- Walk-in booking

**Support Panel (10+ test cases)**
- Ticket creation (auto from damages/incidents)
- Manual ticket creation
- Status workflow
- Message threading
- File attachments
- Macro usage
- Ticket reassignment
- Analytics accuracy

**Ops Panel (12+ test cases)**
- Workboard tabs
- Same operations as admin with ops shell
- Fleet quick view
- Streamlined handover flow

### Files to Create

1. **`MANUAL_TESTING_GUIDE.md`** - Main testing documentation (500+ lines)
2. Update existing **`SYSTEM_OVERVIEW.md`** - Add link to testing guide

---

## Implementation Steps

### Step 1: Create SQL Cleanup Script
- Provide the SQL script above for user to execute via Lovable Cloud
- Script deletes data in correct FK order
- Resets vehicle statuses

### Step 2: Create MANUAL_TESTING_GUIDE.md
- Comprehensive test case documentation
- Organized by panel
- Clear step-by-step instructions
- Verification checklists
- Integration test scenarios

### Step 3: Include Test Data Templates
- Sample customer info
- Sample card details (Stripe test cards)
- Sample booking dates
- Sample driver license placeholders

---

## Technical Considerations

### Data Cleanup Safety
- Script preserves user accounts and fleet configuration
- Only transactional/booking data is removed
- Vehicle units reset to 'available' status
- Points balances optionally reset

### Testing Prerequisites
- At least one location must exist
- At least one vehicle category must exist
- At least one vehicle unit per category recommended
- Test user accounts with proper roles (admin, staff, driver, support)

### Stripe Test Mode
All payment testing should use Stripe test cards:
- `4242 4242 4242 4242` - Successful payment
- `4000 0000 0000 3220` - 3D Secure required
- `4000 0000 0000 9995` - Declined card

---

## Deliverables Summary

| Deliverable | Type | Description |
|-------------|------|-------------|
| SQL Cleanup Script | Database | Removes all booking data safely |
| MANUAL_TESTING_GUIDE.md | Documentation | 100+ test cases across all panels |
| Test Data Templates | Reference | Sample inputs for testing |
| Integration Scenarios | Documentation | End-to-end workflow tests |

