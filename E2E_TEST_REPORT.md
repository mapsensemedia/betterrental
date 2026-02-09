# End-to-End Test Report — C2C Rental Platform

**Date:** February 9, 2026  
**Tester:** Automated E2E (Browser-based)  
**Environment:** Preview (Test)  
**Scope:** Customer Booking Funnel, Admin Panel, Ops Panel, Delivery Panel

---

## Executive Summary

The platform is functionally operational with a working admin dashboard, fleet management, and booking funnel. However, **several critical and high-priority issues** were identified that directly impact revenue accuracy, customer experience, and operational workflows.

| Severity | Count |
|----------|-------|
| 🔴 Critical | 3 |
| 🟠 High | 5 |
| 🟡 Medium | 6 |
| 🔵 Low / Suggestion | 4 |

---

## 🔴 CRITICAL Issues

### 1. Booking Dates Lost Between Search → Protection Page
- **Location:** Search page → Protection page transition
- **Description:** When a customer selects dates (e.g., Feb 20–25, 5 days) on the search page and clicks "Rent Now," the dates are NOT carried forward to the Protection page. The sidebar shows **"1 day"** instead of 5 days.
- **Impact:** Pricing is calculated on the wrong duration. A 5-day rental at $35/day should cost ~$175 base, but shows ~$35. **Revenue loss on every booking.**
- **Root Cause:** The `startAt` and `endAt` URL params are missing from the protection page URL. The context/localStorage is either not persisting dates or the protection page defaults to 1 day.
- **Reproduction:** Search with any dates → Select a vehicle → Check sidebar on `/protection`
- **Suggested Fix:** Ensure `handleCategorySelect` in Search.tsx passes `startAt` and `endAt` to the protection URL params, and that the protection page reads from URL params or context correctly.

### 2. Additional Driver Appearing Without Selection
- **Location:** Booking Summary Sidebar (Add-ons page, Checkout)
- **Description:** The "Additional Driver" line item appears in the sidebar even when no additional driver has been selected. The `additional_driver_shown: true` was confirmed on the Add-ons page extract.
- **Impact:** Confusing UX. May inflate pricing. Recurring issue reported multiple times.
- **Root Cause:** The "Additional Driver" add-on ID persists in `localStorage` from previous sessions. Previous fixes may not have fully resolved the issue across all pages.
- **Suggested Fix:** Audit all pages that render `BookingSummaryPanel` to ensure the additional driver filtering logic is applied consistently. Clear stale add-on state when starting a new booking.

