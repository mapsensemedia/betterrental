# C2C Rental Platform - Comprehensive Manual Testing Guide

> **Version:** 2.0  
> **Last Updated:** February 2026  
> **Purpose:** Step-by-step click-by-click testing instructions for all platform features

---

## Quick Reference

### Panel URLs

| Panel | URL | Access Level |
|-------|-----|--------------|
| Customer Homepage | `/` | Public |
| Search Results | `/search` | Public |
| Protection Selection | `/protection` | Public (with booking context) |
| Add-ons | `/add-ons` | Public (with booking context) |
| Checkout | `/checkout` | Public (with booking context) |
| Customer Dashboard | `/dashboard` | Authenticated customer |
| **Admin Panel** | `/admin` | Admin role |
| **Ops Panel** | `/ops` | Staff/Admin role |
| **Delivery Panel** | `/delivery` | Driver role |
| **Support Panel** | `/support` | Support/Staff/Admin role |

### Test Accounts

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Admin | `admin@test.com` | `testpassword123` | Full admin access |
| Staff | `staff@test.com` | `testpassword123` | Ops + Support |
| Driver | `driver@test.com` | `testpassword123` | Delivery panel only |
| Customer | `customer@test.com` | `testpassword123` | Customer portal |

### Stripe Test Cards

| Scenario | Card Number | Expiry | CVC |
|----------|-------------|--------|-----|
| Success | `4242 4242 4242 4242` | Any future date | Any 3 digits |
| Decline | `4000 0000 0000 0002` | Any future date | Any 3 digits |
| Requires Auth | `4000 0025 0000 3155` | Any future date | Any 3 digits |
| Insufficient Funds | `4000 0000 0000 9995` | Any future date | Any 3 digits |

---

# PART 1: Customer Portal Testing

## TEST 1.1: Homepage Navigation

**What we're testing:** Homepage loads correctly with all sections visible

**Starting point:** Open browser to `https://betterrental.lovable.app/`

---

### Step 1: Verify Hero Section

1. **Wait for the page to load** - You should see the main homepage
2. **Look at the top of the page** - There's a navigation bar with:
   - C2C Rental logo on the left
   - "Locations" link
   - "About" link  
   - "Contact" link
   - "Sign In" button on the right
3. **Below the nav** - You see a large hero section with:
   - A background image of a car
   - A headline about car rentals
   - A search card/form overlay

**Expected Result:** Hero section displays with search card visible

---

### Step 2: Verify Search Card

1. **Find the search card** - It's a white/card component on the hero
2. **Look for these fields:**
   - "Pickup Location" dropdown
   - "Pickup Date" field with calendar icon
   - "Pickup Time" selector
   - "Return Date" field
   - "Return Time" selector
   - Orange/primary "Search Vehicles" button
3. **Click the "Pickup Location" dropdown**
4. **Verify locations appear** - You should see a list like:
   - Miami Airport
   - Fort Lauderdale Airport
   - West Palm Beach
   - (other configured locations)

**Expected Result:** Dropdown shows available pickup locations

---

### Step 3: Scroll and Verify Page Sections

1. **Scroll down the page slowly**
2. **You should see these sections in order:**
   - **Vehicle Categories** - Cards showing Economy, Midsize, SUV, etc.
   - **Why Choose Us** - Benefits/features section
   - **Locations** - Map or location cards
   - **Footer** - Contact info, links, copyright

**Expected Result:** All homepage sections render correctly

---

### Step 4: Test Navigation Links

1. **Click "Locations" in the top nav**
   - **Expected:** Page navigates to `/locations`
   - **You see:** A page with location cards or map
2. **Click the browser back button**
3. **Click "About" in the top nav**
   - **Expected:** Page navigates to `/about`
4. **Click the browser back button**
5. **Click "Contact" in the top nav**
   - **Expected:** Page navigates to `/contact`
   - **You see:** Contact form and/or contact information

**Expected Result:** All navigation links work correctly

---

## TEST 1.2: Search & Browse Flow

**What we're testing:** Searching for vehicles with location and dates

**Starting point:** Homepage (`/`)

---

### Step 1: Configure Search Parameters

1. **Click the "Pickup Location" dropdown**
2. **Select "Miami Airport"** from the list
3. **Click the "Pickup Date" field** - A calendar opens
4. **Click on tomorrow's date** in the calendar
5. **The calendar closes** or you click outside to close it
6. **Click the "Return Date" field** - Calendar opens again
7. **Click on a date 3 days after pickup**
8. **Leave pickup/return times as defaults** (or adjust if needed)

**Expected Result:** All fields are filled with your selections

---

### Step 2: Execute Search

1. **Click the orange "Search Vehicles" button**
2. **Wait for the page to load**
3. **URL changes** to something like `/search?location=...&pickup=...&return=...`

**Expected Result:** Search results page loads

---

### Step 3: Verify Search Results Page

1. **Look at the top of the page** - You should see:
   - A "Modify Search" bar showing your selected dates and location
   - The bar should be clickable to change search parameters
2. **Below the search bar** - Vehicle category cards appear
3. **Each card shows:**
   - Vehicle image
   - Category name (e.g., "Economy", "Midsize SUV")
   - Specs: seats, fuel type, transmission
   - Daily rate (e.g., "$45/day")
   - Availability badge (e.g., "3 available")
4. **Count the cards** - Multiple categories should display

**Expected Result:** Vehicle categories display with pricing and availability

---

### Step 4: Test Category Selection

1. **Click on any vehicle category card** (e.g., "Economy")
2. **A dialog/modal appears** OR you proceed to protection page
3. **If age confirmation appears:**
   - You see a prompt about age requirements (21+ or 25+)
   - Click "Confirm" or "I'm 21+" button
4. **Page navigates** to `/protection`

**Expected Result:** Clicking a category advances the booking flow

---

## TEST 1.3: Complete Booking Flow (Counter Pickup)

**What we're testing:** Full booking from search to payment confirmation

**Starting point:** Search results page with a category selected (from TEST 1.2)

---

### Step 1: Protection Selection Page

1. **You're now on `/protection`**
2. **Look at the page layout:**
   - Left side: Protection package options
   - Right side: Booking summary panel
3. **Review the protection options:**
   - **Basic** - Lowest price, highest deductible
   - **Standard** - Middle option
   - **Premium** - Highest price, zero deductible
