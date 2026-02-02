/**
 * Analytics Dashboard - Clean, minimal layout matching admin style
 */
import { useState, useMemo } from "react";
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
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { getAnalyticsData, clearAnalyticsData } from "@/lib/analytics";
import { useLocations } from "@/hooks/use-locations";
import { format, subDays, isAfter, startOfDay, eachDayOfInterval, isToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { RevenueAnalyticsTab } from "@/components/admin/analytics/RevenueAnalyticsTab";

// Full funnel stages
const FUNNEL_STAGES = [
  { key: "search_performed", label: "Search", icon: Search, color: "hsl(var(--primary))" },
  { key: "vehicle_viewed", label: "Viewed", icon: Eye, color: "hsl(var(--chart-1))" },
  { key: "vehicle_selected", label: "Selected", icon: MousePointerClick, color: "hsl(var(--chart-2))" },
  { key: "protection_selected", label: "Protection", icon: Shield, color: "hsl(var(--chart-3))" },
  { key: "addons_selected", label: "Add-ons", icon: Gift, color: "hsl(var(--chart-4))" },
  { key: "checkout_started", label: "Checkout", icon: ShoppingCart, color: "hsl(var(--chart-5))" },
  { key: "checkout_payment_method_selected", label: "Payment", icon: CreditCard, color: "hsl(var(--accent))" },
  { key: "booking_completed", label: "Completed", icon: CheckCircle, color: "hsl(var(--primary))" },
] as const;

const chartConfig = {
  views: { label: "Views", color: "hsl(var(--primary))" },
  conversions: { label: "Conversions", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

type DateFilter = "today" | "week" | "month" | "all";

export default function AdminAnalytics() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const { data: locations } = useLocations();

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
    if (confirm("Clear all analytics data? This cannot be undone.")) {
      clearAnalyticsData();
      setRefreshKey((k) => k + 1);
    }
  };

  // Filter events by date range
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
    
    // Location filter would apply here if events had location data
    return events;
  }, [data.events, dateFilter, locationFilter]);

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
      return { ...stage, dropoff, conversion, prevCount };
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
    const days = dateFilter === "today" ? 1 : dateFilter === "week" ? 7 : dateFilter === "month" ? 30 : 7;
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
      };
    });
  }, [filteredEvents, dateFilter]);

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
  const bookingCount = funnelStats.find(s => s.key === "booking_completed")?.count || 0;
  const checkoutDropoff = funnelWithDropoff.find(s => s.key === "checkout_started")?.dropoff || 0;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header - matches Overview style */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Conversion funnel and booking metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[160px]">
                <MapPin className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations?.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
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

        {/* Key Metrics - compact row like Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredEvents.length}</p>
                  <p className="text-xs text-muted-foreground">Total Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border">
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
          <Card className="border">
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
          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${errorCount > 0 ? "bg-destructive/10" : "bg-muted"} flex items-center justify-center`}>
                  <AlertTriangle className={`w-5 h-5 ${errorCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${errorCount > 0 ? "text-destructive" : ""}`}>{errorCount}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="revenue" className="gap-1.5">
              <DollarSign className="w-4 h-4" />
              Revenue & Add-Ons
            </TabsTrigger>
            <TabsTrigger value="funnel">Funnel</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>

          {/* Revenue & Add-On Analytics Tab */}
          <TabsContent value="revenue">
            <RevenueAnalyticsTab />
          </TabsContent>

          {/* Conversion Funnel Tab */}
          <TabsContent value="funnel" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Booking Funnel</CardTitle>
                <CardDescription>User journey from search to completion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No events recorded for this period</p>
                  </div>
                ) : (
                  <>
                    {/* Funnel Visualization */}
                    <div className="space-y-2">
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
                              <div className="flex items-center gap-2">
                                <span className="font-bold tabular-nums">{stage.count}</span>
                                {idx > 0 && stage.prevCount > 0 && (
                                  <Badge 
                                    variant="outline" 
                                    className={stage.conversion >= 50 
                                      ? "text-green-600 border-green-200 bg-green-50 text-xs" 
                                      : "text-destructive border-destructive/20 bg-destructive/5 text-xs"
                                    }
                                  >
                                    {stage.conversion.toFixed(0)}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="relative h-6 bg-muted rounded overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 rounded transition-all duration-500"
                                style={{
                                  width: `${widthPercent}%`,
                                  backgroundColor: stage.color,
                                  opacity: 0.85,
                                }}
                              />
                            </div>
                            {idx < funnelWithDropoff.length - 1 && stage.dropoff > 20 && (
                              <div className="flex items-center justify-center text-xs text-muted-foreground py-0.5">
                                <ArrowRight className="w-3 h-3 mr-1" />
                                <span className="text-destructive">{stage.dropoff.toFixed(0)}% drop</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-xl font-bold text-green-600">{overallConversion.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">Overall</p>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-xl font-bold text-destructive">{checkoutDropoff.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">Checkout Drop</p>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-xl font-bold">{bookingCount}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Daily Activity</CardTitle>
                <CardDescription>Views and bookings over time</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyTrend.every(d => d.views === 0 && d.conversions === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No activity data for this period</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyTrend}>
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="views" fill="var(--color-views)" radius={4} />
                        <Bar dataKey="conversions" fill="var(--color-conversions)" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Event Distribution</CardTitle>
                <CardDescription>Top event types</CardDescription>
              </CardHeader>
              <CardContent>
                {eventDistribution.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No events recorded</p>
                  </div>
                ) : (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={eventDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          dataKey="value"
                          label={({ name, value }) => `${value}`}
                        >
                          {eventDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {eventDistribution.slice(0, 4).map((item, idx) => (
                    <Badge key={item.name} variant="outline" className="text-xs">
                      <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      {item.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Top Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.topPages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No page views</p>
                  ) : (
                    <div className="space-y-2">
                      {data.topPages.slice(0, 8).map((page, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                          <span className="truncate max-w-[200px] text-muted-foreground">{page.page}</span>
                          <Badge variant="secondary" className="text-xs">{page.views}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Event Counts</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.eventsByType.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No events</p>
                  ) : (
                    <div className="space-y-2">
                      {data.eventsByType.slice(0, 8).map((item) => (
                        <div key={item.event} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                          <span className="capitalize text-muted-foreground">{item.event.replace(/_/g, " ")}</span>
                          <Badge variant="secondary" className="text-xs">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Errors</CardTitle>
                <CardDescription>JavaScript errors from user sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentErrors.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-muted-foreground">No errors recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.recentErrors.slice(0, 10).map((error, idx) => (
                      <div key={idx} className="p-3 bg-destructive/5 rounded-lg border border-destructive/10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-destructive truncate">
                              {error.properties?.error_message as string || "Unknown error"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {error.properties?.error_name as string || "Error"} • {format(new Date(error.timestamp), "MMM d, h:mm a")}
                            </p>
                            {error.page && (
                              <p className="text-xs text-muted-foreground truncate">{error.page}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