### 3. Inconsistent Pricing Across Pages
- **Location:** Protection page vs Add-ons page sidebar
- **Description:** Protection cost changes between pages: `$42.97 CAD` on the Protection page → `$39.25 CAD` on the Add-ons page for the same "Smart Protection" selection.
- **Impact:** Pricing inconsistency erodes customer trust and may cause disputes.
- **Root Cause:** Likely tied to the date calculation bug (#1) — if the duration changes between pages, the per-day protection cost multiplied by different day counts produces different totals.
- **Suggested Fix:** Fix the date persistence issue (#1) first, then verify all pricing calculations use a single source of truth for rental duration.

---

## 🟠 HIGH Priority Issues

### 4. Location ID Changes During Booking Funnel
- **Location:** Search → Protection page transition
- **Description:** Searched with `locationId=...0002` (Langley) but the Protection page URL shows `locationId=...0001` (Surrey Centre). The selected location is silently changed.
- **Impact:** Customer may be booked at the wrong location, causing confusion at pickup.
- **Suggested Fix:** Ensure `handleCategorySelect` passes the correct `locationId` from the search params, not from the vehicle category's default location.

### 5. Admin Booking Detail — No Financial Summary
- **Location:** `/admin/bookings/{id}`
- **Description:** The booking detail page in the Admin panel shows customer info, vehicle, rental period, and location — but **no pricing breakdown, payment status, or financial details**.
- **Impact:** Admin cannot see how much a booking costs, whether it's been paid, deposit status, or any financial data from this view.
- **Suggested Fix:** Add a "Financial Summary" card to the booking detail page showing: rental cost, protection, add-ons, taxes/fees, total, payment status, deposit status.

### 6. Admin Booking Detail — No Action Buttons
- **Location:** `/admin/bookings/{id}`
- **Description:** No action buttons (Confirm, Void, Process, Cancel) are visible on the admin booking detail page. The admin appears unable to take action on bookings from this view.
- **Impact:** Admin must navigate to the Ops panel to process bookings, reducing efficiency.
- **Note:** This may be by design (admin is read-only viewer per architecture memory), but could be confusing. At minimum, a "Process in Ops" link should be present.
- **Suggested Fix:** Add a prominent "Open in Operations" button that routes to the Ops booking workflow.

### 7. "Pay at Pickup" Option May Allow Unpaid Bookings
- **Location:** Checkout page
- **Description:** Checkout offers "Pay at Pickup – Card required on file" option. If no card validation occurs, customers could book without any payment guarantee.
- **Impact:** No-show risk without financial commitment. Revenue at risk.
- **Suggested Fix:** Ensure the "Pay at Pickup" flow still captures and validates a card on file, and clearly communicates the $19.99 no-show fee.

### 8. Several Bookings Show "1 days" Duration
- **Location:** Admin Bookings list
- **Description:** Multiple bookings (C2CMLE7C5K9, C2CMLE5NYUF, C2CMLE5MOOI) show "1 days" in the admin booking table. This is grammatically incorrect ("1 days" vs "1 day") and may indicate the date bug affected stored data.
- **Impact:** Historical data integrity; grammar issue in UI.
- **Suggested Fix:** Fix pluralization ("1 day" vs "X days"). Investigate whether the stored `total_days` in the database is correct for these bookings.

---

## 🟡 MEDIUM Priority Issues

### 9. Landing Page Search — No Location/Date Validation
- **Location:** Landing page `GlassSearchBar`
- **Description:** While driver's age is now validated, the search does NOT validate that a pickup location, pickup date, or return date has been selected. Users can search with empty fields (though dates may default).
- **Impact:** Poor UX — users may get unexpected results or errors on the search page.
- **Suggested Fix:** Add validation for required fields: location, pickup date, return date. Show inline error messages like the age validation.

### 10. Fleet Analytics Shows Negative Profit
- **Location:** `/admin/fleet-analytics`
- **Description:** Net Profit shows **-$295.85** with $0 revenue and $295.85 in costs. While technically correct (no completed rentals yet), the negative profit display may alarm new users.
- **Impact:** UX concern for new installations / empty state.
- **Suggested Fix:** Add empty state messaging: "No completed rentals yet. Revenue will appear once bookings are fulfilled."

### 11. Fleet Analytics — 37 vs 25 Vehicle Count Discrepancy
- **Location:** Fleet Costs shows "25 Total Units" but Fleet Analytics shows "37 Total Vehicles"
- **Description:** Different pages show different vehicle counts (25 vs 37).
- **Impact:** Data inconsistency reduces trust in the analytics.
- **Suggested Fix:** Clarify the difference (units vs categories × units, or active vs total) or unify the count methodology.

### 12. "Bring Car to Me" Delivery Option on Landing Page
- **Location:** Landing page search bar
- **Description:** The "Bring Car to Me" tab is visible but may not have full validation for delivery address entry at this stage.
- **Impact:** Could lead to incomplete delivery bookings if address isn't captured early.
- **Suggested Fix:** Verify the delivery flow captures a valid address before proceeding to search.

### 13. Customer License Status "Missing" on Booking Detail
- **Location:** Admin booking detail
- **Description:** License Status shows "missing" for the admin user's bookings. While expected for test data, no clear CTA exists to prompt license upload.
- **Impact:** Staff may not know where to capture/upload a license from this view.
- **Suggested Fix:** Add a link/button to the customer profile where license can be uploaded.

### 14. Debit Card Warning — Placement and UX
- **Location:** Checkout page
- **Description:** "⚠️ Debit and prepaid cards are not accepted" warning shows at checkout. It appears as a general page-level warning rather than contextual to the card input.
- **Impact:** Customer may not notice until after entering card details. Could reduce conversions.
- **Suggested Fix:** Move the warning closer to the card number field or show it as a tooltip on the card input.

---

## 🔵 LOW / Suggestions

### 15. Conversion Funnel Shows 0% Across Most Metrics
- **Location:** Admin Dashboard
- **Description:** Analytics shows 0 Vehicle Views, 1 Selection, 0 Checkout Started, 0 Bookings. Conversion rate 0%.
- **Note:** This is expected for a new/test environment, but the funnel tracking may not be capturing events correctly.
- **Suggested Action:** Verify analytics event tracking is properly instrumented on all pages (search, protection, add-ons, checkout).

### 16. "Walk-In" and "Guide" Buttons on Dashboard
- **Location:** Admin Dashboard header
- **Description:** "Walk-In" and "Guide" buttons are visible. Walk-In should create a counter booking; Guide should show onboarding help.
- **Suggested Action:** Verify both buttons are functional and provide meaningful responses.

### 17. Footer Email Subscription
- **Location:** Landing page footer
- **Description:** Email subscription input is visible but not tested for functionality.
- **Suggested Action:** Verify the subscription form actually captures emails.

### 18. Admin Sidebar — "Ops Panel" Link
- **Location:** Admin sidebar bottom
- **Description:** "Ops Panel" link provides quick navigation to `/ops`. This is good UX for switching contexts.
- **Note:** Works as expected.

---

## Pages Tested

| Page | URL | Status | Notes |
|------|-----|--------|-------|
| Landing Page | `/` | ✅ Loads | Search bar, age validation works |
| Search Results | `/search` | ✅ Loads | 8 categories shown with pricing |
| Protection | `/protection` | ⚠️ Issues | Dates lost, wrong duration shown |
| Add-ons | `/add-ons` | ⚠️ Issues | Additional driver ghost, price mismatch |
| Checkout | `/checkout` | ⚠️ Issues | Wrong total due to date bug |
| Admin Dashboard | `/admin` | ✅ Loads | All widgets render correctly |
| Admin Alerts | `/admin/alerts` | ✅ Loads | Empty state, filters work |
| Admin Bookings | `/admin/bookings` | ✅ Loads | 9 bookings listed |
| Admin Booking Detail | `/admin/bookings/{id}` | ⚠️ Issues | No financials, no action buttons |
| Admin Fleet | `/admin/fleet` | ✅ Loads | 8 categories, 3 units each |
| Admin Incidents | `/admin/incidents` | ✅ Loads | Empty state, New Incident button |
| Admin Fleet Costs | `/admin/fleet-costs` | ✅ Loads | Summary cards, 3 tabs |
| Admin Fleet Analytics | `/admin/fleet-analytics` | ✅ Loads | 8 sub-tabs, charts render |
| Admin Settings | `/admin/settings` | ✅ Loads | Settings page accessible |
| Ops Panel | `/ops` | 🔒 Not tested | Requires staff login |
| Delivery Panel | `/delivery` | 🔒 Not tested | Requires driver login |

---

## Recommendations (Priority Order)

1. **🔴 FIX IMMEDIATELY:** Date persistence across booking funnel (Search → Protection → Add-ons → Checkout). This is the #1 revenue-impacting bug.
2. **🔴 FIX IMMEDIATELY:** Remove ghost "Additional Driver" from sidebar when not selected.
3. **🟠 FIX SOON:** Correct location ID passthrough in booking funnel.
4. **🟠 FIX SOON:** Add financial summary to admin booking detail page.
5. **🟡 IMPROVE:** Add landing page form validation for location and dates.
6. **🟡 IMPROVE:** Reconcile vehicle count discrepancy between Fleet Costs and Fleet Analytics.
7. **🔵 VERIFY:** Analytics event tracking is properly instrumented.
8. **🔵 VERIFY:** "Pay at Pickup" flow captures valid card on file.

---

## Testing Limitations

- **Ops Panel and Delivery Panel** could not be fully tested as they require staff/driver role authentication. The browser session was authenticated as admin.
- **Payment flows** (Stripe integration) were not tested end-to-end as they require real/test card input.
- **Email notifications** were not verified.
- **Mobile responsiveness** was not tested (desktop viewport only).
- **Realtime features** (Supabase subscriptions) were not stress-tested.

---

*Report generated automatically. No code changes were made during this test.*