4. **Each option shows:**
   - Package name
   - Daily rate
   - Deductible amount
   - What's covered bullet points
5. **Click on "Standard" protection** (or any option)
   - The card highlights/selects
6. **Look at the right summary panel:**
   - Shows your dates
   - Shows daily rate
   - Shows protection cost
   - Shows subtotal
7. **Click the "Continue" or "Next" button** at the bottom

**Expected Result:** Protection selected, advances to add-ons page

---

### Step 2: Add-ons Selection Page

1. **You're now on `/add-ons`**
2. **Look at available add-ons:**
   - GPS Navigation
   - Child Seat
   - Additional Driver
   - Roadside Assistance
   - WiFi Hotspot
   - (varies by configuration)
3. **Each add-on shows:**
   - Name and description
   - Price (daily rate or one-time fee)
   - Checkbox or toggle to select
4. **Click the checkbox for "GPS Navigation"**
   - It becomes selected/checked
5. **Look at the summary panel on the right:**
   - GPS is now listed
   - Total updates to include GPS cost
6. **Click "Continue" or "Proceed to Checkout" button**

**Expected Result:** Add-ons selected, advances to checkout

---

### Step 3: Checkout Page - Guest Flow

1. **You're now on `/checkout`**
2. **Look at the page sections:**
   - Contact Information form
   - Payment section
   - Order Summary (right side)

3. **Fill in Contact Information:**
   - **First Name:** `John`
   - **Last Name:** `TestCustomer`
   - **Email:** `john.test@example.com`
   - **Phone:** `305-555-0100`

4. **Look for "Pickup Mode" toggle** (if visible):
   - "Counter Pickup" should be selected (default)
   - "Delivery" is the other option

5. **Scroll to Payment Section:**
   - You see Stripe payment form
   - Card number field
   - Expiry date field
   - CVC field

6. **Enter test card details:**
   - **Card Number:** `4242 4242 4242 4242`
   - **Expiry:** `12/28`
   - **CVC:** `123`

7. **Look for terms checkbox:**
   - "I agree to the rental terms and conditions"
   - **Click the checkbox** to agree

8. **Review the Order Summary:**
   - Vehicle category
   - Dates and times
   - Protection package
   - Add-ons
   - Taxes
   - **Total amount**

9. **Click the "Complete Booking" or "Pay Now" button**

10. **Wait for processing:**
    - Button shows loading spinner
    - Payment processes with Stripe
    - Takes 2-5 seconds

**Expected Result:** Payment succeeds, redirects to confirmation

---

### Step 4: Booking Confirmation Page

1. **You're now on `/booking/[booking-id]/confirmed`** or similar
2. **You should see:**
   - Success message (green checkmark or similar)
   - "Booking Confirmed!" heading
   - **Booking Code** (e.g., "C2C-ABC123")
   - Booking details summary
   - Pickup date/time/location
   - Vehicle category
   - Protection and add-ons
3. **Look for action buttons:**
   - "View Booking Pass" or "View Details"
   - "Upload License" link/button
   - "Sign Agreement" option
4. **Write down the Booking Code** for later tests

**Expected Result:** Confirmation page displays with booking code

---

## TEST 1.4: Delivery Booking Flow

**What we're testing:** Booking with delivery instead of counter pickup

**Starting point:** Homepage (`/`)

---

### Step 1: Search for Vehicles

1. **Follow TEST 1.2 Steps 1-3** to search for vehicles
2. **Select a vehicle category**
3. **Proceed through protection selection**
4. **Proceed through add-ons selection**
5. **You arrive at checkout page**

---

### Step 2: Enable Delivery Mode

1. **On the checkout page**, look for "Pickup Mode" or "Delivery Options"
2. **You should see a toggle or radio buttons:**
   - "Counter Pickup" (default)
   - "Bring Car to Me" or "Delivery"
3. **Click "Bring Car to Me" or the Delivery option**
4. **A new section appears** for delivery address:
   - Address autocomplete field
   - "Delivery Address" label
   - Contact name field (may auto-fill)
   - Contact phone field (may auto-fill)
5. **Click the address field**
6. **Type:** `123 Ocean Drive, Miami Beach, FL`
7. **Wait for autocomplete suggestions**
8. **Click on a matching address** from the dropdown
9. **Look at the Order Summary:**
   - Delivery fee is now shown (e.g., "$29.00 delivery")
   - Total has increased

**Expected Result:** Delivery address captured, fee added to total

---

### Step 3: Complete Delivery Booking

1. **Fill in remaining contact info** (if not already filled)
2. **Enter payment details** (use test card `4242...`)
3. **Check the terms agreement box**
4. **Click "Complete Booking"**
5. **Wait for confirmation**

**Expected Result:** Booking confirmed with delivery mode

---

### Step 4: Verify Delivery Booking Details

1. **On confirmation page**, verify:
   - Booking code is displayed
   - "Delivery" or "Bring Car to Me" is shown
   - Delivery address is listed
   - Delivery fee is in the summary

**Expected Result:** Confirmation shows delivery details

---

## TEST 1.5: Post-Booking Customer Actions

**What we're testing:** License upload and agreement signing after booking

**Starting point:** Booking confirmation page (from TEST 1.3 or 1.4)

---

### Step 1: Access License Upload

1. **On confirmation page**, look for:
   - "Upload License" button or link
   - Or "Complete Pre-Arrival Steps" section
2. **Click "Upload License"**
3. **Page navigates** to `/booking/[id]/license` or similar

---

### Step 2: Upload Driver's License

1. **You see an upload interface:**
   - "Front of License" upload area
   - "Back of License" upload area
   - Drag-and-drop zones or file picker buttons
2. **Click the "Front of License" upload area**
3. **File picker opens** - Select any image file (for testing)
4. **Image appears** as a preview
5. **Click the "Back of License" upload area**
6. **Select another image file**
7. **Both images now show as previews**
8. **Click "Submit" or "Upload" button**
9. **Wait for upload to complete**
   - Success message appears
   - Status changes to "Submitted" or "Pending Review"

**Expected Result:** License images uploaded successfully

---

### Step 3: Sign Rental Agreement

1. **Navigate back to booking details** or confirmation page
2. **Look for "Sign Agreement" or "Rental Agreement" link**
3. **Click it** - Page navigates to agreement page
4. **You see:**
   - The rental agreement text (scrollable)
   - Signature capture area at the bottom
