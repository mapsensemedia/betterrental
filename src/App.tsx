import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Search from "./pages/Search";
import VehicleDetail from "./pages/VehicleDetail";
import Auth from "./pages/Auth";
import Checkout from "./pages/Checkout";
import Dashboard from "./pages/Dashboard";
import BookingDetail from "./pages/BookingDetail";
import Locations from "./pages/Locations";
import LocationDetail from "./pages/LocationDetail";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminOverview from "./pages/admin/Overview";
import AdminAlerts from "./pages/admin/Alerts";
import AdminBookings from "./pages/admin/Bookings";
import AdminBilling from "./pages/admin/Billing";
import AdminHandovers from "./pages/admin/Handovers";
import AdminReturns from "./pages/admin/Returns";
import AdminInventory from "./pages/admin/Inventory";
import AdminCalendar from "./pages/admin/Calendar";
import AdminDamages from "./pages/admin/Damages";
import AdminTickets from "./pages/admin/Tickets";
import AdminSettings from "./pages/admin/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Customer Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/search" element={<Search />} />
          <Route path="/vehicle/:id" element={<VehicleDetail />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/booking/:id" element={<BookingDetail />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/location/:id" element={<LocationDetail />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/alerts" element={<AdminAlerts />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
          <Route path="/admin/billing" element={<AdminBilling />} />
          <Route path="/admin/handovers" element={<AdminHandovers />} />
          <Route path="/admin/returns" element={<AdminReturns />} />
          <Route path="/admin/inventory" element={<AdminInventory />} />
          <Route path="/admin/calendar" element={<AdminCalendar />} />
          <Route path="/admin/damages" element={<AdminDamages />} />
          <Route path="/admin/tickets" element={<AdminTickets />} />
          <Route path="/admin/settings" element={<AdminSettings />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
