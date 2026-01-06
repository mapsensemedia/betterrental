/**
 * DeliveryPricingDisplay - Shows delivery fee, distance, and ETA below the map
 */
import { DollarSign, Target, Clock } from "lucide-react";
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
    <div className={cn("space-y-4", className)}>
      {/* Pricing Cards */}
      <div className="bg-muted/50 rounded-xl p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          {/* Delivery Fee */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <DollarSign className="w-5 h-5 text-destructive" />
            </div>
            <span className="text-xs text-muted-foreground">Delivery Fee</span>
            <span className="text-xl font-bold">
              {fee === 0 ? "Free" : `$${fee}`}
            </span>
          </div>

          {/* Distance */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <Target className="w-5 h-5 text-destructive" />
            </div>
            <span className="text-xs text-muted-foreground">Distance</span>
            <span className="text-xl font-bold">
              {distanceKm !== null ? `${distanceKm.toFixed(1)} km` : "--"}
            </span>
          </div>

          {/* ETA */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-destructive" />
            </div>
            <span className="text-xs text-muted-foreground">Est. Delivery</span>
            <span className="text-xl font-bold">
              {etaMinutes ? `${etaMinutes} mins` : eta || "--"}
            </span>
          </div>
        </div>

        {/* Fee Brackets */}
        <div className="mt-4 text-center text-xs text-muted-foreground">
          Free (≤5km) • $29 (5-20km) • $49 (21-30km) • $99 (31-50km)
        </div>
      </div>
    </div>
  );
}
