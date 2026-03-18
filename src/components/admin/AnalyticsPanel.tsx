/**
 * Analytics Panel for Admin Dashboard
 * Displays conversion funnel, top pages, events, and errors from Supabase.
 */
import { useState, useMemo } from "react";
import {
  BarChart3,
  Eye,
  MousePointerClick,
  ShoppingCart,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";
import { subDays } from "date-fns";

export function AnalyticsPanel() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const dateRange = useMemo(() => ({
    start: subDays(new Date(), 7),
    end: new Date(),
  }), []);

  const { data: events = [], refetch } = useAnalyticsEvents({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    refetch();
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const funnelSteps = useMemo(() => {
    const vehicleViews = events.filter((e) => e.event === "vehicle_viewed").length;
    const vehicleSelections = events.filter((e) => e.event === "vehicle_selected").length;
    const checkoutStarts = events.filter((e) => e.event === "checkout_started").length;
    const bookingsCompleted = events.filter((e) => e.event === "booking_completed").length;
    return [
      { label: "Vehicle Views", value: vehicleViews, icon: Eye, color: "text-blue-500", bgColor: "bg-blue-500/10" },
      { label: "Selections", value: vehicleSelections, icon: MousePointerClick, color: "text-purple-500", bgColor: "bg-purple-500/10" },
      { label: "Checkout Started", value: checkoutStarts, icon: ShoppingCart, color: "text-orange-500", bgColor: "bg-orange-500/10" },
      { label: "Bookings", value: bookingsCompleted, icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-500/10" },
    ];
  }, [events]);

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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
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

        {/* Visual Funnel */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Conversion Funnel</p>
          {funnelSteps.map((step) => {
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

        {/* Event Summary */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {events.length} events tracked in last 7 days
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
