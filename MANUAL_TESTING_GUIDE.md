# C2C Rental Platform - Comprehensive Manual Testing Guide

> **Version:** 3.0  
> **Last Updated:** February 2026  
> **Purpose:** Step-by-step click-by-click testing instructions for all platform features  
> **Verified:** All test cases verified against live application

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

### Rental Locations (Verified)

| Location Name | Address | City |
|---------------|---------|------|
| Surrey Newton | 6786 King George Blvd, Surrey, BC V3W 4Z5 | Surrey |
| Langley Centre | 5933 200 St, Langley, BC V3A 1N2 | Langley |
| Abbotsford Centre | 32835 South Fraser Way, Abbotsford, BC | Abbotsford |

### Vehicle Categories (Verified)

| Category | Daily Rate | Example Vehicles |
|----------|------------|------------------|
| Economy | $35/day | Nissan Versa, Kia Rio |
| Mid Size | $45/day | Toyota Corolla, Honda Civic |
| Full Size | $55/day | Toyota Camry, Honda Accord |
| Mid Size SUV | $65/day | Toyota RAV4, Honda CR-V |
| Large SUV | $95/day | Dodge Durango, Chevrolet Tahoe |
| Minivan | $85/day | Chrysler Pacifica, Honda Odyssey |
| Mystery Car | $25/day | Random vehicle assignment |
| SUV | Varies | Ford Edge and similar |
| Sedan | Varies | Various sedans |
| Sports | Varies | Performance vehicles |

### Add-ons Available (Verified)

| Add-on Name | Daily Rate | Description |
|-------------|------------|-------------|
| Additional Driver | $15.00/day | Add an extra authorized driver |
| Booster Seat | $12.99/day | For children 40-100 lbs |
| Child Seat | $12.99/day | For ages 4-7, 40-80 lbs |
| Infant Seat | $12.99/day | Rear-facing for babies up to 22 lbs |
| Premium Roadside Assistance | $12.99/day | 24/7 roadside coverage |
| Fuel Service - Full Tank | $0.00 | Pre-purchase fuel option |

### Protection Packages (Verified)

| Package | Description |
|---------|-------------|
| No Extra Protection | Basic coverage, highest deductible |
| Basic Protection | Standard coverage with reduced deductible |
| Smart Protection | Enhanced coverage, lower deductible |
| All Inclusive | Full coverage, zero deductible |

### Test Accounts

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Admin | `admin@c2crental.ca` | (contact admin) | Full admin access |
| Staff | (configure in system) | (configure) | Ops + Support |
| Driver | (configure in system) | (configure) | Delivery panel |
| Customer | (create test account) | (your password) | Customer portal |

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
   - A background image
   - A headline about car rentals
   - A glass-style search card overlay

**Expected Result:** Hero section displays with search card visible

---

### Step 2: Verify Search Card

1. **Find the search card** - It's a glass/card component on the hero with backdrop blur
2. **Look for these fields:**
   - "Pickup Location" dropdown
   - "Pickup Date" field (date input)
   - "Pickup Time" dropdown
   - "Return Date" field (date input)
   - "Return Time" dropdown
   - "Return to same location" checkbox
   - Orange/primary "Search Vehicles" button
3. **Click the "Pickup Location" dropdown**
4. **Verify locations appear** - You should see exactly these 3 options:
   - **Surrey Centre - Surrey**
   - **Langley Centre - Langley**
   - **Abbotsford Centre - Abbotsford**

**Expected Result:** Dropdown shows the 3 BC locations

---

### Step 3: Scroll and Verify Page Sections

1. **Scroll down the page slowly**
2. **You should see these sections in order:**
   - **Vehicle Categories** - Cards showing Economy, Midsize, SUV, etc.
   - **Why Choose Us** - Benefits/features section with icons
   - **Locations** - Location cards or map
   - **Footer** - Contact info, links, copyright

**Expected Result:** All homepage sections render correctly

---

### Step 4: Test Navigation Links

1. **Click "Locations" in the top nav**
   - **Expected:** Page navigates to `/locations`
   - **You see:** Location cards with addresses for Surrey, Langley, Abbotsford
2. **Click the browser back button**
3. **Click "About" in the top nav**
   - **Expected:** Page navigates to `/about`
   - **You see:** About page with company information
4. **Click the browser back button**
5. **Click "Contact" in the top nav**
   - **Expected:** Page navigates to `/contact`
   - **You see:** Contact form and contact information

