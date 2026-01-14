/**
 * Conversion Funnel Component
 * Visual representation of booking funnel with drop-off rates
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Eye, 
  MousePointerClick, 
  Shield, 
  Gift, 
  ShoppingCart, 
  CreditCard, 
  CheckCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

// Rental booking funnel stages
const FUNNEL_STAGES = [
  { key: "search_performed", label: "Search", icon: Search },
  { key: "vehicle_viewed", label: "Vehicle Viewed", icon: Eye },
  { key: "vehicle_selected", label: "Vehicle Selected", icon: MousePointerClick },
  { key: "protection_selected", label: "Protection Added", icon: Shield },
  { key: "addons_selected", label: "Add-ons Selected", icon: Gift },
  { key: "checkout_started", label: "Checkout Started", icon: ShoppingCart },
  { key: "checkout_payment_method_selected", label: "Payment Method", icon: CreditCard },
  { key: "booking_completed", label: "Booking Completed", icon: CheckCircle },
] as const;

interface FunnelStage {
  key: string;
  label: string;
  count: number;
  icon: typeof Search;
}

interface ConversionFunnelProps {
  events: Array<{ event: string; timestamp: string; [key: string]: any }>;
  className?: string;
}

export function ConversionFunnel({ events, className }: ConversionFunnelProps) {
  // Calculate funnel stats
  const funnelStats = useMemo(() => {
    return FUNNEL_STAGES.map((stage) => ({
      ...stage,
      count: events.filter((e) => e.event === stage.key).length,
    }));
  }, [events]);

  // Find max count for scaling
  const maxCount = Math.max(...funnelStats.map((s) => s.count), 1);

  // Calculate conversion and drop-off rates
  const stagesWithRates = useMemo(() => {
    return funnelStats.map((stage, idx) => {
      const prevCount = idx === 0 ? stage.count : funnelStats[idx - 1].count;
      const conversionRate = prevCount > 0 ? (stage.count / prevCount) * 100 : 0;
      const dropOffRate = prevCount > 0 ? 100 - conversionRate : 0;
      const isHighDropOff = dropOffRate > 30 && idx > 0;
      
      return {
        ...stage,
        conversionRate,
        dropOffRate,
        isHighDropOff,
        widthPercent: (stage.count / maxCount) * 100,
      };
    });
  }, [funnelStats, maxCount]);

  // Overall conversion rate (first stage to last)
  const overallConversion = useMemo(() => {
    const first = funnelStats[0]?.count || 0;
    const last = funnelStats[funnelStats.length - 1]?.count || 0;
    return first > 0 ? (last / first) * 100 : 0;
  }, [funnelStats]);

  if (events.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conversion Funnel</CardTitle>
          <CardDescription>Step-by-step conversion rates and drop-off points</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No funnel data available</p>
            <p className="text-xs mt-1">Analytics events will appear here once customers start browsing</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Conversion Funnel</CardTitle>
            <CardDescription>Step-by-step conversion rates and drop-off points</CardDescription>
          </div>
          <Badge variant="outline" className="font-mono">
            {overallConversion.toFixed(1)}% overall
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        {stagesWithRates.map((stage, idx) => {
          const Icon = stage.icon;
          const isFirst = idx === 0;
          const barColor = stage.isHighDropOff 
            ? "bg-red-400" 
            : "bg-primary";
          
          return (
            <div key={stage.key} className="relative">
              {/* Connector line */}
              {!isFirst && (
                <div className="absolute left-4 -top-2 w-px h-4 bg-border" />
              )}
              
              <div className="flex items-center gap-4 py-3">
                {/* Step number */}
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                  {idx + 1}
                </div>

                {/* Stage info and bar */}
                <div className="flex-1 min-w-0">
                  {/* Label row */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{stage.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {stage.count} users
                      </span>
                      {!isFirst && (
                        <>
                          <span className="text-green-600 font-medium">
                            {stage.conversionRate.toFixed(1)}% converted
                          </span>
                          <span className={cn(
                            "font-medium",
                            stage.isHighDropOff ? "text-red-500" : "text-orange-500"
                          )}>
                            {stage.dropOffRate.toFixed(1)}% dropped
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-6 bg-muted/50 rounded overflow-hidden">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded transition-all duration-500",
                        barColor
                      )}
                      style={{ width: `${stage.widthPercent}%` }}
                    />
                  </div>

                  {/* High drop-off badge */}
                  {stage.isHighDropOff && (
                    <Badge 
                      variant="destructive" 
                      className="mt-1.5 text-[10px] px-1.5 py-0"
                    >
                      High drop-off
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
