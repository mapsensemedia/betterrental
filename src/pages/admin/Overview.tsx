import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { useAdminBookings } from "@/hooks/use-bookings";
import { useAdminAlerts } from "@/hooks/use-alerts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActiveRentalsMonitor } from "@/components/admin/ActiveRentalsMonitor";
import { RealtimeAlertsPanel } from "@/components/admin/RealtimeAlertsPanel";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";
import { WalkInBookingDialog } from "@/components/admin/WalkInBookingDialog";
import { FailedPaymentsWidget } from "@/components/admin/FailedPaymentsWidget";
import { useAdminRealtimeSubscriptions } from "@/hooks/use-realtime-subscriptions";
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
  UserPlus,
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
import { getBookingRoute, getBookingActionLabel } from "@/lib/booking-routes";

// ==========================================
// HOW TO USE — COMPLETE OPERATIONAL GUIDE
// ==========================================

// SECTION 1: Customer Booking Guide
const customerGuide = [
  {
    id: "customer-booking",
    title: "Section 1: How to Book (Customer Guide)",
    icon: Users,
    color: "text-blue-500",
    steps: [
      "**Step 1:** Visit our website and select your desired vehicle, dates, and pickup location.",
      "**Step 2:** Review your booking summary and proceed to checkout.",
      "**Step 3:** Complete your reservation — **driver's license upload is NOT required online**.",
      "**Step 4:** Receive your booking confirmation via email.",
      "**Step 5:** At pickup, bring your **valid driver's license** — it will be verified in person.",
      "**Step 6:** Sign the **rental agreement in person** at the time of pickup.",
    ],
  },
];

// SECTION 2: Admin/Operations Full Step-by-Step Workflow
const adminWorkflowGuide = [
  {
    id: "incoming-booking",
    title: "2.1 Incoming Booking (Bookings Menu)",
    icon: BookOpen,
    color: "text-blue-500",
    steps: [
      "**Step 1:** Go to **Admin Panel → Bookings** to see all reservations.",
      "**Step 2:** Find the booking by scrolling the list OR use the **search bar** to find by booking code.",
      "**Step 3:** Click on the booking row to open and review booking details.",
      "**Step 4:** Review: customer info, vehicle, dates, location, and total amount.",
      "**Step 5:** Decide next action: keep as pending OR mark as confirmed.",
    ],
  },
  {
    id: "confirmation",
    title: "2.2 Confirmation + In-Person Requirements",
    icon: CheckCircle2,
    color: "text-green-500",
    steps: [
      "**Step 1:** Confirm the booking when ready to proceed.",
      "**Step 2:** Note: Customer's **ID will be verified in person** at pickup.",
      "**Step 3:** Note: **Rental agreement will be signed in person** at pickup.",
      "Driver's license upload is **not required** during online checkout.",
    ],
  },
  {
    id: "operations",
    title: "2.3 Move to Operations Panel (Preparation Stage)",
    icon: Settings,
    color: "text-purple-500",
    steps: [
      "**Step 1:** Once confirmed, the booking appears in the **Operations Panel**.",
      "**Step 2:** Open the Operations entry for the confirmed booking.",
      "**Step 3:** Complete vehicle preparation steps: **vehicle readiness, cleanliness, full condition readiness**.",
      "**Step 4:** Ensure all prep steps are complete before proceeding.",
      "**Step 5:** Mark operations as complete — the booking moves to **Pickups**.",
    ],
  },
  {
    id: "pickups-workflow",
    title: "2.4 Pickups Workflow (Today / Tomorrow / This Week / Later)",
    icon: KeyRound,
    color: "text-green-500",
    steps: [
      "**Step 1:** Go to **Pickups** in the sidebar.",
      "**Step 2:** Choose the correct time bucket: **Today / Tomorrow / This Week / Later**.",
      "**Step 3:** Open the booking card for the scheduled pickup.",
      "**Step 4:** At pickup: **verify the customer's driver's license in person**.",
      "**Step 5:** At pickup: have the customer **sign the rental agreement in person**.",
      "**Step 6:** Complete the vehicle handover to the customer.",
      "**Step 7:** Mark the pickup as completed — the booking moves to **Active Rentals**.",
    ],
  },
  {
    id: "active-rentals-workflow",
    title: "2.5 Active Rentals Workflow (During Rental)",
    icon: Car,
    color: "text-primary",
    steps: [
      "**Step 1:** Go to **Active Rentals** in the sidebar.",
      "**Step 2:** Browse the list or use filters to find the rental.",
      "**Step 3:** Each rental displays: **remaining time**, **consumed time**, and rental details.",
      "**Step 4:** Click on any rental card to open the **detailed panel**.",
      "**Inside the detail panel, staff can:**",
      "• **Flag issues** — record any problems reported by the customer",
      "• **Contact customer** — view customer contact details",
      "• **SMS customer** — send a message to the customer",
      "• **Track vehicle location** — (Coming soon)",
      "• **Initiate return** — start the return process",
    ],
  },
  {
    id: "returns-workflow",
    title: "2.6 Returns Workflow (Return Initiation → Returns Menu)",
    icon: RotateCcw,
    color: "text-orange-500",
    steps: [
      "**Step 1:** Initiate return from the **Active Rental detail panel**.",
      "**Step 2:** The return also appears in the **Returns** menu.",
      "**Step 3:** Go to **Returns** and open the return entry.",
      "**Step 4:** Follow the return steps to complete the return and bring the car back to the facility.",
      "**Step 5:** Mark the return as processed/completed.",
    ],
  },
  {
    id: "billing-workflow",
    title: "2.7 Billing & Financial Workflow",
    icon: Receipt,
    color: "text-indigo-500",
    steps: [
      "**Step 1:** Go to **Billing** in the sidebar to access all financial records.",
      "**Step 2:** The **Receipts** tab shows all generated receipts — click 'Create Receipt' to generate one for any booking.",
      "**Step 3:** The **Payments** tab displays all payment transactions with status (completed, pending, failed).",
      "**Step 4:** The **Deposits** tab shows all security deposit records — click 'Process Return' to handle deposit release.",
      "**Step 5:** Click any booking code to navigate directly to its details page.",
      "**Step 6:** Use the refresh button to update data in real-time.",
    ],
  },
];

