import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeliveryStatusBadge } from "./DeliveryStatusBadge";
import { 
  MapPin, 
  Phone, 
  Clock, 
  Car, 
  ChevronRight, 
  Navigation, 
  Building2,
  Mail,
  AlertTriangle,
  UserPlus 
} from "lucide-react";
import type { DeliveryBooking } from "@/hooks/use-my-deliveries";

interface DeliveryCardProps {
  delivery: DeliveryBooking;
  showAssignButton?: boolean;
  onAssignDriver?: () => void;
}

export function DeliveryCard({ delivery, showAssignButton, onAssignDriver }: DeliveryCardProps) {
  const pickupTime = new Date(delivery.startAt);
  const isToday = new Date().toDateString() === pickupTime.toDateString();
  
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
    <Card className={`hover:shadow-md transition-shadow ${delivery.isUrgent ? 'border-amber-400 border-2' : ''} ${delivery.deliveryStatus === 'unassigned' ? 'border-orange-300 bg-orange-50/30' : ''}`}>
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
          <DeliveryStatusBadge status={delivery.deliveryStatus || "unassigned"} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Vehicle Category */}
        {delivery.category && (
          <div className="flex items-center gap-2 text-sm">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{delivery.category.name}</span>
            {delivery.assignedUnit?.licensePlate && (
              <Badge variant="outline" className="ml-auto text-xs font-mono">
                {delivery.assignedUnit.licensePlate}
              </Badge>
            )}
          </div>
        )}

        {/* Assigned Unit Color */}
        {delivery.assignedUnit?.color && (
          <div className="text-xs text-muted-foreground pl-6">
            Color: {delivery.assignedUnit.color}
          </div>
        )}

        {/* Pickup Time */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={delivery.isUrgent ? "font-bold text-amber-600" : isToday ? "font-medium text-primary" : ""}>
            {isToday ? "Today" : format(pickupTime, "EEE, MMM d")} at {format(pickupTime, "h:mm a")}
          </span>
        </div>

        {/* Dispatch Location (Pick up from) */}
        {delivery.dispatchLocation && (
          <div className="flex items-start gap-2 text-sm bg-muted/50 p-2 rounded-md">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Pick up vehicle from:</p>
              <p className="font-medium">{delivery.dispatchLocation.name}</p>
              <p className="text-xs text-muted-foreground">{delivery.dispatchLocation.address}</p>
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
        <div className="flex flex-col gap-1">
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
          {delivery.customer?.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`mailto:${delivery.customer.email}`}
                className="text-primary hover:underline truncate"
              >
                {delivery.customer.email}
              </a>
            </div>
          )}
        </div>

        {/* Special Instructions */}
        {delivery.specialInstructions && (
          <div className="text-sm p-2 bg-warning/10 border border-warning/30 rounded-md">
            <p className="font-medium text-warning-foreground text-xs mb-1">Special Instructions:</p>
            <p className="text-foreground">{delivery.specialInstructions}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {/* Assign Driver Button for unassigned deliveries */}
          {showAssignButton && onAssignDriver && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={onAssignDriver}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Assign Driver
            </Button>
          )}
          
          {/* Only show navigate for assigned deliveries */}
          {!showAssignButton && (
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
          
          <Button variant={showAssignButton ? "outline" : "default"} size="sm" className="flex-1" asChild>
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
