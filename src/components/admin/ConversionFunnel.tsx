/**
 * Conversion Funnel Component
 * Visual representation of booking funnel with drop-off rates
 * Accepts pre-computed stages from the parent (derived from bookings data).
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FunnelStage {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface ConversionFunnelProps {
  stages: FunnelStage[];
  className?: string;
}

export function ConversionFunnel({ stages, className }: ConversionFunnelProps) {
  const maxCount = stages[0]?.count || 1;

  const stagesWithRates = useMemo(() => {
    return stages.map((stage, idx) => {
      const prevCount = idx === 0 ? stage.count : stages[idx - 1].count;
      const conversionRate = prevCount > 0
        ? Math.min(100, Math.max(0, (stage.count / prevCount) * 100))
        : 0;
      const dropOffRate = Math.min(100, Math.max(0, 100 - conversionRate));
      const isHighDropOff = dropOffRate > 30 && idx > 0;

      return {
        ...stage,
        conversionRate,
        dropOffRate,
        isHighDropOff,
        widthPercent: maxCount > 0 ? (stage.count / maxCount) * 100 : 0,
      };
    });
  }, [stages, maxCount]);

  // Overall conversion rate (first stage to last)
  const overallConversion = useMemo(() => {
    const first = stages[0]?.count || 0;
    const last = stages[stages.length - 1]?.count || 0;
    return first > 0 ? (last / first) * 100 : 0;
  }, [stages]);

  if (stages.length === 0 || stages[0].count === 0) {
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
            <p className="text-xs mt-1">Funnel data will appear here once bookings are created</p>
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
            <div key={stage.label} className="relative">
              {!isFirst && (
                <div className="absolute left-4 -top-2 w-px h-4 bg-border" />
              )}

              <div className="flex items-center gap-4 py-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
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

                  <div className="relative h-6 bg-muted/50 rounded overflow-hidden">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded transition-all duration-500",
                        barColor
                      )}
                      style={{ width: `${stage.widthPercent}%` }}
                    />
                  </div>

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