5. **Read/scroll through the agreement** (or scroll to bottom)
6. **Look for signature pad:**
   - Either a canvas to draw signature
   - Or a "Type your name" field
   - Or "I Agree" checkbox with confirmation
7. **If signature canvas:**
   - Use mouse/finger to draw your signature
   - Click "Clear" if you want to redo
8. **Click "Sign Agreement" or "Submit Signature"**
9. **Agreement is now signed:**
   - Success message appears
   - Status shows "Signed"

**Expected Result:** Rental agreement signed and confirmed

---

## TEST 1.6: Customer Dashboard

**What we're testing:** Customer's logged-in dashboard and booking management

**Starting point:** Homepage, not logged in

---

### Step 1: Customer Login

1. **Click "Sign In" button** in top navigation
2. **You're on `/auth` page**
3. **You see login form:**
   - Email field
   - Password field
   - "Sign In" button
   - "Create Account" or "Sign Up" link
4. **Enter customer credentials:**
   - Email: `customer@test.com`
   - Password: `testpassword123`
5. **Click "Sign In"**
6. **Wait for authentication**

**Expected Result:** Logged in, redirected to dashboard or homepage

---

### Step 2: Navigate to Dashboard

1. **If not already on dashboard**, click your name/avatar in top nav
2. **Click "Dashboard" or "My Bookings"**
3. **Page navigates** to `/dashboard`

---

### Step 3: Verify Dashboard Contents

1. **You should see:**
   - "My Bookings" or "Your Rentals" heading
   - List of your bookings (if any exist)
   - Each booking shows:
     - Booking code
     - Dates
     - Vehicle category
     - Status (Pending, Confirmed, Active, Completed)
2. **If you have bookings**, click on one to view details
3. **Booking detail page shows:**
   - Full booking information
   - Status timeline
   - Action buttons (if applicable)
   - License upload status
   - Agreement status

**Expected Result:** Dashboard displays bookings correctly

---

# PART 2: Admin Panel Testing

## TEST 2.1: Admin Login & Navigation

**What we're testing:** Admin panel access and sidebar navigation

**Starting point:** Browser at `/admin`

---

### Step 1: Admin Login

1. **Navigate to `/admin`**
2. **If not logged in**, you're redirected to `/auth`
3. **Login with admin credentials:**
   - Email: `admin@test.com`
   - Password: `testpassword123`
4. **After login**, you should be redirected to `/admin`

**Expected Result:** Admin panel loads with sidebar visible

---

### Step 2: Verify Admin Layout

1. **Look at the page layout:**
   - **Left sidebar** - Navigation menu
   - **Top bar** - Search box, user menu
   - **Main content area** - Dashboard or selected page
2. **In the sidebar, verify these menu items exist (top to bottom):**
   - Alerts (may have a badge count)
   - Dashboard
   - Bookings
   - Fleet
   - Incidents
   - Fleet Costs
   - Fleet Analytics
   - Analytics
   - Calendar
   - Billing
   - Support
   - Offers
   - Settings

**Expected Result:** All sidebar menu items are visible

---

### Step 3: Test Sidebar Navigation

1. **Click "Dashboard"** in sidebar
   - Page shows overview stats and charts
2. **Click "Bookings"** in sidebar
   - Page shows booking list/table
3. **Click "Fleet"** in sidebar
   - Page shows fleet management with categories/vehicles
4. **Click "Incidents"** in sidebar
   - Page shows incident list
5. **Click "Analytics"** in sidebar
   - Page shows charts and analytics

**Expected Result:** Each sidebar link navigates to correct page

---

## TEST 2.2: Walk-In Booking Creation

**What we're testing:** Creating a booking from the admin panel

**Starting point:** Admin panel (`/admin`)

---

### Step 1: Access Walk-In Booking

1. **Click "Bookings"** in the sidebar
2. **You're on `/admin/bookings`**
3. **Look for a button** labeled:
   - "+ Walk-In" (in top right area)
   - Or "New Booking" or similar
4. **Click the "+ Walk-In" button**
5. **A dialog/modal opens** titled "Walk-In Booking" or similar

**Expected Result:** Walk-in booking dialog opens

---

### Step 2: Fill Walk-In Booking Form

1. **In the dialog, fill these fields:**

   **Customer Information:**
   - **First Name:** `Walk`
   - **Last Name:** `InCustomer`
   - **Email:** `walkin@test.com`
   - **Phone:** `305-555-0200`

   **Rental Details:**
   - **Pickup Location:** Select from dropdown (e.g., "Miami Airport")
   - **Pickup Date:** Select today's date
   - **Pickup Time:** Select current time or next hour
   - **Return Date:** Select 2 days from now
   - **Return Time:** Same as pickup time
   
   **Vehicle:**
   - **Category:** Select from dropdown (e.g., "Economy")
   
2. **Look for protection selection** (may be simplified or default)
3. **Look for notes field** - Enter: `Walk-in test booking`

**Expected Result:** All required fields filled

---

### Step 3: Submit Walk-In Booking

1. **Click "Create Booking"** or "Submit" button
2. **Wait for processing**
3. **Dialog closes** on success
4. **Toast notification appears:** "Booking created successfully"
5. **Booking list refreshes** with new booking at top

**Expected Result:** Walk-in booking created, appears in list

---

### Step 4: Verify New Booking in List

1. **Look at the bookings table**
2. **Find the new booking** (should be at top if sorted by newest)
3. **Verify it shows:**
   - Booking code (C2C-XXXXXX format)
   - Customer name: "Walk InCustomer"
   - Status: "pending" or "confirmed"
   - Dates matching your input
4. **Click on the booking row** to open details

**Expected Result:** New booking visible with correct details

---

## TEST 2.3: Pickup Operations (6-Step Wizard)

**What we're testing:** The complete handover workflow for vehicle pickup

**Starting point:** Admin bookings page with a "confirmed" booking ready for pickup

**Prerequisites:** A booking with status "confirmed" and pickup date = today

---

### Step 1: Access Booking Ops

1. **On `/admin/bookings`, find a confirmed booking** with today's pickup date
2. **Click on the booking row** OR click "Pickup Ops" button
3. **You navigate to** `/admin/booking/[id]/ops` or similar
4. **You see the Booking Ops interface:**
   - Left sidebar with step list
   - Main content area with current step
   - Top bar with booking summary

