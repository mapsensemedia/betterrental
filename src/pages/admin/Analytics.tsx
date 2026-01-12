/**
 * Full Analytics Page for Admin Dashboard
 * Shows complete conversion funnel, detailed metrics, and trends
 */
import { useState, useMemo } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
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
  Calendar,
  Filter,
  Download,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { getAnalyticsData, clearAnalyticsData, type AnalyticsEvent } from "@/lib/analytics";
import { format, subDays, isAfter, startOfDay, eachDayOfInterval } from "date-fns";

// Full funnel stages
const FUNNEL_STAGES = [
  { key: "search_performed", label: "Search", icon: Search, color: "hsl(var(--primary))" },
  { key: "vehicle_viewed", label: "Vehicle Viewed", icon: Eye, color: "#3b82f6" },
  { key: "vehicle_selected", label: "Selected", icon: MousePointerClick, color: "#8b5cf6" },
  { key: "protection_selected", label: "Protection", icon: Shield, color: "#6366f1" },
  { key: "addons_selected", label: "Add-ons", icon: Gift, color: "#ec4899" },
  { key: "checkout_started", label: "Checkout", icon: ShoppingCart, color: "#f97316" },
  { key: "checkout_payment_method_selected", label: "Payment Method", icon: CreditCard, color: "#eab308" },
  { key: "booking_completed", label: "Completed", icon: CheckCircle, color: "#22c55e" },
] as const;

