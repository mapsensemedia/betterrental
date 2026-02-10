/**
 * Comprehensive Analytics & Reports Page
 * Covers: Conversion Funnel, Revenue, Fleet Utilization, Audit Logs
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { ConversionFunnel } from "@/components/admin/ConversionFunnel";
import { useAdminBookings } from "@/hooks/use-bookings";
import { useAdminVehicles } from "@/hooks/use-inventory";
import {
  BarChart3,
  TrendingUp,
  Eye,
  MousePointerClick,
  ShoppingCart,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Search,
  Shield,
  Gift,
  CreditCard,
  ArrowRight,
  MapPin,
  History,
  Filter,
  User,
  Clock,
  FileText,
  Car,
  Camera,
  ChevronDown,
  ChevronUp,
  ExternalLink,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { getAnalyticsData, clearAnalyticsData } from "@/lib/analytics";
import { useLocations } from "@/hooks/use-locations";
import { useAuditLogs, useAuditStats, type AuditLog } from "@/hooks/use-audit-logs";
import { format, formatDistanceToNow, subDays, isAfter, startOfDay, eachDayOfInterval, isToday, startOfWeek, startOfMonth, parseISO, differenceInDays } from "date-fns";
import { RevenueAnalyticsTab } from "@/components/admin/analytics/RevenueAnalyticsTab";
import { QuarterlyReportGenerator } from "@/components/admin/QuarterlyReportGenerator";
import { DemandForecastingTab } from "@/components/admin/DemandForecastingTab";

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

// Audit log action config
const ACTION_CONFIG: Record<string, { icon: typeof History; color: string; bgColor: string }> = {
  booking_created: { icon: FileText, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  booking_status_change: { icon: Clock, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  booking_updated: { icon: FileText, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  payment_received: { icon: CreditCard, color: "text-green-500", bgColor: "bg-green-500/10" },
  payment_created: { icon: CreditCard, color: "text-green-500", bgColor: "bg-green-500/10" },
  verification_approved: { icon: Shield, color: "text-green-500", bgColor: "bg-green-500/10" },
  verification_rejected: { icon: Shield, color: "text-destructive", bgColor: "bg-destructive/10" },
  vehicle_assigned: { icon: Car, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  photo_uploaded: { icon: Camera, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  damage_reported: { icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10" },
  receipt_created: { icon: CreditCard, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  default: { icon: History, color: "text-muted-foreground", bgColor: "bg-muted" },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || ACTION_CONFIG.default;
}

function formatActionLabel(action: string): string {
  return action.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

// Audit log item component
function AuditLogItem({ log }: { log: AuditLog }) {
  const [isOpen, setIsOpen] = useState(false);
  const config = getActionConfig(log.action);
  const Icon = config.icon;
  const hasChanges = log.oldData || log.newData;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card hover:bg-muted/30 transition-colors">
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-start gap-3 text-left">
            <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{formatActionLabel(log.action)}</span>
                <Badge variant="outline" className="text-xs">{log.entityType}</Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span>{log.userName || log.userEmail || "System"}</span>
                <span>{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
            {hasChanges && (
              <div className="shrink-0">
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            )}
          </button>
        </CollapsibleTrigger>
        {hasChanges && (
          <CollapsibleContent>
            <div className="px-3 pb-3 pt-0 border-t">
              <div className="pt-3 text-xs font-mono space-y-1">
                {log.newData && Object.entries(log.newData).slice(0, 5).map(([key, val]) => (
                  <div key={key}>
                    <span className="text-muted-foreground">{key}:</span>{" "}
                    <span className="text-green-600">{JSON.stringify(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

type DateFilter = "today" | "week" | "month" | "all";

export default function AdminReports() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isQuarterlyOpen, setIsQuarterlyOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const { data: locations } = useLocations();
  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useAuditLogs({ limit: 100 });
  const { data: auditStats } = useAuditStats();
  const { data: bookings = [] } = useAdminBookings({});
  const { data: vehicles = [] } = useAdminVehicles();

  const data = useMemo(() => getAnalyticsData(), [refreshKey]);

  // Revenue calculations
  const revenueStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    
    // Filter bookings by period
    const completedBookings = bookings.filter(b => b.status === "completed" || b.status === "active");
    const thisWeek = completedBookings.filter(b => isAfter(parseISO(b.createdAt), weekStart));
    const thisMonth = completedBookings.filter(b => isAfter(parseISO(b.createdAt), monthStart));
    
    // Calculate totals
    const totalRevenue = completedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const weekRevenue = thisWeek.reduce((sum, b) => sum + b.totalAmount, 0);
    const monthRevenue = thisMonth.reduce((sum, b) => sum + b.totalAmount, 0);
    
    // Average booking value
    const avgBookingValue = completedBookings.length > 0 
      ? totalRevenue / completedBookings.length 
      : 0;
    
    // Average rental duration
    const avgDuration = completedBookings.length > 0
      ? completedBookings.reduce((sum, b) => sum + b.totalDays, 0) / completedBookings.length
      : 0;
    
    return {
      totalRevenue,
      weekRevenue,
      monthRevenue,
      avgBookingValue,
      avgDuration,
      totalBookings: completedBookings.length,
      weekBookings: thisWeek.length,
      monthBookings: thisMonth.length,
    };
  }, [bookings]);

  // Fleet utilization
  const fleetStats = useMemo(() => {
    const activeRentals = bookings.filter(b => b.status === "active").length;
    const availableVehicles = vehicles.filter(v => v.isAvailable).length;
    const totalVehicles = vehicles.length;
    
    const utilizationRate = totalVehicles > 0 
      ? (activeRentals / totalVehicles) * 100 
      : 0;
    
    // Revenue per vehicle
    const revenuePerVehicle = totalVehicles > 0
      ? revenueStats.totalRevenue / totalVehicles
      : 0;
    
    return {
      activeRentals,
      availableVehicles,
      totalVehicles,
      utilizationRate,
      revenuePerVehicle,
    };
  }, [bookings, vehicles, revenueStats]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refetchLogs();
    setTimeout(() => {
      setRefreshKey((k) => k + 1);
      setIsRefreshing(false);
    }, 300);
  };

  const handleClearData = () => {
    if (confirm("Clear all analytics data? This cannot be undone.")) {
      clearAnalyticsData();
      setRefreshKey((k) => k + 1);
    }
  };

  // Filter analytics events
  const filteredEvents = useMemo(() => {
    let events = data.events;
    if (dateFilter === "today") {
      events = events.filter((e) => isToday(new Date(e.timestamp)));
    } else if (dateFilter === "week") {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      events = events.filter((e) => isAfter(new Date(e.timestamp), weekStart));
    } else if (dateFilter === "month") {
      const monthStart = startOfMonth(new Date());
      events = events.filter((e) => isAfter(new Date(e.timestamp), monthStart));
    }
    return events;
  }, [data.events, dateFilter]);

  // Funnel stats
  const funnelStats = useMemo(() => {
    return FUNNEL_STAGES.map((stage) => ({
      ...stage,
      count: filteredEvents.filter((e) => e.event === stage.key).length,
    }));
  }, [filteredEvents]);

  const overallConversion = useMemo(() => {
    const first = funnelStats[0]?.count || 0;
    const last = funnelStats[funnelStats.length - 1]?.count || 0;
    return first > 0 ? (last / first) * 100 : 0;
  }, [funnelStats]);

  // Daily booking trend - based on actual booking data
  const dailyBookingTrend = useMemo(() => {
    const days = dateFilter === "today" ? 1 : dateFilter === "week" ? 7 : dateFilter === "month" ? 30 : 14;
    const interval = eachDayOfInterval({ start: subDays(new Date(), days - 1), end: new Date() });
    
    return interval.map((date) => {
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const dayBookings = bookings.filter((b) => {
        const bookingDate = parseISO(b.createdAt);
        return bookingDate >= dayStart && bookingDate < dayEnd;
      });
      
      const completedBookings = dayBookings.filter(b => b.status === "completed" || b.status === "active");
      const revenue = completedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
      
      return {
        date: format(date, "MMM d"),
        bookings: dayBookings.length,
        revenue: revenue,
      };
    });
  }, [bookings, dateFilter]);

  // Weekly revenue trend
  const weeklyRevenueTrend = useMemo(() => {
    const weeks = 8; // Last 8 weeks
    const result = [];
    
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(new Date(), i * 7), { weekStartsOn: 1 });
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const weekBookings = bookings.filter(b => {
        const bookingDate = parseISO(b.createdAt);
        return bookingDate >= weekStart && bookingDate < weekEnd && 
               (b.status === "completed" || b.status === "active");
      });
      
      result.push({
        week: format(weekStart, "MMM d"),
        revenue: weekBookings.reduce((sum, b) => sum + b.totalAmount, 0),
        bookings: weekBookings.length,
      });
    }
    
    return result;
  }, [bookings]);

  // Analytics daily trend (from localStorage)
  const dailyTrend = useMemo(() => {
    const days = dateFilter === "today" ? 1 : dateFilter === "week" ? 7 : dateFilter === "month" ? 30 : 7;
    const interval = eachDayOfInterval({ start: subDays(new Date(), days - 1), end: new Date() });
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
  }, [filteredEvents, dateFilter]);

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
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (entityFilter !== "all" && log.entityType !== entityFilter) return false;
      if (auditSearch) {
        const query = auditSearch.toLowerCase();
        const searchableText = [log.action, log.entityType, log.userName, log.userEmail].filter(Boolean).join(" ").toLowerCase();
        return searchableText.includes(query);
      }
      return true;
    });
  }, [logs, entityFilter, auditSearch]);

  const entityTypes = useMemo(() => {
    const types = new Set(logs.map((l) => l.entityType));
    return Array.from(types).sort();
  }, [logs]);

  const bookingCount = funnelStats.find(s => s.key === "booking_completed")?.count || 0;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
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
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Key Business Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${revenueStats.weekRevenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
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
                  <p className="text-2xl font-bold">{fleetStats.utilizationRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Utilization</p>
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
                  <p className="text-2xl font-bold">{revenueStats.avgDuration.toFixed(1)}</p>
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
            <RevenueAnalyticsTab />
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    Revenue Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">This Week</span>
                      <span className="text-lg font-bold">${revenueStats.weekRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">This Month</span>
                      <span className="text-lg font-bold">${revenueStats.monthRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-sm text-muted-foreground">All Time</span>
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

            {/* Revenue Trend Chart - Using actual booking data */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Weekly Revenue Trend</CardTitle>
                <CardDescription>Revenue over the last 8 weeks</CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyRevenueTrend.every(d => d.revenue === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No revenue data for this period</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyRevenueTrend}>
                        <XAxis dataKey="week" fontSize={10} />
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
                <CardTitle className="text-base">Daily Bookings</CardTitle>
                <CardDescription>New bookings and revenue per day</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyBookingTrend.every(d => d.bookings === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No booking data for this period</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyBookingTrend}>
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
            <ConversionFunnel events={filteredEvents} />

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
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <p className="text-4xl font-bold text-primary">{fleetStats.utilizationRate.toFixed(0)}%</p>
                    <p className="text-sm text-muted-foreground mt-1">Current Utilization</p>
                  </div>
                  <Progress value={fleetStats.utilizationRate} className="h-3" />
                  <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                    <div>
                      <p className="text-xl font-bold">{fleetStats.activeRentals}</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{fleetStats.availableVehicles}</p>
                      <p className="text-xs text-muted-foreground">Available</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{fleetStats.totalVehicles}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    Fleet Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Revenue per Vehicle</span>
                      <span className="text-lg font-bold">${fleetStats.revenuePerVehicle.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Revenue</span>
                      <span className="text-lg font-bold">${revenueStats.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Fleet Size</span>
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
