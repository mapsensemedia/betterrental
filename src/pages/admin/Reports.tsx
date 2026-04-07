/**
 * Comprehensive Analytics & Reports Page
 * Covers: Conversion Funnel, Revenue, Fleet Utilization, Audit Logs
 * 
 * Unified filter state: date range + channel + location + category + booking type + payment type
 * is managed here and passed down to all tabs and metric cards.
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { ConversionFunnel } from "@/components/admin/ConversionFunnel";
import { useAdminVehicles } from "@/hooks/use-inventory";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  TrendingUp,
  Eye,
  RefreshCw,
  FileText,
  Car,
  DollarSign,
  Wallet,
  Percent,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";
import { useLocations } from "@/hooks/use-locations";
import { format, subDays, startOfDay, eachDayOfInterval, startOfMonth } from "date-fns";
import { RevenueAnalyticsTab, type DatePreset } from "@/components/admin/analytics/RevenueAnalyticsTab";
import { QuarterlyReportGenerator } from "@/components/admin/QuarterlyReportGenerator";
import { DemandForecastingTab } from "@/components/admin/DemandForecastingTab";
import { useRevenueAnalytics, type BookingChannel, type PaymentType, type BookingType, type RevenueFilters } from "@/hooks/use-revenue-analytics";
import { useCollectedRevenue } from "@/hooks/use-collected-revenue";

const chartConfig = {
  views: { label: "Views", color: "hsl(var(--primary))" },
  conversions: { label: "Conversions", color: "hsl(var(--chart-2))" },
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
  bookings: { label: "Bookings", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const COLORS = ["hsl(var(--primary))", "#22c55e", "#f97316", "#8b5cf6", "#3b82f6", "#ec4899"];

// Funnel stages for internal calculations
const FUNNEL_STAGES = [
  { key: "search_performed", label: "Search" },
  { key: "vehicle_viewed", label: "Viewed" },
  { key: "vehicle_selected", label: "Selected" },
  { key: "protection_selected", label: "Protection" },
  { key: "addons_selected", label: "Add-ons" },
  { key: "checkout_started", label: "Checkout" },
  { key: "checkout_payment_method_selected", label: "Payment" },
  { key: "booking_completed", label: "Completed" },
] as const;

const DATE_PRESET_LABELS: Record<DatePreset | "all", string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  "mtd": "This Month",
  "all": "All Time",
  "custom": "Custom Range",
};


export default function AdminReports() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isQuarterlyOpen, setIsQuarterlyOpen] = useState(false);
  

  // ── Unified filter state (shared across all tabs + metric cards) ──
  const [datePreset, setDatePreset] = useState<DatePreset | "all">("30d");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [channel, setChannel] = useState<BookingChannel>("all");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>("all");
  const [paymentType, setPaymentType] = useState<PaymentType>("all");

  // Compute date range from preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case "7d": return { start: subDays(now, 7), end: now };
      case "30d": return { start: subDays(now, 30), end: now };
      case "90d": return { start: subDays(now, 90), end: now };
      case "mtd": return { start: startOfMonth(now), end: now };
      case "all": return { start: new Date("2024-01-01T00:00:00"), end: now };
      case "custom": return {
        start: customStartDate || subDays(now, 30),
        end: customEndDate || now,
      };
      default: return { start: subDays(now, 30), end: now };
    }
  }, [datePreset, customStartDate, customEndDate]);

  const filters: RevenueFilters = useMemo(() => ({
    startDate: dateRange.start,
    endDate: dateRange.end,
    channel,
    locationId,
    categoryId,
    bookingType,
    paymentType,
  }), [dateRange, channel, locationId, categoryId, bookingType, paymentType]);

  // ── Data hooks ──
  const { data: locations } = useLocations();
  // Fleet: query vehicle_units for real fleet size
  const { data: vehicleUnits = [] } = useQuery({
    queryKey: ["fleet-units-for-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_units")
        .select("id, status")
        .neq("status", "retired");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Active bookings — source of truth for "on rent" (vehicle_units.status is stale)
  const { data: activeRentalUnitIds = [] } = useQuery({
    queryKey: ["active-rental-units-for-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("assigned_unit_id")
        .eq("status", "active")
        .not("assigned_unit_id", "is", null);
      if (error) throw error;
      return (data || []).map(b => b.assigned_unit_id);
    },
    staleTime: 60_000,
  });

  const { data: vehicles = [] } = useAdminVehicles();

  // Page-level revenue analytics — powers all metric cards and charts
  const {
    rentalMetrics,
    addOnMetrics,
    revenueTrend,
    isLoading: revenueLoading,
  } = useRevenueAnalytics(filters);

  // Collected revenue — single source of truth from payments table
  const { collected: collectedRevenue, isLoading: collectedLoading } = useCollectedRevenue(dateRange.start, dateRange.end);

  // Analytics events from Supabase
  const { data: analyticsEventsRaw = [], refetch: refetchAnalytics } = useAnalyticsEvents({ startDate: dateRange.start, endDate: dateRange.end });

  // Real bookings count for the funnel (confirmed, active, completed within date range)
  const { data: realBookingsCount = 0 } = useQuery({
    queryKey: ["funnel-bookings-count", dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .in("status", ["confirmed", "active", "completed"])
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });

  // Fleet utilization (real-time snapshot — not date-filtered)
  const fleetStats = useMemo(() => {
    const totalVehicles = vehicleUnits.length;
    const activeRentalSet = new Set(activeRentalUnitIds);

    // "On rent" = units with an active booking (source of truth)
    const rentedUnits = vehicleUnits.filter(u => activeRentalSet.has(u.id)).length;
    // Maintenance/damage from unit status (reliable — set manually)
    const maintenanceUnits = vehicleUnits.filter(u =>
      u.status === "maintenance" || u.status === "damage"
    ).length;
    // Available = total minus rented minus maintenance
    const availableUnits = totalVehicles - rentedUnits - maintenanceUnits;

    const rentableUnits = rentedUnits + availableUnits;
    const utilizationRate = rentableUnits > 0
      ? (rentedUnits / rentableUnits) * 100
      : 0;
    const revenuePerVehicle = collectedRevenue / (rentableUnits || 1);

    return {
      totalVehicles,
      rentedUnits,
      availableUnits,
      maintenanceUnits,
      rentableUnits,
      utilizationRate,
      revenuePerVehicle,
      totalRevenue: collectedRevenue,
    };
  }, [vehicleUnits, activeRentalUnitIds, collectedRevenue]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refetchLogs();
    refetchAnalytics();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 300);
  };

  const handleClearData = () => {
    // Data is now in Supabase — clearing not supported from client
  };

  // Map analytics events to expected shape
  const filteredEvents = useMemo(() => {
    return analyticsEventsRaw.map((e) => ({
      event: e.event,
      timestamp: e.created_at,
      page: e.page ?? "",
      sessionId: e.session_id ?? "",
      properties: e.properties,
    }));
  }, [analyticsEventsRaw]);

  // Funnel stats
  const funnelStats = useMemo(() => {
    const raw = FUNNEL_STAGES.map((stage) => ({
      ...stage,
      count: filteredEvents.filter((e) => e.event === stage.key).length,
    }));
    // Enforce monotonically decreasing: each stage count <= previous
    for (let i = 1; i < raw.length; i++) {
      raw[i] = { ...raw[i], count: Math.min(raw[i].count, raw[i - 1].count) };
    }
    return raw;
  }, [filteredEvents]);

  const overallConversion = useMemo(() => {
    const first = funnelStats[0]?.count || 0;
    const last = funnelStats[funnelStats.length - 1]?.count || 0;
    return first > 0 ? (last / first) * 100 : 0;
  }, [funnelStats]);

  // Revenue stats for Overview tab — derived from the unified hook
  const revenueStats = useMemo(() => {
    return {
      totalRevenue: collectedRevenue,
      billedRevenue: rentalMetrics.totalRentalBaseRevenue,
      avgBookingValue: rentalMetrics.averageRentalPrice,
      avgDuration: rentalMetrics.averageDays,
      totalBookings: rentalMetrics.totalBookings,
    };
  }, [rentalMetrics, collectedRevenue]);

  // Analytics daily trend (from localStorage)
  const dailyTrend = useMemo(() => {
    const interval = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    return interval.map((date) => {
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayEvents = filteredEvents.filter((e) => {
        const eventDate = new Date(e.timestamp);
        return eventDate >= dayStart && eventDate < dayEnd;
      });
      return {
        date: format(date, "MMM d"),
        views: dayEvents.filter((e) => e.event === "vehicle_viewed").length,
        conversions: dayEvents.filter((e) => e.event === "booking_completed").length,
      };
    });
  }, [filteredEvents, dateRange]);

  // Event distribution
  const eventDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEvents.forEach((e) => {
      counts[e.event] = (counts[e.event] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredEvents]);

  // Filter audit logs
  const NOISE_ACTIONS = ["booking_created", "booking_updated", "photo_uploaded", "checkin_record_created", "verification_approved", "verification_rejected"];

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (entityFilter !== "all" && log.entityType !== entityFilter) return false;
      // Category filter
      if (auditCategoryFilter === "important" && NOISE_ACTIONS.includes(log.action)) return false;
      if (auditCategoryFilter === "payments" && !/(payment|terminal|deposit)/.test(log.action)) return false;
      if (auditCategoryFilter === "status" && !/(status|void|cancel)/.test(log.action)) return false;
      if (auditCategoryFilter === "damage" && !/(damage|incident)/.test(log.action)) return false;
      // auditCategoryFilter === "all" shows everything
      if (auditSearch) {
        const query = auditSearch.toLowerCase();
        const searchableText = [log.action, log.entityType, log.userName, log.userEmail].filter(Boolean).join(" ").toLowerCase();
        return searchableText.includes(query);
      }
      return true;
    });
  }, [logs, entityFilter, auditSearch, auditCategoryFilter]);

  const entityTypes = useMemo(() => {
    const types = new Set(logs.map((l) => l.entityType));
    return Array.from(types).sort();
  }, [logs]);

  const periodLabel = DATE_PRESET_LABELS[datePreset];


  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header — no global date dropdown; filters live inside Revenue tab */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Revenue, conversions, fleet utilization & activity logs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsQuarterlyOpen(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Quarterly Report
            </Button>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Key Business Metrics — powered by unified filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ${collectedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">Collected — {periodLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overallConversion.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Conversion</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Car className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rentalMetrics.totalBookings}</p>
                  <p className="text-xs text-muted-foreground">Total Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rentalMetrics.averageDays.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Avg Days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="revenue-addons" className="space-y-4">
          <TabsList className="bg-muted/50 w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="revenue-addons" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Revenue & Add-Ons
            </TabsTrigger>
            <TabsTrigger value="revenue" className="gap-2">
              <Wallet className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="funnel" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Funnel
            </TabsTrigger>
            <TabsTrigger value="fleet" className="gap-2">
              <Car className="w-4 h-4" />
              Fleet
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <History className="w-4 h-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="demand" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Demand
            </TabsTrigger>
          </TabsList>

          {/* Revenue & Add-On Analytics Tab - Primary */}
          <TabsContent value="revenue-addons">
            <RevenueAnalyticsTab
              filters={filters}
              datePreset={datePreset === "all" ? "custom" : datePreset}
              onDatePresetChange={(p) => setDatePreset(p)}
              onChannelChange={setChannel}
              onLocationIdChange={setLocationId}
              onCategoryIdChange={setCategoryId}
              onBookingTypeChange={setBookingType}
              onPaymentTypeChange={setPaymentType}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              onCustomStartDateChange={setCustomStartDate}
              onCustomEndDateChange={setCustomEndDate}
            />
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    Billed Revenue
                  </CardTitle>
                  <CardDescription>Total invoiced amount ({periodLabel})</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Bookings</span>
                      <span className="text-lg font-bold">{revenueStats.totalBookings}</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-sm text-muted-foreground">Revenue</span>
                      <span className="text-xl font-bold text-primary">${revenueStats.totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    Booking Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Bookings</span>
                      <span className="text-lg font-bold">{revenueStats.totalBookings}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg Booking Value</span>
                      <span className="text-lg font-bold">${revenueStats.avgBookingValue.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg Rental Duration</span>
                      <span className="text-lg font-bold">{revenueStats.avgDuration.toFixed(1)} days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Percent className="w-4 h-4 text-muted-foreground" />
                    Conversion Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Conversion Rate</span>
                      <span className="text-lg font-bold text-success">{overallConversion.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Page Views</span>
                      <span className="text-lg font-bold">{filteredEvents.filter(e => e.event === "page_view").length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Cart Abandonment</span>
                      <span className="text-lg font-bold text-destructive">
                        {funnelStats.find(s => s.key === "checkout_started")?.count || 0 > 0
                          ? (((funnelStats.find(s => s.key === "checkout_started")?.count || 0) -
                             (funnelStats.find(s => s.key === "booking_completed")?.count || 0)) /
                             (funnelStats.find(s => s.key === "checkout_started")?.count || 1) * 100).toFixed(0)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Trend Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Revenue Trend</CardTitle>
                <CardDescription>Revenue over {periodLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueTrend.every(d => d.revenue === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No revenue data for this period</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueTrend}>
                        <XAxis dataKey="date" fontSize={10} />
                        <YAxis fontSize={10} tickFormatter={(v) => `$${v}`} />
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value) => `$${Number(value).toLocaleString()}`} />}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--chart-1))", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Daily Bookings Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bookings by Period</CardTitle>
                <CardDescription>Bookings and revenue per period ({periodLabel})</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueTrend.every(d => d.bookings === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No booking data for this period</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueTrend}>
                        <XAxis dataKey="date" fontSize={10} />
                        <YAxis yAxisId="left" fontSize={10} orientation="left" />
                        <YAxis yAxisId="right" fontSize={10} orientation="right" tickFormatter={(v) => `$${v}`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar yAxisId="left" dataKey="bookings" fill="hsl(var(--primary))" radius={3} />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--chart-2))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Daily Activity (Analytics Events) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Website Activity</CardTitle>
                <CardDescription>Page views and conversions tracked by analytics</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyTrend.every(d => d.views === 0 && d.conversions === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No website activity tracked yet</p>
                    <p className="text-xs mt-1">Analytics events appear as users browse the site</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyTrend}>
                        <XAxis dataKey="date" fontSize={10} />
                        <YAxis fontSize={10} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="views" fill="var(--color-views)" radius={3} />
                        <Bar dataKey="conversions" fill="var(--color-conversions)" radius={3} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Funnel Tab */}
          <TabsContent value="funnel" className="space-y-4">
            <ConversionFunnel events={filteredEvents} bookingsCount={realBookingsCount} />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Event Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {eventDistribution.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">No data</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {eventDistribution.map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-sm truncate flex-1">{item.name}</span>
                        <span className="text-sm font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fleet Tab */}
          <TabsContent value="fleet" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Car className="w-4 h-4 text-muted-foreground" />
                    Fleet Utilization
                  </CardTitle>
                  <CardDescription>Current Fleet Status (live)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <p className="text-4xl font-bold text-primary">{fleetStats.utilizationRate.toFixed(0)}%</p>
                    <p className="text-sm text-muted-foreground mt-1">Current Utilization</p>
                  </div>
                  <Progress value={fleetStats.utilizationRate} className="h-3" />
                  <div className="grid grid-cols-4 gap-3 pt-2 text-center">
                    <div>
                      <p className="text-xl font-bold">{fleetStats.rentedUnits}</p>
                      <p className="text-xs text-muted-foreground">On Rent</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{fleetStats.availableUnits}</p>
                      <p className="text-xs text-muted-foreground">Available</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{fleetStats.maintenanceUnits}</p>
                      <p className="text-xs text-muted-foreground">Maintenance</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{fleetStats.totalVehicles}</p>
                      <p className="text-xs text-muted-foreground">Total Fleet</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    Fleet Revenue ({periodLabel})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg Revenue / Active Vehicle</span>
                      <span className="text-lg font-bold">${fleetStats.revenuePerVehicle.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Revenue</span>
                      <span className="text-lg font-bold">${fleetStats.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Rentable Vehicles</span>
                      <span className="text-lg font-bold">{fleetStats.rentableUnits}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Fleet</span>
                      <span className="text-lg font-bold">{fleetStats.totalVehicles}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={auditCategoryFilter} onValueChange={setAuditCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Action Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="important">Important Actions</SelectItem>
                  <SelectItem value="payments">Payments</SelectItem>
                  <SelectItem value="status">Status Changes</SelectItem>
                  <SelectItem value="damage">Damage & Incidents</SelectItem>
                  <SelectItem value="all">All Actions</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Logs List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {logsLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-8 h-8 rounded-lg" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </div>
                  </div>
                ))
              ) : filteredLogs.length > 0 ? (
                filteredLogs.slice(0, 50).map((log) => <AuditLogItem key={log.id} log={log} />)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No audit logs found</p>
                </div>
              )}
            </div>
            {filteredLogs.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing {Math.min(filteredLogs.length, 50)} of {filteredLogs.length} logs
              </p>
            )}
          </TabsContent>

          <TabsContent value="demand">
            <DemandForecastingTab />
          </TabsContent>
        </Tabs>
      </div>

      <QuarterlyReportGenerator open={isQuarterlyOpen} onClose={() => setIsQuarterlyOpen(false)} />
    </AdminShell>
  );
}