// SECTION 3: Status Glossary
const statusGlossary = [
  {
    id: "glossary",
    title: "Section 3: Status Glossary",
    icon: BookOpen,
    color: "text-slate-500",
    steps: [
      "**Bookings:** Where new bookings arrive and can be searched/opened.",
      "**Operations:** Preparation stage after confirmation — vehicle readiness and prep steps.",
      "**Pickups:** Scheduled handovers grouped by time buckets (Today / Tomorrow / This Week / Later).",
      "**Active Rentals:** Vehicles currently out with customers — shows time remaining and rental details.",
      "**Returns:** Processing vehicles coming back to the facility.",
      "**Billing:** Financial records including receipts, payments, and security deposits.",
    ],
  },
];

// SECTION 4: Important Notes
const importantNotes = [
  {
    id: "important-notes",
    title: "Section 4: Important Notes",
    icon: AlertTriangle,
    color: "text-amber-500",
    steps: [
      "**Driver's license upload is NOT required during online booking.**",
      "**ID is verified in person at pickup.**",
      "**Rental agreement is signed in person at pickup.**",
      "**Security deposit:** Fixed at $350 — handled in Billing → Deposits tab.",
      "**Hover over buttons** to see tooltips explaining their functions.",
      "**Vehicle tracking:** Coming soon — will allow staff to track vehicle location.",
      "Always ensure vehicle is in full-fledged, clean condition before handover.",
    ],
  },
];

// Combined guide for display
const quickGuide = [
  ...customerGuide,
  ...adminWorkflowGuide,
  ...statusGlossary,
  ...importantNotes,
];

export default function AdminOverview() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [walkInDialogOpen, setWalkInDialogOpen] = useState(false);
  const { data: bookings = [], isLoading: bookingsLoading } = useAdminBookings();
  const { data: alerts = [] } = useAdminAlerts();
  
  // Enable real-time updates for all admin data
  useAdminRealtimeSubscriptions();
  
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
  
  // NEW bookings - created in last 24 hours
  const recentBookings = bookings.filter(b => {
    try {
      const createdAt = parseISO(b.createdAt);
      const hoursDiff = (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    } catch { return false; }
  });
  const newBookingsCount = recentBookings.length;
  
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

  // Simplified: 5 key stats including new bookings
  const stats = [
    { label: "New (24h)", value: newBookingsCount, icon: BookOpen, color: newBookingsCount > 0 ? "text-blue-500" : "text-muted-foreground", bgColor: newBookingsCount > 0 ? "bg-blue-500/10" : "bg-muted" },
    { label: "Active", value: activeBookings, icon: Car, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Pickups Today", value: todayPickups, icon: KeyRound, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
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
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setWalkInDialogOpen(true)}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Walk-In Booking
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveTab(activeTab === "guide" ? "dashboard" : "guide")}
              className="gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              {activeTab === "guide" ? "Back to Dashboard" : "How to Use"}
            </Button>
          </div>
        </div>

        {/* Walk-in Booking Dialog */}
        <WalkInBookingDialog 
          open={walkInDialogOpen} 
          onOpenChange={setWalkInDialogOpen} 
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="guide">How to Use</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* Compact Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
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

            {/* New Bookings Card - show recent bookings in last 24h */}
            {recentBookings.length > 0 && (
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      New Bookings (Last 24h)
                      <Badge className="bg-blue-500">{recentBookings.length}</Badge>
                    </CardTitle>
                    <Link to="/admin/bookings?tab=pending">
                      <Button variant="ghost" size="sm" className="gap-1">
                        View all <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                  <CardDescription>
                    Recently created bookings requiring attention
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentBookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {booking.vehicle?.make} {booking.vehicle?.model}
                            </p>
                            <Badge variant="outline" className="font-mono text-xs">
                              {booking.bookingCode}
                            </Badge>
                            <Badge 
                              variant={booking.status === "pending" ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {booking.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {booking.profile?.fullName || "Customer"} • {format(parseISO(booking.startAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="shrink-0"
                        onClick={() => navigate(getBookingRoute(booking.id, booking.status, { returnTo: "/admin" }))}
                      >
                        {getBookingActionLabel(booking.status)}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Failed Payments Widget - Shows only if there are failed payments */}
            <FailedPaymentsWidget />

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

            {/* Real-time panels grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Active Rentals Monitor - Always visible */}
              <ActiveRentalsMonitor />
              
              {/* Live Alerts Panel */}
              <RealtimeAlertsPanel />
            </div>

            {/* Analytics Panel */}
            <AnalyticsPanel />

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