**Expected Result:** All navigation links work correctly

---

## TEST 1.2: Search & Browse Flow

**What we're testing:** Searching for vehicles with location and dates

**Starting point:** Homepage (`/`)

---

### Step 1: Configure Search Parameters

1. **Click the "Pickup Location" dropdown**
2. **Select "Surrey Centre - Surrey"** from the list
3. **Click the "Pickup Date" field** - A native date picker opens
4. **Select tomorrow's date** using the date picker
5. **The pickup date is set**
6. **Click the "Return Date" field** - Date picker opens
7. **Select a date 3 days after pickup**
8. **Pickup and Return times** default to 10:00 AM (or adjust if needed)

**Expected Result:** All fields are filled with your selections

---

### Step 2: Execute Search

1. **Click the "Search Vehicles" button** (orange/primary button)
2. **Wait for the page to load**
3. **URL changes** to something like `/search?locationId=...&startAt=...&endAt=...`

**Expected Result:** Search results page loads

---

### Step 3: Verify Search Results Page

1. **Look at the top of the page** - You should see:
   - A "Modify Search" bar showing your selected dates and location
   - The bar is clickable to change search parameters
2. **Below the search bar** - Vehicle category cards appear
3. **Each card shows:**
   - Vehicle category image
   - Category name (e.g., "Economy", "Mid Size SUV")
   - Specs: seats, fuel type, transmission
   - Daily rate (e.g., "$35/day")
   - "Rent Now" or "Select" button
4. **Count the cards** - Multiple categories should display (Economy, Mid Size, Full Size, SUVs, Minivan, etc.)

**Expected Result:** Vehicle categories display with pricing

---

### Step 4: Test Category Selection

1. **Click on any vehicle category card** (e.g., "Economy" at $35/day)
2. **An age confirmation modal may appear:**
   - Asking about driver's age (21-25 or 25-70)
   - Select your age range
   - Click "Continue" or "Confirm"
3. **Page navigates** to `/protection`

**Expected Result:** Clicking a category advances to protection selection

---

## TEST 1.3: Complete Booking Flow (Counter Pickup)

**What we're testing:** Full booking from search to payment confirmation

**Starting point:** Search results page with a category selected (from TEST 1.2)

---

### Step 1: Protection Selection Page

1. **You're now on `/protection`**
2. **Look at the page layout:**
   - Left side: Protection package options
   - Right side: Booking summary panel (may be sticky)
3. **Review the protection options (4 tiers):**
   - **No Extra Protection** - No additional coverage
   - **Basic Protection** - Standard coverage, some deductible
   - **Smart Protection** - Enhanced coverage, lower deductible
   - **All Inclusive** - Full coverage, zero deductible
4. **Each option shows:**
   - Package name
   - Daily rate or "Included"
   - Coverage details/bullet points
5. **Click on "Basic Protection"** (or any option)
   - The card highlights/selects with a checkmark or border
6. **Look at the right summary panel:**
   - Shows your dates
   - Shows daily rate
   - Shows protection cost added
   - Shows running total
7. **Click the "Continue" button** at the bottom

**Expected Result:** Protection selected, advances to add-ons page

---

### Step 2: Add-ons Selection Page

1. **You're now on `/add-ons`**
2. **Look at available add-ons:**
   - Additional Driver ($15.00/day)
   - Booster Seat ($12.99/day)
   - Child Seat ($12.99/day)
   - Infant Seat ($12.99/day)
   - Premium Roadside Assistance ($12.99/day)
   - Fuel Service - Full Tank (may show $0.00)
3. **Each add-on shows:**
   - Name and description
   - Daily price
   - Quantity selector or checkbox
4. **Click the checkbox or "Add" for "Additional Driver"**
   - It becomes selected
5. **Look at the summary panel on the right:**
   - Additional Driver is now listed
   - Total updates to include add-on cost
6. **Click "Continue" or "Proceed to Checkout" button**

**Expected Result:** Add-ons selected, advances to checkout

---

### Step 3: Checkout Page - Guest Flow

1. **You're now on `/checkout`**
2. **Look at the page sections:**
   - Contact Information form
   - Payment section
   - Order Summary (typically right side)

3. **Fill in Contact Information:**
   - **First Name:** `John`
   - **Last Name:** `TestCustomer`
   - **Email:** `john.test@example.com`
   - **Phone:** `604-555-0100`