const chartConfig = {
  views: { label: "Views", color: "hsl(var(--primary))" },
  conversions: { label: "Conversions", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function AdminAnalytics() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dateRange, setDateRange] = useState<"7d" | "14d" | "30d" | "all">("7d");

  const data = useMemo(() => {
    return getAnalyticsData();
  }, [refreshKey]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setRefreshKey((k) => k + 1);
      setIsRefreshing(false);
    }, 300);
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all analytics data? This cannot be undone.")) {
      clearAnalyticsData();
      setRefreshKey((k) => k + 1);
    }
  };

  // Filter events by date range
  const filteredEvents = useMemo(() => {
    if (dateRange === "all") return data.events;
    const days = dateRange === "7d" ? 7 : dateRange === "14d" ? 14 : 30;
    const cutoff = subDays(new Date(), days);
    return data.events.filter((e) => isAfter(new Date(e.timestamp), cutoff));
  }, [data.events, dateRange]);

  // Calculate funnel stats
  const funnelStats = useMemo(() => {
    return FUNNEL_STAGES.map((stage) => ({
      ...stage,
      count: filteredEvents.filter((e) => e.event === stage.key).length,
    }));
  }, [filteredEvents]);

  // Calculate drop-off between stages
  const funnelWithDropoff = useMemo(() => {
    return funnelStats.map((stage, idx) => {
      const prevCount = idx > 0 ? funnelStats[idx - 1].count : stage.count;
      const dropoff = prevCount > 0 ? ((prevCount - stage.count) / prevCount) * 100 : 0;
      const conversion = prevCount > 0 ? (stage.count / prevCount) * 100 : 0;
      return {
        ...stage,
        dropoff,
        conversion,
        prevCount,
      };
    });
  }, [funnelStats]);

  // Overall conversion rate
  const overallConversion = useMemo(() => {
    const first = funnelStats[0]?.count || 0;
    const last = funnelStats[funnelStats.length - 1]?.count || 0;
    return first > 0 ? (last / first) * 100 : 0;
  }, [funnelStats]);

  // Daily trend data
  const dailyTrend = useMemo(() => {
    const days = dateRange === "7d" ? 7 : dateRange === "14d" ? 14 : dateRange === "30d" ? 30 : 7;
    const interval = eachDayOfInterval({
      start: subDays(new Date(), days - 1),
      end: new Date(),
    });

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
        searches: dayEvents.filter((e) => e.event === "search_performed").length,
      };
    });
  }, [filteredEvents, dateRange]);

  // Event distribution for pie chart
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

  // Error count
  const errorCount = filteredEvents.filter((e) => e.event === "error").length;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track conversion funnel and booking metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="w-[130px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="14d">Last 14 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleClearData}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-3xl font-bold">{filteredEvents.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-3xl font-bold text-green-600">{overallConversion.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bookings</p>
                  <p className="text-3xl font-bold">{funnelStats.find(s => s.key === "booking_completed")?.count || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Errors</p>
                  <p className={`text-3xl font-bold ${errorCount > 0 ? "text-destructive" : ""}`}>{errorCount}</p>
                </div>
                <div className={`w-12 h-12 rounded-full ${errorCount > 0 ? "bg-destructive/10" : "bg-muted"} flex items-center justify-center`}>
                  <AlertTriangle className={`w-6 h-6 ${errorCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="funnel" className="space-y-6">
          <TabsList>
            <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="pages">Pages & Events</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>

          {/* Conversion Funnel Tab */}
          <TabsContent value="funnel" className="space-y-6">
            {/* Visual Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Booking Funnel</CardTitle>
                <CardDescription>Track user journey from search to booking completion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Funnel Visualization */}
                <div className="space-y-3">
                  {funnelWithDropoff.map((stage, idx) => {
                    const maxCount = Math.max(...funnelStats.map((s) => s.count), 1);
                    const widthPercent = (stage.count / maxCount) * 100;
                    const Icon = stage.icon;

                    return (
                      <div key={stage.key} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" style={{ color: stage.color }} />
                            <span className="font-medium">{stage.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold">{stage.count}</span>
                            {idx > 0 && (
                              <div className="flex items-center gap-1">
                                {stage.conversion >= 50 ? (
                                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                    {stage.conversion.toFixed(0)}%
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5">
                                    {stage.conversion.toFixed(0)}%
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                            style={{
                              width: `${widthPercent}%`,
                              backgroundColor: stage.color,
                              opacity: 0.8,
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-medium text-white mix-blend-difference">
                              {widthPercent.toFixed(0)}% of max
                            </span>
                          </div>
                        </div>
                        {idx < funnelWithDropoff.length - 1 && stage.dropoff > 0 && (
                          <div className="flex items-center justify-center text-xs text-muted-foreground py-1">
                            <ArrowRight className="w-3 h-3 mr-1" />
                            <span className="text-destructive">{stage.dropoff.toFixed(0)}% drop-off</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Funnel Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{overallConversion.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Overall Conversion</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-destructive">
                      {funnelWithDropoff.find(s => s.key === "checkout_started")?.dropoff.toFixed(0) || 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Checkout Drop-off</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {funnelWithDropoff.find(s => s.key === "vehicle_selected")?.conversion.toFixed(0) || 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">View → Select Rate</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold">
                      {funnelWithDropoff.find(s => s.key === "booking_completed")?.conversion.toFixed(0) || 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Payment → Complete</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Activity</CardTitle>
                <CardDescription>Vehicle views and bookings over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyTrend}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="views" fill="var(--color-views)" radius={4} />
                      <Bar dataKey="conversions" fill="var(--color-conversions)" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event Distribution</CardTitle>
                  <CardDescription>Top event types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={eventDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {eventDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Search Trends</CardTitle>
                  <CardDescription>Searches performed over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyTrend}>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip />
                        <Line type="monotone" dataKey="searches" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pages & Events Tab */}
          <TabsContent value="pages" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Pages</CardTitle>
                  <CardDescription>Most viewed pages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.topPages.slice(0, 10).map((page, idx) => (
                      <div
                        key={page.page}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-sm w-6">{idx + 1}.</span>
                          <span className="text-sm truncate max-w-[200px]">{page.page}</span>
                        </div>
                        <Badge variant="secondary">{page.views}</Badge>
                      </div>
                    ))}
                    {data.topPages.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No page views recorded yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Events by Type</CardTitle>
                  <CardDescription>All tracked events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.eventsByType.slice(0, 10).map((event) => (
                      <div
                        key={event.event}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                      >
                        <span className="text-sm capitalize">{event.event.replace(/_/g, " ")}</span>
                        <Badge variant="outline">{event.count}</Badge>
                      </div>
                    ))}
                    {data.eventsByType.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No events tracked yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Recent Errors
                </CardTitle>
                <CardDescription>Captured JavaScript errors and exceptions</CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentErrors.length > 0 ? (
                  <div className="space-y-3">
                    {data.recentErrors.map((error, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-lg border border-destructive/20 bg-destructive/5"
                      >
                        <p className="font-medium text-destructive">
                          {error.properties?.error_message as string || "Unknown error"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {error.properties?.error_name as string}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{format(new Date(error.timestamp), "MMM d, yyyy 'at' h:mm a")}</span>
                          <span>•</span>
                          <span>{error.page}</span>
                        </div>
                        {error.properties?.error_stack && (
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {(error.properties.error_stack as string).slice(0, 300)}...
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-lg font-medium">No errors recorded</p>
                    <p className="text-sm text-muted-foreground">Great! Your app is running smoothly.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
