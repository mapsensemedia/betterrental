/**
 * Combined Reports Page - Analytics + Audit Logs
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { getAnalyticsData, clearAnalyticsData } from "@/lib/analytics";
import { useLocations } from "@/hooks/use-locations";
import { useAuditLogs, useAuditStats, type AuditLog } from "@/hooks/use-audit-logs";
import { format, formatDistanceToNow, subDays, isAfter, startOfDay, eachDayOfInterval, isToday, startOfWeek, startOfMonth } from "date-fns";

// Funnel stages
const FUNNEL_STAGES = [
  { key: "search_performed", label: "Search", icon: Search, color: "hsl(var(--primary))" },
  { key: "vehicle_viewed", label: "Viewed", icon: Eye, color: "#3b82f6" },
  { key: "vehicle_selected", label: "Selected", icon: MousePointerClick, color: "#8b5cf6" },
  { key: "protection_selected", label: "Protection", icon: Shield, color: "#6366f1" },
  { key: "addons_selected", label: "Add-ons", icon: Gift, color: "#ec4899" },
  { key: "checkout_started", label: "Checkout", icon: ShoppingCart, color: "#f97316" },
  { key: "checkout_payment_method_selected", label: "Payment", icon: CreditCard, color: "#eab308" },
  { key: "booking_completed", label: "Completed", icon: CheckCircle, color: "#22c55e" },
] as const;

const chartConfig = {
  views: { label: "Views", color: "hsl(var(--primary))" },
  conversions: { label: "Conversions", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const COLORS = ["hsl(var(--primary))", "#22c55e", "#f97316", "#8b5cf6", "#3b82f6", "#ec4899"];

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const { data: locations } = useLocations();
  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useAuditLogs({ limit: 100 });
  const { data: auditStats } = useAuditStats();

  const data = useMemo(() => getAnalyticsData(), [refreshKey]);

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

  // Daily trend
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
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground text-sm mt-1">Analytics and activity logs</p>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredEvents.length}</p>
                  <p className="text-xs text-muted-foreground">Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{overallConversion.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Conversion</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bookingCount}</p>
                  <p className="text-xs text-muted-foreground">Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <History className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{auditStats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Changes (24h)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <History className="w-4 h-4" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Funnel */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Conversion Funnel</CardTitle>
                  <CardDescription>User journey stages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No events recorded</p>
                    </div>
                  ) : (
                    funnelStats.map((stage, idx) => {
                      const maxCount = Math.max(...funnelStats.map((s) => s.count), 1);
                      const widthPercent = (stage.count / maxCount) * 100;
                      const Icon = stage.icon;
                      return (
                        <div key={stage.key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5" style={{ color: stage.color }} />
                              <span>{stage.label}</span>
                            </div>
                            <span className="font-medium tabular-nums">{stage.count}</span>
                          </div>
                          <div className="relative h-4 bg-muted rounded overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 rounded transition-all"
                              style={{ width: `${widthPercent}%`, backgroundColor: stage.color, opacity: 0.8 }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Daily Trend */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Daily Activity</CardTitle>
                  <CardDescription>Views and bookings</CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyTrend.every(d => d.views === 0 && d.conversions === 0) ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No activity data</p>
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

              {/* Event Distribution */}
              <Card className="md:col-span-2">
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
        </Tabs>
      </div>
    </AdminShell>
  );
}
