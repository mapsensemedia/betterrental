# 03 — ROUTES AND PAGES

Everything below is parsed from `src/App.tsx` (the single router) and the
page files it references. Line numbers are real.

---

## 1. Route table

`src/App.tsx` declares **100** `<Route>` elements.

| # | Path | Component / target | Component file | Lazy | Guard | Roles allowed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `/` (App.tsx:163) | `<Index>` | `src/pages/Index.tsx` | no | none | public (no guard) |
| 2 | `/search` (App.tsx:164) | `<Search>` | `src/pages/Search.tsx` | no | none | public (no guard) |
| 3 | `/auth` (App.tsx:165) | `<Auth>` | `src/pages/Auth.tsx` | no | none | public (no guard) |
| 4 | `/compare` (App.tsx:168) | `<Compare>` | `src/pages/Compare.tsx` | yes | none | public (no guard) |
| 5 | `/forgot-password` (App.tsx:169) | `<ForgotPassword>` | `src/pages/ForgotPassword.tsx` | yes | none | public (no guard) |
| 6 | `/reset-password` (App.tsx:170) | `<ResetPassword>` | `src/pages/ResetPassword.tsx` | yes | none | public (no guard) |
| 7 | `/checkout` (App.tsx:171) | `<NewCheckout>` | `src/pages/NewCheckout.tsx` | yes | none | public (no guard) |
| 8 | `/complete-signup` (App.tsx:172) | `<CompleteSignup>` | `src/pages/CompleteSignup.tsx` | yes | none | public (no guard) |
| 9 | `/dashboard` (App.tsx:173) | `<Dashboard>` | `src/pages/Dashboard.tsx` | yes | none | public (no guard) |
| 10 | `/booking/:id` (App.tsx:174) | `<BookingDetail>` | `src/pages/BookingDetail.tsx` | yes | none | public (no guard) |
| 11 | `/locations` (App.tsx:175) | `<Locations>` | `src/pages/Locations.tsx` | yes | none | public (no guard) |
| 12 | `/location/:id` (App.tsx:176) | `<LocationDetail>` | `src/pages/LocationDetail.tsx` | yes | none | public (no guard) |
| 13 | `/check-in` (App.tsx:177) | `<CheckIn>` | `src/pages/CheckIn.tsx` | yes | none | public (no guard) |
| 14 | `/protection` (App.tsx:178) | `<Protection>` | `src/pages/Protection.tsx` | yes | none | public (no guard) |
| 15 | `/add-ons` (App.tsx:179) | `<AddOns>` | `src/pages/AddOns.tsx` | yes | none | public (no guard) |
| 16 | `/about` (App.tsx:180) | `<About>` | `src/pages/About.tsx` | yes | none | public (no guard) |
| 17 | `/surrey` (App.tsx:181) | `<Surrey>` | `src/pages/Surrey.tsx` | yes | none | public (no guard) |
| 18 | `/langley` (App.tsx:182) | `<Langley>` | `src/pages/Langley.tsx` | yes | none | public (no guard) |
| 19 | `/langley-200-street` (App.tsx:183) | `<Langley200Street>` | `src/pages/Langley200Street.tsx` | yes | none | public (no guard) |
| 20 | `/abbotsford` (App.tsx:184) | `<Abbotsford>` | `src/pages/Abbotsford.tsx` | yes | none | public (no guard) |
| 21 | `/contact` (App.tsx:185) | `<Contact>` | `src/pages/Contact.tsx` | yes | none | public (no guard) |
| 22 | `/subscription` (App.tsx:186) | `<Subscription>` | `src/pages/Subscription.tsx` | yes | none | public (no guard) |
| 23 | `/blog` (App.tsx:187) | `<BlogIndex>` | `src/pages/blog/BlogIndex.tsx` | yes | none | public (no guard) |
| 24 | `/blog/car-rental-surrey-guide` (App.tsx:188) | `<CarRentalSurreyGuide>` | `src/pages/blog/CarRentalSurreyGuide.tsx` | yes | none | public (no guard) |
| 25 | `/blog/icbc-car-rental-insurance-bc` (App.tsx:189) | `<IcbcCarRentalInsurance>` | `src/pages/blog/IcbcCarRentalInsurance.tsx` | yes | none | public (no guard) |
| 26 | `/blog/best-road-trips-from-surrey-bc` (App.tsx:190) | `<BestRoadTripsFromSurrey>` | `src/pages/blog/BestRoadTripsFromSurrey.tsx` | yes | none | public (no guard) |
| 27 | `/blog/car-rental-tips-new-drivers-bc` (App.tsx:191) | `<CarRentalTipsNewDrivers>` | `src/pages/blog/CarRentalTipsNewDrivers.tsx` | yes | none | public (no guard) |
| 28 | `/blog/affordable-car-rental-surrey-langley-abbotsford-bc` (App.tsx:192) | `<AffordableCarRentalSurreyLangleyAbbotsford>` | `src/pages/blog/AffordableCarRentalSurreyLangleyAbbotsford.tsx` | yes | none | public (no guard) |
| 29 | `/blog/daily-vs-weekly-car-rental-surrey-bc` (App.tsx:193) | `<DailyVsWeeklyCarRentalSurrey>` | `src/pages/blog/DailyVsWeeklyCarRentalSurrey.tsx` | yes | none | public (no guard) |
| 30 | `/blog/c2c-vs-turo-vs-enterprise-surrey` (App.tsx:194) | `<C2cVsTuroVsEnterpriseSurrey>` | `src/pages/blog/C2cVsTuroVsEnterpriseSurrey.tsx` | yes | none | public (no guard) |
| 31 | `/booking/confirmed` (App.tsx:195) | `<BookingConfirmed>` | `src/pages/booking/BookingConfirmed.tsx` | yes | none | public (no guard) |
| 32 | `/booking/:bookingId/license` (App.tsx:196) | `<BookingLicense>` | `src/pages/booking/BookingLicense.tsx` | yes | none | public (no guard) |
| 33 | `/booking/:bookingId/agreement` (App.tsx:197) | `<BookingAgreement>` | `src/pages/booking/BookingAgreement.tsx` | yes | none | public (no guard) |
| 34 | `/booking/:bookingId/pass` (App.tsx:198) | `<BookingPass>` | `src/pages/booking/BookingPass.tsx` | yes | none | public (no guard) |
| 35 | `/booking/:bookingId/pickup` (App.tsx:199) | `<BookingPickup>` | `src/pages/booking/BookingPickup.tsx` | yes | none | public (no guard) |
| 36 | `/booking/:bookingId/return` (App.tsx:200) | `<BookingReturn>` | `src/pages/booking/BookingReturn.tsx` | yes | none | public (no guard) |
| 37 | `/walkaround/:bookingId` (App.tsx:201) | `<WalkaroundSign>` | `src/pages/booking/WalkaroundSign.tsx` | yes | none | public (no guard) |
| 38 | `/my-booking` (App.tsx:203) | redirect → `/dashboard` | — | — | none | public |
| 39 | `/my-booking/:bookingCode` (App.tsx:204) | redirect → `/dashboard` | — | — | none | public |
| 40 | `/terms` (App.tsx:206) | `<Terms>` | `src/pages/PdfViewerPage.tsx` | yes | none | public (no guard) |
| 41 | `/legal` (App.tsx:207) | `<Legal>` | `src/pages/PdfViewerPage.tsx` | yes | none | public (no guard) |
| 42 | `/privacy` (App.tsx:208) | `<Privacy>` | `src/pages/PdfViewerPage.tsx` | yes | none | public (no guard) |
| 43 | `/vehicle/:id` (App.tsx:211) | redirect → `/search` | — | — | none | public |
| 44 | `/car/:id` (App.tsx:212) | redirect → `/search` | — | — | none | public |
| 45 | `/browse/:id` (App.tsx:213) | redirect → `/search` | — | — | none | public |
| 46 | `/details/:id` (App.tsx:214) | redirect → `/search` | — | — | none | public |
| 47 | `/admin` (App.tsx:217) | redirect → `/admin/alerts` | — | — | none | public |
| 48 | `/admin/login` (App.tsx:218) | `<AdminLogin>` | `src/pages/admin/AdminLogin.tsx` | yes | none | public (no guard) |
| 49 | `/admin/alerts` (App.tsx:219) | `<AdminAlerts>` | `src/pages/admin/Alerts.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 50 | `/admin/bookings` (App.tsx:220) | `<AdminBookings>` | `src/pages/admin/Bookings.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 51 | `/admin/bookings/:bookingId` (App.tsx:221) | `<AdminBookingDetail>` | `src/pages/admin/BookingDetail.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 52 | `/admin/bookings/:bookingId/ops` (App.tsx:222) | `<BookingOps>` | `src/pages/admin/BookingOps.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 53 | `/admin/agreements` (App.tsx:223) | `<AdminAgreements>` | `src/pages/admin/Agreements.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 54 | `/admin/finance` (App.tsx:224) | `<AdminFinance>` | `src/pages/admin/Finance.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 55 | `/admin/billing` (App.tsx:225) | redirect → `/admin/finance?tab=transactions` | — | — | none | public |
| 56 | `/admin/payment-dashboard` (App.tsx:226) | redirect → `/admin/finance?tab=overview` | — | — | none | public |
| 57 | `/admin/reconciliation` (App.tsx:227) | redirect → `/admin/finance` | — | — | none | public |
| 58 | `/admin/returns/:bookingId` (App.tsx:228) | `<ReturnOps>` | `src/pages/admin/ReturnOps.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 59 | `/admin/active-rentals/:bookingId` (App.tsx:229) | `<ActiveRentalDetail>` | `src/pages/admin/ActiveRentalDetail.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 60 | `/admin/inventory` (App.tsx:230) | redirect → `/admin/fleet` | — | — | none | public |
| 61 | `/admin/staff` (App.tsx:231) | `<AdminStaff>` | `src/pages/admin/Staff.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 62 | `/admin/fleet` (App.tsx:232) | `<FleetManagement>` | `src/pages/admin/FleetManagement.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 63 | `/admin/fleet-analytics` (App.tsx:233) | `<FleetAnalytics>` | `src/pages/admin/FleetAnalytics.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 64 | `/admin/fleet-costs` (App.tsx:234) | `<FleetCosts>` | `src/pages/admin/FleetCosts.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 65 | `/admin/fleet/vehicle/:unitId` (App.tsx:235) | `<VehicleUnitDetail>` | `src/pages/admin/VehicleUnitDetail.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 66 | `/admin/fleet/category/:categoryId` (App.tsx:236) | `<CategoryDetail>` | `src/pages/admin/CategoryDetail.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 67 | `/admin/calendar` (App.tsx:237) | `<AdminCalendar>` | `src/pages/admin/Calendar.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 68 | `/admin/tickets` (App.tsx:238) | `<AdminTickets>` | `src/pages/admin/Tickets.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 69 | `/admin/abandoned-carts` (App.tsx:239) | `<AbandonedCarts>` | `src/pages/admin/AbandonedCarts.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 70 | `/admin/reports` (App.tsx:240) | `<AdminReports>` | `src/pages/admin/Reports.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 71 | `/admin/settings` (App.tsx:241) | `<AdminSettings>` | `src/pages/admin/Settings.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 72 | `/admin/offers` (App.tsx:242) | `<AdminOffers>` | `src/pages/admin/Offers.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 73 | `/admin/incidents` (App.tsx:243) | `<AdminIncidents>` | `src/pages/admin/Incidents.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 74 | `/admin/damages` (App.tsx:244) | `<AdminDamages>` | `src/pages/admin/Damages.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 75 | `/admin/vendors` (App.tsx:245) | `<AdminVendors>` | `src/pages/admin/Vendors.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 76 | `/admin/debug/:bookingId` (App.tsx:246) | `<BookingDebug>` | `src/pages/admin/BookingDebug.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 77 | `/support` (App.tsx:249) | `<SupportTickets>` | `src/pages/support/SupportTickets.tsx` | yes | SupportProtectedRoute | super_admin, manager, admin, staff, support (src/hooks/use-support-access.ts:19-20) |
| 78 | `/support/analytics` (App.tsx:250) | `<SupportAnalyticsPage>` | `src/pages/support/SupportAnalytics.tsx` | yes | SupportProtectedRoute | super_admin, manager, admin, staff, support (src/hooks/use-support-access.ts:19-20) |
| 79 | `/delivery` (App.tsx:253) | `<DeliveryDashboard>` | `src/features/delivery/pages/Dashboard.tsx` | yes | DeliveryProtectedRoute | super_admin, manager, admin, staff, driver (src/hooks/use-delivery-access.ts:19-20) |
| 80 | `/delivery/walk-in` (App.tsx:254) | `<DeliveryWalkIn>` | `src/features/delivery/pages/WalkIn.tsx` | yes | DeliveryProtectedRoute | super_admin, manager, admin, staff, driver (src/hooks/use-delivery-access.ts:19-20) |
| 81 | `/delivery/:id` (App.tsx:255) | `<DeliveryDetail>` | `src/features/delivery/pages/Detail.tsx` | yes | DeliveryProtectedRoute | super_admin, manager, admin, staff, driver (src/hooks/use-delivery-access.ts:19-20) |
| 82 | `/ops` (App.tsx:258) | `<OpsWorkboard>` | `src/pages/ops/OpsWorkboard.tsx` | yes | OpsProtectedRoute | see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner) |
| 83 | `/ops/bookings` (App.tsx:259) | `<OpsBookings>` | `src/pages/ops/OpsBookings.tsx` | yes | OpsProtectedRoute | see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner) |
| 84 | `/ops/pickups` (App.tsx:260) | `<OpsPickups>` | `src/pages/ops/OpsPickups.tsx` | yes | OpsProtectedRoute | see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner) |
| 85 | `/ops/active` (App.tsx:261) | `<OpsActiveRentals>` | `src/pages/ops/OpsActiveRentals.tsx` | yes | OpsProtectedRoute | see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner) |
| 86 | `/ops/returns` (App.tsx:262) | `<OpsReturns>` | `src/pages/ops/OpsReturns.tsx` | yes | OpsProtectedRoute | see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner) |
| 87 | `/ops/fleet` (App.tsx:263) | `<OpsFleet>` | `src/pages/ops/OpsFleet.tsx` | yes | OpsProtectedRoute | see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner) |
| 88 | `/ops/booking/:bookingId` (App.tsx:265) | `<AdminBookingDetail>` | `src/pages/admin/BookingDetail.tsx` | yes | OpsProtectedRoute | see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner) |
| 89 | `/ops/booking/:bookingId/handover` (App.tsx:266) | `<BookingOps>` | `src/pages/admin/BookingOps.tsx` | yes | OpsProtectedRoute | see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner) |
| 90 | `/ops/rental/:bookingId` (App.tsx:267) | `<ActiveRentalDetail>` | `src/pages/admin/ActiveRentalDetail.tsx` | yes | OpsProtectedRoute | see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner) |
| 91 | `/ops/return/:bookingId` (App.tsx:268) | `<ReturnOps>` | `src/pages/admin/ReturnOps.tsx` | yes | OpsProtectedRoute | see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner) |
| 92 | `/admin/history` (App.tsx:271) | redirect → `/admin/bookings?tab=completed` | — | — | none | public |
| 93 | `/admin/handovers` (App.tsx:272) | redirect → `/admin/bookings` | — | — | none | public |
| 94 | `/admin/photos` (App.tsx:273) | redirect → `/admin/fleet` | — | — | none | public |
| 95 | `/admin/verifications` (App.tsx:274) | redirect → `/admin/alerts?type=verification_pending` | — | — | none | public |
| 96 | `/admin/analytics` (App.tsx:275) | `<AdminReports>` | `src/pages/admin/Reports.tsx` | yes | AdminProtectedRoute | super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30) |
| 97 | `/admin/audit-logs` (App.tsx:276) | redirect → `/admin/reports` | — | — | none | public |
| 98 | `/admin/support` (App.tsx:279) | redirect → `/support` | — | — | none | public |
| 99 | `/admin/support-analytics` (App.tsx:280) | redirect → `/support/analytics` | — | — | none | public |
| 100 | `*` (App.tsx:283) | `<NotFound>` | `src/pages/NotFound.tsx` | yes | none | public (no guard) |

### 1.1 Redirect-only routes

| Path | Redirects to |
| --- | --- |
| `/my-booking` | `/dashboard` |
| `/my-booking/:bookingCode` | `/dashboard` |
| `/vehicle/:id` | `/search` |
| `/car/:id` | `/search` |
| `/browse/:id` | `/search` |
| `/details/:id` | `/search` |
| `/admin` | `/admin/alerts` |
| `/admin/billing` | `/admin/finance?tab=transactions` |
| `/admin/payment-dashboard` | `/admin/finance?tab=overview` |
| `/admin/reconciliation` | `/admin/finance` |
| `/admin/inventory` | `/admin/fleet` |
| `/admin/history` | `/admin/bookings?tab=completed` |
| `/admin/handovers` | `/admin/bookings` |
| `/admin/photos` | `/admin/fleet` |
| `/admin/verifications` | `/admin/alerts?type=verification_pending` |
| `/admin/audit-logs` | `/admin/reports` |
| `/admin/support` | `/support` |
| `/admin/support-analytics` | `/support/analytics` |

### 1.2 Reachability

A route is marked **DEAD ROUTE** when no `<Link to>`, `navigate()`, `href`,
sitemap entry or redirect target anywhere in `src/` or `public/` points at it
and it is not a documented external entry point.