---

### Step 2: Review Step Sidebar

1. **Look at the left sidebar** - You see 6 steps:
   1. **Prep** - Vehicle preparation checklist
   2. **Payment** - Deposit hold authorization
   3. **Photos** - Pre-rental condition photos
   4. **Agreement** - Rental agreement signature
   5. **Check-in** - Customer check-in verification
   6. **Handover** - Final key handover
2. **Each step shows:**
   - Step number
   - Step name
   - Completion status (checkmark if done)
3. **Current step is highlighted**

**Expected Result:** 6-step wizard sidebar visible

---

### Step 3: Step 1 - Vehicle Prep

1. **Click "Prep"** in the sidebar (or it's selected by default)
2. **Main area shows:**
   - "Vehicle Prep" heading
   - Assigned unit info (or "Assign Unit" if none)
   - Prep checklist items
3. **If no unit assigned:**
   - Click "Assign Unit" button
   - Dialog opens with available vehicles
   - Select a vehicle from the list
   - Click "Assign" button
4. **Complete the prep checklist:**
   - [ ] Vehicle cleaned ➜ **Click checkbox**
   - [ ] Fuel level checked ➜ **Click checkbox**
   - [ ] Keys ready ➜ **Click checkbox**
   - [ ] Documents prepared ➜ **Click checkbox**
5. **All checkboxes checked** = Step complete
6. **Green checkmark appears** next to "Prep" in sidebar

**Expected Result:** Prep step completed with unit assigned

---

### Step 4: Step 2 - Payment/Deposit Hold

1. **Click "Payment"** in the sidebar
2. **Main area shows:**
   - Payment status
   - Deposit hold information
   - Card on file (if available)
3. **If deposit not yet authorized:**
   - Click "Create Deposit Hold" button
   - System contacts Stripe to authorize hold
   - Wait for confirmation
4. **Once authorized, you see:**
   - "Deposit Authorized" status
   - Hold amount (e.g., "$500.00")
   - Authorization ID
   - Expiration date
5. **Step shows as complete** in sidebar

**Expected Result:** Deposit hold authorized

---

### Step 5: Step 3 - Pre-Rental Photos

1. **Click "Photos"** in the sidebar
2. **Main area shows:**
   - "Condition Photos" heading
   - Photo upload sections for different angles:
     - Front
     - Rear
     - Driver Side
     - Passenger Side
     - Interior
     - Dashboard/Odometer
3. **For each section:**
   - Click "Upload" or camera icon
   - Select a photo file
   - Photo appears as thumbnail
4. **Upload at least 4-6 photos** for key angles
5. **Enter current odometer reading** if field is shown
6. **Click "Save Photos"** or photos auto-save
7. **Step shows as complete** in sidebar

**Expected Result:** Pre-rental photos uploaded

---

### Step 6: Step 4 - Rental Agreement

1. **Click "Agreement"** in the sidebar
2. **Main area shows:**
   - "Rental Agreement" heading
   - Agreement status (Pending/Signed)
   - Options to:
     - Generate PDF agreement
     - Send to customer for digital signature
     - Capture in-person signature
3. **To capture in-person signature:**
   - Click "Capture Signature" button
   - Signature pad appears
   - Customer signs with mouse/finger/stylus
   - Click "Save Signature"
4. **Or to generate and print:**
   - Click "Generate PDF"
   - PDF opens in new tab
   - Print for physical signature
   - Mark as "Signed on Paper"
5. **Agreement status updates** to "Signed"
6. **Step shows as complete** in sidebar

**Expected Result:** Agreement signed or marked as complete

---

### Step 7: Step 5 - Customer Check-in

1. **Click "Check-in"** in the sidebar
2. **Main area shows:**
   - "Customer Check-in" heading
   - Verification checklist:
     - [ ] ID matches booking name
     - [ ] Driver's license valid and not expired
     - [ ] Age requirement verified (21+ or 25+)
     - [ ] Payment card verified
3. **Review the uploaded license** (if available):
   - License images are shown
   - Compare to physical ID
4. **Complete verification checks:**
   - Click each checkbox as you verify
5. **Enter notes if needed** in notes field
6. **Click "Complete Check-in"** button
7. **Step shows as complete** in sidebar

**Expected Result:** Customer check-in verified

---

### Step 8: Step 6 - Handover

1. **Click "Handover"** in the sidebar
2. **Main area shows:**
   - "Vehicle Handover" heading
   - Summary of booking
   - Final confirmation checklist:
     - [ ] Keys handed to customer
     - [ ] Customer briefed on vehicle operation
     - [ ] Emergency contact info provided
     - [ ] Pickup time recorded
3. **Complete the handover checklist**
4. **Click "Complete Handover"** or "Hand Over Vehicle" button
5. **Confirmation dialog may appear** - Click "Confirm"
6. **Booking status updates** to "active"
7. **Success message:** "Vehicle handed over successfully"

**Expected Result:** Handover complete, rental is now active

---

## TEST 2.4: Return Operations (5-Step Wizard)

**What we're testing:** The complete return workflow when customer brings vehicle back

**Starting point:** Admin panel with an "active" booking ready for return

**Prerequisites:** A booking with status "active"

---

### Step 1: Access Return Ops

1. **Navigate to** `/admin/bookings`
2. **Find an active booking** OR go to `/admin/returns`
3. **Click on the booking** that's being returned
4. **Click "Start Return"** button OR you're redirected to return ops
5. **You navigate to** `/admin/booking/[id]/return-ops` or similar

---

### Step 2: Review Return Step Sidebar

1. **Look at the left sidebar** - You see 5 steps:
   1. **Intake** - Initial vehicle inspection
   2. **Evidence** - Return condition photos
   3. **Issues** - Damage/issue review
   4. **Fees** - Additional charges review
   5. **Closeout** - Deposit release and completion

**Expected Result:** 5-step return wizard visible

---

### Step 3: Step 1 - Return Intake

1. **Click "Intake"** in sidebar (or selected by default)
2. **Main area shows:**
   - Return intake form
   - Fields for:
     - Current odometer reading
     - Fuel level (1/4, 1/2, 3/4, Full)
     - General condition notes
     - Return time (auto-filled or manual)
3. **Enter odometer reading:** `25450` (example)
4. **Select fuel level** from dropdown
5. **Check boxes:**
   - [ ] Vehicle exterior inspected
   - [ ] Vehicle interior inspected
   - [ ] Keys returned
6. **Add notes if needed**
7. **Click "Complete Intake"** or "Save"

**Expected Result:** Intake step completed

---

### Step 4: Step 2 - Return Evidence (Photos)

1. **Click "Evidence"** in sidebar
2. **Main area shows:**
   - Photo upload sections (same angles as pickup)
   - Previous (pre-rental) photos shown for comparison
3. **Upload return condition photos:**
   - Front, Rear, Sides, Interior
   - Focus on any damage or wear
4. **Upload at least 4-6 photos**
5. **Click "Save Photos"**

**Expected Result:** Return photos uploaded

---

### Step 5: Step 3 - Issues Review

1. **Click "Issues"** in sidebar
2. **Main area shows:**
   - "Damage/Issues Review" heading
   - Side-by-side photo comparison (before/after)
   - "Report New Damage" button
3. **If no damage found:**
   - Select "No new damage" option
   - Click "Confirm No Issues"
4. **If damage found:**
   - Click "Report New Damage" button
   - Dialog opens with:
     - Location on vehicle dropdown
     - Severity (Minor, Moderate, Severe)
     - Description field
     - Photo upload for damage
   - Fill details and click "Submit"
5. **Review any reported issues**
6. **Click "Issues Reviewed"** button

**Expected Result:** Issues step completed (with or without damages)

---

### Step 6: Step 4 - Additional Fees

1. **Click "Fees"** in sidebar
2. **Main area shows:**
   - Fee summary table
   - Automatic fees calculated:
     - Late return fee (if applicable)
     - Fuel charge (if tank not full)
     - Mileage overage (if exceeded)
   - Manual fee entry section
3. **Review automatic fees:**
   - Late fee shows hours late × rate
   - Fuel shows gallons needed × rate
4. **To add manual fee:**
   - Click "Add Fee" button
   - Enter description and amount
   - Click "Add"
5. **Review total additional charges**
6. **Click "Confirm Fees"**

**Expected Result:** All fees reviewed and confirmed

---

### Step 7: Step 5 - Closeout & Deposit

1. **Click "Closeout"** in sidebar
2. **Main area shows:**
   - Final summary of rental
   - Deposit status
   - Options:
     - Release full deposit (if no issues)
     - Capture partial deposit (for charges)
     - Capture full deposit (major issues)
3. **If no additional charges:**
   - Click "Release Deposit" button
   - Confirm the release
4. **If charges exist:**
   - Amount to capture shows calculated total
   - Click "Capture $XX.XX" button
   - Confirm the capture
5. **Click "Complete Return"** button
6. **Booking status updates** to "completed"
7. **Success message:** "Return completed successfully"

**Expected Result:** Rental closed out, deposit handled, status = completed

---

## TEST 2.5: Fleet Management

**What we're testing:** Vehicle categories and unit management

**Starting point:** Admin panel sidebar

---

### Step 1: Access Fleet Management

1. **Click "Fleet"** in the admin sidebar
2. **You navigate to** `/admin/fleet`
3. **You see tabs or sections:**
   - Categories
   - Vehicle Units
   - Maintenance (possibly)

**Expected Result:** Fleet management page loads

---

### Step 2: View Categories

1. **Click "Categories" tab** (if not already selected)
2. **You see a grid or list of vehicle categories:**
   - Each shows: image, name, daily rate, specs
   - Examples: Economy, Compact, Midsize, SUV, etc.
3. **Click on any category** to view details
4. **Category detail page shows:**
   - Category information
   - List of vehicle units in this category
   - Pricing tiers
   - Features/specs

**Expected Result:** Categories list and details visible

---

### Step 3: Edit a Category

1. **On category detail page**, click "Edit" button
2. **Edit dialog opens** with fields:
   - Name
   - Daily rate
   - Image upload
   - Seats, transmission, fuel type
   - Description
3. **Change the daily rate** to a different value
4. **Click "Save"**
5. **Changes are applied** and reflected in the list

**Expected Result:** Category updated successfully

---

### Step 4: View Vehicle Units

1. **Click "Vehicle Units" tab** OR navigate to specific category
2. **You see a table of individual vehicles:**
   - VIN
   - License plate
   - Status (Available, On Rent, Maintenance)
   - Mileage
   - Category
3. **Click on a vehicle row** to view details
4. **Vehicle unit detail shows:**
   - Full specifications
   - Maintenance history
   - Rental history
   - Current status

**Expected Result:** Vehicle units list and details accessible

---

### Step 5: Add New Vehicle Unit

1. **Click "Add Vehicle" or "+" button**
2. **Dialog opens** with fields:
   - VIN (17 characters)
   - License Plate
   - Category (dropdown)
   - Year, Make, Model
   - Color
   - Initial mileage
3. **Fill in test data:**
   - VIN: `1HGBH41JXMN109186`
   - Plate: `TEST123`
   - Category: Select "Economy"
   - Year: 2024
   - Initial mileage: 0
4. **Click "Save" or "Add Vehicle"**
5. **New vehicle appears** in the list

**Expected Result:** New vehicle unit created

---

## TEST 2.6: Billing & Deposits

**What we're testing:** Payment and deposit management

**Starting point:** Admin panel sidebar

---

### Step 1: Access Billing

1. **Click "Billing"** in the admin sidebar
2. **You navigate to** `/admin/billing`
3. **You see:**
   - Payment overview/summary
   - Deposit holds section
   - Recent transactions
   - Receipt generation

**Expected Result:** Billing page loads

---

### Step 2: View Deposit Holds

1. **Look for "Active Deposits" or "Deposit Holds" section**
2. **Table shows:**
   - Booking code
   - Customer name
   - Hold amount
   - Authorization date
   - Status (Authorized, Captured, Released)
3. **Each row has actions:**
   - View details
   - Capture deposit
   - Release deposit

**Expected Result:** Deposit holds visible

---

### Step 3: Capture a Deposit

1. **Find a deposit with "Authorized" status**
2. **Click "Capture" or action menu → "Capture"**
3. **Dialog opens** asking for:
   - Amount to capture (default = full amount)
   - Reason for capture
4. **Enter reason:** `Fuel charge - tank not full`
5. **Enter amount:** `50.00`
6. **Click "Capture"**
7. **Wait for Stripe processing**
8. **Status updates** to "Partially Captured" or shows captured amount

**Expected Result:** Deposit captured successfully

---

### Step 4: Release a Deposit

1. **Find another authorized deposit**
2. **Click "Release" or action menu → "Release"**
3. **Confirmation dialog:** "Release $500.00 deposit?"
4. **Click "Confirm Release"**
5. **Status updates** to "Released"

**Expected Result:** Deposit released successfully

---

## TEST 2.7: Incidents & Damages

**What we're testing:** Incident case management

**Starting point:** Admin panel sidebar

---

### Step 1: Access Incidents

1. **Click "Incidents"** in the admin sidebar
2. **You navigate to** `/admin/incidents`
3. **You see incident list/table:**
   - Incident ID
   - Type (Accident, Damage, Theft, etc.)
   - Booking/Vehicle
   - Status
   - Severity
   - Created date

**Expected Result:** Incidents page loads

---

### Step 2: Create New Incident

1. **Click "New Incident" or "+" button**
2. **Dialog opens** with form:
   - Incident Type (dropdown): Accident, Damage, Theft, Mechanical, Other
   - Related Booking (optional dropdown)
   - Vehicle (dropdown)
   - Severity: Minor, Moderate, Severe
   - Description (textarea)
   - Date of incident
3. **Fill in test data:**
   - Type: `Damage`
   - Vehicle: Select any
   - Severity: `Minor`
   - Description: `Small dent on rear bumper found during return inspection`
   - Date: Today
4. **Click "Create Incident"**
5. **Incident appears** in the list

**Expected Result:** New incident created

---

### Step 3: Update Incident Status

1. **Click on the incident** you just created
2. **Incident detail page shows:**
   - Full incident information
   - Status timeline
   - Actions section
   - Evidence/photos section
   - Resolution notes
3. **Click "Update Status" or status dropdown**
4. **Change status** to "Under Investigation"
5. **Add notes:** `Reviewing dashcam footage`
6. **Click "Save"**
7. **Status updates** in the incident

**Expected Result:** Incident status updated

---

# PART 3: Ops Panel Testing

## TEST 3.1: Ops Panel Access & Workboard

**What we're testing:** Operations panel for daily staff use

**Starting point:** `/ops`

---

### Step 1: Access Ops Panel

1. **Navigate to** `/ops` (or click "Ops" link if available)
2. **Login with staff credentials** if prompted:
   - Email: `staff@test.com` or `admin@test.com`
   - Password: `testpassword123`
3. **You see the Ops layout:**
   - Sidebar on left
   - Workboard in main area

**Expected Result:** Ops panel loads

---

### Step 2: Verify Ops Sidebar

1. **Look at the sidebar** - You see:
   - Workboard (with today's count badge)
   - All Bookings
   - Pickups (with count badge)
   - Active Rentals (with count badge)
   - Returns (with count badge)
   - Fleet Status
2. **Badge counts** show number of items in each queue

**Expected Result:** Ops sidebar with counts visible

---

### Step 3: Workboard Overview

1. **Click "Workboard"** in sidebar
2. **Main area shows:**
   - Today's date header
   - Summary cards:
     - Pickups Today
     - Active Rentals
     - Returns Expected
   - Quick action buttons
3. **Each card shows** count and may be clickable

**Expected Result:** Workboard summary visible

---

## TEST 3.2: Ops Pickups Queue

**What we're testing:** Managing today's pickup queue

**Starting point:** Ops panel

---

### Step 1: Access Pickups

1. **Click "Pickups"** in ops sidebar
2. **You navigate to** `/ops/pickups`
3. **You see:**
   - Filter tabs: Today, Tomorrow, All
   - List of upcoming pickups
   - Each card shows:
     - Booking code
     - Customer name
     - Vehicle category
     - Pickup time
     - Status (Pending prep, Ready, etc.)

**Expected Result:** Pickups queue displayed

---

### Step 2: Filter Pickups

1. **Click "Today" filter tab**
   - Only today's pickups show
2. **Click "Tomorrow" tab**
   - Tomorrow's pickups show
3. **Click "All" tab**
   - All upcoming pickups show

**Expected Result:** Filters work correctly

---

### Step 3: Start Pickup Process

1. **On a pickup card**, click "Start Pickup" or click the card
2. **You're taken to** the pickup ops wizard (same as TEST 2.3)
3. **Or a quick-action panel opens** with:
   - Assign vehicle
   - Mark as ready
   - View details

**Expected Result:** Can initiate pickup workflow from ops

---

## TEST 3.3: Active Rentals View

**What we're testing:** Monitoring currently active rentals

**Starting point:** Ops panel

---

### Step 1: Access Active Rentals

1. **Click "Active Rentals"** in ops sidebar
2. **You navigate to** `/ops/active`
3. **You see a list of rentals** currently on the road:
   - Booking code
   - Customer name
   - Vehicle (category + unit)
   - Started date
   - Expected return date
   - Status indicators (on-time, overdue, etc.)

**Expected Result:** Active rentals list displayed

---

### Step 2: Check for Overdue Rentals

1. **Look for any bookings** past their return date
2. **These should be highlighted** or have "Overdue" badge
3. **Click on an overdue rental** to view details
4. **Details show:**
   - How many hours/days overdue
   - Customer contact information
   - Late fee calculation

**Expected Result:** Overdue rentals are clearly marked

---

## TEST 3.4: Returns Queue

**What we're testing:** Managing expected returns

**Starting point:** Ops panel

---

### Step 1: Access Returns

1. **Click "Returns"** in ops sidebar
2. **You navigate to** `/ops/returns`
3. **You see:**
   - Filter tabs: Today, Overdue, All
   - List of expected returns
   - Each card shows:
     - Booking code
     - Customer name
     - Vehicle info
     - Expected return time
     - Status

**Expected Result:** Returns queue displayed

---

### Step 2: Start Return Process

1. **Find a rental** that's ready to return
2. **Click "Start Return"** or click the card
3. **You're taken to** return ops wizard (same as TEST 2.4)

**Expected Result:** Can initiate return workflow from ops

---

# PART 4: Delivery Panel Testing

## TEST 4.1: Delivery Panel Access

**What we're testing:** Driver delivery portal access and dashboard

**Starting point:** `/delivery`

---

### Step 1: Access Delivery Panel

1. **Navigate to** `/delivery`
2. **Login with driver credentials:**
   - Email: `driver@test.com`
   - Password: `testpassword123`
3. **You see the Delivery Portal:**
   - Header with logo
   - "My Deliveries" tab
   - "Available" tab
   - Delivery cards

**Expected Result:** Delivery panel loads

---

### Step 2: View My Deliveries

1. **Click "My Deliveries" tab** (if not selected)
2. **You see deliveries assigned to you:**
   - Customer name
   - Delivery address
   - Scheduled time
   - Status (Assigned, En Route, Arrived)
   - Action buttons

**Expected Result:** Assigned deliveries visible

---

### Step 3: View Available Deliveries

1. **Click "Available" tab**
2. **You see unassigned deliveries:**
   - Delivery details
   - "Claim" button on each card
3. **These are deliveries** any driver can claim

**Expected Result:** Available deliveries visible

---

## TEST 4.2: Claim a Delivery

**What we're testing:** Driver claiming an unassigned delivery

**Starting point:** Delivery panel, Available tab

---

### Step 1: Claim Delivery

1. **On "Available" tab**, find a delivery
2. **Click "Claim" button** on the delivery card
3. **Confirmation appears:** "Claim this delivery?"
4. **Click "Confirm"**
5. **Delivery moves** to "My Deliveries" tab
6. **Status updates** to "Assigned"

**Expected Result:** Delivery claimed successfully

---

## TEST 4.3: Complete Delivery Workflow

**What we're testing:** Full delivery process from start to handover

**Starting point:** Delivery panel with a claimed delivery

---

### Step 1: Start Delivery

1. **On "My Deliveries"**, find your claimed delivery
2. **Click "Start" or "Begin Delivery"**
3. **Status updates** to "En Route"
4. **Map may show** route to destination

**Expected Result:** Delivery started, status = en route

---

### Step 2: Mark Arrived

1. **Click "Arrived" or "I'm Here"** when at location
2. **GPS may be captured** automatically
3. **Status updates** to "Arrived"
4. **Timer may start** for handover

**Expected Result:** Arrival recorded

---

### Step 3: Complete Handover

1. **Delivery detail expands** with handover checklist:
   - Customer ID verified
   - Agreement signed
   - Vehicle condition acknowledged
   - Keys handed over
2. **Capture signature** (if required)
   - Signature pad appears
   - Customer signs
3. **Upload handover photo** (if required)
   - Photo of vehicle at delivery location
4. **Click "Complete Delivery"**
5. **Status updates** to "Delivered"
6. **Delivery disappears** from active list

**Expected Result:** Delivery completed successfully

---

## TEST 4.4: Walk-In Booking (Delivery Panel)

**What we're testing:** Creating a walk-in booking from delivery panel

**Starting point:** Delivery panel

---

### Step 1: Access Walk-In

1. **Look for "Walk-In" button** (usually top right)
2. **Click "Walk-In"**
3. **Booking form opens** (similar to admin walk-in)

---

### Step 2: Create Walk-In

1. **Fill customer details**
2. **Select vehicle category**
3. **Set dates**
4. **Click "Create"**
5. **Booking is created** with appropriate status

**Expected Result:** Walk-in booking created from delivery panel

---

# PART 5: Support Panel Testing

## TEST 5.1: Support Panel Access

**What we're testing:** Support ticket queue and management

**Starting point:** `/support`

---

### Step 1: Access Support Panel

1. **Navigate to** `/support`
2. **Login with support credentials:**
   - Email: `admin@test.com` or support role
   - Password: `testpassword123`
3. **You see Support Panel:**
   - Sidebar with navigation
   - Ticket queue in main area

**Expected Result:** Support panel loads

---

### Step 2: View Ticket Queue

1. **Main area shows ticket list:**
   - Ticket ID
   - Subject
   - Customer name
   - Status (Open, Pending, Resolved, Closed)
   - Priority (Low, Medium, High, Urgent)
   - Last updated
2. **Filter options:**
   - Status filter
   - Priority filter
   - Search box

**Expected Result:** Ticket queue visible with filters

---

## TEST 5.2: Create Support Ticket

**What we're testing:** Creating a new support ticket

**Starting point:** Support panel

---

### Step 1: Create Ticket

1. **Click "New Ticket" or "+" button**
2. **Form opens** with fields:
   - Customer (dropdown or search)
   - Related Booking (optional)
   - Subject
   - Description
   - Priority
   - Category (Billing, Technical, General, etc.)
3. **Fill in:**
   - Subject: `Billing question about extra charges`
   - Description: `Customer is asking about the fuel charge on their last rental`
   - Priority: `Medium`
   - Category: `Billing`
4. **Click "Create Ticket"**

**Expected Result:** New ticket created

---

## TEST 5.3: Reply to Ticket

**What we're testing:** Responding to customer tickets

**Starting point:** Support panel with tickets

---

### Step 1: Open Ticket

1. **Click on a ticket** in the queue
2. **Ticket detail page shows:**
   - Ticket information header
   - Conversation thread
   - Reply box at bottom
   - Action buttons (Resolve, Close, Escalate)

---

### Step 2: Send Reply

1. **In the reply box**, type:
   `Hi [Customer], thank you for reaching out. I've reviewed your rental and the fuel charge was applied because the tank was returned at 1/2 instead of full. Please let me know if you have any other questions.`
2. **Click "Send" or "Reply"**
3. **Message appears** in the conversation thread
4. **Ticket status** may update to "Pending" (awaiting customer)

**Expected Result:** Reply sent and visible

---

### Step 3: Resolve Ticket

1. **After issue is resolved**, click "Resolve" button
2. **Confirmation:** "Mark this ticket as resolved?"
3. **Click "Confirm"**
4. **Status updates** to "Resolved"

**Expected Result:** Ticket marked as resolved

---

# PART 6: End-to-End Integration Tests

## TEST 6.1: Complete Rental Lifecycle (E2E)

**What we're testing:** Full rental from booking to return

**Duration:** ~15-20 minutes

---

### Phase 1: Customer Booking (5 min)

1. **As customer**, complete TEST 1.3 (full booking flow)
2. **Note the booking code:** `______________`
3. **Upload license** (TEST 1.5 Step 2)
4. **Sign agreement** (TEST 1.5 Step 3)

---

### Phase 2: Admin Pickup (5 min)

1. **Login as admin** to `/admin`
2. **Find the booking** by code
3. **Complete 6-step pickup wizard** (TEST 2.3)
4. **Verify booking status** = "active"

---

### Phase 3: Active Rental Period (1 min)

1. **Go to Ops panel** `/ops`
2. **Check "Active Rentals"**
3. **Verify rental appears** with correct details

---

### Phase 4: Return Process (5 min)

1. **In admin panel**, start return for the booking
2. **Complete 5-step return wizard** (TEST 2.4)
3. **Release deposit** (or capture if charges)
4. **Verify booking status** = "completed"

---

### Phase 5: Verification (2 min)

1. **Check customer dashboard:**
   - Booking shows as "Completed"
   - Receipt is available
2. **Check admin billing:**
   - Deposit is released
   - Transaction is logged

**Expected Result:** Complete rental lifecycle works end-to-end

---

## TEST 6.2: Delivery Booking E2E

**What we're testing:** Full delivery booking from customer to driver handover

---

### Phase 1: Customer Books Delivery (5 min)

1. **Complete TEST 1.4** (delivery booking flow)
2. **Note booking code:** `______________`

---

### Phase 2: Admin Processes Pre-Dispatch (5 min)

1. **Admin panel**: Find the delivery booking
2. **Complete Steps 1-4** of pickup wizard:
   - Prep (assign unit)
   - Payment (authorize deposit)
   - Photos
   - Agreement
3. **Booking ready** for dispatch

---

### Phase 3: Driver Delivers (5 min)

1. **Login to delivery panel** as driver
2. **Claim the delivery** (if not assigned)
3. **Start delivery** → En Route
4. **Mark arrived**
5. **Complete handover:**
   - Signature captured
   - Photos taken
   - Keys handed over
6. **Complete delivery**

---

### Phase 4: Verify (2 min)

1. **Check booking status** = "active"
2. **Check delivery status** = "delivered"
3. **Vehicle unit status** = "on_rent"

**Expected Result:** Delivery workflow complete

---

# APPENDICES

## A. Stripe Test Card Reference

| Scenario | Card Number | Result |
|----------|-------------|--------|
| Success | 4242 4242 4242 4242 | Payment succeeds |
| Decline | 4000 0000 0000 0002 | Card declined |
| Requires Auth | 4000 0025 0000 3155 | 3D Secure required |
| Insufficient | 4000 0000 0000 9995 | Insufficient funds |
| Processing Error | 4000 0000 0000 0119 | Processing error |
| Expired | 4000 0000 0000 0069 | Expired card |

**All test cards use:**
- Expiry: Any future date (e.g., 12/28)
- CVC: Any 3 digits
- ZIP: Any 5 digits (if required)

---

## B. Status Workflow Reference

### Booking Statuses

```
draft → pending → confirmed → active → completed
                     ↓
                 cancelled (from pending/confirmed)
                     ↓
                  no_show (from confirmed, pickup window missed)
```

### Deposit Statuses

```
null → authorized → captured/released
                ↓
         partially_captured
                ↓
              released
```

### Delivery Statuses

```
unassigned → assigned → picked_up → en_route → arrived → delivered
                                        ↓
                                      issue
```

### Incident Statuses

```
reported → under_investigation → in_repair → resolved → closed
```

---

## C. Test Data Templates

### Customer Information
```
First Name: Test
Last Name: Customer
Email: test[N]@example.com (replace N with number)
Phone: 305-555-01[NN]
```

### Vehicle Information
```
VIN: 1HGBH41JXMN[NNNNNN] (17 chars total)
Plate: TST[NNN]
Year: 2024
```

### Address (Miami Area)
```
100 Ocean Drive, Miami Beach, FL 33139
1111 Lincoln Road, Miami Beach, FL 33139
200 Biscayne Blvd, Miami, FL 33132
Miami International Airport, Miami, FL 33126
```

---

## D. Troubleshooting Guide

### Common Issues

**Issue: Can't login to admin panel**
- Verify you're using correct credentials
- Check if account has admin role assigned
- Clear browser cache and cookies
- Try incognito/private browser window

**Issue: Payment fails**
- Use correct test card number (4242...)
- Ensure expiry is future date
- Check if Stripe is configured correctly
- Look for error message details

**Issue: Booking not appearing in list**
- Refresh the page
- Check filter settings (status, date range)
- Verify booking was created successfully
- Check console for errors

**Issue: Photos not uploading**
- Check file size (usually max 10MB)
- Try different image format (JPG, PNG)
- Check internet connection
- Look for upload error messages

**Issue: Deposit operations failing**
- Verify Stripe webhook is active
- Check if original payment method is valid
- Look at Stripe dashboard for errors
- Review deposit_ledger table

---

## E. Test Execution Checklist

Use this checklist to track test completion:

### Customer Portal
- [ ] TEST 1.1: Homepage Navigation
- [ ] TEST 1.2: Search & Browse
- [ ] TEST 1.3: Complete Booking (Counter)
- [ ] TEST 1.4: Delivery Booking
- [ ] TEST 1.5: Post-Booking Actions
- [ ] TEST 1.6: Customer Dashboard

### Admin Panel
- [ ] TEST 2.1: Login & Navigation
- [ ] TEST 2.2: Walk-In Booking
- [ ] TEST 2.3: Pickup Operations (6 steps)
- [ ] TEST 2.4: Return Operations (5 steps)
- [ ] TEST 2.5: Fleet Management
- [ ] TEST 2.6: Billing & Deposits
- [ ] TEST 2.7: Incidents & Damages

### Ops Panel
- [ ] TEST 3.1: Workboard
- [ ] TEST 3.2: Pickups Queue
- [ ] TEST 3.3: Active Rentals
- [ ] TEST 3.4: Returns Queue

### Delivery Panel
- [ ] TEST 4.1: Dashboard Access
- [ ] TEST 4.2: Claim Delivery
- [ ] TEST 4.3: Complete Delivery
- [ ] TEST 4.4: Walk-In Booking

### Support Panel
- [ ] TEST 5.1: Panel Access
- [ ] TEST 5.2: Create Ticket
- [ ] TEST 5.3: Reply & Resolve

### Integration Tests
- [ ] TEST 6.1: Complete Rental Lifecycle
- [ ] TEST 6.2: Delivery Booking E2E

---

**End of Manual Testing Guide**