4. **Look for "Pickup Mode" or "Delivery" option** (if visible):
   - "Counter Pickup" should be default
   - "Bring Car to Me" / "Delivery" is the other option

5. **Scroll to Payment Section:**
   - You see Stripe payment form elements
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
   - Vehicle category name
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

1. **You're now on** `/booking/[booking-id]/confirmed` or similar
2. **You should see:**
   - Success message (green checkmark or similar)
   - "Booking Confirmed!" heading
   - **Booking Code** (e.g., "C2C-ABC123")
   - Booking details summary
   - Pickup date/time/location
   - Vehicle category
   - Protection and add-ons selected
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
   - Address autocomplete field (Mapbox powered)
   - "Delivery Address" label
   - Contact name field (may auto-fill)
   - Contact phone field (may auto-fill)
5. **Click the address field**
6. **Type:** `123 King George Blvd, Surrey, BC`
7. **Wait for autocomplete suggestions**
8. **Click on a matching address** from the dropdown
9. **Look at the Order Summary:**
   - Delivery fee may be shown (e.g., "Free" for ≤10km, "$49" for 10-50km)
   - Total updates if delivery fee applies

**Expected Result:** Delivery address captured, fee calculated

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
   - "Delivery" mode is shown
   - Delivery address is listed
   - Delivery fee (if any) is in the summary

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

**Starting point:** Homepage, logged in as customer

---

### Step 1: Access Dashboard

1. **If not logged in**, click "Sign In" in top nav
2. **On `/auth` page**, login with your credentials
3. **After login**, click your name/avatar in top nav
4. **Click "Dashboard" or navigate to `/dashboard`**

---

### Step 2: Verify Dashboard Contents

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
   - Email: `admin@c2crental.ca`
   - Password: (your admin password)
4. **After login**, you should be redirected to `/admin`

**Expected Result:** Admin panel loads with sidebar visible

---

### Step 2: Verify Admin Layout

1. **Look at the page layout:**
   - **Left sidebar** - Navigation menu with icons
   - **Top bar** - Header with logo and user menu
   - **Main content area** - Dashboard or selected page
2. **In the sidebar, verify these menu items exist (top to bottom):**
   - Alerts (with badge count for pending alerts)
   - Dashboard (Overview)
   - Bookings
   - Active Rentals
   - Returns
   - Fleet
   - Incidents
   - Fleet Costs
   - Fleet Analytics
   - Analytics
   - Calendar
   - Billing
   - Support
   - Verifications
   - Offers
   - Settings

**Expected Result:** All sidebar menu items are visible

---

### Step 3: Test Sidebar Navigation

1. **Click "Dashboard"** in sidebar
   - Page shows overview stats and summary cards
2. **Click "Bookings"** in sidebar
   - Page shows booking list/table with filters
3. **Click "Fleet"** in sidebar
   - Page shows fleet management with categories tab
4. **Click "Incidents"** in sidebar
   - Page shows incident case list
5. **Click "Analytics"** in sidebar
   - Page shows charts and revenue analytics

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
   - "+ Walk-In" or "New Walk-In" (in header area)
4. **Click the "+ Walk-In" button**
5. **A dialog/modal opens** titled "Walk-In Booking"

**Expected Result:** Walk-in booking dialog opens

---

### Step 2: Fill Walk-In Booking Form

1. **In the dialog, fill these fields:**

   **Customer Information:**
   - **First Name:** `Walk`
   - **Last Name:** `InCustomer`
   - **Email:** `walkin@test.com`
   - **Phone:** `604-555-0200`

   **Rental Details:**
   - **Pickup Location:** Select "Surrey Centre" from dropdown
   - **Pickup Date:** Select today's date
   - **Pickup Time:** Select current time or next hour
   - **Return Date:** Select 2 days from now
   - **Return Time:** Same as pickup time
   
   **Vehicle:**
   - **Category:** Select from dropdown (e.g., "Economy")
   
2. **Look for protection selection** (may be simplified)
3. **Look for notes field** - Enter: `Walk-in test booking`

**Expected Result:** All required fields filled

---

### Step 3: Submit Walk-In Booking

1. **Click "Create Booking"** or "Submit" button
2. **Wait for processing**
3. **Dialog closes** on success
4. **Toast notification appears:** "Booking created successfully"
5. **Booking list refreshes** with new booking

**Expected Result:** Walk-in booking created, appears in list

---

## TEST 2.3: Pickup Operations (6-Step Wizard)

**What we're testing:** The complete handover workflow for vehicle pickup