| Path | Referenced from (excluding App.tsx) | Verdict |
| --- | --- | --- |
| `/` | `index.html`, `public/_headers`, `src/tailwind.config.lov.json`, `src/vite-env.d.ts`, `src/auth/capabilities.ts`, `src/domain/queryKeys.ts` … | reachable |
| `/search` | `public/llms.txt`, `public/sitemap.xml`, `src/constants/gbpLinks.ts`, `src/pages/blog/DailyVsWeeklyCarRentalSurrey.tsx`, `src/pages/Langley.tsx`, `src/pages/BookingDetail.tsx` … | reachable |
| `/auth` | `public/robots.txt`, `src/pages/ForgotPassword.tsx`, `src/pages/CheckIn.tsx`, `src/pages/CompleteSignup.tsx`, `src/pages/ResetPassword.tsx`, `src/pages/BookingDetail.tsx` … | reachable |
| `/compare` | `public/sitemap.xml`, `public/llms.txt`, `src/pages/Compare.tsx`, `src/components/layout/Footer.tsx` | reachable |
| `/forgot-password` | `public/robots.txt`, `src/pages/Auth.tsx`, `src/pages/ResetPassword.tsx` | reachable |
| `/reset-password` | `public/robots.txt`, `src/pages/ForgotPassword.tsx` | reachable |
| `/checkout` | `public/robots.txt`, `src/pages/AddOns.tsx`, `src/pages/NewCheckout.tsx`, `src/components/shared/BookingStepper.tsx`, `src/components/rental/RentalStepHeader.tsx`, `src/hooks/use-hold.ts` | reachable |
| `/complete-signup` | `public/robots.txt`, `src/pages/NewCheckout.tsx` | reachable |
| `/dashboard` | `public/robots.txt`, `src/pages/BookingDetail.tsx`, `src/pages/Auth.tsx`, `src/pages/CompleteSignup.tsx`, `src/pages/ResetPassword.tsx`, `src/pages/NewCheckout.tsx` … | reachable |
| `/booking/:id` | `src/domain/index.ts`, `public/robots.txt`, `src/index.css`, `src/hooks/use-fleet-categories.ts`, `src/hooks/use-auth.ts`, `src/features/delivery/pages/Detail.tsx` … | reachable |
| `/locations` | `public/sitemap.xml`, `public/llms.txt`, `src/pages/LocationDetail.tsx`, `src/pages/Langley200Street.tsx`, `src/pages/Index.tsx`, `src/pages/Locations.tsx` … | reachable |
| `/location/:id` | `public/sitemap.xml`, `public/llms.txt`, `src/context/LocationScopeProvider.tsx`, `src/pages/BookingDetail.tsx`, `src/pages/Locations.tsx`, `src/pages/LocationDetail.tsx` … | reachable |
| `/check-in` | `public/robots.txt`, `src/pages/booking/BookingPass.tsx`, `src/pages/CheckIn.tsx`, `src/pages/BookingDetail.tsx` | reachable |
| `/protection` | `public/sitemap.xml`, `src/contexts/RentalBookingContext.tsx`, `src/pages/Index.tsx`, `src/components/landing/VehicleDetailsModal.tsx`, `src/components/landing/VehicleCard.tsx`, `src/pages/AddOns.tsx` … | reachable |
| `/add-ons` | `public/sitemap.xml`, `src/pages/AddOns.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/Protection.tsx`, `src/components/shared/BookingStepper.tsx`, `src/components/layout/Footer.tsx` … | reachable |
| `/about` | `public/sitemap.xml`, `public/llms.txt`, `src/pages/Index.tsx`, `src/pages/About.tsx`, `src/components/layout/TopNav.tsx`, `src/components/layout/Footer.tsx` | reachable |
| `/surrey` | `public/sitemap.xml`, `public/llms.txt`, `src/pages/blog/IcbcCarRentalInsurance.tsx`, `src/pages/blog/CarRentalTipsNewDrivers.tsx`, `src/pages/Langley.tsx`, `src/pages/Index.tsx` … | reachable |
| `/langley` | `public/sitemap.xml`, `src/pages/LocationDetail.tsx`, `public/llms.txt`, `src/pages/blog/IcbcCarRentalInsurance.tsx`, `src/pages/Surrey.tsx`, `src/pages/About.tsx` … | reachable |
| `/langley-200-street` | `public/sitemap.xml`, `public/llms.txt`, `src/pages/Langley200Street.tsx`, `src/components/landing/LocationChips.tsx`, `src/components/layout/TopNav.tsx`, `src/components/layout/Footer.tsx` | reachable |
| `/abbotsford` | `public/sitemap.xml`, `public/llms.txt`, `src/pages/About.tsx`, `src/pages/Index.tsx`, `src/pages/Abbotsford.tsx`, `src/pages/LocationDetail.tsx` … | reachable |
| `/contact` | `public/sitemap.xml`, `src/pages/Contact.tsx`, `public/llms.txt`, `src/pages/About.tsx`, `src/pages/Abbotsford.tsx`, `src/pages/Langley200Street.tsx` … | reachable |
| `/subscription` | `public/sitemap.xml`, `src/pages/Subscription.tsx` | reachable |
| `/blog` | `public/llms.txt`, `public/sitemap.xml`, `src/pages/Index.tsx`, `src/pages/blog/IcbcCarRentalInsurance.tsx`, `src/pages/blog/C2cVsTuroVsEnterpriseSurrey.tsx`, `src/pages/blog/DailyVsWeeklyCarRentalSurrey.tsx` … | reachable |
| `/blog/car-rental-surrey-guide` | `public/sitemap.xml`, `public/llms.txt`, `src/pages/blog/C2cVsTuroVsEnterpriseSurrey.tsx`, `src/components/layout/Footer.tsx` | reachable |
| `/blog/icbc-car-rental-insurance-bc` | `public/sitemap.xml`, `public/llms.txt`, `src/pages/Index.tsx`, `src/pages/blog/C2cVsTuroVsEnterpriseSurrey.tsx`, `src/components/layout/Footer.tsx` | reachable |
| `/blog/best-road-trips-from-surrey-bc` | `public/sitemap.xml`, `public/llms.txt`, `src/pages/Index.tsx` | reachable |
| `/blog/car-rental-tips-new-drivers-bc` | `public/sitemap.xml`, `public/llms.txt` | reachable |
| `/blog/affordable-car-rental-surrey-langley-abbotsford-bc` | `public/sitemap.xml`, `public/llms.txt`, `src/pages/blog/C2cVsTuroVsEnterpriseSurrey.tsx` | reachable |
| `/blog/daily-vs-weekly-car-rental-surrey-bc` | `public/sitemap.xml`, `public/llms.txt`, `src/pages/Index.tsx`, `src/pages/blog/C2cVsTuroVsEnterpriseSurrey.tsx` | reachable |
| `/blog/c2c-vs-turo-vs-enterprise-surrey` | `public/sitemap.xml`, `public/llms.txt` | reachable |
| `/booking/confirmed` | none | **DEAD ROUTE** |
| `/booking/:bookingId/license` | `src/domain/index.ts`, `src/pages/Dashboard.tsx`, `src/pages/CompleteSignup.tsx`, `src/pages/CheckIn.tsx`, `src/pages/BookingDetail.tsx`, `src/pages/NewCheckout.tsx` … | reachable |
| `/booking/:bookingId/agreement` | `public/robots.txt`, `src/domain/index.ts`, `src/pages/Dashboard.tsx`, `src/lib/booking-routes.ts`, `src/pages/CompleteSignup.tsx`, `src/pages/CheckIn.tsx` … | reachable |
| `/booking/:bookingId/pass` | `public/robots.txt`, `src/index.css`, `src/domain/index.ts`, `src/pages/BookingDetail.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/ops/OpsReturns.tsx` … | reachable |
| `/booking/:bookingId/pickup` | `public/robots.txt`, `src/index.css`, `src/pages/Dashboard.tsx`, `src/pages/CompleteSignup.tsx`, `src/pages/BookingDetail.tsx`, `src/pages/ops/OpsReturns.tsx` … | reachable |
| `/booking/:bookingId/return` | `public/robots.txt`, `src/pages/CheckIn.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/BookingDetail.tsx`, `src/pages/Dashboard.tsx`, `src/pages/ops/OpsReturns.tsx` … | reachable |
| `/walkaround/:bookingId` | `public/robots.txt`, `src/components/admin/ops/WalkaroundSendDialog.tsx` | reachable |
| `/my-booking` | `public/robots.txt` | reachable |
| `/my-booking/:bookingCode` | `public/robots.txt` | reachable |
| `/terms` | `src/pages/PdfViewerPage.tsx`, `src/pages/NewCheckout.tsx`, `src/components/layout/Footer.tsx` | reachable |
| `/legal` | none | **DEAD ROUTE** |
| `/privacy` | none | **DEAD ROUTE** |
| `/vehicle/:id` | `src/pages/Auth.tsx`, `src/pages/Compare.tsx`, `src/lib/seed-categories.ts`, `src/lib/schemas/index.ts`, `src/pages/admin/CategoryDetail.tsx`, `src/lib/pricing.test.ts` … | reachable |
| `/car/:id` | `public/sitemap.xml`, `public/llms.txt`, `src/pages/support/SupportTickets.tsx`, `src/pages/support/SupportAnalytics.tsx`, `src/pages/ops/OpsWorkboard.tsx`, `src/pages/ops/OpsReturns.tsx` … | reachable |
| `/browse/:id` | none | **DEAD ROUTE** |
| `/details/:id` | none | **DEAD ROUTE** |
| `/admin` | `public/robots.txt`, `src/pages/CheckIn.tsx`, `src/pages/BookingDetail.tsx`, `src/pages/ops/OpsWorkboard.tsx`, `src/pages/ops/OpsPickups.tsx`, `src/pages/admin/FleetCategories.tsx` … | reachable |
| `/admin/login` | `src/pages/admin/AdminLogin.tsx`, `src/components/admin/AdminProtectedRoute.tsx`, `src/components/layout/AdminShell.tsx` | reachable |
| `/admin/alerts` | `src/pages/admin/Overview.tsx`, `src/components/layout/AdminShell.tsx`, `src/pages/admin/ActiveRentalDetail.tsx`, `src/pages/admin/Finance.tsx`, `src/components/admin/RealtimeAlertsPanel.tsx` | reachable |
| `/admin/bookings` | `src/pages/CheckIn.tsx`, `src/hooks/use-panel-context.ts`, `src/pages/admin/Finance.tsx`, `src/pages/admin/SupportV2.tsx`, `src/pages/admin/PaymentDashboard.tsx`, `src/pages/admin/Damages.tsx` … | reachable |
| `/admin/bookings/:bookingId` | `src/pages/CheckIn.tsx`, `src/components/support/TicketBookingSummary.tsx`, `src/pages/admin/SupportV2.tsx`, `src/pages/admin/Pickups.tsx`, `src/pages/admin/PaymentDashboard.tsx`, `src/pages/admin/Overview.tsx` … | reachable |
| `/admin/bookings/:bookingId/ops` | `src/pages/CheckIn.tsx`, `src/pages/admin/Pickups.tsx`, `src/pages/admin/PaymentDashboard.tsx`, `src/pages/admin/Billing.tsx`, `src/pages/admin/Overview.tsx`, `src/pages/admin/AuditLogs.tsx` … | reachable |
| `/admin/agreements` | `src/components/layout/AdminShell.tsx` | reachable |
| `/admin/finance` | `src/pages/admin/Finance.tsx`, `src/pages/admin/Damages.tsx`, `src/pages/admin/Overview.tsx`, `src/components/layout/AdminShell.tsx`, `src/components/admin/FailedPaymentsWidget.tsx` | reachable |
| `/admin/billing` | `src/pages/admin/PaymentDashboard.tsx` | reachable |
| `/admin/payment-dashboard` | none | **DEAD ROUTE** |
| `/admin/reconciliation` | none | **DEAD ROUTE** |
| `/admin/returns/:bookingId` | `src/pages/admin/Returns.tsx`, `src/pages/admin/ReturnOps.tsx`, `src/pages/admin/Billing.tsx`, `src/pages/admin/Finance.tsx`, `src/pages/admin/ActiveRentalDetail.tsx`, `src/pages/admin/Overview.tsx` … | reachable |
| `/admin/active-rentals/:bookingId` | `src/lib/booking-routes.ts`, `src/pages/CheckIn.tsx`, `src/hooks/use-panel-context.ts`, `src/components/support/TicketBookingSummary.tsx`, `src/pages/admin/ActiveRentals.tsx`, `src/pages/admin/BookingDetail.tsx` … | reachable |
| `/admin/inventory` | none | **DEAD ROUTE** |
| `/admin/staff` | `src/pages/admin/Settings.tsx`, `src/components/layout/AdminShell.tsx` | reachable |
| `/admin/fleet` | `src/pages/admin/VehicleUnitDetail.tsx`, `src/pages/admin/Overview.tsx`, `src/pages/admin/Alerts.tsx`, `src/pages/admin/FleetCategories.tsx`, `src/pages/admin/FleetAnalytics.tsx`, `src/pages/admin/FleetCosts.tsx` … | reachable |
| `/admin/fleet-analytics` | `src/components/layout/AdminShell.tsx`, `src/components/admin/fleet/ByCategoryTab.tsx` | reachable |
| `/admin/fleet-costs` | `src/components/layout/AdminShell.tsx` | reachable |
| `/admin/fleet/vehicle/:unitId` | `src/pages/admin/FleetCategories.tsx`, `src/pages/admin/CategoryDetail.tsx`, `src/components/admin/fleet/VehicleHealthCard.tsx`, `src/components/admin/fleet/ByVehicleTab.tsx` | reachable |
| `/admin/fleet/category/:categoryId` | `src/components/admin/fleet/ByCategoryTab.tsx` | reachable |
| `/admin/calendar` | `src/pages/admin/Overview.tsx`, `src/pages/admin/Inventory.tsx`, `src/components/layout/AdminShell.tsx` | reachable |
| `/admin/tickets` | `src/pages/admin/ActiveRentalDetail.tsx` | reachable |
| `/admin/abandoned-carts` | none | **DEAD ROUTE** |
| `/admin/reports` | `src/components/layout/AdminShell.tsx` | reachable |
| `/admin/settings` | `src/components/layout/AdminShell.tsx` | reachable |
| `/admin/offers` | `src/components/layout/AdminShell.tsx` | reachable |
| `/admin/incidents` | `src/pages/admin/SupportV2.tsx`, `src/components/layout/AdminShell.tsx` | reachable |
| `/admin/damages` | `src/pages/admin/Overview.tsx`, `src/pages/admin/Inventory.tsx` | reachable |
| `/admin/vendors` | `src/components/layout/AdminShell.tsx` | reachable |
| `/admin/debug/:bookingId` | none | **DEAD ROUTE** |
| `/support` | `public/robots.txt`, `src/components/layout/AdminShell.tsx`, `src/components/layout/SupportShell.tsx`, `src/pages/support/SupportTickets.tsx`, `src/pages/support/SupportAnalytics.tsx`, `src/pages/admin/Tickets.tsx` … | reachable |
| `/support/analytics` | `src/components/layout/SupportShell.tsx` | reachable |
| `/delivery` | `public/robots.txt`, `src/components/delivery/DeliveryShell.tsx`, `src/components/delivery/DeliveryProtectedRoute.tsx`, `src/components/delivery/DeliveryGrid.tsx`, `src/components/landing/DeliveryBanner.tsx`, `src/components/delivery/DeliveryCard.tsx` … | reachable |
| `/delivery/walk-in` | `src/components/delivery/DeliveryShell.tsx` | reachable |
| `/delivery/:id` | `public/robots.txt`, `src/features/delivery/utils/delivery-helpers.ts`, `src/features/delivery/pages/WalkIn.tsx`, `src/features/delivery/pages/Detail.tsx`, `src/features/delivery/pages/Dashboard.tsx`, `src/features/delivery/index.ts` … | reachable |
| `/ops` | `public/robots.txt`, `src/pages/BookingDetail.tsx`, `src/pages/ops/OpsWorkboard.tsx`, `src/pages/CheckIn.tsx`, `src/pages/ops/OpsReturns.tsx`, `src/pages/ops/OpsActiveRentals.tsx` … | reachable |
| `/ops/bookings` | `src/components/ops/OpsShell.tsx`, `src/hooks/use-panel-context.ts`, `src/pages/admin/BookingDetail.tsx` | reachable |
| `/ops/pickups` | `src/pages/ops/OpsWorkboard.tsx`, `src/pages/ops/OpsPickups.tsx`, `src/hooks/use-panel-context.ts`, `src/pages/admin/BookingOps.tsx`, `src/components/ops/OpsShell.tsx` | reachable |
| `/ops/active` | `src/pages/ops/OpsWorkboard.tsx`, `src/pages/admin/ActiveRentalDetail.tsx`, `src/hooks/use-panel-context.ts`, `src/components/ops/OpsShell.tsx` | reachable |
| `/ops/returns` | `src/pages/ops/OpsWorkboard.tsx`, `src/hooks/use-panel-context.ts`, `src/pages/admin/ReturnOps.tsx`, `src/components/ops/OpsShell.tsx` | reachable |
| `/ops/fleet` | `src/pages/ops/OpsWorkboard.tsx`, `src/components/ops/OpsShell.tsx` | reachable |
| `/ops/booking/:bookingId` | `src/pages/ops/OpsPickups.tsx`, `src/pages/ops/OpsBookings.tsx`, `src/pages/admin/ActiveRentalDetail.tsx`, `src/pages/admin/BookingDetail.tsx`, `src/components/ops/OpsShell.tsx`, `src/components/support/TicketBookingSummary.tsx` … | reachable |
| `/ops/booking/:bookingId/handover` | `src/pages/ops/OpsBookings.tsx`, `src/pages/ops/OpsPickups.tsx`, `src/hooks/use-panel-context.ts`, `src/pages/admin/ActiveRentalDetail.tsx`, `src/pages/admin/BookingDetail.tsx`, `src/components/support/TicketBookingSummary.tsx` … | reachable |
| `/ops/rental/:bookingId` | `src/pages/ops/OpsBookings.tsx`, `src/pages/ops/OpsActiveRentals.tsx`, `src/pages/admin/BookingOps.tsx`, `src/components/support/TicketBookingSummary.tsx`, `src/pages/admin/BookingDetail.tsx`, `src/hooks/use-panel-context.ts` | reachable |
| `/ops/return/:bookingId` | `src/pages/ops/OpsWorkboard.tsx`, `src/pages/ops/OpsReturns.tsx`, `src/pages/admin/ReturnOps.tsx`, `src/pages/admin/BookingDetail.tsx`, `src/pages/admin/ActiveRentalDetail.tsx`, `src/hooks/use-panel-context.ts` … | reachable |
| `/admin/history` | none | **DEAD ROUTE** |
| `/admin/handovers` | none | **DEAD ROUTE** |
| `/admin/photos` | none | **DEAD ROUTE** |
| `/admin/verifications` | none | **DEAD ROUTE** |
| `/admin/analytics` | `src/pages/admin/Reports.tsx`, `src/pages/admin/Analytics.tsx` | reachable |
| `/admin/audit-logs` | none | **DEAD ROUTE** |
| `/admin/support` | none | **DEAD ROUTE** |
| `/admin/support-analytics` | none | **DEAD ROUTE** |
| `*` | react-router catch-all | reachable (404 handler) |

---

## 2. Link and navigation inventory

Collected with `rg` over `src/`: `to="…"`, `navigate("…")`, `href="/…"`.

