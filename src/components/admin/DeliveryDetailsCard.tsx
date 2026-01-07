import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, 
  MapPin, 
  DollarSign, 
  Navigation,
  Clock,
  Building,
} from "lucide-react";

interface DeliveryDetailsCardProps {
  pickupAddress: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  locationName?: string | null;
  locationAddress?: string | null;
  /** Delivery fee if applicable */
  deliveryFee?: number | null;
  /** Distance in miles/km */
  deliveryDistance?: number | null;
  /** ETA in minutes */
  deliveryEta?: number | null;
  /** Compact mode for table rows */
  compact?: boolean;
}

export function DeliveryDetailsCard({
  pickupAddress,
  pickupLat,
  pickupLng,
  locationName,
  locationAddress,
  deliveryFee,
  deliveryDistance,
  deliveryEta,
  compact = false,
}: DeliveryDetailsCardProps) {
  // Only show if there's a delivery address (pickup_address indicates delivery mode)
  if (!pickupAddress) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800">
          <Truck className="h-3 w-3 mr-1" />
          Delivery
        </Badge>
        <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={pickupAddress}>
          {pickupAddress}
        </span>
      </div>
    );
  }

  return (
    <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Truck className="h-4 w-4 text-purple-600" />
          <span>Delivery Details</span>
          <Badge className="bg-purple-500 text-white ml-auto">
            Bring Car to Me
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Delivery Address */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-purple-700 dark:text-purple-400">Delivery Address</p>
            <p className="text-muted-foreground">{pickupAddress}</p>
            {pickupLat && pickupLng && (
              <a 
                href={`https://www.google.com/maps?q=${pickupLat},${pickupLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-600 hover:underline mt-1 inline-flex items-center gap-1"
              >
                <Navigation className="h-3 w-3" />
                Open in Maps
              </a>
            )}
          </div>
        </div>

        {/* Closest Pickup Center */}
        {locationName && (
          <div className="flex items-start gap-2">
            <Building className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Closest Pickup Center</p>
              <p className="text-muted-foreground">{locationName}</p>
              {locationAddress && (
                <p className="text-xs text-muted-foreground">{locationAddress}</p>
              )}
            </div>
          </div>
        )}

        {/* Delivery Fee */}
        {deliveryFee != null && deliveryFee > 0 && (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="font-medium">Delivery Fee:</span>
              <span className="text-purple-600 font-semibold">${deliveryFee.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Distance & ETA */}
        {(deliveryDistance || deliveryEta) && (
          <div className="flex items-center gap-4 pt-2 border-t border-purple-200 dark:border-purple-800">
            {deliveryDistance && (
              <div className="flex items-center gap-1 text-xs">
                <Navigation className="h-3 w-3 text-muted-foreground" />
                <span>{deliveryDistance.toFixed(1)} mi</span>
              </div>
            )}
            {deliveryEta && (
              <div className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>~{deliveryEta} min</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact inline badge for delivery mode
 */
export function DeliveryBadge({ hasDelivery }: { hasDelivery: boolean }) {
  if (!hasDelivery) return null;
  
  return (
    <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800">
      <Truck className="h-3 w-3 mr-1" />
      Delivery
    </Badge>
  );
}
