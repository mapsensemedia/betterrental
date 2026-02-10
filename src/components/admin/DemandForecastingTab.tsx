/**
 * Demand Forecasting Tab
 * Rental frequency heatmaps and seasonal trend analysis
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemandForecasting } from "@/hooks/use-demand-forecasting";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip } from "recharts";
import { MapPin, Tag, TrendingUp, Calendar } from "lucide-react";

export function DemandForecastingTab() {
  const [months, setMonths] = useState(12);
  const {
    dayOfWeekHeatmap,
    monthlyHeatmap,
    locationDemand,
    categoryDemand,
    seasonalTrend,
    totalBookings,
    isLoading,
  } = useDemandForecasting(months);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  const maxDayValue = Math.max(...dayOfWeekHeatmap.map((d) => d.value), 1);
  const maxMonthValue = Math.max(...monthlyHeatmap.map((m) => m.value), 1);

  const getHeatColor = (value: number, max: number) => {
    const ratio = value / max;
    if (ratio > 0.75) return "bg-green-500 text-white";
    if (ratio > 0.5) return "bg-green-400 text-white";
    if (ratio > 0.25) return "bg-green-200 text-green-900";
    if (ratio > 0) return "bg-green-100 text-green-800";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Demand Forecasting</h3>
          <p className="text-sm text-muted-foreground">
            {totalBookings} bookings analyzed
          </p>
        </div>
        <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
            <SelectItem value="24">Last 24 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Day of Week Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Rental Frequency by Day of Week
          </CardTitle>
          <CardDescription>Which days see the most rental start dates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {dayOfWeekHeatmap.map((d) => (
              <div
                key={d.label}
                className={`flex-1 rounded-lg p-3 text-center ${getHeatColor(d.value, maxDayValue)}`}
              >
                <p className="text-xs font-medium">{d.label}</p>
                <p className="text-lg font-bold">{d.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Monthly Booking Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {monthlyHeatmap.map((m) => (
              <div
                key={m.label}
                className={`rounded-lg p-2 text-center ${getHeatColor(m.value, maxMonthValue)}`}
              >
                <p className="text-xs">{m.label}</p>
                <p className="text-sm font-bold">{m.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Revenue Trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Seasonal Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seasonalTrend}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "revenue" ? [`$${value.toLocaleString()}`, "Revenue"] : [value, "Bookings"]
                  }
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Demand by Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Demand by Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locationDemand.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No location data</p>
            ) : (
              <div className="space-y-3">
                {locationDemand.slice(0, 10).map((loc, i) => (
                  <div key={loc.locationId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <span className="text-sm font-medium">{loc.locationName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{loc.totalBookings}</Badge>
                      <span className="text-xs text-muted-foreground">
                        avg ${loc.avgDailyRate.toFixed(0)}/day
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Demand by Category */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Demand by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryDemand.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No category data</p>
            ) : (
              <div className="space-y-3">
                {categoryDemand.slice(0, 10).map((cat, i) => (
                  <div key={cat.categoryId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <span className="text-sm font-medium">{cat.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{cat.totalBookings}</Badge>
                      <span className="text-xs text-muted-foreground">
                        avg {cat.avgDuration.toFixed(1)} days
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
