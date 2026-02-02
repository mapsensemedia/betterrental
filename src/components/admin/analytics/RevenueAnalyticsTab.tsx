/**
 * Revenue & Add-On Analytics Tab
 * Comprehensive analytics for rental pricing, add-ons, and channel comparison
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Download,
  CalendarIcon,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Globe,
  Store,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { useRevenueAnalytics, exportToCSV, BookingChannel, PaymentType, BookingType } from "@/hooks/use-revenue-analytics";
import { useLocations } from "@/hooks/use-locations";
import { useFleetCategories } from "@/hooks/use-fleet-categories";
import { cn } from "@/lib/utils";

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--primary))" },
  bookings: { label: "Bookings", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

type DatePreset = "7d" | "30d" | "90d" | "mtd" | "custom";

export function RevenueAnalyticsTab() {
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [channel, setChannel] = useState<BookingChannel>("all");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>("all");
  const [paymentType, setPaymentType] = useState<PaymentType>("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: locations } = useLocations();
  const { data: categories } = useFleetCategories();

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case "7d": return { start: subDays(now, 7), end: now };
      case "30d": return { start: subDays(now, 30), end: now };
      case "90d": return { start: subDays(now, 90), end: now };
      case "mtd": return { start: startOfMonth(now), end: now };
      case "custom": return { 
        start: customStartDate || subDays(now, 30), 
        end: customEndDate || now 
      };
      default: return { start: subDays(now, 30), end: now };
    }
  }, [datePreset, customStartDate, customEndDate]);

  const {
    rentalMetrics,
    addOnMetrics,
    addOnBreakdown,
    channelComparison,
    revenueTrend,
    addOnTrend,
    exportData,
    isLoading,
  } = useRevenueAnalytics({
    startDate: dateRange.start,
    endDate: dateRange.end,
    channel,
    locationId,
    categoryId,
    bookingType,
    paymentType,
  });

  const handleExportBookings = () => {
    exportToCSV(exportData, "revenue-report");
  };

  const handleExportAddOns = () => {
    exportToCSV(addOnBreakdown.map(a => ({
      name: a.name,
      bookings_added: a.bookingsAdded,
      attach_rate_percent: a.attachRate.toFixed(1),
      total_revenue: a.totalRevenue.toFixed(2),
      avg_price: a.avgPrice.toFixed(2),
      last_30_days_trend_percent: a.last30DaysTrend.toFixed(1),
    })), "addon-breakdown");
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  const TrendIndicator = ({ value }: { value: number }) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Preset */}
        <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
          <SelectTrigger className="w-[130px]">
            <CalendarIcon className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="mtd">Month to Date</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {datePreset === "custom" && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {customStartDate ? format(customStartDate, "MMM d") : "Start"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {customEndDate ? format(customEndDate, "MMM d") : "End"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Channel Filter */}
        <Select value={channel} onValueChange={(v) => setChannel(v as BookingChannel)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="walk_in">Walk-In</SelectItem>
          </SelectContent>
        </Select>

        {/* Toggle Additional Filters */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowFilters(!showFilters)}
          className={cn(showFilters && "bg-muted")}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>

        <div className="flex-1" />

        {/* Export Buttons */}
        <Button variant="outline" size="sm" onClick={handleExportBookings}>
          <Download className="w-4 h-4 mr-2" />
          Export Bookings
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportAddOns}>
          <Download className="w-4 h-4 mr-2" />
          Export Add-Ons
        </Button>
      </div>

      {/* Additional Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Location</label>
                <Select value={locationId || "all"} onValueChange={(v) => setLocationId(v === "all" ? null : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations?.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Category</label>
                <Select value={categoryId || "all"} onValueChange={(v) => setCategoryId(v === "all" ? null : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Booking Type</label>
                <Select value={bookingType} onValueChange={(v) => setBookingType(v as BookingType)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Payment Type</label>
                <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="pay_now">Pay Now</SelectItem>
                    <SelectItem value="pay_later">Pay at Pickup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(rentalMetrics.averageRentalPrice)}</p>
                <p className="text-xs text-muted-foreground">Avg Rental Price</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-1/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-chart-1" />
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
              <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(addOnMetrics.averageAddOnSpend)}</p>
                <p className="text-xs text-muted-foreground">Avg Add-On Spend</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{addOnMetrics.attachRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Add-On Attach Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-dashed">
          <CardContent className="p-3">
            <p className="text-sm text-muted-foreground">Total Base Revenue</p>
            <p className="text-lg font-semibold">{formatCurrency(rentalMetrics.totalRentalBaseRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-3">
            <p className="text-sm text-muted-foreground">Median Rental Price</p>
            <p className="text-lg font-semibold">{formatCurrency(rentalMetrics.medianRentalPrice)}</p>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-3">
            <p className="text-sm text-muted-foreground">Total Add-On Revenue</p>
            <p className="text-lg font-semibold">{formatCurrency(addOnMetrics.totalAddOnRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-3">
            <p className="text-sm text-muted-foreground">Bookings with Add-Ons</p>
            <p className="text-lg font-semibold">{addOnMetrics.bookingsWithAddOns}</p>
          </CardContent>
        </Card>
      </div>

      {/* Channel Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Channel Comparison</CardTitle>
          <CardDescription>Online vs Walk-In performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {channelComparison.map(ch => (
              <div 
                key={ch.channel} 
                className={cn(
                  "p-4 rounded-lg border",
                  ch.channel === "online" ? "bg-chart-1/5 border-chart-1/30" : "bg-chart-5/5 border-chart-5/30"
                )}
              >
                <div className="flex items-center gap-2 mb-4">
                  {ch.channel === "online" ? (
                    <Globe className="w-5 h-5 text-chart-1" />
                  ) : (
                    <Store className="w-5 h-5 text-chart-5" />
                  )}
                  <span className="font-medium capitalize">{ch.channel.replace("_", "-")}</span>
                  <Badge variant="secondary" className="ml-auto">{ch.bookingCount} bookings</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Rental</p>
                    <p className="text-lg font-semibold">{formatCurrency(ch.avgRentalPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Add-On</p>
                    <p className="text-lg font-semibold">{formatCurrency(ch.avgAddOnSpend)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Attach Rate</p>
                    <p className="text-lg font-semibold">{ch.attachRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-lg font-semibold">{formatCurrency(ch.totalRevenue)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rental Revenue Trend</CardTitle>
            <CardDescription>Base rental revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueTrend.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data for selected period
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add-On Revenue Trend</CardTitle>
            <CardDescription>Add-on revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            {addOnTrend.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data for selected period
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={addOnTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add-On Breakdown Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add-On Breakdown</CardTitle>
          <CardDescription>Performance by individual add-on</CardDescription>
        </CardHeader>
        <CardContent>
          {addOnBreakdown.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No add-on data for selected period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Add-On Name</th>
                    <th className="text-right py-2 font-medium"># Bookings</th>
                    <th className="text-right py-2 font-medium">Attach Rate</th>
                    <th className="text-right py-2 font-medium">Total Revenue</th>
                    <th className="text-right py-2 font-medium">Avg Price</th>
                    <th className="text-right py-2 font-medium">30-Day Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {addOnBreakdown.map(addon => (
                    <tr key={addon.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 font-medium">{addon.name}</td>
                      <td className="py-3 text-right tabular-nums">{addon.bookingsAdded}</td>
                      <td className="py-3 text-right tabular-nums">{addon.attachRate.toFixed(1)}%</td>
                      <td className="py-3 text-right tabular-nums font-medium">{formatCurrency(addon.totalRevenue)}</td>
                      <td className="py-3 text-right tabular-nums">{formatCurrency(addon.avgPrice)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TrendIndicator value={addon.last30DaysTrend} />
                          <span className={cn(
                            "tabular-nums",
                            addon.last30DaysTrend > 0 && "text-emerald-600 dark:text-emerald-400",
                            addon.last30DaysTrend < 0 && "text-destructive"
                          )}>
                            {addon.last30DaysTrend > 0 ? "+" : ""}{addon.last30DaysTrend.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
