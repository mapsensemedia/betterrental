import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { StepProgress } from "./DeliverySteps";
import { CompactUnitInfo } from "./DeliveryUnitInfo";
import { 
  MapPin, 
  Phone, 
  Clock, 
  Car, 
  ChevronRight, 
  Navigation, 
  Building2,
  AlertTriangle,
  Hand 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeliveryBooking } from "../api/types";

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface DeliveryCardProps {
  delivery: DeliveryBooking;
  showClaimButton?: boolean;
  onClaim?: () => void;
  claimLoading?: boolean;
  className?: string;
}

export function DeliveryCard({
  delivery,
  showClaimButton,
  onClaim,
  claimLoading,
  className,
}: DeliveryCardProps) {
  const pickupTime = new Date(delivery.startAt);
  const isToday = new Date().toDateString() === pickupTime.toDateString();
  const isUnassigned = delivery.deliveryStatus === 'unassigned';
  
  const handleNavigate = () => {
    if (delivery.pickupLat && delivery.pickupLng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${delivery.pickupLat},${delivery.pickupLng}`,
        "_blank"
      );
    } else if (delivery.pickupAddress) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.pickupAddress)}`,
        "_blank"
      );
    }
  };

  return (
    <Card className={cn(
      "hover:shadow-md transition-shadow",
      delivery.isUrgent && 'border-amber-400 border-2',
      isUnassigned && 'border-orange-300 bg-orange-50/30',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold">
                {delivery.bookingCode}
              </CardTitle>
              {delivery.isUrgent && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  Urgent
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {delivery.customer?.fullName || "Unknown Customer"}
            </p>
          </div>
          <StatusBadge status={delivery.deliveryStatus} />
        </div>

        {/* Step progress indicator */}
        {delivery.deliveryStatus && delivery.deliveryStatus !== 'unassigned' && (
          <StepProgress 
            currentStatus={delivery.deliveryStatus} 
            className="mt-3" 
          />
        )}

        {/* Assigned Driver Info */}
        {delivery.assignedDriverName && !isUnassigned && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t mt-2">
            <span className="font-medium">Driver:</span>
            <span>{delivery.assignedDriverName}</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Vehicle Category & Unit */}
        {delivery.category && (
          <div className="flex items-center gap-2 text-sm">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{delivery.category.name}</span>
          </div>
        )}

        {/* Assigned Unit Info (VIN, plate, color, mileage) */}
        {delivery.assignedUnit && (
          <CompactUnitInfo unit={delivery.assignedUnit} className="pl-6" />
        )}

        {/* Pickup Time */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={cn(
            delivery.isUrgent && "font-bold text-amber-600",
            isToday && !delivery.isUrgent && "font-medium text-primary"
          )}>
            {isToday ? "Today" : format(pickupTime, "EEE, MMM d")} at {format(pickupTime, "h:mm a")}
          </span>
        </div>

        {/* Dispatch Location */}
        {delivery.dispatchLocation && (
          <div className="flex items-start gap-2 text-sm bg-muted/50 p-2 rounded-md">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Pick up from:</p>
              <p className="font-medium">{delivery.dispatchLocation.name}</p>
            </div>
          </div>
        )}

        {/* Delivery Address */}
        {delivery.pickupAddress && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Deliver to:</p>
              <span className="line-clamp-2">{delivery.pickupAddress}</span>
            </div>
          </div>
        )}

        {/* Customer Contact */}
        {delivery.pickupContactPhone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a 
              href={`tel:${delivery.pickupContactPhone}`}
              className="text-primary hover:underline"
            >
              {delivery.pickupContactPhone}
            </a>
          </div>
        )}

        {/* Special Instructions */}
        {delivery.specialInstructions && (
          <div className="text-sm p-2 bg-amber-50 border border-amber-200 rounded-md">
            <p className="font-medium text-amber-800 text-xs mb-1">Special Instructions:</p>
            <p className="text-amber-900">{delivery.specialInstructions}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {/* Claim Button */}
          {showClaimButton && onClaim && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={onClaim}
              disabled={claimLoading}
            >
              <Hand className="h-4 w-4 mr-1" />
              {claimLoading ? "Claiming…" : "Claim"}
            </Button>
          )}
          
          {/* Navigate Button (only for assigned deliveries) */}
          {!showClaimButton && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleNavigate}
              disabled={!delivery.pickupAddress && !delivery.pickupLat}
            >
              <Navigation className="h-4 w-4 mr-1" />
              Navigate
            </Button>
          )}
          
          {/* Details Button */}
          <Button 
            variant={showClaimButton ? "outline" : "default"} 
            size="sm" 
            className="flex-1" 
            asChild
          >
            <Link to={`/delivery/${delivery.id}`}>
              Details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