| Target | Matching route | Source files (file:line, kind) |
| --- | --- | --- |
| `/` | `/` | `src/pages/ForgotPassword.tsx:67` (Link/NavLink to); `src/pages/ResetPassword.tsx:115` (Link/NavLink to); `src/pages/CheckIn.tsx:126` (Link/NavLink to); `src/pages/CheckIn.tsx:287` (Link/NavLink to); `src/pages/Auth.tsx:147` (Link/NavLink to); `src/pages/blog/AffordableCarRentalSurreyLangleyAbbotsford.tsx:244` (Link/NavLink to); `src/pages/blog/DailyVsWeeklyCarRentalSurrey.tsx:253` (Link/NavLink to); `src/components/layout/TopNav.tsx:59` (Link/NavLink to) … +10 more |
| `/abbotsford` | `/abbotsford` | `src/pages/Surrey.tsx:356` (Link/NavLink to); `src/pages/Langley200Street.tsx:335` (Link/NavLink to); `src/pages/Langley.tsx:304` (Link/NavLink to); `src/pages/Index.tsx:319` (Link/NavLink to); `src/pages/blog/BestRoadTripsFromSurrey.tsx:113` (Link/NavLink to); `src/pages/blog/IcbcCarRentalInsurance.tsx:113` (Link/NavLink to); `src/pages/blog/CarRentalTipsNewDrivers.tsx:120` (Link/NavLink to); `src/pages/blog/CarRentalSurreyGuide.tsx:108` (Link/NavLink to) |
| `/about` | `/about` | `src/pages/Index.tsx:322` (Link/NavLink to) |
| `/add-ons?${params.toString()}` | `/add-ons` | `src/pages/Protection.tsx:87` (navigate() template); `src/pages/NewCheckout.tsx:423` (navigate() template) |
| `/admin` | `/admin` | `src/components/delivery/DeliveryShell.tsx:115` (Link/NavLink to); `src/components/layout/SupportShell.tsx:128` (Link/NavLink to) |
| `/admin/active-rentals/${rental.id}` | `/admin/active-rentals/:bookingId` | `src/pages/admin/ActiveRentals.tsx:252` (navigate() template) |
| `/admin/alerts` | `/admin/alerts` | `src/App.tsx:217` (Link/NavLink to); `src/pages/admin/Overview.tsx:537` (Link/NavLink to); `src/components/admin/RealtimeAlertsPanel.tsx:126` (Link/NavLink to); `src/components/admin/RealtimeAlertsPanel.tsx:101` (navigate()) |
| `/admin/alerts?booking=${rental.id}` | `/admin/alerts` | `src/pages/admin/ActiveRentalDetail.tsx:752` (Link template); `src/pages/admin/ActiveRentalDetail.tsx:862` (Link template) |
| `/admin/alerts?type=verification_pending` | `/admin/alerts` | `src/App.tsx:274` (Link/NavLink to) |
| `/admin/billing` | `/admin/billing` | `src/pages/admin/PaymentDashboard.tsx:369` (Link/NavLink to) |
| `/admin/bookings` | `/admin/bookings` | `src/App.tsx:272` (Link/NavLink to) |
| `/admin/bookings/${alert.bookingId}/ops` | `/admin/bookings/:bookingId/ops` | `src/components/admin/RealtimeAlertsPanel.tsx:99` (navigate() template) |
| `/admin/bookings/${booking.id}` | `/admin/bookings/:bookingId` | `src/components/support/TicketBookingSummary.tsx:129` (navigate() template) |
| `/admin/bookings/${booking.id}/ops?returnTo=/admin` | `/admin/bookings/:bookingId/ops` | `src/pages/admin/Overview.tsx:462` (navigate() template) |
| `/admin/bookings/${booking.id}/ops?returnTo=/admin/pickups` | `/admin/bookings/:bookingId/ops` | `src/pages/admin/Pickups.tsx:339` (navigate() template) |
| `/admin/bookings/${bookingId}?returnTo=/admin/bookings` | `/admin/bookings/:bookingId` | `src/pages/admin/Bookings.tsx:294` (navigate() template) |
| `/admin/bookings/${createdBookingRef.current.id}/ops?returnTo=/admin/bookings` | `/admin/bookings/:bookingId/ops` | `src/components/admin/WalkInBookingDialog.tsx:314` (navigate() template) |
| `/admin/bookings/${d.id}` | `/admin/bookings/:bookingId` | `src/components/admin/ops/steps/StepPayment.tsx:224` (Link template) |
| `/admin/bookings/${data.booking.id}/ops?returnTo=/admin/bookings` | `/admin/bookings/:bookingId/ops` | `src/components/admin/WalkInBookingDialog.tsx:298` (navigate() template) |
| `/admin/bookings/${id}` | `/admin/bookings/:bookingId` | `src/pages/admin/Overview.tsx:477` (navigate() template) |
| `/admin/bookings/${inv.booking_id}/ops` | `/admin/bookings/:bookingId/ops` | `src/pages/admin/Finance.tsx:1942` (navigate() template); `src/pages/admin/Billing.tsx:735` (navigate() template) |
| `/admin/bookings/${log.entityId}/ops` | `/admin/bookings/:bookingId/ops` | `src/pages/admin/AuditLogs.tsx:183` (Link template) |
| `/admin/bookings/${p.booking_id}` | `/admin/bookings/:bookingId` | `src/pages/admin/PaymentDashboard.tsx:397` (Link template) |
| `/admin/bookings/${payment.booking_id}/ops` | `/admin/bookings/:bookingId/ops` | `src/pages/admin/Finance.tsx:2082` (navigate() template); `src/pages/admin/Finance.tsx:2137` (navigate() template); `src/pages/admin/Billing.tsx:903` (navigate() template); `src/pages/admin/Billing.tsx:968` (navigate() template) |
| `/admin/bookings/${receipt.booking_id}/ops` | `/admin/bookings/:bookingId/ops` | `src/pages/admin/Finance.tsx:2018` (navigate() template); `src/pages/admin/Billing.tsx:826` (navigate() template) |
| `/admin/bookings/${row.bookingId}` | `/admin/bookings/:bookingId` | `src/pages/admin/Agreements.tsx:335` (Link template) |
| `/admin/bookings/${selectedAlert.bookingId}/ops` | `/admin/bookings/:bookingId/ops` | `src/pages/admin/Alerts.tsx:557` (Link template) |
| `/admin/bookings/${selectedTicket.booking_id}/ops` | `/admin/bookings/:bookingId/ops` | `src/pages/admin/SupportV2.tsx:521` (Link template) |
| `/admin/bookings/${verification.bookingId}/ops` | `/admin/bookings/:bookingId/ops` | `src/components/admin/alerts/PendingVerificationsCard.tsx:101` (Link template) |
| `/admin/bookings?code=${encodeURIComponent(bookingCode.trim())}` | `/admin/bookings` | `src/components/layout/AdminShell.tsx:231` (navigate() template) |
| `/admin/bookings?id=${booking.id}` | `/admin/bookings` | `src/pages/admin/Calendar.tsx:387` (navigate() template) |
| `/admin/bookings?id=${payment.bookingId}` | `/admin/bookings` | `src/components/admin/FailedPaymentsWidget.tsx:122` (Link template) |
| `/admin/bookings?id=${selectedDamage.booking_id}` | `/admin/bookings` | `src/pages/admin/Damages.tsx:302` (Link template) |
| `/admin/bookings?tab=completed` | `/admin/bookings` | `src/App.tsx:271` (Link/NavLink to) |
| `/admin/bookings?tab=pending` | `/admin/bookings` | `src/pages/admin/Overview.tsx:366` (Link/NavLink to) |
| `/admin/finance` | `/admin/finance` | `src/App.tsx:227` (Link/NavLink to) |
| `/admin/finance?tab=overview` | `/admin/finance` | `src/App.tsx:226` (Link/NavLink to) |
| `/admin/finance?tab=transactions` | `/admin/finance` | `src/App.tsx:225` (Link/NavLink to); `src/pages/admin/Finance.tsx:1004` (navigate()); `src/pages/admin/Finance.tsx:1064` (navigate()) |
| `/admin/finance?tab=transactions&booking=${selectedDamage.booking_id}&adjustment=damage&amount=${estimatedCost || selectedDamage.estimated_cost || ""}` | `/admin/finance` | `src/pages/admin/Damages.tsx:105` (navigate() template) |
| `/admin/finance?tab=transactions&location=${loc.id}` | `/admin/finance` | `src/pages/admin/Finance.tsx:923` (navigate() template) |
| `/admin/finance?tab=transactions&status=failed` | `/admin/finance` | `src/components/admin/FailedPaymentsWidget.tsx:108` (Link/NavLink to) |
| `/admin/fleet` | `/admin/fleet` | `src/App.tsx:230` (Link/NavLink to); `src/App.tsx:273` (Link/NavLink to) |
| `/admin/fleet-analytics?tab=categories` | `/admin/fleet-analytics` | `src/components/admin/fleet/ByCategoryTab.tsx:114` (navigate()) |
| `/admin/fleet/category/${cat.categoryId}` | `/admin/fleet/category/:categoryId` | `src/components/admin/fleet/ByCategoryTab.tsx:229` (navigate() template) |
| `/admin/fleet/vehicle/${unit.id}` | `/admin/fleet/vehicle/:unitId` | `src/pages/admin/FleetCategories.tsx:518` (navigate() template); `src/pages/admin/FleetCategories.tsx:592` (navigate() template) |
| `/admin/fleet/vehicle/${v.vehicleUnitId}` | `/admin/fleet/vehicle/:unitId` | `src/pages/admin/CategoryDetail.tsx:275` (navigate() template); `src/components/admin/fleet/ByVehicleTab.tsx:372` (navigate() template) |
| `/admin/fleet/vehicle/${vehicle.vehicleUnitId}` | `/admin/fleet/vehicle/:unitId` | `src/components/admin/fleet/VehicleHealthCard.tsx:187` (navigate() template) |
| `/admin/fleet?vehicle=${selectedAlert.vehicleId}` | `/admin/fleet` | `src/pages/admin/Alerts.tsx:569` (Link template) |
| `/admin/incidents?id=${selectedTicket.incident_id}` | `/admin/incidents` | `src/pages/admin/SupportV2.tsx:530` (Link template) |
| `/admin/login` | `/admin/login` | `src/components/admin/AdminProtectedRoute.tsx:29` (Link/NavLink to); `src/components/layout/AdminShell.tsx:244` (navigate()); `src/components/admin/AdminProtectedRoute.tsx:46` (href) |
| `/admin/pickups` | `*` | `src/pages/admin/Overview.tsx:429` (Link/NavLink to) |
| `/admin/reports` | `/admin/reports` | `src/App.tsx:276` (Link/NavLink to) |
| `/admin/returns/${bookingId}` | `/admin/returns/:bookingId` | `src/pages/admin/Returns.tsx:75` (navigate() template) |
| `/admin/returns/${payment.booking_id}` | `/admin/returns/:bookingId` | `src/pages/admin/Finance.tsx:2153` (navigate() template); `src/pages/admin/Billing.tsx:988` (navigate() template) |
| `/admin/returns/${rental.id}` | `/admin/returns/:bookingId` | `src/pages/admin/ActiveRentalDetail.tsx:834` (Link template) |
| `/admin/settings` | `/admin/settings` | `src/components/layout/AdminShell.tsx:505` (Link/NavLink to) |
| `/admin/tickets?booking=${rental.id}` | `/admin/tickets` | `src/pages/admin/ActiveRentalDetail.tsx:787` (Link template); `src/pages/admin/ActiveRentalDetail.tsx:856` (Link template) |
| `/auth` | `/auth` | `src/pages/ForgotPassword.tsx:94` (Link/NavLink to); `src/pages/ForgotPassword.tsx:136` (Link/NavLink to); `src/pages/ResetPassword.tsx:132` (Link/NavLink to); `src/pages/ResetPassword.tsx:208` (Link/NavLink to); `src/components/layout/TopNav.tsx:136` (Link/NavLink to); `src/components/layout/TopNav.tsx:249` (Link/NavLink to); `src/pages/CompleteSignup.tsx:54` (navigate()); `src/pages/BookingDetail.tsx:272` (navigate()) … +7 more |
| `/auth?returnUrl=${encodeURIComponent(` | `/auth` | `src/pages/CompleteSignup.tsx:94` (navigate() template); `src/pages/CompleteSignup.tsx:203` (Link template) |
| `/auth?returnUrl=${encodeURIComponent("/dashboard")}` | `/auth` | `src/pages/Dashboard.tsx:66` (navigate() template) |
| `/auth?returnUrl=${encodeURIComponent(returnUrl)}` | `/auth` | `src/hooks/use-require-auth.ts:27` (navigate() template) |
| `/auth?returnUrl=/admin&forceLogin=1` | `/auth` | `src/pages/admin/AdminLogin.tsx:31` (Link/NavLink to) |
| `/auth?returnUrl=/delivery` | `/auth` | `src/components/delivery/DeliveryProtectedRoute.tsx:29` (Link/NavLink to) |
| `/auth?returnUrl=/ops` | `/auth` | `src/components/ops/OpsProtectedRoute.tsx:34` (Link/NavLink to) |
| `/auth?returnUrl=/support` | `/auth` | `src/components/support/SupportProtectedRoute.tsx:29` (Link/NavLink to) |
| `/blog` | `/blog` | `src/pages/Index.tsx:324` (Link/NavLink to); `src/pages/blog/AffordableCarRentalSurreyLangleyAbbotsford.tsx:66` (Link/NavLink to); `src/pages/blog/DailyVsWeeklyCarRentalSurrey.tsx:63` (Link/NavLink to) |
| `/blog/${a.slug}` | `*` | `src/pages/blog/BlogIndex.tsx:90` (Link template) |
| `/blog/affordable-car-rental-surrey-langley-abbotsford-bc` | `/blog/affordable-car-rental-surrey-langley-abbotsford-bc` | `src/pages/blog/C2cVsTuroVsEnterpriseSurrey.tsx:123` (Link/NavLink to) |
| `/blog/best-road-trips-from-surrey-bc` | `/blog/best-road-trips-from-surrey-bc` | `src/pages/Index.tsx:327` (Link/NavLink to) |
| `/blog/car-rental-surrey-guide` | `/blog/car-rental-surrey-guide` | `src/pages/blog/C2cVsTuroVsEnterpriseSurrey.tsx:117` (Link/NavLink to) |
| `/blog/daily-vs-weekly-car-rental-surrey-bc` | `/blog/daily-vs-weekly-car-rental-surrey-bc` | `src/pages/Index.tsx:325` (Link/NavLink to); `src/pages/blog/C2cVsTuroVsEnterpriseSurrey.tsx:97` (Link/NavLink to) |
| `/blog/icbc-car-rental-insurance-bc` | `/blog/icbc-car-rental-insurance-bc` | `src/pages/Index.tsx:326` (Link/NavLink to); `src/pages/blog/C2cVsTuroVsEnterpriseSurrey.tsx:77` (Link/NavLink to); `src/pages/blog/C2cVsTuroVsEnterpriseSurrey.tsx:124` (Link/NavLink to) |
| `/booking/${activeBooking.id}?payment=success` | `/booking/:id` | `src/pages/NewCheckout.tsx:1083` (navigate() template) |
| `/booking/${b.id}` | `/booking/:id` | `src/pages/Dashboard.tsx:454` (Link template) |
| `/booking/${booking.id}` | `/booking/:id` | `src/pages/NewCheckout.tsx:745` (navigate() template); `src/pages/CheckIn.tsx:293` (Link template); `src/pages/booking/BookingConfirmed.tsx:224` (Link template) |
| `/booking/${booking.id}/license` | `/booking/:bookingId/license` | `src/pages/booking/BookingConfirmed.tsx:212` (Link template) |
| `/booking/${bookingId}` | `/booking/:id` | `src/pages/CompleteSignup.tsx:33` (navigate() template); `src/pages/CompleteSignup.tsx:109` (navigate() template); `src/pages/booking/BookingReturn.tsx:123` (Link template); `src/pages/booking/BookingPickup.tsx:181` (Link template); `src/pages/booking/BookingAgreement.tsx:100` (Link template); `src/pages/booking/BookingAgreement.tsx:137` (Link template); `src/pages/booking/BookingPass.tsx:159` (Link template); `src/pages/booking/BookingLicense.tsx:91` (Link template) |
| `/booking/${bookingId}/agreement` | `/booking/:bookingId/agreement` | `src/pages/booking/BookingLicense.tsx:125` (Link template) |
| `/booking/${bookingId}/license` | `/booking/:bookingId/license` | `src/pages/booking/BookingAgreement.tsx:117` (Link template) |
| `/booking/${bookingId}/pass` | `/booking/:bookingId/pass` | `src/pages/booking/BookingPickup.tsx:284` (Link template); `src/pages/booking/BookingAgreement.tsx:182` (Link template) |
| `/checkout?${params.toString()}` | `/checkout` | `src/pages/AddOns.tsx:205` (navigate() template); `src/hooks/use-hold.ts:106` (navigate() template) |
| `/complete-signup?bookingCode=${encodeURIComponent(activeBooking.booking_code)}&bookingId=${encodeURIComponent(activeBooking.id)}&email=${encodeURIComponent(formData.email)}&payment=success` | `/complete-signup` | `src/pages/NewCheckout.tsx:1081` (navigate() template) |
| `/complete-signup?bookingCode=${encodeURIComponent(booking.booking_code)}&bookingId=${encodeURIComponent(booking.id)}&email=${encodeURIComponent(formData.email)}` | `/complete-signup` | `src/pages/NewCheckout.tsx:743` (navigate() template) |
| `/contact` | `/contact` | `src/pages/Surrey.tsx:368` (Link/NavLink to); `src/pages/Langley200Street.tsx:351` (Link/NavLink to); `src/pages/Abbotsford.tsx:483` (Link/NavLink to); `src/pages/Langley.tsx:316` (Link/NavLink to); `src/pages/Index.tsx:323` (Link/NavLink to); `src/pages/About.tsx:84` (Link/NavLink to); `src/pages/About.tsx:270` (Link/NavLink to); `src/pages/blog/CarRentalTipsNewDrivers.tsx:111` (Link/NavLink to) … +2 more |
| `/dashboard` | `/dashboard` | `src/pages/ResetPassword.tsx:150` (Link/NavLink to); `src/pages/booking/BookingReturn.tsx:106` (Link/NavLink to); `src/pages/BookingDetail.tsx:491` (Link/NavLink to); `src/pages/BookingDetail.tsx:527` (Link/NavLink to); `src/pages/booking/BookingPickup.tsx:167` (Link/NavLink to); `src/pages/booking/BookingPass.tsx:143` (Link/NavLink to); `src/pages/booking/BookingLicense.tsx:77` (Link/NavLink to); `src/pages/booking/BookingConfirmed.tsx:103` (Link/NavLink to) … +10 more |
| `/dashboard/bookings/${authErrBody.existingBookingId}` | `*` | `src/pages/NewCheckout.tsx:569` (navigate() template) |
| `/delivery` | `/delivery` | `src/components/delivery/DeliveryShell.tsx:99` (Link/NavLink to); `src/features/delivery/pages/WalkIn.tsx:130` (navigate()); `src/features/delivery/pages/Detail.tsx:223` (navigate()); `src/features/delivery/pages/Detail.tsx:239` (navigate()); `src/features/delivery/pages/Detail.tsx:328` (navigate()) |
| `/delivery/${booking.id}` | `/delivery/:id` | `src/components/admin/ops/OpsBookingSummary.tsx:260` (Link template); `src/components/admin/ops/steps/StepEnRoute.tsx:218` (Link template) |
| `/delivery/${delivery.id}` | `/delivery/:id` | `src/features/delivery/components/DeliveryCard.tsx:187` (Link template); `src/components/delivery/DeliveryCard.tsx:217` (Link template) |
| `/documents/rental-agreement.pdf` | `*` | `src/components/layout/Footer.tsx:194` (href) |
| `/documents/terms-and-conditions.pdf` | `*` | `src/pages/NewCheckout.tsx:1420` (href); `src/pages/NewCheckout.tsx:1421` (href); `src/pages/NewCheckout.tsx:1422` (href); `src/components/layout/Footer.tsx:192` (href); `src/components/layout/Footer.tsx:193` (href) |
| `/forgot-password` | `/forgot-password` | `src/pages/ResetPassword.tsx:129` (Link/NavLink to); `src/pages/Auth.tsx:281` (Link/NavLink to) |
| `/langley` | `/langley` | `src/pages/Surrey.tsx:354` (Link/NavLink to); `src/pages/Langley200Street.tsx:327` (Link/NavLink to); `src/pages/Abbotsford.tsx:229` (Link/NavLink to); `src/pages/Abbotsford.tsx:532` (Link/NavLink to); `src/pages/Index.tsx:318` (Link/NavLink to); `src/pages/blog/BestRoadTripsFromSurrey.tsx:112` (Link/NavLink to); `src/pages/blog/IcbcCarRentalInsurance.tsx:112` (Link/NavLink to); `src/pages/blog/CarRentalTipsNewDrivers.tsx:119` (Link/NavLink to) … +1 more |
| `/location/${booking.locations?.id}?from=${encodeURIComponent(` | `/location/:id` | `src/pages/BookingDetail.tsx:900` (Link template) |
| `/location/${loc.id}` | `/location/:id` | `src/pages/Locations.tsx:110` (Link template); `src/pages/Locations.tsx:115` (Link template) |
| `/location/${locationId}` | `/location/:id` | `src/pages/Locations.tsx:45` (navigate() template) |
| `/locations` | `/locations` | `src/pages/Index.tsx:320` (Link/NavLink to); `src/components/landing/LocationChips.tsx:77` (Link/NavLink to); `src/components/landing/LocationsSection.tsx:163` (Link/NavLink to) |
| `/ops` | `/ops` | `src/components/ops/OpsShell.tsx:166` (Link/NavLink to); `src/components/layout/AdminShell.tsx:332` (Link/NavLink to); `src/components/layout/AdminShell.tsx:408` (Link/NavLink to); `src/pages/admin/Bookings.tsx:448` (navigate()) |
| `/ops/booking/${booking.id}` | `/ops/booking/:bookingId` | `src/pages/ops/OpsBookings.tsx:169` (navigate() template); `src/pages/ops/OpsBookings.tsx:172` (navigate() template) |
| `/ops/booking/${booking.id}/handover` | `/ops/booking/:bookingId/handover` | `src/pages/ops/OpsPickups.tsx:146` (navigate() template); `src/pages/ops/OpsBookings.tsx:163` (navigate() template); `src/components/ops/OpsShell.tsx:120` (navigate() template) |
| `/ops/booking/${bookingId}/handover` | `/ops/booking/:bookingId/handover` | `src/pages/admin/BookingDetail.tsx:509` (navigate() template) |
| `/ops/booking/${bookingId}/handover?returnTo=${returnTo}` | `/ops/booking/:bookingId/handover` | `src/pages/admin/BookingDetail.tsx:528` (navigate() template) |
| `/ops/booking/${bookingId}?returnTo=${returnTo}` | `/ops/booking/:bookingId` | `src/pages/admin/BookingDetail.tsx:575` (navigate() template) |
| `/ops/bookings?search=${encodeURIComponent(term)}` | `/ops/bookings` | `src/components/ops/OpsShell.tsx:127` (navigate() template); `src/components/ops/OpsShell.tsx:132` (navigate() template) |
| `/ops/fleet` | `/ops/fleet` | `src/pages/ops/OpsWorkboard.tsx:259` (navigate()) |
| `/ops/rental/${booking.id}` | `/ops/rental/:bookingId` | `src/pages/ops/OpsBookings.tsx:166` (navigate() template); `src/pages/ops/OpsActiveRentals.tsx:37` (navigate() template) |
| `/ops/return/${booking.id}` | `/ops/return/:bookingId` | `src/pages/ops/OpsReturns.tsx:36` (navigate() template) |
| `/ops/return/${bookingId}` | `/ops/return/:bookingId` | `src/pages/admin/BookingDetail.tsx:518` (navigate() template) |
| `/ops/return/${bookingId}?returnTo=${returnTo}` | `/ops/return/:bookingId` | `src/pages/admin/BookingDetail.tsx:537` (navigate() template) |
| `/protection` | `/protection` | `src/pages/Index.tsx:321` (Link/NavLink to) |
| `/protection?${params.toString()}` | `/protection` | `src/pages/AddOns.tsx:218` (navigate() template); `src/pages/Search.tsx:200` (navigate() template); `src/components/landing/VehicleDetailsModal.tsx:121` (navigate() template); `src/components/landing/VehicleCard.tsx:75` (navigate() template) |
| `/search` | `/search` | `src/pages/Dashboard.tsx:357` (Link/NavLink to); `src/pages/Dashboard.tsx:370` (Link/NavLink to); `src/pages/Surrey.tsx:282` (Link/NavLink to); `src/pages/Surrey.tsx:365` (Link/NavLink to); `src/pages/Langley200Street.tsx:272` (Link/NavLink to); `src/pages/Langley200Street.tsx:346` (Link/NavLink to); `src/pages/Langley.tsx:245` (Link/NavLink to); `src/pages/Langley.tsx:313` (Link/NavLink to) … +26 more |
| `/search?${params.toString()}` | `/search` | `src/components/landing/GlassSearchBar.tsx:108` (navigate() template) |
| `/search?category=${slug}` | `/search` | `src/components/landing/CategoryCard.tsx:22` (Link template) |
| `/search?from=fleet` | `/search` | `src/pages/Abbotsford.tsx:55` (Link/NavLink to); `src/pages/Abbotsford.tsx:285` (Link/NavLink to); `src/components/landing/FleetRow.tsx:53` (Link/NavLink to); `src/components/landing/FleetRow.tsx:79` (Link/NavLink to) |
| `/support` | `/support` | `src/pages/admin/Alerts.tsx:372` (Link/NavLink to); `src/pages/admin/SupportAnalytics.tsx:153` (Link/NavLink to); `src/App.tsx:279` (Link/NavLink to); `src/components/layout/SupportShell.tsx:112` (Link/NavLink to) |
| `/support/analytics` | `/support/analytics` | `src/App.tsx:280` (Link/NavLink to) |
| `/support?category=damage` | `/support` | `src/pages/admin/Incidents.tsx:369` (Link/NavLink to); `src/pages/admin/Incidents.tsx:378` (Link/NavLink to) |
| `/support?category=incident` | `/support` | `src/pages/admin/Incidents.tsx:165` (Link/NavLink to); `src/pages/admin/Incidents.tsx:248` (Link/NavLink to) |
| `/support?id=${incident.support_ticket.id}` | `/support` | `src/pages/admin/Incidents.tsx:327` (Link template); `src/pages/admin/Incidents.tsx:344` (Link template) |
| `/support?id=${selectedAlert.ticketId}` | `/support` | `src/pages/admin/Alerts.tsx:545` (Link template) |
| `/support?id=${ticket.id}` | `/support` | `src/pages/support/SupportAnalytics.tsx:132` (Link template); `src/pages/admin/SupportAnalytics.tsx:525` (Link template) |
| `/support?queue=${item.key}` | `/support` | `src/components/layout/SupportShell.tsx:200` (Link template) |
| `/surrey` | `/surrey` | `src/pages/Langley200Street.tsx:331` (Link/NavLink to); `src/pages/Abbotsford.tsx:223` (Link/NavLink to); `src/pages/Abbotsford.tsx:530` (Link/NavLink to); `src/pages/Langley.tsx:302` (Link/NavLink to); `src/pages/Index.tsx:317` (Link/NavLink to); `src/pages/blog/C2cVsTuroVsEnterpriseSurrey.tsx:116` (Link/NavLink to); `src/pages/blog/BestRoadTripsFromSurrey.tsx:51` (Link/NavLink to); `src/pages/blog/BestRoadTripsFromSurrey.tsx:111` (Link/NavLink to) … +6 more |
| `/vehicle/${vehicle.id}` | `/vehicle/:id` | `src/pages/Compare.tsx:177` (Link template) |

