/**
 * DeliveryModeBanner - Visual indicator for delivery bookings in BookingOps
 * Shows delivery address, assigned driver, and link to Delivery Portal
 */
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Truck, 
  MapPin, 
  User, 
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DELIVERY_STATUS_MAP } from "@/lib/ops-steps";

interface DeliveryModeBannerProps {
  booking: {
    id: string;
    pickup_address?: string | null;
    assigned_driver_id?: string | null;
    locations?: { name?: string; address?: string } | null;
    delivery_statuses?: { status: string } | null;
  };
  driverName?: string | null;
  className?: string;
}

export function DeliveryModeBanner({ booking, driverName, className }: DeliveryModeBannerProps) {
  if (!booking.pickup_address) return null;
  
  const deliveryStatus = booking.delivery_statuses?.status || "unassigned";
  const statusInfo = DELIVERY_STATUS_MAP[deliveryStatus] || DELIVERY_STATUS_MAP.unassigned;
  const isDriverAssigned = !!booking.assigned_driver_id;
  
  return (
    <Alert className={cn(
      "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30",
      className
    )}>
      <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
        Delivery Booking
        <Badge className={cn("text-[10px]", statusInfo.color)}>
          {statusInfo.label}
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        {/* Delivery Address */}
        <div className="flex items-start gap-2">
          <MapPin className="h-3.5 w-3.5 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Deliver To</p>
            <p className="text-sm font-medium text-foreground">{booking.pickup_address}</p>
          </div>
        </div>
        
        {/* Dispatch Hub */}
        {booking.locations?.name && (
          <div className="flex items-start gap-2">
            <Building2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Dispatched From</p>
              <p className="text-sm text-foreground">{booking.locations.name}</p>
            </div>
          </div>
        )}
        
        {/* Driver Assignment - informational only */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            {isDriverAssigned ? (
              <span className="text-sm">
                <span className="text-muted-foreground">Driver:</span>{" "}
                <span className="font-medium">{driverName || "Assigned"}</span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                No driver assigned yet
              </span>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
