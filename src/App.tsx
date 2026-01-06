import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BookingProvider } from "@/contexts/BookingContext";
import { RentalBookingProvider } from "@/contexts/RentalBookingContext";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Compare from "./pages/Compare";
import Auth from "./pages/Auth";
import Checkout from "./pages/Checkout";
import Dashboard from "./pages/Dashboard";
import BookingDetail from "./pages/BookingDetail";
import Locations from "./pages/Locations";
import LocationDetail from "./pages/LocationDetail";
import NotFound from "./pages/NotFound";
import CheckIn from "./pages/CheckIn";
import Protection from "./pages/Protection";
import AddOns from "./pages/AddOns";
import NewCheckout from "./pages/NewCheckout";

// Admin Pages
import AdminOverview from "./pages/admin/Overview";
import AdminAlerts from "./pages/admin/Alerts";
import AdminBookings from "./pages/admin/Bookings";
import AdminBilling from "./pages/admin/Billing";
import AdminReturns from "./pages/admin/Returns";
import AdminInventory from "./pages/admin/Inventory";
import AdminCalendar from "./pages/admin/Calendar";
import AdminDamages from "./pages/admin/Damages";
import AdminTickets from "./pages/admin/Tickets";
import AdminSettings from "./pages/admin/Settings";
import AdminPickups from "./pages/admin/Pickups";
import AdminActiveRentals from "./pages/admin/ActiveRentals";
import ActiveRentalDetail from "./pages/admin/ActiveRentalDetail";
import BookingOps from "./pages/admin/BookingOps";

// Admin Protection
import { AdminProtectedRoute } from "./components/admin/AdminProtectedRoute";

// Redirects for removed nav items
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <BookingProvider>
          <RentalBookingProvider>
            <ScrollToTop />
            <Toaster />
            <Sonner />
          <Routes>
            {/* Customer Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<Search />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/checkout" element={<NewCheckout />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/booking/:id" element={<BookingDetail />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/location/:id" element={<LocationDetail />} />
            <Route path="/check-in" element={<CheckIn />} />
            <Route path="/protection" element={<Protection />} />
            <Route path="/add-ons" element={<AddOns />} />

            {/* Redirects for removed vehicle detail pages */}
            <Route path="/vehicle/:id" element={<Navigate to="/search" replace />} />
            <Route path="/car/:id" element={<Navigate to="/search" replace />} />
            <Route path="/browse/:id" element={<Navigate to="/search" replace />} />
            <Route path="/details/:id" element={<Navigate to="/search" replace />} />

            {/* Admin Routes - Protected */}
            <Route path="/admin" element={<AdminProtectedRoute><AdminOverview /></AdminProtectedRoute>} />
            <Route path="/admin/alerts" element={<AdminProtectedRoute><AdminAlerts /></AdminProtectedRoute>} />
            <Route path="/admin/bookings" element={<AdminProtectedRoute><AdminBookings /></AdminProtectedRoute>} />
            <Route path="/admin/bookings/:bookingId/ops" element={<AdminProtectedRoute><BookingOps /></AdminProtectedRoute>} />
            <Route path="/admin/pickups" element={<AdminProtectedRoute><AdminPickups /></AdminProtectedRoute>} />
            <Route path="/admin/active-rentals" element={<AdminProtectedRoute><AdminActiveRentals /></AdminProtectedRoute>} />
            <Route path="/admin/active-rentals/:bookingId" element={<AdminProtectedRoute><ActiveRentalDetail /></AdminProtectedRoute>} />
            <Route path="/admin/billing" element={<AdminProtectedRoute><AdminBilling /></AdminProtectedRoute>} />
            <Route path="/admin/returns" element={<AdminProtectedRoute><AdminReturns /></AdminProtectedRoute>} />
            <Route path="/admin/inventory" element={<AdminProtectedRoute><AdminInventory /></AdminProtectedRoute>} />
            <Route path="/admin/calendar" element={<AdminProtectedRoute><AdminCalendar /></AdminProtectedRoute>} />
            <Route path="/admin/damages" element={<AdminProtectedRoute><AdminDamages /></AdminProtectedRoute>} />
            <Route path="/admin/tickets" element={<AdminProtectedRoute><AdminTickets /></AdminProtectedRoute>} />
            <Route path="/admin/settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />

            {/* Redirects for removed nav items */}
            <Route path="/admin/handovers" element={<Navigate to="/admin/pickups" replace />} />
            <Route path="/admin/photos" element={<Navigate to="/admin/damages" replace />} />
            <Route path="/admin/verifications" element={<Navigate to="/admin/alerts?type=verification_pending" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </RentalBookingProvider>
        </BookingProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
