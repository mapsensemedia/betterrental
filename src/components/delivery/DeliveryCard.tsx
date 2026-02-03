import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeliveryStatusBadge } from "./DeliveryStatusBadge";
import { MapPin, Phone, Clock, Car, ChevronRight, Navigation } from "lucide-react";
import type { DeliveryBooking } from "@/hooks/use-my-deliveries";

interface DeliveryCardProps {
  delivery: DeliveryBooking;
}

export function DeliveryCard({ delivery }: DeliveryCardProps) {
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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {delivery.bookingCode}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {delivery.customer?.fullName || "Unknown Customer"}
            </p>
          </div>
          <DeliveryStatusBadge status={delivery.deliveryStatus || "assigned"} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Vehicle */}
        {delivery.vehicle && (
          <div className="flex items-center gap-2 text-sm">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span>
              {delivery.vehicle.year} {delivery.vehicle.make} {delivery.vehicle.model}
            </span>
          </div>
        )}

        {/* Pickup Time */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={isToday ? "font-medium text-primary" : ""}>
            {isToday ? "Today" : format(pickupTime, "EEE, MMM d")} at {format(pickupTime, "h:mm a")}
          </span>
        </div>

        {/* Address */}
        {delivery.pickupAddress && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span className="line-clamp-2">{delivery.pickupAddress}</span>
          </div>
        )}

        {/* Phone */}
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
          <Button variant="default" size="sm" className="flex-1" asChild>
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
