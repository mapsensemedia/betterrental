/**
 * Analytics Panel for Admin Dashboard
 * Displays conversion funnel, top pages, events, and errors
 */
import { useState, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getAnalyticsData, clearAnalyticsData } from "@/lib/analytics";
import { format, subDays, isAfter } from "date-fns";

export function AnalyticsPanel() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorsOpen, setErrorsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const data = useMemo(() => {
    // Re-fetch when refreshKey changes
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
    if (confirm("Are you sure you want to clear all analytics data?")) {
      clearAnalyticsData();
      setRefreshKey((k) => k + 1);
    }
  };

  // Filter to last 7 days for stats
  const last7Days = useMemo(() => {
    const cutoff = subDays(new Date(), 7);
    return data.events.filter((e) => isAfter(new Date(e.timestamp), cutoff));
  }, [data.events]);

  const last7DaysStats = useMemo(() => {
    const vehicleViews = last7Days.filter((e) => e.event === "vehicle_viewed").length;
    const vehicleSelections = last7Days.filter((e) => e.event === "vehicle_selected").length;
    const checkoutStarts = last7Days.filter((e) => e.event === "checkout_started").length;
    const bookingsCompleted = last7Days.filter((e) => e.event === "booking_completed").length;
    return { vehicleViews, vehicleSelections, checkoutStarts, bookingsCompleted };
  }, [last7Days]);

  const funnelSteps = [
    {
      label: "Vehicle Views",
      value: last7DaysStats.vehicleViews,
      icon: Eye,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Selections",
      value: last7DaysStats.vehicleSelections,
      icon: MousePointerClick,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Checkout Started",
      value: last7DaysStats.checkoutStarts,
      icon: ShoppingCart,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Bookings",
      value: last7DaysStats.bookingsCompleted,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  const conversionRate =
    last7DaysStats.vehicleViews > 0
      ? ((last7DaysStats.bookingsCompleted / last7DaysStats.vehicleViews) * 100).toFixed(1)
      : "0.0";

  const dropoffRate =
    last7DaysStats.checkoutStarts > 0
      ? (((last7DaysStats.checkoutStarts - last7DaysStats.bookingsCompleted) / last7DaysStats.checkoutStarts) * 100).toFixed(1)
      : "0.0";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Analytics Overview
            </CardTitle>
            <CardDescription>Last 7 days conversion funnel</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearData}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Funnel Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {funnelSteps.map((step, idx) => (
            <div
              key={step.label}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card"
            >
              <div className={`w-10 h-10 rounded-lg ${step.bgColor} flex items-center justify-center`}>
                <step.icon className={`w-5 h-5 ${step.color}`} />
              </div>
              <p className="text-2xl font-bold">{step.value}</p>
              <p className="text-xs text-muted-foreground text-center">{step.label}</p>
              {idx > 0 && funnelSteps[idx - 1].value > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {((step.value / funnelSteps[idx - 1].value) * 100).toFixed(0)}% of prev
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Conversion Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Conversion Rate</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Views → Bookings</p>
          </div>
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Checkout Drop-off</span>
              <TrendingDown className="w-4 h-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold text-destructive">{dropoffRate}%</p>
            <p className="text-xs text-muted-foreground">Started → Abandoned</p>
          </div>
        </div>

        {/* Visual Funnel */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Conversion Funnel</p>
          {funnelSteps.map((step, idx) => {
            const maxValue = Math.max(...funnelSteps.map((s) => s.value), 1);
            const percentage = (step.value / maxValue) * 100;
            return (
              <div key={step.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 truncate">{step.label}</span>
                <Progress value={percentage} className="flex-1 h-2" />
                <span className="text-xs font-medium w-8 text-right">{step.value}</span>
              </div>
            );
          })}
        </div>

        {/* Top Pages */}
        {data.topPages.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Top Pages</p>
            <div className="space-y-1">
              {data.topPages.slice(0, 5).map((page) => (
                <div
                  key={page.page}
                  className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50"
                >
                  <span className="truncate text-muted-foreground">{page.page}</span>
                  <Badge variant="secondary">{page.views}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Errors */}
        {data.recentErrors.length > 0 && (
          <Collapsible open={errorsOpen} onOpenChange={setErrorsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium">Recent Errors</span>
                  <Badge variant="destructive" className="text-xs">
                    {data.recentErrors.length}
                  </Badge>
                </div>
                {errorsOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {data.recentErrors.slice(0, 5).map((error, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg border border-destructive/20 bg-destructive/5 text-xs"
                >
                  <p className="font-medium text-destructive truncate">
                    {error.properties?.error_message as string}
                  </p>
                  <p className="text-muted-foreground">
                    {format(new Date(error.timestamp), "MMM d, h:mm a")} • {error.page}
                  </p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Event Summary */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {data.events.length} total events tracked • {last7Days.length} in last 7 days
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
