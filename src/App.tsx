import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RentalBookingProvider } from "@/contexts/RentalBookingContext";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eager load critical pages
import Index from "./pages/Index";
import Search from "./pages/Search";
import Auth from "./pages/Auth";

// Lazy load less critical pages for faster initial load
const Compare = lazy(() => import("./pages/Compare"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const BookingDetail = lazy(() => import("./pages/BookingDetail"));
const Locations = lazy(() => import("./pages/Locations"));
const LocationDetail = lazy(() => import("./pages/LocationDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CheckIn = lazy(() => import("./pages/CheckIn"));
const Protection = lazy(() => import("./pages/Protection"));
const AddOns = lazy(() => import("./pages/AddOns"));
const NewCheckout = lazy(() => import("./pages/NewCheckout"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Post-booking customer pages
const BookingConfirmed = lazy(() => import("./pages/booking/BookingConfirmed"));
const BookingLicense = lazy(() => import("./pages/booking/BookingLicense"));
const BookingAgreement = lazy(() => import("./pages/booking/BookingAgreement"));
const BookingPass = lazy(() => import("./pages/booking/BookingPass"));
const BookingPickup = lazy(() => import("./pages/booking/BookingPickup"));
const BookingReturn = lazy(() => import("./pages/booking/BookingReturn"));
const WalkaroundSign = lazy(() => import("./pages/booking/WalkaroundSign"));

// Admin Pages - all lazy loaded
const AdminOverview = lazy(() => import("./pages/admin/Overview"));
const AdminAlerts = lazy(() => import("./pages/admin/Alerts"));
const AdminBookings = lazy(() => import("./pages/admin/Bookings"));
const AdminBookingDetail = lazy(() => import("./pages/admin/BookingDetail"));
const AdminBilling = lazy(() => import("./pages/admin/Billing"));
const AdminInventory = lazy(() => import("./pages/admin/Inventory"));
const AdminCalendar = lazy(() => import("./pages/admin/Calendar"));
const AdminTickets = lazy(() => import("./pages/admin/Tickets"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const ActiveRentalDetail = lazy(() => import("./pages/admin/ActiveRentalDetail"));
const BookingOps = lazy(() => import("./pages/admin/BookingOps"));
const ReturnOps = lazy(() => import("./pages/admin/ReturnOps"));
const AbandonedCarts = lazy(() => import("./pages/admin/AbandonedCarts"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const FleetAnalytics = lazy(() => import("./pages/admin/FleetAnalytics"));
const FleetManagement = lazy(() => import("./pages/admin/FleetManagement"));
const FleetCosts = lazy(() => import("./pages/admin/FleetCosts"));
const AdminIncidents = lazy(() => import("./pages/admin/Incidents"));
const AdminDamages = lazy(() => import("./pages/admin/Damages"));
const AdminOffers = lazy(() => import("./pages/admin/Offers"));
const VehicleUnitDetail = lazy(() => import("./pages/admin/VehicleUnitDetail"));
const AdminVendors = lazy(() => import("./pages/admin/Vendors"));
const CategoryDetail = lazy(() => import("./pages/admin/CategoryDetail"));

// Support Panel Pages - lazy loaded with separate route protection
const SupportTickets = lazy(() => import("./pages/support/SupportTickets"));
const SupportAnalyticsPage = lazy(() => import("./pages/support/SupportAnalytics"));

// Delivery Panel Pages - lazy loaded (NEW: Using feature-based architecture)
const DeliveryDashboard = lazy(() => import("./features/delivery/pages/Dashboard"));
const DeliveryDetail = lazy(() => import("./features/delivery/pages/Detail"));
const DeliveryWalkIn = lazy(() => import("./features/delivery/pages/WalkIn"));

// Ops Panel Pages - lazy loaded
const OpsWorkboard = lazy(() => import("./pages/ops/OpsWorkboard"));
const OpsPickups = lazy(() => import("./pages/ops/OpsPickups"));
const OpsActiveRentals = lazy(() => import("./pages/ops/OpsActiveRentals"));
const OpsReturns = lazy(() => import("./pages/ops/OpsReturns"));
const OpsFleet = lazy(() => import("./pages/ops/OpsFleet"));
const OpsBookings = lazy(() => import("./pages/ops/OpsBookings"));

// Admin Protection
import { AdminProtectedRoute } from "./components/admin/AdminProtectedRoute";

// Support Protection
import { SupportProtectedRoute } from "./components/support/SupportProtectedRoute";

// Delivery Protection
import { DeliveryProtectedRoute } from "./components/delivery/DeliveryProtectedRoute";

// Ops Protection
import { OpsProtectedRoute } from "./components/ops/OpsProtectedRoute";

// Redirects for removed nav items
import { Navigate } from "react-router-dom";

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <RentalBookingProvider>
            <ScrollToTop />
            <Toaster />
            <Sonner />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Customer Routes - Critical paths */}
                <Route path="/" element={<Index />} />
                <Route path="/search" element={<Search />} />
                <Route path="/auth" element={<Auth />} />
                
                {/* Customer Routes - Lazy loaded */}
                <Route path="/compare" element={<Compare />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/checkout" element={<NewCheckout />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/booking/:id" element={<BookingDetail />} />
                <Route path="/locations" element={<Locations />} />
                <Route path="/location/:id" element={<LocationDetail />} />
                <Route path="/check-in" element={<CheckIn />} />
                <Route path="/protection" element={<Protection />} />
                <Route path="/add-ons" element={<AddOns />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/booking/confirmed" element={<BookingConfirmed />} />
                <Route path="/booking/:bookingId/license" element={<BookingLicense />} />
                <Route path="/booking/:bookingId/agreement" element={<BookingAgreement />} />
                <Route path="/booking/:bookingId/pass" element={<BookingPass />} />
                <Route path="/booking/:bookingId/pickup" element={<BookingPickup />} />
                <Route path="/booking/:bookingId/return" element={<BookingReturn />} />
                <Route path="/walkaround/:bookingId" element={<WalkaroundSign />} />
                {/* Redirect my-booking to dashboard */}
                <Route path="/my-booking" element={<Navigate to="/dashboard" replace />} />
                <Route path="/my-booking/:bookingCode" element={<Navigate to="/dashboard" replace />} />

                {/* Redirects for removed vehicle detail pages */}
                <Route path="/vehicle/:id" element={<Navigate to="/search" replace />} />
                <Route path="/car/:id" element={<Navigate to="/search" replace />} />
                <Route path="/browse/:id" element={<Navigate to="/search" replace />} />
                <Route path="/details/:id" element={<Navigate to="/search" replace />} />

                {/* Admin Routes - Protected & Lazy */}
                <Route path="/admin" element={<AdminProtectedRoute><AdminOverview /></AdminProtectedRoute>} />
                <Route path="/admin/alerts" element={<AdminProtectedRoute><AdminAlerts /></AdminProtectedRoute>} />
                <Route path="/admin/bookings" element={<AdminProtectedRoute><AdminBookings /></AdminProtectedRoute>} />
                <Route path="/admin/bookings/:bookingId" element={<AdminProtectedRoute><AdminBookingDetail /></AdminProtectedRoute>} />
                <Route path="/admin/bookings/:bookingId/ops" element={<AdminProtectedRoute><BookingOps /></AdminProtectedRoute>} />
                <Route path="/admin/billing" element={<AdminProtectedRoute><AdminBilling /></AdminProtectedRoute>} />
                <Route path="/admin/returns/:bookingId" element={<AdminProtectedRoute><ReturnOps /></AdminProtectedRoute>} />
                <Route path="/admin/active-rentals/:bookingId" element={<AdminProtectedRoute><ActiveRentalDetail /></AdminProtectedRoute>} />
                <Route path="/admin/inventory" element={<Navigate to="/admin/fleet" replace />} />
                <Route path="/admin/fleet" element={<AdminProtectedRoute><FleetManagement /></AdminProtectedRoute>} />
                <Route path="/admin/fleet-analytics" element={<AdminProtectedRoute><FleetAnalytics /></AdminProtectedRoute>} />
                <Route path="/admin/fleet-costs" element={<AdminProtectedRoute><FleetCosts /></AdminProtectedRoute>} />
                <Route path="/admin/fleet/vehicle/:unitId" element={<AdminProtectedRoute><VehicleUnitDetail /></AdminProtectedRoute>} />
                <Route path="/admin/fleet/category/:categoryId" element={<AdminProtectedRoute><CategoryDetail /></AdminProtectedRoute>} />
                <Route path="/admin/calendar" element={<AdminProtectedRoute><AdminCalendar /></AdminProtectedRoute>} />
                <Route path="/admin/tickets" element={<AdminProtectedRoute><AdminTickets /></AdminProtectedRoute>} />
                <Route path="/admin/abandoned-carts" element={<AdminProtectedRoute><AbandonedCarts /></AdminProtectedRoute>} />
                <Route path="/admin/reports" element={<AdminProtectedRoute><AdminReports /></AdminProtectedRoute>} />
                <Route path="/admin/settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />
                <Route path="/admin/offers" element={<AdminProtectedRoute><AdminOffers /></AdminProtectedRoute>} />
                <Route path="/admin/incidents" element={<AdminProtectedRoute><AdminIncidents /></AdminProtectedRoute>} />
                <Route path="/admin/damages" element={<AdminProtectedRoute><AdminDamages /></AdminProtectedRoute>} />
                <Route path="/admin/vendors" element={<AdminProtectedRoute><AdminVendors /></AdminProtectedRoute>} />

                {/* Support Panel Routes - Separate from Admin */}
                <Route path="/support" element={<SupportProtectedRoute><SupportTickets /></SupportProtectedRoute>} />
                <Route path="/support/analytics" element={<SupportProtectedRoute><SupportAnalyticsPage /></SupportProtectedRoute>} />

                {/* Delivery Panel Routes - For Drivers */}
                <Route path="/delivery" element={<DeliveryProtectedRoute><DeliveryDashboard /></DeliveryProtectedRoute>} />
                <Route path="/delivery/walk-in" element={<DeliveryProtectedRoute><DeliveryWalkIn /></DeliveryProtectedRoute>} />
                <Route path="/delivery/:id" element={<DeliveryProtectedRoute><DeliveryDetail /></DeliveryProtectedRoute>} />

                {/* Ops Panel Routes - For Staff/Operations */}
                <Route path="/ops" element={<OpsProtectedRoute><OpsWorkboard /></OpsProtectedRoute>} />
                <Route path="/ops/bookings" element={<OpsProtectedRoute><OpsBookings /></OpsProtectedRoute>} />
                <Route path="/ops/pickups" element={<OpsProtectedRoute><OpsPickups /></OpsProtectedRoute>} />
                <Route path="/ops/active" element={<OpsProtectedRoute><OpsActiveRentals /></OpsProtectedRoute>} />
                <Route path="/ops/returns" element={<OpsProtectedRoute><OpsReturns /></OpsProtectedRoute>} />
                <Route path="/ops/fleet" element={<OpsProtectedRoute><OpsFleet /></OpsProtectedRoute>} />
                {/* Ops booking/return routes use same pages as admin but with ops shell */}
                <Route path="/ops/booking/:bookingId" element={<OpsProtectedRoute><AdminBookingDetail /></OpsProtectedRoute>} />
                <Route path="/ops/booking/:bookingId/handover" element={<OpsProtectedRoute><BookingOps /></OpsProtectedRoute>} />
                <Route path="/ops/rental/:bookingId" element={<OpsProtectedRoute><ActiveRentalDetail /></OpsProtectedRoute>} />
                <Route path="/ops/return/:bookingId" element={<OpsProtectedRoute><ReturnOps /></OpsProtectedRoute>} />

                {/* Redirects for consolidated nav items - all go to Operations hub */}
                <Route path="/admin/pickups" element={<Navigate to="/admin/bookings?tab=pickups" replace />} />
                <Route path="/admin/active-rentals" element={<Navigate to="/admin/bookings?tab=active" replace />} />
                <Route path="/admin/returns" element={<Navigate to="/admin/bookings?tab=returns" replace />} />
                <Route path="/admin/history" element={<Navigate to="/admin/bookings?tab=completed" replace />} />
                <Route path="/admin/handovers" element={<Navigate to="/admin/bookings" replace />} />
                <Route path="/admin/damages" element={<Navigate to="/admin/fleet" replace />} />
                <Route path="/admin/photos" element={<Navigate to="/admin/fleet" replace />} />
                <Route path="/admin/photos" element={<Navigate to="/admin/inventory" replace />} />
                <Route path="/admin/verifications" element={<Navigate to="/admin/alerts?type=verification_pending" replace />} />
                <Route path="/admin/analytics" element={<Navigate to="/admin/reports" replace />} />
                <Route path="/admin/audit-logs" element={<Navigate to="/admin/reports" replace />} />
                
                {/* Redirect old support path */}
                <Route path="/admin/support" element={<Navigate to="/support" replace />} />
                <Route path="/admin/support-analytics" element={<Navigate to="/support/analytics" replace />} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </RentalBookingProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
