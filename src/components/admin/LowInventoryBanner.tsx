import { useLowInventoryAlerts } from "@/hooks/use-unit-assignment";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Car } from "lucide-react";

interface LowInventoryBannerProps {
  threshold?: number;
}

export function LowInventoryBanner({ threshold = 1 }: LowInventoryBannerProps) {
  const { data: alerts } = useLowInventoryAlerts(threshold);

  if (!alerts || alerts.length === 0) return null;

  const criticalAlerts = alerts.filter((a) => a.availableUnits === 0);
  const warningAlerts = alerts.filter((a) => a.availableUnits > 0);

  return (
    <div className="space-y-2">
      {criticalAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No VIN Units Available</AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap gap-2 mt-2">
              {criticalAlerts.map((alert) => (
                <Badge
                  key={alert.vehicleId}
                  variant="destructive"
                  className="flex items-center gap-1"
                >
                  <Car className="w-3 h-3" />
                  {alert.make} {alert.model} ({alert.bookedUnits}/{alert.totalUnits} assigned)
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {warningAlerts.length > 0 && (
        <Alert className="border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Low VIN Inventory</AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap gap-2 mt-2">
              {warningAlerts.map((alert) => (
                <Badge
                  key={alert.vehicleId}
                  variant="outline"
                  className="border-warning text-warning flex items-center gap-1"
                >
                  <Car className="w-3 h-3" />
                  {alert.make} {alert.model} ({alert.availableUnits} left)
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
