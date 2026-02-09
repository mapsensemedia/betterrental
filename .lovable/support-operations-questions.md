# Support & Operations System — Questions for Planning

> **Purpose:** Before building any new features, this document captures every gap, ambiguity, and decision point
> discovered during a thorough analysis of the current codebase. Organized by operational area.

---

## 1. SUPPORT TICKET → BOOKING ACTION BRIDGE

### Current State
- The Support Panel (`/support`) lets staff manage tickets (status, messages, escalation, macros).
- When a customer reports "Running Late" via `ReportIssueDialog`, it creates a **support ticket** + an **admin alert**.
- The support ticket has a `booking_id` link, but the **Support Panel has NO actionable buttons** to modify the booking.
- To extend a rental, staff must **leave the Support Panel**, navigate to `/ops/rental/{id}` or the Admin drawer, find the "Extend Rental Duration" accordion, and manually adjust the dates.
- There is **no way for the support agent to see the booking's current status, dates, or pricing** from within the ticket view — they only see the booking code link.

### Questions

**1.1** When a support agent opens a ticket tagged as "Running Late" or "Late Return", should they see:
- (a) A **compact booking summary card** inside the ticket detail (status, dates, vehicle, location, daily rate, late fee info)?
- (b) A **full booking panel** embedded alongside the ticket?
- (c) Just the current booking code link (no change)?

**1.2** Should the Support Panel have **Quick Action buttons** for common booking operations directly inside the ticket view?
- Examples: "Extend Rental", "Override Late Fee", "Waive No-Show Fee", "Mark as Resolved"
- Or should support agents always navigate to the Ops panel for any booking mutation?

**1.3** If quick actions are desired, which specific actions should be available from inside a support ticket?
- [ ] Extend rental duration (pick new end date/time)
- [ ] Override/waive late return fee
- [ ] Process early return
- [ ] Issue partial refund
- [ ] Change vehicle category
- [ ] Cancel/void booking
- [ ] Other: ___

**1.4** Should completing a booking action from within a ticket (e.g., extending a rental) **auto-update the ticket** (add an internal note, change status to "waiting_customer" or "closed")?

---

## 2. LATE RETURN HANDLING

### Current State
- Late returns are calculated automatically: 30-minute grace period, then 25% of daily rate per hour.
- The Ops panel has a "Modify Rental Duration" panel (`BookingModificationPanel`) on active bookings.
- There's an `useOverrideLateFee` hook that lets admin override the calculated late fee with a custom amount + reason.
- The customer-facing `ReportIssueDialog` lets customers flag "Running Late", but this just creates a ticket — it does **not** extend the booking or pause the late fee clock.
- There is **no automated process** that links a "Running Late" ticket to the late fee calculation.

### Questions

**2.1** When a customer reports "Running Late", should the system:
- (a) Just create a ticket (current behavior)?
- (b) Create a ticket AND auto-pause the late fee accumulation until staff reviews?
- (c) Create a ticket AND prompt the customer to select a new return time (self-service extension)?
- (d) Create a ticket AND auto-extend by a fixed grace window (e.g., 2 hours) while staff reviews?

**2.2** Should late fee waivers/overrides require a **reason category** (not just free text)?
- Examples: "Customer notified in advance", "Traffic/weather", "Vehicle issue", "Goodwill", "Loyalty member"
- Or is the current free-text reason field sufficient?

**2.3** When extending an active rental, should the system check for **vehicle availability conflicts** with upcoming bookings for the same vehicle unit?
- (a) Hard block: reject the extension if a conflict exists
- (b) Warning: allow but flag a conflict for ops to resolve (vehicle swap needed)
- (c) No check: staff manages conflicts manually

**2.4** Is there a maximum extension period allowed? Currently the system caps rentals at 30 days total. Should extensions:
- (a) Respect the 30-day cap (reject if new total exceeds 30 days)?
- (b) Allow exceeding 30 days for extensions only (with staff approval)?
- (c) Have a separate max extension (e.g., 7 days max per extension)?

---

## 3. EARLY RETURN HANDLING

### Current State
- The rental agreement states: "Early return does not guarantee refund."
- There is **no early return workflow** in the system — the return workflow only processes returns at or after the scheduled end time.
- There's no customer-facing "I want to return early" button.
- The `BookingModificationPanel` only allows extending, not shortening.

### Questions

**3.1** Should customers be able to **request** an early return through their dashboard?
- (a) Yes, a "Return Early" button that notifies staff and starts the return workflow
- (b) Yes, a self-service early return that recalculates pricing and triggers partial refund
- (c) No, early returns are handled via phone/support ticket only (walk-in at the counter)

**3.2** When an early return happens, what's the refund policy?
- (a) No refund for unused days (current agreement)
- (b) Staff-discretion partial refund (calculated but requires manual approval)
- (c) Automatic partial refund for days not used (minus service fee)
- (d) Configurable per-booking: staff decides at the time of return

**3.3** Should the `BookingModificationPanel` support **shortening** a booking (not just extending)?
- This would let ops staff adjust the end date earlier and trigger a recalculation.

