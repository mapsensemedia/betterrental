import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { useAdminBookings } from "@/hooks/use-bookings";
import { useAdminAlerts } from "@/hooks/use-alerts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActiveRentalsMonitor } from "@/components/admin/ActiveRentalsMonitor";
import {
  Car,
  Calendar,
  Bell,
  ArrowRightLeft,
  RotateCcw,
  Receipt,
  FileCheck,
  AlertTriangle,
  BookOpen,
  KeyRound,
  Camera,
  MessageSquare,
  Settings,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

const quickGuide = [
  {
    id: "bookings",
    title: "Managing Bookings",
    icon: BookOpen,
    color: "text-blue-500",
    steps: [
      "Go to **Bookings** tab to see all reservations",
      "Click on any booking row to open the **Booking Operations Drawer**",
      "From the drawer you can: view customer details, manage verification, create receipts, and track payments",
      "Use the search bar at the top to quickly find a booking by code",
    ],
  },
  {
    id: "pickups",
    title: "Processing Pickups",
    icon: KeyRound,
    color: "text-green-500",
    steps: [
      "Navigate to **Pickups** tab to see today's scheduled pickups",
      "Ensure the customer has completed **verification** (ID upload) before handover",
      "Check that **pickup photos** have been uploaded by the customer",
      "Click the booking to open operations and mark the vehicle as handed over",
    ],
  },
  {
    id: "returns",
    title: "Processing Returns",
    icon: RotateCcw,
    color: "text-orange-500",
    steps: [
      "Go to **Returns** tab to see vehicles due for return",
      "Check that the customer has uploaded **return photos** (exterior, odometer, fuel)",
      "Open the booking drawer to compare pickup vs return condition",
      "If damages found, record them in the **Damages** section",
      "Create the final **receipt** with any additional charges (fuel, late fees, damage)",
    ],
  },
  {
    id: "verifications",
    title: "Reviewing Verifications",
    icon: FileCheck,
    color: "text-purple-500",
    steps: [
      "Go to **Verifications** tab to see pending document reviews",
      "Click on a request to view the uploaded documents (Driver's License, etc.)",
      "Review each document and click **Approve** or **Reject**",
      "If rejecting, add notes explaining what's wrong so the customer can re-upload",
    ],
  },
  {
    id: "receipts",
    title: "Creating Receipts",
    icon: Receipt,
    color: "text-emerald-500",
    steps: [
      "Open a booking from the **Bookings** tab",
      "In the drawer, scroll to the **Financials** section",
      "Click **Create Receipt** to open the billing editor",
      "Line items are auto-populated from the booking (rental, add-ons, deposit)",
      "Add any adjustments (discounts, damage charges, late fees)",
      "Click **Issue Receipt** to finalize and make it visible to the customer",
    ],
  },
  {
    id: "photos",
    title: "Reviewing Condition Photos",
    icon: Camera,
    color: "text-pink-500",
    steps: [
      "Go to **Photos** tab to see all uploaded vehicle condition photos",
      "Filter by pickup or return phase",
      "Photos are organized by booking - click to expand and view the full gallery",
      "Compare pickup vs return photos to identify any new damages",
    ],
  },
  {
    id: "damages",
    title: "Recording Damages",
    icon: AlertTriangle,
    color: "text-red-500",
    steps: [
      "Go to **Damages** tab or access from a booking's drawer",
      "Click **Report Damage** to create a new record",
      "Select severity (Minor, Moderate, Severe) and describe the damage",
      "Upload photos and estimate repair cost",
      "The damage charge can be added to the customer's final receipt",
    ],
  },
  {
    id: "alerts",
    title: "Managing Alerts",
    icon: Bell,
    color: "text-yellow-500",
    steps: [
      "The **Alerts** tab shows system-generated notifications",
      "Common alerts: pending verification, late returns, missing photos",
      "Click an alert to acknowledge it and take action",
      "Alerts auto-resolve when the underlying issue is fixed",
    ],
  },
  {
    id: "active-rentals",
    title: "Monitoring Active Rentals",
    icon: Car,
    color: "text-primary",
    steps: [
      "Navigate to **Active Rentals** in the sidebar for a full view",
      "The page shows all vehicles currently out on rental",
      "Use the **filter cards** at the top to quickly filter by status: Overdue, Due Soon, Within 6h, or On Schedule",
      "**Red/Overdue** items need immediate attention - customer has exceeded return time",
      "**Amber/Due Soon** items are within 2 hours of their scheduled return",
      "Use the **search bar** to find rentals by booking code, vehicle, customer, or location",
      "Click any rental card to open its booking operations panel",
      "The dashboard also shows a compact **Active Rentals Monitor** for quick overview",
    ],
  },
];

export default function AdminOverview() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const { data: bookings = [], isLoading: bookingsLoading } = useAdminBookings();
  const { data: alerts = [] } = useAdminAlerts();
  
  // Fetch pending verifications
  const { data: verifications = [] } = useQuery({
    queryKey: ["admin-verifications-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("id, status")
        .eq("status", "pending")
        .limit(50);
      if (error) return [];
      return data || [];
    },
  });

  // Calculate stats
  const activeBookings = bookings.filter(b => b.status === "active").length;
  const pendingBookings = bookings.filter(b => b.status === "pending").length;
  const confirmedBookings = bookings.filter(b => b.status === "confirmed").length;
  
  const todayPickups = bookings.filter(b => {
    if (b.status !== "confirmed") return false;
    try {
      return isToday(parseISO(b.startAt));
    } catch { return false; }
  }).length;

  const todayReturns = bookings.filter(b => {
    if (b.status !== "active") return false;
    try {
      return isToday(parseISO(b.endAt));
    } catch { return false; }
  }).length;

  const tomorrowPickups = bookings.filter(b => {
    if (b.status !== "confirmed") return false;
    try {
      return isTomorrow(parseISO(b.startAt));
    } catch { return false; }
  }).length;

  const pendingAlerts = alerts.filter(a => a.status === "pending").length;
  const pendingVerifications = verifications.filter(v => v.status === "pending").length;

  // Simplified: 4 key stats only
  const stats = [
    { label: "Active", value: activeBookings, icon: Car, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Pickups Today", value: todayPickups, icon: KeyRound, color: "text-green-500", bgColor: "bg-green-500/10" },
    { label: "Returns Today", value: todayReturns, icon: RotateCcw, color: "text-orange-500", bgColor: "bg-orange-500/10" },
    { label: "Alerts", value: pendingAlerts, icon: Bell, color: pendingAlerts > 0 ? "text-destructive" : "text-muted-foreground", bgColor: pendingAlerts > 0 ? "bg-destructive/10" : "bg-muted" },
  ];

  const quickLinks = [
    { label: "Bookings", href: "/admin/bookings", icon: BookOpen, description: "View all reservations" },
    { label: "Pickups", href: "/admin/pickups", icon: KeyRound, description: "Pickups & handovers" },
    { label: "Returns", href: "/admin/returns", icon: RotateCcw, description: "Due returns" },
    { label: "Alerts", href: "/admin/alerts", icon: Bell, description: "Action required", badge: pendingAlerts + pendingVerifications },
    { label: "Billing", href: "/admin/billing", icon: Receipt, description: "Receipts & payments" },
    { label: "Inventory", href: "/admin/inventory", icon: Car, description: "Fleet management" },
    { label: "Calendar", href: "/admin/calendar", icon: Calendar, description: "Booking schedule" },
    { label: "Damages", href: "/admin/damages", icon: AlertTriangle, description: "Damage reports" },
  ];

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Overview</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setActiveTab(activeTab === "guide" ? "dashboard" : "guide")}
            className="gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            {activeTab === "guide" ? "Back to Dashboard" : "How to Use"}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="guide">How to Use</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* Compact Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {stats.map((stat) => (
                <div 
                  key={stat.label} 
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-card"
                >
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${stat.bgColor} flex items-center justify-center shrink-0`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl font-bold leading-none">{bookingsLoading ? "..." : stat.value}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Awaiting Pickup - Confirmed bookings with completeness */}
            {confirmedBookings > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-green-500" />
                      Awaiting Pickup
                    </CardTitle>
                    <Link to="/admin/pickups">
                      <Button variant="ghost" size="sm" className="gap-1">
                        View all <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                  <CardDescription>
                    Confirmed bookings ready for handover
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {bookings
                    .filter(b => b.status === "confirmed")
                    .slice(0, 5)
                    .map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div>
                            <p className="text-sm font-medium truncate">
                              {booking.vehicle?.make} {booking.vehicle?.model}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {booking.profile?.fullName || "Customer"} • {format(parseISO(booking.startAt), "h:mm a")}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="shrink-0"
                          onClick={() => navigate(`/admin/bookings/${booking.id}/ops?returnTo=/admin`)}
                        >
                          Open
                        </Button>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Active Rentals Monitor - Always visible */}
            <ActiveRentalsMonitor />

            {/* Upcoming Summary */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Upcoming Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <KeyRound className="w-4 h-4 text-green-500" />
                      </div>
                      <span className="text-sm">Pickups Tomorrow</span>
                    </div>
                    <Badge variant="secondary">{tomorrowPickups}</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-sm">Awaiting Confirmation</span>
                    </div>
                    <Badge variant="secondary">{pendingBookings}</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm">Confirmed Bookings</span>
                    </div>
                    <Badge variant="secondary">{confirmedBookings}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="w-4 h-4 text-yellow-500" />
                    Action Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingAlerts > 0 && (
                    <Link 
                      to="/admin/alerts"
                      className="flex items-center justify-between py-2 border-b border-border hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                          <Bell className="w-4 h-4 text-destructive" />
                        </div>
                        <span className="text-sm">Unread Alerts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{pendingAlerts}</Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  )}
                  {pendingVerifications > 0 && (
                    <Link 
                      to="/admin/alerts?type=verification_pending"
                      className="flex items-center justify-between py-2 border-b border-border hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <FileCheck className="w-4 h-4 text-purple-500" />
                        </div>
                        <span className="text-sm">Pending Verifications</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-500">{pendingVerifications}</Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  )}
                  {pendingAlerts === 0 && pendingVerifications === 0 && (
                    <div className="flex items-center gap-3 py-4 text-muted-foreground">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="text-sm">All caught up! No pending actions.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Navigation</CardTitle>
                <CardDescription>Jump to common sections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:bg-muted/50 hover:border-primary/30 transition-colors group relative"
                    >
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <link.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-sm font-medium">{link.label}</span>
                      <span className="text-xs text-muted-foreground text-center">{link.description}</span>
                      {link.badge && link.badge > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 text-xs px-1.5 py-0">
                          {link.badge}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* How to Use Guide Tab */}
          <TabsContent value="guide" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Admin Panel Guide
                </CardTitle>
                <CardDescription>
                  Step-by-step instructions for common admin tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {quickGuide.map((section) => (
                    <AccordionItem key={section.id} value={section.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center`}>
                            <section.icon className={`w-4 h-4 ${section.color}`} />
                          </div>
                          <span className="font-medium">{section.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ol className="space-y-3 pl-11 pt-2">
                          {section.steps.map((step, idx) => (
                            <li key={idx} className="flex gap-3 text-sm text-muted-foreground">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                                {idx + 1}
                              </span>
                              <span dangerouslySetInnerHTML={{ 
                                __html: step.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') 
                              }} />
                            </li>
                          ))}
                        </ol>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4" />
                    Need More Help?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    For additional support, contact your system administrator or refer to the full documentation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