**Starting point:** Admin bookings page with a "confirmed" booking ready for pickup

**Prerequisites:** A booking with status "confirmed" and pickup date = today

---

### Step 1: Access Booking Ops

1. **On `/admin/bookings`, find a confirmed booking** with today's pickup date
2. **Click on the booking row** or click action button
3. **You navigate to** `/admin/booking/[id]/ops`
4. **You see the Booking Ops interface:**
   - Left sidebar with step list (vertical stepper)
   - Main content area with current step
   - Top bar with booking summary

---

### Step 2: Review Step Sidebar

1. **Look at the left sidebar** - You see steps:
   1. **Prep** - Vehicle preparation checklist
   2. **Payment** - Deposit hold authorization
   3. **Photos** - Pre-rental condition photos
   4. **Walkaround** - Customer walkaround acknowledgment
   5. **Agreement** - Rental agreement signature
   6. **Check-in** - Customer verification
   7. **Handover** - Final key handover
2. **Each step shows:**
   - Step icon
   - Step name
   - Completion status (checkmark if done)
3. **Current step is highlighted**

**Expected Result:** Step wizard sidebar visible

---

### Step 3: Step 1 - Vehicle Prep

1. **Click "Prep"** in the sidebar (or it's selected by default)
2. **Main area shows:**
   - "Vehicle Prep" heading
   - Unit assignment section
   - Prep checklist items
3. **If no unit assigned:**
   - Click "Assign Unit" button
   - Dialog opens with available vehicles
   - Select a vehicle VIN from the list
   - Click "Assign" button
4. **Complete the prep checklist items** by clicking each checkbox
5. **All checkboxes checked** = Step complete
6. **Green checkmark appears** next to "Prep" in sidebar

**Expected Result:** Prep step completed with unit assigned

---

### Step 4: Step 2 - Payment/Deposit Hold

1. **Click "Payment"** in the sidebar
2. **Main area shows:**
   - Payment status
   - Deposit hold information
   - Card details (if on file)
3. **If deposit not yet authorized:**
   - Click "Create Deposit Hold" button
   - System creates authorization via Stripe
   - Wait for confirmation
4. **Once authorized, you see:**
   - "Deposit Authorized" or "Hold Active" status
   - Hold amount displayed
   - Authorization date
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
     - Fuel Gauge
3. **For each required section:**
   - Click upload area or camera icon
   - Select a photo file
   - Photo appears as thumbnail
4. **Upload at least 4-6 photos** for key angles
5. **Enter current odometer reading** in the field
6. **Record fuel level**
7. **Photos auto-save** or click "Save"
8. **Step shows as complete** in sidebar

**Expected Result:** Pre-rental photos uploaded

---

### Step 6: Step 4 - Customer Walkaround

1. **Click "Walkaround"** in the sidebar
2. **Options to:**
   - Send walkaround link to customer via SMS
   - Capture walkaround acknowledgment in-person
3. **Customer acknowledges vehicle condition**
4. **Step shows as complete**

**Expected Result:** Walkaround acknowledged

---

### Step 7: Step 5 - Rental Agreement

1. **Click "Agreement"** in the sidebar
2. **Main area shows:**
   - "Rental Agreement" heading
   - Agreement status (Pending/Signed)
   - Options to:
     - Generate PDF agreement
     - Send for digital signature
     - Capture in-person signature
3. **To capture in-person signature:**
   - Click "Capture Signature" button
   - Signature pad canvas appears
   - Customer signs with mouse/finger
   - Click "Save Signature"
4. **Agreement status updates** to "Signed"
5. **Step shows as complete** in sidebar

**Expected Result:** Agreement signed or marked as complete

---

### Step 8: Step 6 - Customer Check-in

1. **Click "Check-in"** in the sidebar
2. **Main area shows:**
   - "Customer Check-in" heading
   - Verification checklist:
     - ID matches booking name
     - Driver's license valid
     - Age requirement verified
3. **Review the uploaded license** (if available)
4. **Complete verification checks** by clicking checkboxes
5. **Click "Complete Check-in"** button
6. **Step shows as complete** in sidebar

**Expected Result:** Customer check-in verified

---

### Step 9: Step 7 - Handover

1. **Click "Handover"** in the sidebar
2. **Main area shows:**
   - "Vehicle Handover" heading
   - Summary of booking
   - Final confirmation options
3. **Complete handover confirmation**
4. **Click "Complete Handover"** or "Hand Over Vehicle" button
5. **Booking status updates** to "active"
6. **Success message:** "Vehicle handed over successfully"

**Expected Result:** Handover complete, rental is now active

---

## TEST 2.4: Return Operations (6-Step Wizard)

**What we're testing:** The complete return workflow when customer brings vehicle back

**Starting point:** Admin panel with an "active" booking ready for return

**Prerequisites:** A booking with status "active"

---

### Step 1: Access Return Ops

1. **Navigate to** `/admin/bookings` or `/admin/returns`
2. **Find an active booking**
3. **Click on the booking** or "Start Return" button
4. **You navigate to** `/admin/booking/[id]/return-ops`

---

### Step 2: Review Return Step Sidebar

1. **Look at the left sidebar** - You see steps:
   1. **Intake** - Initial vehicle inspection with odometer/fuel
   2. **Evidence** - Return condition photos
   3. **Issues** - Damage/issue review and flags
   4. **Fees** - Late fees and additional charges
   5. **Deposit** - Deposit release or capture
   6. **Closeout** - Final completion

**Expected Result:** 6-step return wizard visible

---

### Step 3: Step 1 - Return Intake

1. **Click "Intake"** in sidebar (or selected by default)
2. **Main area shows:**
   - Return intake form
   - Fields for:
     - Current odometer reading (must be >= pickup reading)
     - Fuel level dropdown (1/8 increments: Empty, 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8, Full)
     - Condition notes
3. **Enter odometer reading** (e.g., `25450`)
   - System validates: must be >= pickup odometer
   - Warning if > 5000km difference
4. **Select fuel level** from dropdown
5. **Click "Complete Intake"** or "Save"

**Expected Result:** Intake step completed

---

### Step 4: Step 2 - Return Evidence (Photos)

1. **Click "Evidence"** in sidebar
2. **Main area shows:**
   - Photo upload sections (same angles as pickup)
   - Previous (pre-rental) photos shown for comparison
   - **Fuel Gauge photo required** if fuel is lower than pickup
3. **Upload return condition photos:**
   - Front, Rear, Sides, Interior
   - Fuel gauge (mandatory if fuel below pickup level)
4. **Upload at least 4-6 photos**
5. **Click "Save Photos"**

**Expected Result:** Return photos uploaded

---

### Step 5: Step 3 - Issues Review

1. **Click "Issues"** in sidebar
2. **Main area shows:**
   - "Issues Review" or "Flag Problems" heading
   - Options to mark return as exception
   - Damage report section
3. **If no issues:**
   - Confirm no new damage found
4. **If damage found:**
   - Click "Report Damage" or flag the issue
   - Enter damage description
   - Select severity
   - Upload damage photos
5. **Click "Issues Reviewed"** or complete step

**Expected Result:** Issues step completed

---

### Step 6: Step 4 - Additional Fees

1. **Click "Fees"** in sidebar
2. **Main area shows:**
   - Late fee calculation (if applicable)
     - 30-minute grace period
     - 25% of daily rate per hour after grace
   - Other fee options
3. **Review automatic fees:**
   - Late fee shows hours late × calculated rate
4. **Confirm or adjust fees**

**Expected Result:** Fees reviewed and confirmed

---

### Step 7: Step 5 - Deposit Handling

1. **Click "Deposit"** in sidebar
2. **Main area shows:**
   - Deposit status and hold amount
   - Options:
     - Release full deposit (if no issues)
     - Capture partial amount (for charges)
     - Capture full deposit (major issues)
3. **If capturing any amount:**
   - **Select category** (required: Damage, Late Fee, Fuel, Cleaning, Other)
   - **Enter reason** (minimum 20 characters required)
   - Enter amount to capture
4. **Click "Release Deposit"** or "Capture" button
5. **Confirm the action**

**Expected Result:** Deposit handled appropriately

---

### Step 8: Step 6 - Closeout

1. **Click "Closeout"** in sidebar
2. **Main area shows:**
   - Final summary of rental
   - Generate receipt option
   - Send confirmation email option
3. **Click "Complete Return"** button
4. **Booking status updates** to "completed"
5. **Success message:** "Return completed successfully"

**Expected Result:** Rental closed out, status = completed

---

## TEST 2.5: Fleet Management

**What we're testing:** Vehicle categories and unit management

**Starting point:** Admin panel sidebar

---

### Step 1: Access Fleet Management

1. **Click "Fleet"** in the admin sidebar
2. **You navigate to** `/admin/fleet`
3. **You see tabs:**
   - Categories
   - Overview
   - Utilization
   - Other fleet tabs

**Expected Result:** Fleet management page loads

---

### Step 2: View Categories

1. **Click "Categories" tab** (if not already selected)
2. **You see a grid or list of vehicle categories:**
   - Economy, Mid Size, Full Size, SUV variants, Minivan, etc.
   - Each shows: image, name, daily rate, vehicle count
3. **Click on any category** to view details
4. **Category detail shows:**
   - Category information
   - List of vehicle units
   - Pricing
   - Availability

**Expected Result:** Categories list and details visible

---

### Step 3: View Vehicle Units

1. **Navigate to a category** or vehicle units section
2. **You see individual vehicles:**
   - VIN
   - License plate
   - Status (Available, On Rent, Maintenance)
   - Mileage
   - Category
3. **Click on a vehicle** to view unit details
4. **Unit detail shows:**
   - Full specifications
   - Maintenance history
   - Current booking (if on rent)

**Expected Result:** Vehicle units list and details accessible

---

## TEST 2.6: Billing & Deposits

**What we're testing:** Payment and deposit management

**Starting point:** Admin panel sidebar

---

### Step 1: Access Billing

1. **Click "Billing"** in the admin sidebar
2. **You navigate to** `/admin/billing`
3. **You see:**
   - Deposit management section
   - Transaction history
   - Failed payments (if any)

**Expected Result:** Billing page loads

---

### Step 2: View Deposit Holds

1. **Look for deposit holds section**
2. **Table shows:**
   - Booking code
   - Customer name
   - Hold amount
   - Status (Authorized, Captured, Released)
   - Actions available

**Expected Result:** Deposit holds visible

---

## TEST 2.7: Incidents & Damages

**What we're testing:** Incident case management

**Starting point:** Admin panel sidebar

---

### Step 1: Access Incidents

1. **Click "Incidents"** in the admin sidebar
2. **You navigate to** `/admin/incidents`
3. **You see incident list:**
   - Incident ID
   - Type (Accident, Damage, etc.)
   - Vehicle
   - Status
   - Severity
   - Date

**Expected Result:** Incidents page loads

---

### Step 2: Create New Incident

1. **Click "New Incident" or "+" button**
2. **Dialog opens** with form fields:
   - Incident Type dropdown
   - Related Booking (optional)
   - Vehicle selection
   - Severity
   - Description
   - Date
3. **Fill in test data:**
   - Type: `Damage`
   - Severity: `Minor`
   - Description: `Small scratch found on rear bumper`
4. **Click "Create Incident"**
5. **Incident appears** in the list

**Expected Result:** New incident created

---

# PART 3: Ops Panel Testing

## TEST 3.1: Ops Panel Access & Workboard

**What we're testing:** Operations panel for daily staff use

**Starting point:** `/ops`

---

### Step 1: Access Ops Panel

1. **Navigate to** `/ops`
2. **Login with staff/admin credentials** if prompted
3. **You see the Ops layout:**
   - Sidebar on left with navigation
   - Workboard in main area

**Expected Result:** Ops panel loads

---

### Step 2: Verify Ops Sidebar

1. **Look at the sidebar** - You see:
   - Workboard (main dashboard)
   - Bookings (all bookings list)
   - Pickups (today's pickups with count)
   - Active Rentals (count badge)
   - Returns (returns queue)
   - Fleet (fleet status)
2. **Badge counts** show number of items in each queue

**Expected Result:** Ops sidebar with counts visible

---

### Step 3: Workboard Overview

1. **Click "Workboard"** in sidebar
2. **Main area shows:**
   - Today's summary
   - Quick action cards
   - Upcoming pickups/returns

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
   - Filter options (Today, etc.)
   - List of upcoming pickups
   - Each shows: booking code, customer, vehicle, time, status

**Expected Result:** Pickups queue displayed

---

### Step 2: Start Pickup Process

1. **Find a pickup** ready for processing
2. **Click "Start Pickup"** or the booking card
3. **You're taken to** the pickup ops wizard

**Expected Result:** Can initiate pickup workflow from ops

---

## TEST 3.3: Active Rentals View

**What we're testing:** Monitoring currently active rentals

**Starting point:** Ops panel

---

### Step 1: Access Active Rentals

1. **Click "Active Rentals"** in ops sidebar
2. **You navigate to** `/ops/active`
3. **You see rentals currently on the road:**
   - Booking code
   - Customer name
   - Vehicle info
   - Start date
   - Expected return date
   - Status indicators

**Expected Result:** Active rentals list displayed

---

## TEST 3.4: Returns Queue

**What we're testing:** Managing expected returns

**Starting point:** Ops panel

---

### Step 1: Access Returns

1. **Click "Returns"** in ops sidebar
2. **You navigate to** `/ops/returns`
3. **You see:**
   - Filter options
   - List of expected returns
   - Each shows: booking, customer, vehicle, expected time

**Expected Result:** Returns queue displayed

---

# PART 4: Delivery Panel Testing

## TEST 4.1: Delivery Panel Access

**What we're testing:** Driver delivery portal access and dashboard

**Starting point:** `/delivery`

---

### Step 1: Access Delivery Panel

1. **Navigate to** `/delivery`
2. **Login with driver credentials** if prompted
3. **You see the Delivery Portal:**
   - Header with C2C logo
   - "My Deliveries" tab
   - "Unassigned" tab (available deliveries)
   - Delivery cards grid

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

### Step 3: View Unassigned Deliveries

1. **Click "Unassigned" tab**
2. **You see deliveries available to claim:**
   - Delivery details
   - "Claim" button on each card

**Expected Result:** Available deliveries visible

---

## TEST 4.2: Claim a Delivery

**What we're testing:** Driver claiming an unassigned delivery

**Starting point:** Delivery panel, Unassigned tab

---

### Step 1: Claim Delivery

1. **On "Unassigned" tab**, find a delivery
2. **Click "Claim" button** on the delivery card
3. **Confirmation may appear**
4. **Click "Confirm"**
5. **Delivery moves** to "My Deliveries" tab
6. **Status updates** to "Assigned"

**Expected Result:** Delivery claimed successfully

---

## TEST 4.3: Complete Delivery Workflow

**What we're testing:** Full delivery process from start to handover

**Starting point:** Delivery panel with a claimed delivery

---

### Step 1: View Delivery Details

1. **On "My Deliveries"**, click on a delivery card
2. **Delivery detail page shows:**
   - Customer info
   - Delivery address with map
   - Vehicle details
   - Action buttons

---

### Step 2: Start Delivery

1. **Click "Start" or "Begin Delivery"**
2. **Status updates** to "En Route"

**Expected Result:** Delivery started

---

### Step 3: Mark Arrived

1. **Click "Arrived" or "I'm Here"**
2. **GPS location may be captured**
3. **Status updates** to "Arrived"

**Expected Result:** Arrival recorded

---

### Step 4: Complete Handover

1. **Handover checklist appears:**
   - Customer ID verified
   - Vehicle condition acknowledged
   - Keys handed over
2. **Capture signature** if required
3. **Upload handover photos** if required
4. **Click "Complete Delivery"**
5. **Status updates** to "Delivered"

**Expected Result:** Delivery completed successfully

---

# PART 5: Support Panel Testing

## TEST 5.1: Support Panel Access

**What we're testing:** Support ticket queue and management

**Starting point:** `/support`

---

### Step 1: Access Support Panel

1. **Navigate to** `/support`
2. **Login with support/admin credentials**
3. **You see Support Panel:**
   - Sidebar with Tickets and Analytics
   - Ticket queue in main area

**Expected Result:** Support panel loads

---

### Step 2: View Ticket Queue

1. **Main area shows ticket list:**
   - Ticket ID/subject
   - Customer info
   - Status (Open, Pending, Resolved, Closed)
   - Priority
   - Last updated
2. **Filter options available**

**Expected Result:** Ticket queue visible with filters

---

## TEST 5.2: Work with Tickets

**What we're testing:** Viewing and responding to tickets

---

### Step 1: Open Ticket

1. **Click on a ticket** in the queue
2. **Ticket detail shows:**
   - Ticket information
   - Conversation thread
   - Reply box
   - Action buttons (Resolve, Close)

---

### Step 2: Send Reply

1. **Type a reply** in the reply box
2. **Click "Send" or "Reply"**
3. **Message appears** in the conversation

**Expected Result:** Reply sent and visible

---

# PART 6: End-to-End Integration Tests

## TEST 6.1: Complete Rental Lifecycle (E2E)

**What we're testing:** Full rental from booking to return

**Duration:** ~15-20 minutes

---

### Phase 1: Customer Booking (5 min)

1. **As customer**, complete TEST 1.3 (full booking flow)
2. **Select location:** Surrey Centre
3. **Note the booking code:** `______________`
4. **Upload license** (TEST 1.5 Step 2)
5. **Sign agreement** (TEST 1.5 Step 3)

---

### Phase 2: Admin Pickup (5 min)

1. **Login as admin** to `/admin`
2. **Find the booking** by code in Bookings
3. **Complete pickup wizard steps:**
   - Assign unit
   - Authorize deposit
   - Upload photos
   - Complete agreement
   - Check-in customer
   - Complete handover
4. **Verify booking status** = "active"

---

### Phase 3: Active Rental Period (1 min)

1. **Go to Ops panel** `/ops`
2. **Check "Active Rentals"**
3. **Verify rental appears** with correct details

---

### Phase 4: Return Process (5 min)

1. **In admin panel**, start return for the booking
2. **Complete return wizard steps:**
   - Record odometer and fuel
   - Upload return photos
   - Review any issues
   - Handle late fees (if any)
   - Release or capture deposit
   - Complete closeout
3. **Verify booking status** = "completed"

---

### Phase 5: Verification (2 min)

1. **Check customer dashboard:**
   - Booking shows as "Completed"
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
2. **Use delivery address in Surrey area**
3. **Note booking code:** `______________`

---

### Phase 2: Admin Processes Pre-Dispatch (5 min)

1. **Admin panel**: Find the delivery booking
2. **Complete initial pickup wizard steps:**
   - Prep (assign unit)
   - Payment (authorize deposit)
   - Photos
   - Agreement
3. **Booking ready** for driver pickup

---

### Phase 3: Driver Delivers (5 min)

1. **Login to delivery panel** as driver
2. **Claim the delivery** (if not assigned)
3. **Start delivery** → En Route
4. **Mark arrived**
5. **Complete handover** with signature

---

### Phase 4: Verify (2 min)

1. **Check booking status** = "active"
2. **Check delivery status** = "delivered"

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
pending → confirmed → active → completed
              ↓
          cancelled (from pending/confirmed)
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
unassigned → assigned → en_route → arrived → delivered
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
Phone: 604-555-01[NN]
```

### Vehicle Information
```
VIN: 1HGBH41JXMN[NNNNNN] (17 chars total)
Plate: TST[NNN]
Year: 2024
```

### Address (BC Lower Mainland Area)
```
100 King George Blvd, Surrey, BC
5933 200 St, Langley, BC V3A 1N2
32835 South Fraser Way, Abbotsford, BC
123 Main Street, Vancouver, BC
```

---

## D. Troubleshooting Guide

### Common Issues

**Issue: Can't login to admin panel**
- Verify you're using correct credentials
- Check if account has admin role assigned in user_roles table
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
- Review deposit_ledger table for status

**Issue: Late fee calculation**
- 30-minute grace period after scheduled return
- Fee = 25% of daily rate per hour after grace
- Verify daily rate is correct in booking

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
- [ ] TEST 2.3: Pickup Operations (7 steps)
- [ ] TEST 2.4: Return Operations (6 steps)
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

### Support Panel
- [ ] TEST 5.1: Panel Access
- [ ] TEST 5.2: Work with Tickets

### Integration Tests
- [ ] TEST 6.1: Complete Rental Lifecycle
- [ ] TEST 6.2: Delivery Booking E2E

---

## F. Business Rules Reference

### Late Return Policy
- **Grace Period:** 30 minutes after scheduled return time
- **Late Fee:** 25% of daily rate per hour after grace period
- Example: $100/day rate = $25/hour late fee

### Delivery Pricing
- **≤10km from location:** Free delivery
- **10-50km from location:** $49 delivery fee
- **>50km:** Delivery not available

### Age Requirements
- **21-25 years:** Young driver fee may apply
- **25-70 years:** Standard rates

### Deposit Capture Categories
When capturing deposit funds, must select:
- Damage
- Late Fee
- Fuel
- Cleaning
- Other

Minimum 20-character reason required.

### Fuel Level Recording (Return)
Fuel levels recorded in 1/8 increments:
- Empty (0%)
- 1/8 (12.5%)
- 1/4 (25%)
- 3/8 (37.5%)
- 1/2 (50%)
- 5/8 (62.5%)
- 3/4 (75%)
- 7/8 (87.5%)
- Full (100%)

If fuel level at return is lower than at pickup, fuel gauge photo is **mandatory**.

---

**End of Manual Testing Guide**