---

## 4. OVERDUE / NO-SHOW AUTOMATION

### Current State
- The `check-rental-alerts` edge function creates admin alerts for overdue rentals (>30 min past scheduled return) and upcoming returns (within 2 hours).
- Active rentals are monitored in the Active Rentals page with overdue/approaching/warning zones.
- There's a `canCustomerMarkReturned` function for key-drop self-return scenarios.
- There's **no automated SMS/email** sent to customers when their rental becomes overdue.
- There's **no automated support ticket** created for overdue rentals.
- No-show bookings are handled via cancellation with a $19.99 fee, but there's **no automated no-show detection**.

### Questions

**4.1** Should the system automatically send an **SMS/email to the customer** when their rental becomes overdue?
- (a) Yes, immediately when grace period expires (30 min after scheduled return)
- (b) Yes, at multiple intervals (30 min, 1 hour, 2 hours, 4 hours)
- (c) No, staff handles outreach manually

**4.2** Should overdue rentals automatically create a **support ticket** for tracking?
- (a) Yes, auto-create a high-priority "Overdue Return" ticket after grace period
- (b) Yes, but only after X hours overdue (what threshold?)
- (c) No, the existing admin alert system is sufficient

**4.3** Should the system detect **no-shows** automatically?
- A no-show = confirmed booking where the customer didn't arrive by X hours after pickup time.
- (a) Yes, auto-detect after 1 hour past pickup time and create an alert
- (b) Yes, auto-detect after 2 hours and auto-cancel with no-show fee
- (c) No, ops staff manually identifies no-shows

**4.4** Should overdue late fees be **auto-applied** in real-time (accumulating as time passes), or only calculated at the point of return?
- Currently, late fees are calculated when the return is processed, not accumulated in real-time.
- Real-time accumulation would show the customer their growing fee via their dashboard.

---

## 5. CUSTOMER SELF-SERVICE vs. STAFF-ASSISTED

### Current State
- Customers can: view booking, upload license, sign agreement, acknowledge walkaround, report issues, cancel (before pickup), mark vehicle returned (key drop).
- Customers **cannot**: extend rental, request early return, change dates, change vehicle, view/dispute late fees.
- All booking modifications require staff action through the Ops or Admin panels.

### Questions

**5.1** Should customers have a **self-service extension** option from their dashboard?
- (a) Full self-service: pick new return date, auto-recalculate, pay difference online
- (b) Request-only: customer submits extension request, staff approves/rejects
- (c) No self-service: all extensions go through support tickets or phone

**5.2** If self-service extensions are enabled, should they:
- Check vehicle availability automatically?
- Require immediate online payment for the price difference?
- Be limited to a maximum number of additional days?
- Be blocked within X hours of the original return time?

**5.3** Should customers be able to see their **running late fee** in real-time on their dashboard?
- (a) Yes, show a live counter after grace period ("Your current late fee: $XX.XX")
- (b) Yes, but only show a static warning ("Late fees apply after 30 min grace period")
- (c) No, only show at final closeout

**5.4** Should customers see an **"I'm Running Late" quick button** on their dashboard (separate from the full Report Issue dialog)?
- This would be a simpler flow: just enter estimated new return time, no full ticket creation.

---

## 6. FINANCIAL OPERATIONS FROM SUPPORT

### Current State
- Support agents can view tickets and send messages but cannot:
  - Process refunds
  - Override fees
  - Create payment links
  - Issue credits
- All financial operations require navigating to the Admin or Ops panel.
- The `deposit-automation.ts` handles auto-release of deposits on completion.

### Questions

**6.1** Should support agents have access to any **financial actions** within the ticket view?
- [ ] View payment history for the linked booking
- [ ] Issue goodwill credits (small amounts, e.g., up to $50)
- [ ] Create a payment request link (send to customer for additional charges)
- [ ] Override/waive specific fees (late fee, no-show fee)
- [ ] None — all financial actions stay in Admin/Ops

**6.2** If financial actions are available, should they require a **second approval** (e.g., admin role confirmation)?

**6.3** Should there be a **maximum amount** a support agent can waive/refund without escalation?
- Example: Support can waive up to $100, anything above needs admin approval.

---

## 7. VEHICLE SWAP / CHANGE DURING ACTIVE RENTAL

### Current State
- Vehicle category upgrades are possible **before activation** via `UnifiedVehicleManager` and `CategoryUpgradeDialog`.
- Once a rental is active, there's **no vehicle swap workflow**.
- If a vehicle has a breakdown, the booking is linked to a specific unit, but there's no swap mechanism.

### Questions

**7.1** Should the system support **vehicle swaps during active rentals**?
- (a) Yes, with a structured workflow (release old unit → assign new unit → update booking → audit log)
- (b) Yes, but only via admin override (not standard ops flow)
- (c) Not needed — handle manually outside the system

**7.2** If a customer reports a breakdown, should the support ticket offer a **"Schedule Replacement Vehicle"** action?

