/**
 * DeliveryPricingDisplay - Clean, minimal delivery cost breakdown
 */
import { MapPin, Route, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryPricingDisplayProps {
  fee: number;
  distanceKm: number | null;
  eta: string | null;
  className?: string;
}

export function DeliveryPricingDisplay({
  fee,
  distanceKm,
  eta,
  className,
}: DeliveryPricingDisplayProps) {
  // Extract minutes from eta string if available
  const etaMinutes = eta ? eta.replace(/[^0-9]/g, "") : null;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Distance */}
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Distance:</span>
          <span className="text-sm font-medium">
            {distanceKm !== null ? `${distanceKm.toFixed(1)} km` : "--"}
          </span>
        </div>

        {/* ETA */}
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Est. time:</span>
          <span className="text-sm font-medium">
            {etaMinutes ? `${etaMinutes} mins` : eta || "--"}
          </span>
        </div>

        {/* Delivery Fee */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-muted-foreground">Delivery:</span>
          <span className={cn(
            "text-base font-semibold",
            fee === 0 ? "text-success" : "text-foreground"
          )}>
            {fee === 0 ? "Free" : `$${fee}`}
          </span>
        </div>
      </div>

      {/* Fee Brackets */}
      <p className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground text-center">
        Free (≤5km) • $29 (5-20km) • $49 (21-30km) • $99 (31-50km)
      </p>
    </div>
  );
}