**Broken navigation targets:** none

---

## 3. Page-by-page detail

### `src/pages/Index.tsx`

- **Route(s):** `/`
- **Access:** public (no guard)
- **Hooks called:** `useEffect`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowRight`, `CleaningBanner`, `CustomerLayout`, `DeliveryBanner`, `FleetRow`, `HowItWorks`, `IncludedStrip`, `Link`, `LocationChips`, `RentalSearchCard`, `Testimonials`, `TrustMarquee`, `WhyChooseSection`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/Search.tsx`

- **Route(s):** `/search`
- **Access:** public (no guard)
- **Hooks called:** `useAvailableCategories`, `useEffect`, `useFleetCategories`, `useMemo`, `useNavigate`, `useQueryClient`, `useRentalBooking`, `useSearchParams`, `useState`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowUpDown`, `BookingStepper`, `BrowseFilterMobile`, `BrowseFilterSidebar`, `BrowseFilterState`, `Car`, `CustomerLayout`, `Fuel`, `Grid`, `List`, `SEO`, `SearchModifyBar`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Settings2`, `Skeleton`, `SortOption`, `TripContextPrompt`, `Users`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `daily_rate`, `sort_order`
- **Values computed in this file (formula quoted):**
  - L388: `${(category.daily_rate * rentalDays).toFixed(2)}`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/Auth.tsx`

- **Route(s):** `/auth`
- **Access:** public (no guard)
- **Hooks called:** `useAuth`, `useEffect`, `useNavigate`, `useSearchParams`, `useState`, `useToast`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `profiles` | upsert | `{
            id: data.user.id,
            email,
            full_name: name,
            phone,
          }` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowRight`, `Button`, `File`, `FileCheck`, `HTMLInputElement`, `Input`, `Label`, `Link`, `Lock`, `Mail`, `PhoneInput`, `Separator`, `Upload`, `User`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `origin`, `session`, `user`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/Compare.tsx`

- **Route(s):** `/compare`
- **Access:** public (no guard)
- **Hooks called:** `useMemo`, `useNavigate`, `useSearchParams`, `useVehicle`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowLeft`, `Badge`, `Button`, `Check`, `CompareRow`, `CompareSection`, `CustomerLayout`, `Fuel`, `Gauge`, `Link`, `Minus`, `PageContainer`, `PriceDisclaimer`, `SEO`, `Skeleton`, `Users`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `category`, `make`, `model`, `year`
- **Values computed in this file (formula quoted):**
  - L236: `<span key={v.id}>${(v.dailyRate * 3 * 1.1).toFixed(0)}*</span>`
  - L242: `<span key={v.id}>${(v.dailyRate * 7 * 1.1).toFixed(0)}*</span>`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/ForgotPassword.tsx`

- **Route(s):** `/forgot-password`
- **Access:** public (no guard)
- **Hooks called:** `useState`, `useToast`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowLeft`, `Button`, `CheckCircle`, `Input`, `Label`, `Link`, `Mail`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `origin`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/ResetPassword.tsx`

- **Route(s):** `/reset-password`
- **Access:** public (no guard)
- **Hooks called:** `useEffect`, `useNavigate`, `useState`, `useToast`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AlertCircle`, `ArrowLeft`, `Button`, `CheckCircle`, `Input`, `Label`, `Link`, `Lock`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `hash`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/NewCheckout.tsx`

- **Route(s):** `/checkout`
- **Access:** public (no guard)
- **Hooks called:** `useAddOns`, `useAuth`, `useCallback`, `useCategory`, `useDriverFeeSettings`, `useEffect`, `useLocation`, `useLocations`, `useMarkCartConverted`, `useMemo`, `useNavigate`, `useProtectionPackages`, `useRef`, `useRentalBooking`, `useSaveAbandonedCart`, `useSearchParams`, `useState`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:**
  - L86: `* Read the JSON error body from a supabase.functions.invoke result.`
  - L262: `const { data, error } = await supabase.functions.invoke("validate-promo-code", {`
  - L517: `authResponse = await supabase.functions.invoke("create-booking", {`
  - L621: `guestResponse = await supabase.functions.invoke("create-guest-booking", {`
  - L1052: `const { data: authData, error: authError } = await supabase.functions.invoke("wl-authorize", { body: authBody });`
  - L1073: `await supabase.functions.invoke("check-booking-payment-integrity", { body: integrityBody });`
- **Child components rendered:** `ArrowLeft`, `BookingStepper`, `Button`, `Card`, `Check`, `Checkbox`, `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`, `CreditCard`, `CustomerLayout`, `Input`, `Label`, `Loader2`, `Lock`, `MapPin`, `PointsRedemption`, `PriceTooltip`, `SaveTimeAtCounter`, `SavedCardsSelector`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Separator`, `WorldlineCheckout`, `WorldlineCheckoutHandle`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `booking`, `booking_code`, `category`, `error`, `make`, `message`, `model`, `valid`, `year`
- **Values computed in this file (formula quoted):**
  - L338: `const promoKeepRate = promoCode ? (100 - promoPercentOff) / 100 : 1;`
  - L339: `const promoTotal = Math.round(pricing.total * promoKeepRate * 100) / 100;`
  - L340: `const promoSavings = Math.round((pricing.total - promoTotal) * 100) / 100;`
  - L341: `const effectiveDeposit = Math.round(DEFAULT_DEPOSIT_AMOUNT * promoKeepRate * 100) / 100;`
  - L344: `const finalTotal = Math.max(0, promoTotal - pointsDiscount);`
  - L828: `${finalTotal.toFixed(2)} CAD`
  - L986: `<p className="text-lg font-bold">${finalTotal.toFixed(2)} CAD</p>`
  - L994: `<p className="text-lg font-bold">${finalTotal.toFixed(2)} CAD</p>`
  - L1211: `${pricing.total.toFixed(2)} CAD`
  - L1214: `<p className="text-2xl font-bold">${finalTotal.toFixed(2)} CAD</p>`
  - L1229: `<span>${pricing.vehicleBaseTotal.toFixed(2)} CAD</span>`
  - L1237: `<span>+${pricing.weekendSurcharge.toFixed(2)} CAD</span>`
  - L1246: `<span>-${pricing.durationDiscount.toFixed(2)} CAD</span>`
  - L1256: `<span>${pricing.protectionTotal.toFixed(2)} CAD</span>`
  - L1271: `<span>${item.total.toFixed(2)} CAD</span>`
  - L1284: `<span>${pricing.additionalDriversCost.total.toFixed(2)} CAD</span>`
  - L1295: `<span>${pricing.deliveryFee.toFixed(2)} CAD</span>`
  - L1304: `<span>${pricing.youngDriverFee.toFixed(2)} CAD</span>`
  - L1312: `<span>${pricing.differentDropoffFee.toFixed(2)} CAD</span>`
  - L1322: `<span>${(1.50 * rentalDays).toFixed(2)} CAD</span>`
  - L1329: `<span>${(1.00 * rentalDays).toFixed(2)} CAD</span>`
  - L1338: `<span>${pricing.subtotal.toFixed(2)} CAD</span>`
  - L1345: `<span>${pricing.taxAmount.toFixed(2)} CAD</span>`
  - L1352: `<span>${pricing.pstAmount.toFixed(2)} CAD</span>`
  - L1359: `<span>${pricing.gstAmount.toFixed(2)} CAD</span>`
  - L1367: `<span>${pricing.processingFee.toFixed(2)} CAD</span>`
  - L1374: `<span>-${promoSavings.toFixed(2)} CAD</span>`
  - L1383: `<span>-${pointsDiscount.toFixed(2)} CAD</span>`
  - L1388: `<span>${finalTotal.toFixed(2)} CAD</span>`
  - L1395: `<span>${effectiveDeposit.toFixed(2)} CAD</span>`
  - L1477: `Pay ${finalTotal.toFixed(2)} + ${effectiveDeposit.toFixed(2)} deposit hold`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/CompleteSignup.tsx`

- **Route(s):** `/complete-signup`
- **Access:** public (no guard)
- **Hooks called:** `useAuth`, `useEffect`, `useNavigate`, `useSearchParams`, `useState`, `useToast`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowRight`, `Button`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `CustomerLayout`, `Input`, `Label`, `Link`, `Lock`, `Mail`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `origin`, `session`, `user`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/Dashboard.tsx`

- **Route(s):** `/dashboard`
- **Access:** public (no guard)
- **Hooks called:** `useActiveOffers`, `useAuth`, `useCustomerMarkReturned`, `useCustomerRealtimeSubscriptions`, `useEffect`, `useLicenseUpload`, `useMembershipInfo`, `useMemo`, `useNavigate`, `useQuery`, `useToast`
- **Inline query keys:** `["my-agreements", bookingIds]`, `["my-bookings", user?.id]`, `["my-verifications", user?.id]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `bookings` | select | `id, booking_code, status, start_at, end_at, total_amount, customer_marked_returned_at, vehicle_id,
           locations!location_id (name, city` |
  | `vehicle_categories` | select | `id, name, image_url` |
  | `verification_requests` | select | `id, status, booking_id` |
  | `rental_agreements` | select | `id, booking_id, status` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `AlertCircle`, `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger`, `Badge`, `Button`, `Clock`, `CustomerLayout`, `Eye`, `File`, `FileCheck`, `FileText`, `HTMLInputElement`, `KeyRound`, `Link`, `PageContainer`, `Shield`, `Skeleton`, `StatusBadge`, `Upload`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `booking_code`, `customer_marked_returned_at`, `end_at`, `latitude`, `locations`, `longitude`, `start_at`, `status`, `total_amount`, `vehicle_categories`, `vehicle_id`
- **Values computed in this file (formula quoted):**
  - L451: `<p className="font-semibold">${Number(b.total_amount).toFixed(0)}</p>`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/BookingDetail.tsx`

- **Route(s):** `/booking/:id`
- **Access:** public (no guard)
- **Hooks called:** `useAuth`, `useBookingReceipts`, `useBookingVerification`, `useCreateCustomerTicketV2`, `useCustomerRealtimeSubscriptions`, `useCustomerTicketByIdV2`, `useCustomerTicketsV2`, `useEffect`, `useNavigate`, `useParams`, `useQuery`, `useRentalAgreement`, `useSearchParams`, `useSendCustomerMessageV2`, `useState`
- **Inline query keys:** `["booking-notifications", id]`, `["booking-payments", id]`, `["booking-walkarounds", id]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `payments` | select | `*` |
  | `walkaround_inspections` | select | `*` |
  | `notification_logs` | select | `*` |
  | `booking_add_ons` | delete | `` |
  | `bookings` | delete | `` |
  | `bookings` | select | `
            id,
            booking_code,
            status,
            start_at,
            end_at,
            daily_rate,
            total_days,
            subtotal,
            tax_amount,
 ` |
  | `vehicle_categories` | select | `id, name, image_url` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `AlertCircle`, `ArrowLeft`, `Badge`, `Bell`, `BookingData`, `BookingProgressStepper`, `Button`, `Calendar`, `CancelBookingDialog`, `Car`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Check`, `CheckCircle`, `Clock`, `Copy`, `CreditCard`, `CustomerLayout`, `CustomerWalkaroundAcknowledge`, `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `Download`, `DriverLicenseUpload`, `FileText`, `FinancialBreakdown`, `Input`, `Label`, `Link`, `Loader2`, `MapPin`, `MessageCircle`, `PageContainer`, `PayNowCard`, `QRCodeSVG`, `QrCode`, `Receipt`, `RentalAgreementSign`, `ReportIssueDialog`, `Send`, `Separator`, `StatusBadge`, `Textarea`, `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`, `VerificationModal`, `XCircle`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `booking_add_ons`, `booking_additional_drivers`, `booking_code`, `card_holder_name`, `card_last_four`, `card_type`, `daily_rate`, `deposit_amount`, `deposit_authorized_at`, `deposit_captured_at`, `deposit_released_at`, `deposit_status`, `end_at`, `locations`, `origin`, `pickup_address`, `start_at`, `status`, `subject`, `total_amount`, `total_days`, `vehicle_id`, `vehicles`, `wl_auth_status`, `wl_deposit_auth_status`, `wl_deposit_transaction_id`, `wl_transaction_id`
- **Values computed in this file (formula quoted):**
  - L818: `<span>${Number(booking.deposit_amount).toFixed(2)}</span>`
  - L975: `${(receipt.totals_json as any)?.total?.toFixed(2)}`
  - L1235: `<span>${Number(item.total).toFixed(2)}</span>`
  - L1243: `<span>${(selectedReceipt.totals_json as any)?.subtotal?.toFixed(2)}</span>`
  - L1247: `<span>${(selectedReceipt.totals_json as any)?.tax?.toFixed(2)}</span>`
  - L1256: `<span>${(selectedReceipt.totals_json as any)?.processingFee?.toFixed(2)}</span>`
  - L1262: `<span>${(selectedReceipt.totals_json as any)?.total?.toFixed(2)}</span>`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/Locations.tsx`

- **Route(s):** `/locations`
- **Access:** public (no guard)
- **Hooks called:** `useEffect`, `useLocations`, `useNavigate`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `Button`, `ChevronRight`, `CustomerLayout`, `Link`, `LocationsMap`, `MapPin`, `Navigation`, `PageContainer`, `Skeleton`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `address`, `city`, `lat`, `lng`, `name`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/LocationDetail.tsx`

- **Route(s):** `/location/:id`
- **Access:** public (no guard)
- **Hooks called:** `useEffect`, `useLocation`, `useSearchParams`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowLeft`, `Button`, `Clock`, `CustomerLayout`, `Link`, `LocationsMap`, `MapPin`, `Navigation`, `PageContainer`, `SEO`, `Skeleton`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `address`, `city`, `lat`, `lng`, `name`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/CheckIn.tsx`

- **Route(s):** `/check-in`
- **Access:** public (no guard)
- **Hooks called:** `useEffect`, `useIsAdmin`, `useNavigate`, `useSearchParams`, `useState`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:**
  - L62: `const { data, error: fnError } = await supabase.functions.invoke("lookup-booking-pass", {`
- **Child components rendered:** `AlertCircle`, `ArrowRight`, `Badge`, `BookingData`, `Button`, `Calendar`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Clock`, `CustomerLayout`, `FileCheck`, `Home`, `Link`, `Loader2`, `MapPin`, `PageContainer`, `Separator`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `booking_code`, `end_at`, `locations`, `start_at`, `status`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/Protection.tsx`

- **Route(s):** `/protection`
- **Access:** public (no guard)
- **Hooks called:** `useCategory`, `useEffect`, `useNavigate`, `useProtectionPackages`, `useRentalBooking`, `useSearchParams`, `useVehicle`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowLeft`, `Badge`, `BookingStepper`, `BookingSummaryPanel`, `Button`, `Card`, `Check`, `CustomerLayout`, `PriceTooltip`, `SEO`, `Shield`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `category`, `make`, `model`
- **Values computed in this file (formula quoted):**
  - L133: `${totalPrice.toFixed(2)} CAD`
  - L257: `{pkg.dailyRate.toFixed(2)}`
  - L262: `${pkg.originalRate.toFixed(2)} CAD/day`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/AddOns.tsx`

- **Route(s):** `/add-ons`
- **Access:** public (no guard)
- **Hooks called:** `useAddOns`, `useCategory`, `useDriverFeeSettings`, `useEffect`, `useNavigate`, `useProtectionPackages`, `useRentalBooking`, `useSearchParams`, `useVehicle`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AdditionalDriversCard`, `ArrowLeft`, `BookingStepper`, `BookingSummaryPanel`, `Button`, `Card`, `Check`, `CustomerLayout`, `Fuel`, `IconComponent`, `Minus`, `Plus`, `SEO`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `category`
- **Values computed in this file (formula quoted):**
  - L121: `const addOnsTotal = selectedAddOnIds.reduce((sum, id) => {`
  - L168: `const next = Math.max(1, current + delta);`
  - L261: `${totalPrice.toFixed(2)} CAD`
  - L334: `${fuelCost.ourPrice.toFixed(2)} CAD`
  - L341: `*{FUEL_DISCOUNT_CENTS}¢/L below market price – Save ${fuelCost.savings.toFixed(2)} CAD`
  - L386: `${addon.dailyRate.toFixed(2)} CAD / day`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/About.tsx`

- **Route(s):** `/about`
- **Access:** public (no guard)
- **Hooks called:** none
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowRight`, `Button`, `Card`, `CardContent`, `CustomerLayout`, `FileCheck`, `Link`, `MapPin`, `PageHero`, `SEO`, `TrustMarquee`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `city`, `href`, `img`, `note`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/Surrey.tsx`

- **Route(s):** `/surrey`
- **Access:** public (no guard)
- **Hooks called:** none
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowRight`, `Button`, `Card`, `CardContent`, `CityClaimGrid`, `CityFaq`, `CityRoutesAndLocation`, `CitySection`, `CityStepsWithImage`, `CityTileGrid`, `CityVisualBand`, `CustomerLayout`, `Link`, `PageContainer`, `PageHero`, `RentalSearchCard`, `SEO`, `TrustMarquee`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/Langley.tsx`

- **Route(s):** `/langley`
- **Access:** public (no guard)
- **Hooks called:** none
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowRight`, `Button`, `Card`, `CardContent`, `CityClaimGrid`, `CityFaq`, `CityRoutesAndLocation`, `CitySection`, `CityStepsWithImage`, `CityTileGrid`, `CityVisualBand`, `CustomerLayout`, `Link`, `PageContainer`, `PageHero`, `RentalSearchCard`, `SEO`, `TrustMarquee`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/Langley200Street.tsx`

- **Route(s):** `/langley-200-street`
- **Access:** public (no guard)
- **Hooks called:** none
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowRight`, `Button`, `Card`, `CardContent`, `CityClaimGrid`, `CityFaq`, `CityRoutesAndLocation`, `CitySection`, `CityStepsWithImage`, `CityTileGrid`, `CityVisualBand`, `CustomerLayout`, `Link`, `PageContainer`, `PageHero`, `RentalSearchCard`, `SEO`, `TrustMarquee`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/Abbotsford.tsx`

- **Route(s):** `/abbotsford`
- **Access:** public (no guard)
- **Hooks called:** `useFleetCategories`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `Accordion`, `AccordionContent`, `AccordionItem`, `AccordionTrigger`, `ArrowRight`, `Button`, `Car`, `Card`, `CardContent`, `CategoryDisplayCard`, `CheckCircle2`, `ChevronDown`, `CityVisualBand`, `CleaningBanner`, `CustomerLayout`, `Fuel`, `HelpCircle`, `Icon`, `Link`, `MapPin`, `MessageCircle`, `PageHero`, `RentalSearchCard`, `SEO`, `SectionHeader`, `Settings2`, `Shield`, `Skeleton`, `Users`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/Contact.tsx`

- **Route(s):** `/contact`
- **Access:** public (no guard)
- **Hooks called:** `useState`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:**
  - L78: `const { error } = await supabase.functions.invoke("send-contact-email", {`
- **Child components rendered:** `ArrowRight`, `Button`, `Card`, `CardContent`, `CheckCircle`, `Clock`, `CustomerLayout`, `ExternalLink`, `Facebook`, `HTMLInputElement`, `Input`, `Instagram`, `Label`, `Mail`, `MapPin`, `PageHero`, `Phone`, `SEO`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Send`, `Textarea`, `TrustMarquee`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `label`, `url`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/Subscription.tsx`

- **Route(s):** `/subscription`
- **Access:** public (no guard)
- **Hooks called:** `useEffect`, `useState`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:**
  - L215: `const { error } = await supabase.functions.invoke("send-contact-email", {`
- **Child components rendered:** `Accordion`, `AccordionContent`, `AccordionItem`, `AccordionTrigger`, `ArrowRight`, `Button`, `CalendarClock`, `Car`, `CheckCircle`, `Checkbox`, `Cog`, `CustomerLayout`, `HTMLDivElement`, `Icon`, `Input`, `Mail`, `MapPin`, `Phone`, `SEO`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Send`, `User`, `Users`, `Wallet`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/blog/BlogIndex.tsx`

- **Route(s):** `/blog`
- **Access:** public (no guard)
- **Hooks called:** none
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowRight`, `Badge`, `Card`, `CardContent`, `CustomerLayout`, `Link`, `SEO`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/blog/CarRentalSurreyGuide.tsx`

- **Route(s):** `/blog/car-rental-surrey-guide`
- **Access:** public (no guard)
- **Hooks called:** none
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `Button`, `CustomerLayout`, `Link`, `SEO`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/blog/IcbcCarRentalInsurance.tsx`

- **Route(s):** `/blog/icbc-car-rental-insurance-bc`
- **Access:** public (no guard)
- **Hooks called:** none
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `Button`, `CustomerLayout`, `Link`, `SEO`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/blog/BestRoadTripsFromSurrey.tsx`

- **Route(s):** `/blog/best-road-trips-from-surrey-bc`
- **Access:** public (no guard)
- **Hooks called:** none
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `Button`, `CustomerLayout`, `Link`, `SEO`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/blog/CarRentalTipsNewDrivers.tsx`

- **Route(s):** `/blog/car-rental-tips-new-drivers-bc`
- **Access:** public (no guard)
- **Hooks called:** none
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `Button`, `CustomerLayout`, `Link`, `SEO`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/blog/AffordableCarRentalSurreyLangleyAbbotsford.tsx`

- **Route(s):** `/blog/affordable-car-rental-surrey-langley-abbotsford-bc`
- **Access:** public (no guard)
- **Hooks called:** `useEffect`, `useState`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowLeft`, `ArrowRight`, `Button`, `CheckCircle`, `CustomerLayout`, `Link`, `SEO`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/blog/DailyVsWeeklyCarRentalSurrey.tsx`

- **Route(s):** `/blog/daily-vs-weekly-car-rental-surrey-bc`
- **Access:** public (no guard)
- **Hooks called:** `useEffect`, `useState`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowLeft`, `ArrowRight`, `Button`, `CustomerLayout`, `Link`, `SEO`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `choice`, `highlight`, `situation`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/blog/C2cVsTuroVsEnterpriseSurrey.tsx`

- **Route(s):** `/blog/c2c-vs-turo-vs-enterprise-surrey`
- **Access:** public (no guard)
- **Hooks called:** none
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `Button`, `CustomerLayout`, `Link`, `SEO`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/booking/BookingConfirmed.tsx`

- **Route(s):** `/booking/confirmed`
- **Access:** public (no guard)
- **Hooks called:** `useAuth`, `useEffect`, `useNavigate`, `useQuery`, `useRef`, `useSearchParams`
- **Inline query keys:** `["booking-confirmed", bookingId]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `bookings` | select | `
          *,
          vehicle_id,
          locations!location_id (id, name, address, city` |
  | `vehicle_categories` | select | `id, name, image_url` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowRight`, `Badge`, `Button`, `Car`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CheckCircle`, `CustomerLayout`, `Link`, `Loader2`, `MapPin`, `PageContainer`, `Separator`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `booking_code`, `end_at`, `locations`, `start_at`, `total_amount`, `vehicle_id`, `vehicles`
- **Values computed in this file (formula quoted):**
  - L196: `<span>${booking.total_amount.toFixed(2)} CAD</span>`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/booking/BookingLicense.tsx`

- **Route(s):** `/booking/:bookingId/license`
- **Access:** public (no guard)
- **Hooks called:** `useAuth`, `useBookingVerification`, `useEffect`, `useNavigate`, `useQuery`
- **Inline query keys:** `["booking-license", bookingId]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `bookings` | select | `id, booking_code, status, user_id` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowLeft`, `ArrowRight`, `Button`, `Card`, `CardContent`, `CheckCircle`, `CustomerLayout`, `DriverLicenseUpload`, `Link`, `Loader2`, `PageContainer`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/booking/BookingAgreement.tsx`

- **Route(s):** `/booking/:bookingId/agreement`
- **Access:** public (no guard)
- **Hooks called:** `useAuth`, `useBookingVerification`, `useEffect`, `useGenerateAgreement`, `useNavigate`, `useQuery`, `useRentalAgreement`
- **Inline query keys:** `["booking-agreement", bookingId]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `bookings` | select | `id, booking_code, status, user_id` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `AlertCircle`, `ArrowLeft`, `ArrowRight`, `Button`, `Card`, `CardContent`, `CheckCircle`, `CustomerLayout`, `FileText`, `Link`, `Loader2`, `PageContainer`, `RentalAgreementSign`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/booking/BookingPass.tsx`

- **Route(s):** `/booking/:bookingId/pass`
- **Access:** public (no guard)
- **Hooks called:** `useAuth`, `useEffect`, `useNavigate`, `useQuery`, `useState`
- **Inline query keys:** `["booking-pass", bookingId]`, `["booking-pass-payments", bookingId]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `bookings` | select | `
          *,
          vehicle_id,
          locations!location_id (id, name, address, city` |
  | `vehicle_categories` | select | `id, name, image_url` |
  | `payments` | select | `*` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `ArrowLeft`, `Badge`, `Button`, `Calendar`, `CancelBookingDialog`, `Car`, `Card`, `CardContent`, `Check`, `Copy`, `CreditCard`, `CustomerLayout`, `Link`, `Loader2`, `MapPin`, `PageContainer`, `QRCodeSVG`, `Separator`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `booking_code`, `daily_rate`, `locations`, `origin`, `start_at`, `status`, `vehicle_id`, `vehicles`, `wl_auth_status`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/booking/BookingPickup.tsx`

- **Route(s):** `/booking/:bookingId/pickup`
- **Access:** public (no guard)
- **Hooks called:** `useAuth`, `useBookingVerification`, `useEffect`, `useNavigate`, `useQuery`, `useRentalAgreement`
- **Inline query keys:** `["booking-pickup", bookingId]`, `["booking-pickup-payments", bookingId]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `bookings` | select | `
          *,
          vehicles (id, make, model, year` |
  | `payments` | select | `*` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `AlertCircle`, `ArrowLeft`, `Button`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CheckCircle`, `Clock`, `CustomerLayout`, `Link`, `Loader2`, `MapPin`, `PageContainer`, `XCircle`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `locations`, `start_at`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/booking/BookingReturn.tsx`

- **Route(s):** `/booking/:bookingId/return`
- **Access:** public (no guard)
- **Hooks called:** `useAuth`, `useEffect`, `useNavigate`, `useQuery`, `useState`
- **Inline query keys:** `["booking-return", bookingId]`, `["booking-return-deposits", bookingId]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `bookings` | select | `
          *,
          vehicles (id, make, model, year` |
  | `payments` | select | `*` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `AlertTriangle`, `ArrowLeft`, `Badge`, `Button`, `Calendar`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CheckCircle`, `Clock`, `CustomerLayout`, `Fuel`, `Link`, `Loader2`, `MapPin`, `MessageCircle`, `PageContainer`, `ReportIssueDialog`, `Separator`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `actual_return_at`, `booking_code`, `deposit_amount`, `end_at`, `locations`, `status`
- **Values computed in this file (formula quoted):**
  - L200: `<p className="font-medium">${booking.deposit_amount?.toFixed(2) || "500.00"} CAD</p>`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/booking/WalkaroundSign.tsx`

- **Route(s):** `/walkaround/:bookingId`
- **Access:** public (no guard)
- **Hooks called:** `useBookingById`, `useBookingConditionPhotos`, `useCustomerAcknowledge`, `useSearchParams`, `useState`, `useWalkaroundInspection`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `Alert`, `AlertDescription`, `AlertTriangle`, `Badge`, `Button`, `Calendar`, `Car`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CheckCircle`, `Checkbox`, `ClipboardCheck`, `Fuel`, `Gauge`, `Input`, `Label`, `Loader2`, `PenLine`, `Separator`, `SignedStorageImage`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `booking_code`, `start_at`, `vehicles`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/PdfViewerPage.tsx`

- **Route(s):** `/terms`, `/legal`, `/privacy`
- **Access:** public (no guard)
- **Hooks called:** `useEffect`, `useNavigate`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `Button`, `ChevronLeft`, `PdfViewerPage`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `replace`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/AdminLogin.tsx`

- **Route(s):** `/admin/login`
- **Access:** public (no guard)
- **Hooks called:** `useEffect`, `useState`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `Loader2`, `Navigate`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/Alerts.tsx`

- **Route(s):** `/admin/alerts`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useAcknowledgeAlert`, `useAdminAlerts`, `useBulkResolveAlerts`, `usePendingTicketSummary`, `useResolveAlert`, `useSearchParams`, `useState`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AdminAlert`, `AdminShell`, `AlertRow`, `AlertTriangle`, `Badge`, `Bell`, `BookOpen`, `Button`, `Car`, `Check`, `ChevronRight`, `Clock`, `CollapsibleSection`, `Eye`, `Info`, `Label`, `Link`, `MessageSquare`, `RefreshCw`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Separator`, `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `Skeleton`, `Switch`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Tooltip`, `TooltipContent`, `TooltipTrigger`, `Trash2`, `TypeIcon`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/Bookings.tsx`

- **Route(s):** `/admin/bookings`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useAdminActiveBookings`, `useAdminBookings`, `useAdminPickupBookings`, `useAdminVehicles`, `useEffect`, `useEffectiveLocationId`, `useLocations`, `useMemo`, `useNavigate`, `usePickupProgress`, `useSearchParams`, `useState`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `ActiveRentalsMonitor`, `AdminShell`, `AlertCircle`, `Badge`, `BookingFilters`, `BookingWorkflowCard`, `Button`, `Calendar`, `CalendarDays`, `Car`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `CheckCircle2`, `Clock`, `DateHighlightBadge`, `DeliveryBadge`, `Eye`, `Input`, `KeyRound`, `LowInventoryBanner`, `MapPin`, `OperationsFilters`, `OperationsFiltersState`, `PaymentStatusDot`, `RefreshCw`, `RotateCcw`, `Search`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `StatusBadge`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`, `UserPlus`, `WalkInBookingDialog`, `Workflow`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `location`, `notes`, `overbooked`, `profile`, `status`, `vehicle`
- **Values computed in this file (formula quoted):**
  - L427: `const total = active.reduce((s, b) => s + b.totalAmount, 0);`
  - L599: `<span className="font-medium text-sm">${booking.totalAmount.toFixed(0)}</span>`
  - L675: `<span className="font-medium text-sm">${booking.totalAmount.toFixed(0)}</span>`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/BookingDetail.tsx`

- **Route(s):** `/admin/bookings/:bookingId`, `/ops/booking/:bookingId`
- **Access:** see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner); super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useBookingById`, `useBookingConditionPhotos`, `useLocation`, `useNavigate`, `useQuery`, `useQueryClient`, `useSearchParams`, `useState`, `useUpdateBookingStatus`
- **Inline query keys:** `["assigned-unit", unitId]`, `["booking-agreements-detail", bookingId]`, `["booking-damages-detail", bookingId]`, `["booking-deposit-ledger", bookingId]`, `["booking-final-invoices", bookingId]`, `["booking-incidents-detail", bookingId]`, `["booking-inspections-detail", bookingId]`, `["booking-receipts", bookingId]`, `["vehicle-unit", booking.assigned_unit_id]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `vehicle_units` | select | `vin, license_plate, color, status` |
  | `vehicle_units` | select | `id, vin, license_plate, current_mileage` |
  | `damage_reports` | select | `*` |
  | `inspection_metrics` | select | `*` |
  | `deposit_ledger` | select | `*` |
  | `receipts` | select | `*` |
  | `final_invoices` | select | `*` |
  | `incident_cases` | select | `*` |
  | `rental_agreements` | select | `id, status, agreement_type, customer_signed_at, signature_png_url, created_at, agreement_content, terms_json, customer_signature, staff_confirmed_by, staff_confirmed_at, signed_manually, signed_manual` |

- **Edge functions invoked from this file:**
  - L402: `const { data, error } = await supabase.functions.invoke("close-account", {`
  - L421: `const { data, error } = await supabase.functions.invoke("generate-agreement", {`
- **Child components rendered:** `AgreementStructuredView`, `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertTriangle`, `ArrowLeft`, `AssignedUnitCard`, `AssignedVehicleSection`, `AuditTimeline`, `Badge`, `Ban`, `BookingDocumentsCard`, `Button`, `Calendar`, `Camera`, `Car`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `ChangeVehicleDialog`, `CheckCircle2`, `Clock`, `CreditCard`, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogTrigger`, `DollarSign`, `Download`, `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger`, `ExternalLink`, `FileCheck`, `FileText`, `FinancialBreakdown`, `Fuel`, `Gauge`, `Info`, `InspectionNotesDisplay`, `Loader2`, `Mail`, `MapPin`, `MoreVertical`, `PanelShell`, `PaymentDepositPanel`, `Pencil`, `Phone`, `PhotoLightbox`, `Play`, `PriceTooltip`, `ProcessedBySection`, `Receipt`, `RefreshCw`, `ScrollArea`, `Separator`, `Shield`, `SignedStorageImage`, `StatusBadge`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`, `Truck`, `User`, `VehicleHistoryList`, `VoidBookingDialog`, `XCircle`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `actual_return_at`, `addons_total`, `amount`, `amount_due`, `assigned_unit_id`, `booking_code`, `card_holder_name`, `card_last_four`, `card_type`, `color`, `created_at`, `daily_rate`, `damage_charges`, `deposit_amount`, `deposit_captured`, `deposit_held`, `deposit_released`, `deposit_status`, `end_at`, `grand_total`, `invoice_number`, `issued_at`, `late_fees`, `license_plate`, `location_id`, `locations`, `notes`, `pathname`, `payment_type`, `payments`, `payments_received`, `pickup_address`, `profiles`, `rental_subtotal`, `return_location_id`, `start_at`, `status`, `subtotal`, `tax_amount`, `taxes_total`, `total_amount`, `total_days`, `upgrade_daily_fee`, `vehicle_id`, `vehicles`, `vin`
- **Values computed in this file (formula quoted):**
  - L8: `import { format, parseISO, differenceInHours } from "date-fns";`
  - L480: `? differenceInHours(parseISO(booking.actual_return_at), parseISO(booking.start_at))`
  - L805: `<span>{Math.round(actualDuration / 24)} day{Math.round(actualDuration / 24) !== 1 ? "s" : ""}</span>`
  - L942: `<span className="text-right">${Number(booking.daily_rate).toFixed(2)}</span>`
  - L950: `<span className="text-right">${Number(booking.subtotal).toFixed(2)}</span>`
  - L959: `<span className="text-right">${Number(booking.tax_amount).toFixed(2)}</span>`
  - L965: `<span className="shrink-0">Upgrade (${Number(booking.upgrade_daily_fee).toFixed(2)}/day × {booking.total_days}d):</span>`
  - L966: `<span className="text-right">${(Number(booking.upgrade_daily_fee) * booking.total_days).toFixed(2)}</span>`
  - L972: `<span className="text-right">${Number(booking.total_amount).toFixed(2)} CAD</span>`
  - L978: `${Number(booking.deposit_amount).toFixed(2)}`
  - L1206: `<span className="text-muted-foreground">PST ({(PST_RATE * 100).toFixed(0)}%)</span>`
  - L1207: `<span>${(Number(booking.subtotal) * PST_RATE).toFixed(2)}</span>`
  - L1210: `<span className="text-muted-foreground">GST ({(GST_RATE * 100).toFixed(0)}%)</span>`
  - L1211: `<span>${(Number(booking.subtotal) * GST_RATE).toFixed(2)}</span>`
  - L1218: `<span>${Number(booking.tax_amount).toFixed(2)}</span>`
  - L1258: `<span className="font-medium">${Number(booking.deposit_amount || 0).toFixed(2)}</span>`
  - L1268: `${Number(entry.amount).toFixed(2)}`
  - L1291: `<p className="font-medium">${Number(payment.amount).toFixed(2)}</p>`
  - L1337: `<span>${Number(invoice.rental_subtotal).toFixed(2)}</span>`
  - L1342: `<span>${Number(invoice.addons_total).toFixed(2)}</span>`
  - L1347: `<span>${Number(invoice.taxes_total).toFixed(2)}</span>`
  - L1352: `<span>${Number(invoice.late_fees).toFixed(2)}</span>`
  - L1358: `<span className="text-destructive">${Number(invoice.damage_charges).toFixed(2)}</span>`
  - L1364: `<span>${Number(invoice.grand_total).toFixed(2)}</span>`
  - L1368: `<span>${Number(invoice.payments_received).toFixed(2)}</span>`
  - L1373: `<span>${Number(invoice.amount_due).toFixed(2)}</span>`
  - L1475: `<span className="shrink-0">${Number(addon.price).toFixed(2)}</span>`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/BookingOps.tsx`

- **Route(s):** `/admin/bookings/:bookingId/ops`, `/ops/booking/:bookingId/handover`
- **Access:** see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner); super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useAvailableDrivers`, `useBookingById`, `useBookingConditionPhotos`, `useBookingDocuments`, `useBookingVerification`, `useCheckInRecord`, `useCheckVehicleAvailability`, `useEffect`, `useLocation`, `useNavigate`, `usePaymentDepositStatus`, `useRealtimeDeliveryStatuses`, `useRef`, `useRentalAgreement`, `useSearchParams`, `useState`, `useUpdateBookingStatus`, `useVehiclePrepStatus`, `useWalkaroundInspection`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AlertCircle`, `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `ArrowLeft`, `Badge`, `BookingEditPanel`, `Button`, `CancelBookingDialog`, `CreateIncidentDialog`, `DeliveryModeBanner`, `Dialog`, `DialogContent`, `DialogDescription`, `DialogHeader`, `DialogTitle`, `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger`, `Loader2`, `MobileBookingSummary`, `ModifyRentalPanel`, `MoreVertical`, `OpsBookingSummary`, `OpsStepContent`, `OpsStepId`, `OpsStepSidebar`, `PanelShell`, `ProcessedBySection`, `ScrollArea`, `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`, `Truck`, `Wrench`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `assigned_driver_id`, `assigned_unit_id`, `booking_code`, `delivery_statuses`, `end_at`, `handover_sms_sent_at`, `pathname`, `pickup_address`, `profiles`, `start_at`, `status`, `user_id`, `vehicle_id`, `vehicles`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/Agreements.tsx`

- **Route(s):** `/admin/agreements`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useAgreements`, `useEffectiveLocationId`, `useMemo`, `useRentalAgreement`, `useState`
- **Inline query keys:** `["admin-agreements", scopeLocationId ?? "all"]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `rental_agreements` | select | `id, booking_id, status, signature_png_url, customer_signature, customer_signed_at, agreement_content, created_at` |
  | `bookings` | select | `id, booking_code, start_at, end_at, user_id, vehicle_id, customer_id, status, location_id` |
  | `customers` | select | `id, full_name, email` |
  | `profiles` | select | `id, full_name, email` |
  | `vehicle_categories` | select | `id, name` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `AdminShell`, `AgreementRow`, `AgreementStructuredView`, `AlertTriangle`, `ArrowUpDown`, `Badge`, `Button`, `Card`, `CardContent`, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `Eye`, `FileText`, `Input`, `Link`, `PenLine`, `ScrollArea`, `Search`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Skeleton`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Tabs`, `TabsList`, `TabsTrigger`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `booking_code`, `customer_id`, `email`, `end_at`, `full_name`, `length`, `location_id`, `map`, `start_at`, `status`, `user_id`, `vehicle_id`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/Finance.tsx`

- **Route(s):** `/admin/finance`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useEffectiveLocationId`, `useMemo`, `useMutation`, `useNavigate`, `useQuery`, `useQueryClient`, `useSearchParams`, `useState`
- **Inline query keys:** `["admin-invoices"]`, `["admin-payments"]`, `["admin-payments", dateStart.toISOString(), dateEnd.toISOString()]`, `["admin-receipts"]`, `["admin-receipts", statusFilter]`, `["finance-capture-failures"]`, `["finance-locations"]`, `["invoice-booking-detail", selectedInvoiceBookingId]`, `["payment-dashboard"]`, `["payment-dashboard", dateRange]`, `["payment-dashboard-prev"]`, `["payment-dashboard-prev", dateRange]`, `["payment-dashboard-unrecorded"]`, `["payment-dashboard-unrecorded", dateRange]`, `["payment-dashboard-wl"]`, `["payment-dashboard-wl", dateRange]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `locations` | select | `id, name` |
  | `payments` | select | `id, booking_id, amount, payment_type, payment_method, status, transaction_id, created_at` |
  | `bookings` | select | `id, booking_code, user_id, customer_id, status, location_id` |
  | `profiles` | select | `id, full_name` |
  | `customers` | select | `id, full_name` |
  | `bookings` | select | `id, booking_code, total_amount, user_id, customer_id, start_at, status, wl_transaction_id` |
  | `payments` | select | `booking_id` |
  | `profiles` | select | `id, full_name` |
  | `customers` | select | `id, full_name` |
  | `payments` | select | `booking_id, transaction_id, payment_type` |
  | `bookings` | select | `id, booking_code, total_amount, wl_transaction_id, wl_auth_status, card_type, created_at, start_at, user_id, customer_id, status, location_id` |
  | `bookings` | select | `id, booking_code, deposit_amount, wl_deposit_transaction_id, wl_deposit_auth_status, deposit_status, deposit_authorized_at, card_type, created_at, start_at, user_id, customer_id, status, location_id` |
  | `profiles` | select | `id, full_name` |
  | `customers` | select | `id, full_name` |
  | `payments` | select | `amount, status` |
  | `locations` | select | `id, name` |
  | `bookings` | select | `*, booking_add_ons(id, price, quantity, add_ons(name, daily_rate, one_time_fee` |
  | `vehicle_categories` | select | `name` |
  | `final_invoices` | select | `*, booking:bookings(booking_code, start_at, end_at, total_days, user_id, customer_id, vehicle_id, location_id` |
  | `profiles` | select | `id, full_name, email` |
  | `customers` | select | `id, full_name, email` |
  | `vehicle_categories` | select | `id, name` |
  | `receipts` | select | `*, booking:bookings(booking_code, total_amount, daily_rate, total_days, start_at, end_at, deposit_amount, user_id, customer_id, vehicle_id, location_id` |
  | `profiles` | select | `id, full_name, email` |
  | `customers` | select | `id, full_name, email` |
  | `vehicle_categories` | select | `id, name` |
  | `booking_add_ons` | select | `booking_id, price, add_on:add_ons(name` |
  | `payments` | select | `*, booking:bookings(booking_code, user_id, location_id` |
  | `bookings` | select | `id, booking_code, total_amount, wl_transaction_id, wl_auth_status, card_type, card_last_four, status, created_at, user_id, customer_id, location_id` |
  | `bookings` | select | `id, booking_code, deposit_amount, wl_deposit_transaction_id, wl_deposit_auth_status, card_type, card_last_four, deposit_status, deposit_authorized_at, created_at, user_id, customer_id, location_id` |
  | `profiles` | select | `id, full_name` |
  | `customers` | select | `id, full_name` |
  | `receipts` | update | `{ status: ` |
  | `admin_alerts` | select | `id, title, message, booking_id, created_at, status` |

- **Edge functions invoked from this file:**
  - L356: `const { data, error } = await supabase.functions.invoke("wl-reconcile-authorized", { body: {} });`
- **Child components rendered:** `AdminShell`, `AlertTriangle`, `ArrowUpDown`, `Badge`, `Banknote`, `BarChart3`, `BreakdownRow`, `Button`, `CalendarIcon`, `Card`, `CardContent`, `CheckCircle`, `Clock`, `CreditCard`, `Date`, `Dialog`, `DialogContent`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `DollarSign`, `Download`, `ExternalLink`, `Eye`, `FileText`, `Filter`, `FinancialBreakdown`, `Icon`, `Input`, `InvoiceRow`, `Loader2`, `MapPin`, `OverviewTab`, `PageHeader`, `PaymentStatusBadge`, `Receipt`, `ReceiptData`, `RefreshCw`, `Search`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Separator`, `Skeleton`, `SortHead`, `StatCard`, `StatGrid`, `StatusCard`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `Tooltip`, `TooltipContent`, `TooltipTrigger`, `TransactionsTab`, `UnderlineTabs`, `UnderlineTabsContent`, `UnderlineTabsList`, `UnderlineTabsTrigger`, `User`, `XCircle`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `amount`, `booking`, `booking_code`, `booking_id`, `card_type`, `count`, `created_at`, `customer_id`, `daily_rate`, `deposit_amount`, `deposit_authorized_at`, `deposit_status`, `end_at`, `full_name`, `location_id`, `map`, `name`, `payment_method`, `payment_type`, `profile`, `source`, `start_at`, `status`, `total`, `total_amount`, `total_days`, `transaction_id`, `user_id`, `vehicle_id`, `wl_auth_status`, `wl_deposit_auth_status`, `wl_deposit_transaction_id`, `wl_transaction_id`
- **Values computed in this file (formula quoted):**
  - L506: `const unrecordedTotal = useMemo(() => unrecordedBookings.reduce((s, b) => s + b.total_amount, 0), [unrecordedBookings]);`
  - L701: `const pending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);`
  - L702: `const failed = payments.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);`
  - L704: `const successRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;`
  - L705: `const prevCollected = prevPayments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);`
  - L706: `const changePercent = prevCollected > 0 ? Math.round(((collected - prevCollected) / prevCollected) * 100) : 0;`
  - L720: `.map(([method, data]) => ({ method, ...data, percent: metrics.collected > 0 ? Math.round((data.total / metrics.collected) * 100) : 0 }))`
  - L742: `percent: metrics.collected > 0 ? Math.round((data.total / metrics.collected) * 100) : 0,`
  - L778: `const collected = dayPayments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);`
  - L779: `const pending = dayPayments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);`
  - L780: `const failed = dayPayments.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);`
  - L782: `const successRate = dayPayments.length > 0 ? Math.round((completedCount / dayPayments.length) * 100) : 0;`
  - L976: `<TableCell className="text-right text-sm font-medium">${day.collected.toFixed(2)}</TableCell>`
  - L977: `<TableCell className="text-right text-sm text-muted-foreground">${day.pending.toFixed(2)}</TableCell>`
  - L979: `{day.failed > 0 ? <span className="text-destructive">${day.failed.toFixed(2)}</span> : "—"}`
  - L1038: `<TableCell className="text-sm font-medium">${p.amount.toFixed(2)}</TableCell>`
  - L1558: `const pendingAmount = branchPayments.filter(p => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0);`
  - L1560: `const totalDeposits = depositPayments.reduce((sum, p) => sum + Number(p.amount), 0);`
  - L1950: `<TableCell className="font-medium">${Number(inv.grand_total).toFixed(2)}</TableCell>`
  - L1951: `<TableCell className={Number(inv.amount_due) > 0 ? "text-destructive font-medium" : ""}>${Number(inv.amount_due || 0).toFixed(2)}</TableCell>`
  - L2026: `<TableCell className="font-medium">${receipt.totals_json?.total?.toFixed(2) || "0.00"}</TableCell>`
  - L2090: `<TableCell className="font-medium">${Number(payment.amount).toFixed(2)}</TableCell>`
  - L2146: `<TableCell className="font-medium">${Number(payment.amount).toFixed(2)}</TableCell>`
  - L2223: `<div className="flex justify-between text-sm"><span className="text-muted-foreground">Late Fees</span><span>${Number(selectedInvoice.late_fees).toFixed(2)}</span></div>`
  - L2226: `<div className="flex justify-between text-sm text-destructive"><span>Damage Charges</span><span>${Number(selectedInvoice.damage_charges).toFixed(2)}</span></div>`
  - L2229: `<div className="flex justify-between font-bold text-lg"><span>Grand Total</span><span>${Number(selectedInvoice.grand_total).toFixed(2)}</span></div>`
  - L2231: `<div className="flex justify-between text-sm"><span className="text-muted-foreground">Payments Received</span><span>${Number(selectedInvoice.payments_received).toFixed(2)}</span></`
  - L2234: `<div className="flex justify-between font-semibold text-destructive"><span>Amount Due</span><span>${Number(selectedInvoice.amount_due).toFixed(2)}</span></div>`
  - L2309: `<TableCell className="text-sm text-right">${item.unitPrice?.toFixed(2)}</TableCell>`
  - L2310: `<TableCell className="text-sm text-right font-medium">${item.total?.toFixed(2)}</TableCell>`
  - L2319: `<div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${selectedReceipt.totals_json?.subtotal?.toFixed(2) || "0.00"}</span></div>`
  - L2320: `<div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${selectedReceipt.totals_json?.tax?.toFixed(2) || "0.00"}</span></div>`
  - L2322: `<div className="flex justify-between font-bold text-lg"><span>Total</span><span>${selectedReceipt.totals_json?.total?.toFixed(2) || "0.00"}</span></div>`
  - L2324: `<div className="flex justify-between text-sm text-muted-foreground pt-1"><span>Security Deposit</span><span>${selectedReceipt.booking.deposit_amount.toFixed(2)}</span></div>`
  - L2401: `const percent = total > 0 ? Math.round((amount / total) * 100) : 0;`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/ReturnOps.tsx`

- **Route(s):** `/admin/returns/:bookingId`, `/ops/return/:bookingId`
- **Access:** see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner); super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useBookingById`, `useBookingConditionPhotos`, `useBookingIncidents`, `useCallback`, `useCloseAccount`, `useCompleteReturnStep`, `useEffect`, `useInitiateReturn`, `useLocation`, `useNavigate`, `usePaymentDepositStatus`, `useQuery`, `useQueryClient`, `useRef`, `useState`, `useUpdateBookingStatus`
- **Inline query keys:** `["active-rentals"]`, `["admin-bookings"]`, `["booking", bookingId]`, `["booking-damages", bookingId]`, `["return-inspection-metrics", bookingId]`, `["returns"]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `inspection_metrics` | select | `*` |
  | `damage_reports` | select | `*` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `Alert`, `AlertDescription`, `AlertTriangle`, `ArrowLeft`, `Badge`, `BookingEditPanel`, `Button`, `CreateIncidentDialog`, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `Loader2`, `Lock`, `ModifyRentalPanel`, `PanelShell`, `Pencil`, `ReturnBookingSummary`, `ReturnStepId`, `ReturnStepSidebar`, `ScrollArea`, `StepReturnCloseout`, `StepReturnDeposit`, `StepReturnEvidence`, `StepReturnIntake`, `StepReturnIssues`, `Wrench`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `booking_code`, `deposit_amount`, `end_at`, `pathname`, `profiles`, `status`, `user_id`, `vehicle_id`, `vehicles`
- **Values computed in this file (formula quoted):**
  - L4: `import { differenceInMinutes } from "date-fns";`
  - L188: `const minutesLate = isLateReturn && endDate ? differenceInMinutes(new Date(), endDate) : 0;`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/ActiveRentalDetail.tsx`

- **Route(s):** `/admin/active-rentals/:bookingId`, `/ops/rental/:bookingId`
- **Access:** see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner); super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useActiveRentalDetail`, `useBookingById`, `useCreateAlert`, `useEffect`, `useLocation`, `useNavigate`, `useQuery`, `useReactState`, `useState`, `useUpdateBookingStatus`
- **Inline query keys:** `["vehicle-unit", assignedUnitId]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `vehicle_units` | select | `id, vin, license_plate, current_mileage` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `ActiveRentalUnitAssignCard`, `Alert`, `AlertDescription`, `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertTitle`, `AlertTriangle`, `ArrowLeft`, `Badge`, `BookingDocumentsCard`, `BookingEditPanel`, `Button`, `Car`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardInfoSection`, `CardTitle`, `ChangeVehicleDialog`, `ChangeVehicleSection`, `CheckCircle`, `CreateIncidentDialog`, `CreditCard`, `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `DialogTrigger`, `ExternalLink`, `Flag`, `Link`, `Mail`, `MapPin`, `MessageSquare`, `ModifyRentalPanel`, `PanelShell`, `Pencil`, `Phone`, `Play`, `ProcessedBySection`, `RotateCcw`, `Send`, `Separator`, `Shield`, `SignedStorageImage`, `Skeleton`, `StatusBadge`, `Textarea`, `Timer`, `User`, `VehicleHistoryList`, `Wrench`, `XCircle`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `customer`, `location`, `notes`, `pathname`, `status`, `subject`, `vehicle`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/Staff.tsx`

- **Route(s):** `/admin/staff`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useMutation`, `useQuery`, `useQueryClient`, `useStaffLocation`, `useState`
- **Inline query keys:** `["staff-assignment"]`, `["staff-management"]`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:**
  - L73: `const { data, error } = await supabase.functions.invoke("manage-staff", { body });`
- **Child components rendered:** `AdminShell`, `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `Badge`, `Button`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `Eye`, `EyeOff`, `Input`, `Label`, `Mail`, `MapPin`, `PasswordField`, `Pencil`, `Plus`, `RefreshCw`, `Role`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `ShieldCheck`, `Skeleton`, `StaffRow`, `Switch`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Trash2`, `UserCog`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `locations`, `staff`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/FleetManagement.tsx`

- **Route(s):** `/admin/fleet`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useCategoryVins`, `useDeleteFleetCategory`, `useDeleteVin`, `useEffect`, `useEffectiveLocationId`, `useFleetCategories`, `useQueryClient`, `useSearchParams`, `useState`, `useUpdateVinStatus`
- **Inline query keys:** `["category-vins"]`, `["fleet-categories"]`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AdminShell`, `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AllVehiclesTable`, `Badge`, `Button`, `Car`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `CategoryFormDialog`, `ChevronRight`, `Edit2`, `FleetCategory`, `FolderOpen`, `Plus`, `RefreshCw`, `ScrollArea`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `Skeleton`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `TemporaryVehiclesTable`, `Trash2`, `VinFormDialog`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/FleetAnalytics.tsx`

- **Route(s):** `/admin/fleet-analytics`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useQueryClient`, `useSearchParams`, `useState`
- **Inline query keys:** `["fleet-analytics"]`, `["fleet-cost-analysis"]`, `["vehicle-categories"]`, `["vehicle-units"]`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AdminShell`, `BarChart3`, `Building2`, `Button`, `ByCategoryTab`, `ByVehicleTab`, `Car`, `CategoryManagementTab`, `CompetitorPricingTab`, `CostTrackingTab`, `DollarSign`, `Download`, `FleetOverviewTab`, `FleetProfitTrendChart`, `FleetRevenueVsCostChart`, `FolderOpen`, `GitCompare`, `PerformanceComparisonTab`, `PieChart`, `RefreshCw`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `Tooltip`, `TooltipContent`, `TooltipTrigger`, `TrendingUp`, `UtilizationTab`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/FleetCosts.tsx`

- **Route(s):** `/admin/fleet-costs`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useCreateVehicleUnit`, `useDeleteVehicleUnit`, `useEffectiveLocationId`, `useFleetCostAnalysisEnhanced`, `useSearchParams`, `useState`, `useUpdateVehicleUnit`, `useVehicleUnits`, `useVehicles`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AdminShell`, `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `Badge`, `Button`, `Calculator`, `Car`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Clock`, `DepreciationCalculator`, `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `DollarSign`, `Edit2`, `Eye`, `FileText`, `FleetReportsPanel`, `Hash`, `HeartPulse`, `Input`, `Label`, `LifecycleSummarySection`, `LocationSelector`, `Plus`, `Receipt`, `RefreshCw`, `Search`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Skeleton`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `Textarea`, `Trash2`, `TrendingUp`, `VehicleHealthCard`, `VehicleUnit`, `VehicleUnitDetail`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `acquisition_cost`, `acquisition_date`, `color`, `current_mileage`, `license_plate`, `location_id`, `mileage_at_acquisition`, `notes`, `status`, `tank_capacity_liters`, `total_expenses`, `vehicle`, `vehicle_id`, `vin`
- **Values computed in this file (formula quoted):**
  - L236: `const totalAcquisitionCost = units?.reduce(`
  - L240: `const totalExpenses = units?.reduce(`
  - L264: `utilizationRate: v.totalRentalDays > 0 ? Math.min(100, (v.totalRentalDays / 365) * 100) : 0,`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/VehicleUnitDetail.tsx`

- **Route(s):** `/admin/fleet/vehicle/:unitId`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useFleetCostAnalysisByVehicle`, `useMaintenanceLogsByUnit`, `useNavigate`, `useState`, `useUnitRentalHistory`, `useVehicleUnit`, `useVehicleUnitCostTimeline`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `Activity`, `AdminShell`, `ArrowLeft`, `Badge`, `Button`, `Calendar`, `Car`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `ClipboardList`, `DollarSign`, `Download`, `Edit2`, `Gauge`, `Lightbulb`, `MaintenanceLogDialog`, `Plus`, `Skeleton`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `TrendingDown`, `TrendingUp`, `VehicleUnitEditDialog`, `Wrench`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `acquisition_date`, `booking_code`, `color`, `customer_email`, `customer_name`, `end_at`, `license_plate`, `make`, `model`, `start_at`, `status`, `tank_capacity_liters`, `total_amount`, `total_days`, `vehicle`, `vin`, `year`
- **Values computed in this file (formula quoted):**
  - L306: `<span className="font-medium">${metrics?.costPerMile?.toFixed(2) || "0.00"} CAD</span>`
  - L310: `<span className="font-medium text-green-600">${metrics?.revenuePerMile?.toFixed(2) || "0.00"}</span>`
  - L331: `<span className="font-medium">{metrics?.avgRentalDuration?.toFixed(1) || 0} days</span>`
  - L336: `{metrics?.profitMargin?.toFixed(1) || 0}%`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/CategoryDetail.tsx`

- **Route(s):** `/admin/fleet/category/:categoryId`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useFleetCategories`, `useFleetCostAnalysisByVehicle`, `useNavigate`, `useState`, `useVehicleCategoryWithUnits`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AdminShell`, `AlertTriangle`, `ArrowLeft`, `Badge`, `Button`, `Car`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `CategoryEditDialog`, `DollarSign`, `Download`, `Edit2`, `Eye`, `FolderOpen`, `Skeleton`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Tooltip`, `TooltipContent`, `TooltipTrigger`, `TrendingDown`, `TrendingUp`
- **Values computed in this file (formula quoted):**
  - L48: `totalAcquisition: categoryMetrics.reduce((sum, v) => sum + v.acquisitionCost, 0),`
  - L49: `totalRevenue: categoryMetrics.reduce((sum, v) => sum + v.totalRentalRevenue, 0),`
  - L50: `totalDamage: categoryMetrics.reduce((sum, v) => sum + v.totalDamageCost, 0),`
  - L51: `totalMaintenance: categoryMetrics.reduce((sum, v) => sum + v.totalMaintenanceCost, 0),`
  - L52: `totalProfit: categoryMetrics.reduce((sum, v) => sum + v.netProfit, 0),`
  - L53: `totalRentals: categoryMetrics.reduce((sum, v) => sum + v.rentalCount, 0),`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/Calendar.tsx`

- **Route(s):** `/admin/calendar`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useCalendarData`, `useEffectiveLocationId`, `useLocations`, `useMemo`, `useNavigate`, `useState`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AdminShell`, `Badge`, `Button`, `Car`, `Card`, `CardContent`, `ChevronLeft`, `ChevronRight`, `Input`, `Search`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Skeleton`, `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `model`, `name`, `status`
- **Values computed in this file (formula quoted):**
  - L106: `return { left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` };`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/Tickets.tsx`

- **Route(s):** `/admin/tickets`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useAddTimelineEntry`, `useDeleteTicketAttachment`, `useEffect`, `useMutation`, `useQuery`, `useQueryClient`, `useResolveTicket`, `useSearchParams`, `useSendTicketMessage`, `useState`, `useTicketAttachments`, `useTicketById`, `useTicketTimeline`, `useTickets`, `useUpdateTicketStatus`, `useUploadTicketAttachment`
- **Inline query keys:** `["admin-ticket"]`, `["admin-tickets"]`, `["ticket-attachments", ticketId]`, `["ticket-timeline"]`, `["ticket-timeline", ticketId]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `ticket_timeline` | select | `*` |
  | `profiles` | select | `id, full_name, email` |
  | `ticket_attachments` | select | `*` |
  | `tickets` | update | `{
          status: ` |
  | `ticket_timeline` | insert | `{
        ticket_id: ticketId,
        user_id: user.id,
        action: ` |
  | `ticket_timeline` | insert | `{
        ticket_id: ticketId,
        user_id: user.id,
        action,
        old_status: oldStatus,
        new_status: newStatus,
        note,
      }` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `AdminShell`, `AlertCircle`, `Avatar`, `AvatarFallback`, `Badge`, `Button`, `Card`, `CardContent`, `CheckCircle`, `Clock`, `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `Eye`, `FileText`, `HTMLDivElement`, `HTMLInputElement`, `HelpCircle`, `History`, `Input`, `Label`, `Loader2`, `MessageSquare`, `Paperclip`, `Play`, `RefreshCw`, `ScrollArea`, `Search`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Send`, `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `Skeleton`, `StatusIcon`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `Textarea`, `TicketBookingSummary`, `TicketStatus`, `Tooltip`, `TooltipContent`, `TooltipTrigger`, `Trash2`, `Upload`, `User`, `UserPlus`, `XCircle`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `booking`, `email`, `full_name`, `map`, `status`, `subject`, `user`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/AbandonedCarts.tsx`

- **Route(s):** `/admin/abandoned-carts`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useAbandonedCarts`, `useDeleteAbandonedCart`, `useState`, `useUpdateAbandonedCart`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AbandonedCart`, `AdminShell`, `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `Badge`, `Button`, `Car`, `Card`, `CardContent`, `CheckCircle`, `Checkbox`, `Clock`, `Dialog`, `DialogContent`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `Label`, `Mail`, `MessageSquare`, `Phone`, `ShoppingCart`, `Skeleton`, `Textarea`, `Trash2`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `make`, `model`, `year`
- **Values computed in this file (formula quoted):**
  - L72: `const groupedCarts = (carts || []).reduce((acc, cart) => {`
  - L148: `${(carts?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0).toLocaleString()} CAD`
  - L261: `<p className="font-semibold">${cart.total_amount.toFixed(2)} CAD</p>`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/Reports.tsx`

- **Route(s):** `/admin/reports`, `/admin/analytics`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useAdminVehicles`, `useAnalyticsEvents`, `useCollectedRevenue`, `useEffectiveLocationId`, `useLocations`, `useMemo`, `useQuery`, `useRevenueAnalytics`, `useStaffLocation`, `useState`
- **Inline query keys:** `["active-rental-units-for-reports", effectiveLocationId ?? "all"]`, `["fleet-units-for-reports", effectiveLocationId ?? "all"]`, `["funnel-addon-ids", dateRange.start.toISOString(), dateRange.end.toISOString()]`, `["funnel-bookings-data", dateRange.start.toISOString(), dateRange.end.toISOString(), effectiveLocationId ?? "all"]`, `["funnel-payment-ids", dateRange.start.toISOString(), dateRange.end.toISOString()]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `vehicle_units` | select | `id, status` |
  | `bookings` | select | `assigned_unit_id` |
  | `bookings` | select | `id, status, protection_plan` |
  | `booking_add_ons` | select | `booking_id` |
  | `payments` | select | `booking_id` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `AdminShell`, `Bar`, `BarChart`, `BarChart3`, `BookingChannel`, `BookingType`, `Button`, `CalendarDays`, `Car`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ConversionFunnel`, `Date`, `DatePreset`, `DemandForecastingTab`, `DollarSign`, `Eye`, `FileText`, `Line`, `LineChart`, `LocationDailyReport`, `MapPin`, `PaymentType`, `Percent`, `Progress`, `QuarterlyReportGenerator`, `RefreshCw`, `ResponsiveContainer`, `RevenueAnalyticsTab`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `TrendingUp`, `Wallet`, `XAxis`, `YAxis`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `assigned_unit_id`, `protection_plan`, `status`, `value`
- **Values computed in this file (formula quoted):**
  - L307: `stages[i].count = Math.min(stages[i].count, stages[i - 1].count);`
  - L411: `<p className="text-2xl font-bold">{overallConversion.toFixed(1)}%</p>`
  - L437: `<p className="text-2xl font-bold">{rentalMetrics.averageDays.toFixed(1)}</p>`
  - L531: `<span className="text-lg font-bold">${revenueStats.avgBookingValue.toFixed(0)}</span>`
  - L535: `<span className="text-lg font-bold">{revenueStats.avgDuration.toFixed(1)} days</span>`
  - L552: `<span className="text-lg font-bold text-success">{overallConversion.toFixed(1)}%</span>`
  - L565: `? (((checkoutCount - completedCount) / checkoutCount) * 100).toFixed(0)`
  - L715: `<p className="text-4xl font-bold text-primary">{fleetStats.utilizationRate.toFixed(0)}%</p>`
  - L751: `<span className="text-lg font-bold">${fleetStats.revenuePerVehicle.toFixed(0)}</span>`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/Settings.tsx`

- **Route(s):** `/admin/settings`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useState`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AddOnsPricingPanel`, `AdminShell`, `Award`, `Badge`, `Bell`, `Building2`, `Button`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardPasswordSettings`, `CardTitle`, `CheckCircle`, `Clock`, `DollarSign`, `Input`, `Label`, `Mail`, `MembershipManagementPanel`, `MessageSquare`, `PointsSettingsPanel`, `ProtectionPricingPanel`, `Separator`, `Settings`, `Shield`, `Switch`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `Users`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/Offers.tsx`

- **Route(s):** `/admin/offers`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useAdminOffers`, `useCreateOffer`, `useDeleteOffer`, `useState`, `useUpdateOffer`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AdminShell`, `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger`, `ArrowUp`, `Badge`, `Button`, `Card`, `CardContent`, `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `DollarSign`, `Gift`, `Input`, `Label`, `OfferFormData`, `Pencil`, `Percent`, `Plus`, `PointsOffer`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Separator`, `Skeleton`, `Star`, `Switch`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Textarea`, `Trash2`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/Incidents.tsx`

- **Route(s):** `/admin/incidents`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useDamageReports`, `useEffectiveLocationId`, `useIncidentCasesWithTickets`, `useNavigate`, `useQuery`, `useState`
- **Inline query keys:** `["incident-cases-with-tickets", locationId ?? "all"]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `incident_cases` | select | `
          *,
          bookings (id, booking_code, location_id` |
  | `vehicle_categories` | select | `id, name` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `AdminShell`, `AlertTriangle`, `Badge`, `Button`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `CreateIncidentDialog`, `ExternalLink`, `FileText`, `Link`, `MessageSquare`, `Plus`, `RefreshCw`, `Skeleton`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Tooltip`, `TooltipContent`, `TooltipTrigger`, `Wrench`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/Damages.tsx`

- **Route(s):** `/admin/damages`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useDamageById`, `useDamageReports`, `useEffectiveLocationId`, `useLocations`, `useNavigate`, `useSearchParams`, `useState`, `useUpdateDamage`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AdminShell`, `AlertTriangle`, `Badge`, `Button`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `DollarSign`, `ImageIcon`, `Input`, `Link`, `Search`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `Skeleton`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Textarea`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `name`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/Vendors.tsx`

- **Route(s):** `/admin/vendors`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useAuth`, `useCreateVendor`, `useDeleteVendor`, `useState`, `useUpdateVendor`, `useVendorServiceHistory`, `useVendors`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AdminShell`, `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `Badge`, `Building2`, `Button`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `Dialog`, `DialogContent`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `Edit2`, `Filter`, `History`, `Input`, `Label`, `Mail`, `MapPin`, `Phone`, `Plus`, `Search`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Sheet`, `SheetContent`, `SheetDescription`, `SheetHeader`, `SheetTitle`, `Skeleton`, `Star`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Textarea`, `Trash2`, `Vendor`, `VendorDetailSheet`, `VendorForm`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/admin/BookingDebug.tsx`

- **Route(s):** `/admin/debug/:bookingId`
- **Access:** super_admin, manager, admin, staff, cleaner, finance (src/hooks/use-admin.ts:28-30)
- **Hooks called:** `useQuery`
- **Inline query keys:** `["debug-addons", bookingId]`, `["debug-booking", bookingId]`, `["debug-deposit-ledger", bookingId]`, `["debug-drivers", bookingId]`, `["debug-payments", bookingId]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `bookings` | select | `
          id, booking_code, status, daily_rate, total_days, subtotal,
          tax_amount, total_amount, deposit_amount, delivery_fee,
          different_dropoff_fee, young_driver_fee, upgrade_dail` |
  | `booking_add_ons` | select | `id, add_on_id, price, quantity, add_ons(name, daily_rate, one_time_fee` |
  | `booking_additional_drivers` | select | `id, driver_name, driver_age_band, young_driver_fee` |
  | `payments` | select | `id, amount, status, payment_type, payment_method, transaction_id, created_at` |
  | `deposit_ledger` | select | `id, action, amount, reason, category, created_at` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `AlertTriangle`, `Badge`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CheckCircle`, `Database`, `Separator`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `booking_code`, `daily_rate`, `delivery_fee`, `deposit_amount`, `different_dropoff_fee`, `driver_age_band`, `pricing_snapshot`, `protection_plan`, `status`, `subtotal`, `tax_amount`, `total_amount`, `total_days`, `upgrade_daily_fee`, `young_driver_fee`
- **Values computed in this file (formula quoted):**
  - L99: `const addOnsTotal = addOns.reduce((sum, a) => sum + Number(a.price || 0), 0);`
  - L100: `const driversTotal = drivers.reduce((sum, d) => sum + Number(d.young_driver_fee || 0), 0);`
  - L131: `<div>Stored subtotal: ${storedSubtotal.toFixed(2)}</div>`
  - L132: `<div>Computed (rental + extras + fees): ${computedSubtotal.toFixed(2)}</div>`
  - L135: `Δ = ${(computedSubtotal - storedSubtotal).toFixed(2)}`
  - L182: `<span className="font-semibold">${Number(a.price).toFixed(2)}</span>`
  - L188: `<span>${addOnsTotal.toFixed(2)}</span>`
  - L208: `<span className="font-semibold">${Number(d.young_driver_fee).toFixed(2)}</span>`
  - L214: `<span>${driversTotal.toFixed(2)}</span>`
  - L234: `<span className="font-semibold">${Number(p.amount).toFixed(2)}</span>`
  - L263: `<span>${Number(d.amount).toFixed(2)}</span>`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/support/SupportTickets.tsx`

- **Route(s):** `/support`
- **Access:** super_admin, manager, admin, staff, support (src/hooks/use-support-access.ts:19-20)
- **Hooks called:** `useAuth`, `useCloseTicketV2`, `useCreateTicketV2`, `useEffect`, `useEscalateTicketV2`, `useSearchParams`, `useSendMessageV2`, `useState`, `useSupportMacros`, `useSupportTicketById`, `useSupportTicketsV2`, `useUpdateTicketV2`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `Avatar`, `AvatarFallback`, `Badge`, `Button`, `Card`, `CardContent`, `Clock`, `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `Eye`, `EyeOff`, `Flame`, `HTMLDivElement`, `Input`, `Label`, `Mail`, `MessageSquare`, `Phone`, `Plus`, `Popover`, `PopoverContent`, `PopoverTrigger`, `RefreshCw`, `ScrollArea`, `Search`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Send`, `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `Skeleton`, `StatusIcon`, `SupportShell`, `Switch`, `Textarea`, `TicketBookingSummary`, `TicketCategory`, `TicketPriority`, `TicketRow`, `Tooltip`, `TooltipContent`, `TooltipTrigger`, `User`, `UserPlus`, `Zap`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `booking_code`, `created_at`, `customer`, `guest_email`, `guest_name`, `is_urgent`, `status`, `subject`, `ticket_id`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/support/SupportAnalytics.tsx`

- **Route(s):** `/support/analytics`
- **Access:** super_admin, manager, admin, staff, support (src/hooks/use-support-access.ts:19-20)
- **Hooks called:** `useState`, `useSupportAnalytics`, `useSupportTicketsV2`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AlertTriangle`, `Bar`, `BarChart`, `Button`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `CartesianGrid`, `Cell`, `CheckCircle`, `Clock`, `DateRange`, `Flame`, `Link`, `MessageSquare`, `Pie`, `PieChart`, `RefreshCw`, `ResponsiveContainer`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Skeleton`, `SupportShell`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `TicketTable`, `Timer`, `Tooltip`, `TrendingUp`, `Users`, `XAxis`, `YAxis`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `created_at`, `customer`, `guest_email`, `guest_name`, `subject`, `ticket_id`
- **Values computed in this file (formula quoted):**
  - L174: `if (minutes < 1440) return `${Math.round(minutes / 60)}h`;`
  - L175: `return `${Math.round(minutes / 1440)}d`;`
  - L180: `return `${Math.round(hours / 24)}d`;`
  - L364: `label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/features/delivery/pages/Dashboard.tsx`

- **Route(s):** `/delivery`
- **Access:** super_admin, manager, admin, staff, driver (src/hooks/use-delivery-access.ts:19-20)
- **Hooks called:** `useDeliveryCounts`, `useDeliveryList`, `useEffect`, `useRealtimeDelivery`, `useSearchParams`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `Button`, `DeliveryGrid`, `DeliveryShell`, `PortalStatus`, `RefreshCw`, `StatusPill`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/features/delivery/pages/WalkIn.tsx`

- **Route(s):** `/delivery/walk-in`
- **Access:** super_admin, manager, admin, staff, driver (src/hooks/use-delivery-access.ts:19-20)
- **Hooks called:** `useBrowseCategories`, `useLocations`, `useNavigate`, `useState`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:**
  - L91: `const { data, error } = await supabase.functions.invoke("create-walk-in-booking", {`
- **Child components rendered:** `ArrowLeft`, `Button`, `Car`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Check`, `DeliveryShell`, `Input`, `Label`, `Loader2`, `MapPin`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Textarea`, `User`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `booking`, `error`, `name`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/features/delivery/pages/Detail.tsx`

- **Route(s):** `/delivery/:id`
- **Access:** super_admin, manager, admin, staff, driver (src/hooks/use-delivery-access.ts:19-20)
- **Hooks called:** `useDeliveryDetail`, `useHandoverChecklist`, `useMemo`, `useNavigate`, `usePreActivationCheck`, `useQuery`, `useRealtimeDeliveryDetail`, `useState`
- **Inline query keys:** `["delivery-handover-photos", bookingId]`, `["delivery-inspection", bookingId]`, `["rental-agreement-status", bookingId]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `rental_agreements` | select | `id, status, customer_signed_at` |
  | `inspection_metrics` | select | `id` |
  | `condition_photos` | select | `id` |
  | `delivery_statuses` | update | `{ status: ` |
  | `delivery_tasks` | upsert | `{
          booking_id: bookingId,
          status: ` |

- **Edge functions invoked from this file:**
  - L579: `const { data, error } = await supabase.functions.invoke("update-booking-status", {`
- **Child components rendered:** `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger`, `AlertTriangle`, `ArrowLeft`, `Button`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Check`, `CheckCircle2`, `DeliveryActions`, `DeliveryDetailSkeleton`, `DeliveryShell`, `HandoverChecklist`, `Key`, `Loader2`, `MapPin`, `Navigation`, `Phone`, `PortalStepProgress`, `PreActivationStatus`, `RentalAgreementSign`, `ShieldAlert`, `Skeleton`, `StatusBadge`, `StepArrivedContent`, `StepEnRouteContent`, `StepHandoverActivation`, `StepPhotos`, `StepWalkaround`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/ops/OpsWorkboard.tsx`

- **Route(s):** `/ops`
- **Access:** see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner)
- **Hooks called:** `useNavigate`, `useOpsLocationFilter`, `useQuery`, `useSearchParams`, `useState`, `useWorkboardCounts`
- **Inline query keys:** `["ops-workboard-counts", locationId]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `bookings` | select | `id, start_at` |
  | `bookings` | select | `id, end_at` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `Button`, `Car`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CheckCircle2`, `ChevronRight`, `Icon`, `OpsShell`, `RotateCcw`, `Skeleton`, `StatCard`, `TaskCount`, `UserPlus`, `WalkInBookingDialog`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `end_at`, `start_at`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/ops/OpsBookings.tsx`

- **Route(s):** `/ops/bookings`
- **Access:** see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner)
- **Hooks called:** `useMemo`, `useNavigate`, `useOpsLocationFilter`, `useQuery`, `useSearchParams`, `useState`
- **Inline query keys:** `["ops-all-bookings", activeTab, locationId, debouncedSearch]`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `Badge`, `BookingCard`, `Button`, `Calendar`, `Car`, `Card`, `CardContent`, `ChevronRight`, `Input`, `OpsShell`, `RefreshCw`, `Search`, `Skeleton`, `StatusBadge`, `Tabs`, `TabsList`, `TabsTrigger`, `Truck`, `User`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `profile`, `status`, `vehicle`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/ops/OpsPickups.tsx`

- **Route(s):** `/ops/pickups`
- **Access:** see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner)
- **Hooks called:** `useCreateAlert`, `useHandovers`, `useNavigate`, `useOpsLocationFilter`, `useState`, `useUpdateBookingStatus`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AlertTriangle`, `Badge`, `Button`, `Calendar`, `Car`, `Card`, `CardContent`, `Checkbox`, `Clock`, `DateFilter`, `DeliveryBadge`, `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `Flag`, `HandoverBooking`, `Icon`, `Input`, `KeyRound`, `Label`, `MapPin`, `OpsShell`, `Play`, `ReadinessBadge`, `RefreshCw`, `Search`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Skeleton`, `Textarea`, `XCircle`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `location`, `profile`, `vehicle`
- **Values computed in this file (formula quoted):**
  - L125: `const groupedBookings = filteredBookings.reduce(`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/ops/OpsActiveRentals.tsx`

- **Route(s):** `/ops/active`
- **Access:** see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner)
- **Hooks called:** `useEffectiveLocationId`, `useNavigate`, `useQuery`, `useState`
- **Inline query keys:** `["ops-active-rentals", locationId ?? "all"]`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AlertTriangle`, `Badge`, `Button`, `Car`, `Card`, `CardContent`, `ChevronRight`, `Clock`, `Input`, `OpsShell`, `RentalCard`, `Search`, `Skeleton`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `profile`, `status`, `vehicle`
- **Values computed in this file (formula quoted):**
  - L23: `import { format, parseISO, differenceInHours, isPast } from "date-fns";`
  - L30: `const hoursLeft = differenceInHours(endTime, new Date());`
  - L71: `${booking.totalAmount.toFixed(0)} paid`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/ops/OpsReturns.tsx`

- **Route(s):** `/ops/returns`
- **Access:** see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner)
- **Hooks called:** `useNavigate`, `useOpsLocationFilter`, `useQuery`, `useSearchParams`, `useState`
- **Inline query keys:** `["ops-returns", locationFilter]`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** `AlertTriangle`, `Badge`, `Button`, `Car`, `Card`, `CardContent`, `ChevronRight`, `Clock`, `Input`, `OpsShell`, `ReturnCard`, `RotateCcw`, `Search`, `Skeleton`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `profile`, `status`, `vehicle`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/ops/OpsFleet.tsx`

- **Route(s):** `/ops/fleet`
- **Access:** see src/components/ops/OpsProtectedRoute.tsx (header comment: admin, staff, cleaner)
- **Hooks called:** `useEffectiveLocationId`, `useQuery`, `useState`
- **Inline query keys:** `["ops-fleet-active-bookings", locationId ?? "all"]`, `["ops-fleet-categories"]`, `["ops-fleet-units", locationId ?? "all"]`
- **Direct Supabase calls in the page file:**

  | Table | Operation | Columns |
  | --- | --- | --- |
  | `bookings` | select | `assigned_unit_id` |

- **Edge functions invoked from this file:** none
- **Child components rendered:** `Badge`, `Car`, `Card`, `CardContent`, `Input`, `OpsShell`, `Search`, `Skeleton`, `StatusIcon`
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `assigned_unit_id`, `status`, `vin`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

### `src/pages/NotFound.tsx`

- **Route(s):** `*`
- **Access:** public (no guard)
- **Hooks called:** `useEffect`, `useLocation`
- **Direct Supabase calls in the page file:** none (all data via hooks)
- **Edge functions invoked from this file:** none
- **Child components rendered:** none
- **Displayed / consumed record fields (property accesses on fetched rows —
  map to the identically named columns documented in `docs/01-DATABASE.md`):**
  `pathname`

GAP note: field-level provenance beyond the column names listed above is
not declared anywhere in the code (rows are passed through untyped hook
results), so a stricter mapping is UNKNOWN: not determinable from codebase.

---

## 4. Role access matrix

Ops roles: no inline role list; the guard delegates to a hook — `UNKNOWN` in src/components/ops/OpsProtectedRoute.tsx.

| Route | anonymous | customer (signed in, no role row) | super_admin | manager | admin | staff | cleaner | finance | support | driver |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/search` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/auth` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/compare` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/forgot-password` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/reset-password` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/checkout` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/complete-signup` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/dashboard` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/booking/:id` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/locations` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/location/:id` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/check-in` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/protection` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/add-ons` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/about` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/surrey` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/langley` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/langley-200-street` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/abbotsford` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/contact` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/subscription` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/blog` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/blog/car-rental-surrey-guide` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/blog/icbc-car-rental-insurance-bc` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/blog/best-road-trips-from-surrey-bc` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/blog/car-rental-tips-new-drivers-bc` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/blog/affordable-car-rental-surrey-langley-abbotsford-bc` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/blog/daily-vs-weekly-car-rental-surrey-bc` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/blog/c2c-vs-turo-vs-enterprise-surrey` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/booking/confirmed` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/booking/:bookingId/license` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/booking/:bookingId/agreement` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/booking/:bookingId/pass` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/booking/:bookingId/pickup` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/booking/:bookingId/return` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/walkaround/:bookingId` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/terms` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/legal` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/privacy` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/admin/login` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |
| `/admin/alerts` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/bookings` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/bookings/:bookingId` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/bookings/:bookingId/ops` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/agreements` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/finance` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/returns/:bookingId` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/active-rentals/:bookingId` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/staff` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/fleet` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/fleet-analytics` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/fleet-costs` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/fleet/vehicle/:unitId` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/fleet/category/:categoryId` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/calendar` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/tickets` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/abandoned-carts` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/reports` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/settings` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/offers` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/incidents` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/damages` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/vendors` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/debug/:bookingId` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/support` | denied | denied | allowed | allowed | allowed | allowed | denied | denied | allowed | denied |
| `/support/analytics` | denied | denied | allowed | allowed | allowed | allowed | denied | denied | allowed | denied |
| `/delivery` | denied | denied | allowed | allowed | allowed | allowed | denied | denied | denied | allowed |
| `/delivery/walk-in` | denied | denied | allowed | allowed | allowed | allowed | denied | denied | denied | allowed |
| `/delivery/:id` | denied | denied | allowed | allowed | allowed | allowed | denied | denied | denied | allowed |
| `/ops` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/ops/bookings` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/ops/pickups` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/ops/active` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/ops/returns` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/ops/fleet` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/ops/booking/:bookingId` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/ops/booking/:bookingId/handover` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/ops/rental/:bookingId` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/ops/return/:bookingId` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `/admin/analytics` | denied | denied | allowed | allowed | allowed | allowed | allowed | allowed | denied | denied |
| `*` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed |

Notes taken from the guard source:
- Every guard first requires a Supabase session; unauthenticated users are
  redirected (`AdminProtectedRoute` → `/admin/login`).
- Guards check only for the presence of a `user_roles` row in the allowed
  list; they do **not** check `staff_assignments.location_id`. Branch
  scoping happens inside pages/hooks, not in the router.
- GAP: `/booking/:id`, `/dashboard`, `/check-in`, `/walkaround/:bookingId`
  and the other customer routes have no router-level guard at all; access
  control for them depends entirely on RLS and on the edge functions they
  call (see `docs/01-DATABASE.md` section 4 and `docs/02-EDGE-FUNCTIONS.md`).