---

## 8. SUPPORT MACROS & TEMPLATES

### Current State
- The Support Panel has a **macro system** (`support_macros` table) for templated responses.
- Macros support variables like `{customer_name}` and `{booking_code}`.
- Usage tracking exists (`usage_count`).

### Questions

**8.1** Should macros include **action triggers** (not just text templates)?
- Example: A "Late Return – Extension Granted" macro could:
  1. Insert a templated response
  2. Auto-extend the booking by X hours
  3. Waive the late fee
  4. Close the ticket
- Or should macros remain text-only?

**8.2** Are the current macro categories sufficient (general, billing, booking, ops, damage, website_bug)?
- Should we add: "late_return", "early_return", "extension", "no_show", "vehicle_issue"?

**8.3** Should macros be **role-scoped**? (e.g., some macros only visible to admins, others to all support staff)

---

## 9. NOTIFICATION & COMMUNICATION GAPS

### Current State
- Admin notifications exist for: new bookings, cancellations, license uploads, payments, issues, damages, overdue.
- Customer notifications exist for: booking confirmation, payment confirmation, agreement ready, handover SMS.
- **Missing notifications:**
  - No customer notification when a late fee is applied
  - No customer notification when their rental is extended by staff
  - No customer notification when a refund is processed
  - No customer notification for upcoming return reminder (only admin gets the alert)

### Questions

**9.1** Which customer-facing notifications should be added?
- [ ] Return reminder (e.g., 24h and 2h before scheduled return)
- [ ] Late fee applied notification (with amount and how to dispute)
- [ ] Rental extended confirmation (with new dates and pricing)
- [ ] Refund processed confirmation (with amount and expected timeline)
- [ ] Vehicle swap confirmation
- [ ] Support ticket status updates (e.g., "Your issue has been resolved")

**9.2** What channels should these notifications use?
- (a) Email only
- (b) SMS only
- (c) Both email and SMS
- (d) Configurable per customer preference

---

## 10. REPORTING & ANALYTICS GAPS

### Current State
- Support analytics exist: ticket counts, response times, resolution times, category distribution.
- Revenue analytics exist in the admin panel.
- **No cross-referencing** between support tickets and financial impact (e.g., how much was waived via support tickets this month).

### Questions

**10.1** Should the system track **financial impact of support actions**?
- Example: "Support waived $X in late fees this month across Y tickets"
- This requires logging the monetary value of each support-driven action.

**10.2** Should there be a **"Late Return Report"** showing:
- Total late returns this period
- Average lateness (hours)
- Total late fees charged vs. waived
- Customers with repeat late returns

---

## 11. ESCALATION & SLA ENFORCEMENT

### Current State
- Ticket auto-escalation: Normal→High after 24h, High→Urgent after 12h.
- No specific SLA targets for different ticket categories.
- No escalation based on ticket **type** (a "Running Late" ticket and a "Website Bug" ticket have the same escalation timeline).

### Questions

**11.1** Should different ticket categories have different **SLA targets**?
- Example: "Running Late" → 15 min first response, "Website Bug" → 4 hours
- This would require category-specific escalation rules.

**11.2** Should "Running Late" tickets bypass the normal queue and be **auto-assigned** to the next available agent?

---

## 12. BOOKING MODIFICATION AUDIT TRAIL

### Current State
- Booking modifications (extensions) create audit logs with old/new data and reason.
- Late fee overrides are tracked with the override amount, reason, and who approved.
- **No structured tracking** of whether a modification was initiated from a support ticket vs. direct ops action.

### Questions

**12.1** Should booking modifications link back to the **originating support ticket** for traceability?
- This would mean the audit log includes `ticket_id` when a modification was triggered from support.

**12.2** Should there be a **modification history panel** visible to customers on their booking detail page?
- (a) Yes, show all date/price changes with timestamps
- (b) Show only the latest modification
- (c) No, keep modification history admin-only

---

## PRIORITY RECOMMENDATION

Based on the analysis, here's a suggested implementation priority:

| Priority | Feature | Impact |
|----------|---------|--------|
| **P0** | Booking summary card inside support ticket view | Agents can't see booking details without leaving |
| **P0** | Quick action: Extend rental from support ticket | Most common support action has no shortcut |
| **P0** | Quick action: Override/waive late fee from ticket | Second most common support action |
| **P1** | Automated overdue SMS to customer | Reduces inbound support tickets |
| **P1** | Return reminder notifications to customer | Prevents late returns proactively |
| **P1** | Customer self-service extension request | Reduces support ticket volume |
| **P1** | Early return workflow | Currently no workflow exists |
| **P2** | Conflict checking on extensions | Prevents double-booking edge cases |
| **P2** | No-show auto-detection | Currently manual |
| **P2** | Support → Booking audit trail linking | Traceability improvement |
| **P3** | Action-triggered macros | Efficiency improvement |
| **P3** | Financial impact tracking in support analytics | Reporting improvement |
| **P3** | Category-specific SLA rules | Operational maturity |
