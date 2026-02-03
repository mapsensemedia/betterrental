/**
 * StepEnRoute - Delivery-specific step for tracking driver in transit
 * Replaces the standard check-in step for delivery bookings
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Navigation,
  Phone,
  MessageSquare,
  User,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DELIVERY_STATUS_MAP } from "@/lib/ops-steps";
import { format } from "date-fns";

interface StepEnRouteProps {
  booking: {
    id: string;
    pickup_address?: string | null;
    assigned_driver_id?: string | null;
    start_at: string;
    profiles?: {
      full_name?: string | null;
      phone?: string | null;
    } | null;
    delivery_statuses?: {
      status: string;
      updated_at?: string;
      location_lat?: number | null;
      location_lng?: number | null;
      notes?: string | null;
    } | null;
  };
  driverInfo?: {
    fullName: string;
    phone?: string | null;
  } | null;
  completion: {
    driverEnRoute?: boolean;
    driverArrived?: boolean;
    govIdVerified: boolean;
    licenseOnFile: boolean;
    nameMatches: boolean;
    licenseNotExpired: boolean;
    ageVerified: boolean;
  };
}

export function StepEnRoute({ booking, driverInfo, completion }: StepEnRouteProps) {
  const deliveryStatus = booking.delivery_statuses?.status || "assigned";
  const statusInfo = DELIVERY_STATUS_MAP[deliveryStatus] || DELIVERY_STATUS_MAP.assigned;
  
  const isEnRoute = deliveryStatus === "en_route" || deliveryStatus === "picked_up";
  const hasArrived = deliveryStatus === "delivered";
  
  const handleCallDriver = () => {
    if (driverInfo?.phone) {
      window.location.href = `tel:${driverInfo.phone}`;
    }
  };
  
  const handleCallCustomer = () => {
    if (booking.profiles?.phone) {
      window.location.href = `tel:${booking.profiles.phone}`;
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Delivery Status Tracking Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Delivery Status</CardTitle>
            </div>
            <Badge className={cn("text-xs", statusInfo.color)}>
              {statusInfo.label}
            </Badge>
          </div>
          <CardDescription>
            Track driver progress and customer arrival
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Delivery Progress Timeline */}
          <div className="space-y-3">
            <DeliveryStep 
              icon={<Navigation className="h-4 w-4" />}
              label="Vehicle Dispatched"
              description="Driver has left with the vehicle"
              complete={isEnRoute || hasArrived}
              active={deliveryStatus === "picked_up"}
            />
            <DeliveryStep 
              icon={<Truck className="h-4 w-4" />}
              label="En Route to Customer"
              description="Driver is on the way to delivery address"
              complete={deliveryStatus === "en_route" || hasArrived}
              active={deliveryStatus === "en_route"}
            />
            <DeliveryStep 
              icon={<MapPin className="h-4 w-4" />}
              label="Arrived at Destination"
              description="Driver has arrived at the delivery location"
              complete={hasArrived}
              active={hasArrived}
            />
          </div>
          
          {/* Last Update Time */}
          {booking.delivery_statuses?.updated_at && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last updated: {format(new Date(booking.delivery_statuses.updated_at), "PP p")}
            </p>
          )}
          
          {/* Driver Notes */}
          {booking.delivery_statuses?.notes && (
            <Alert className="bg-muted/50">
              <AlertDescription className="text-xs">
                <strong>Driver Note:</strong> {booking.delivery_statuses.notes}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Driver & Customer Contact */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Quick Contacts</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Driver Contact */}
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Driver</p>
              <p className="font-medium text-sm mb-2">
                {driverInfo?.fullName || "Not assigned"}
              </p>
              {driverInfo?.phone && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2 h-8 text-xs"
                  onClick={handleCallDriver}
                >
                  <Phone className="h-3 w-3" />
                  Call Driver
                </Button>
              )}
            </div>
            
            {/* Customer Contact */}
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Customer</p>
              <p className="font-medium text-sm mb-2">
                {booking.profiles?.full_name || "Unknown"}
              </p>
              {booking.profiles?.phone && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2 h-8 text-xs"
                  onClick={handleCallCustomer}
                >
                  <Phone className="h-3 w-3" />
                  Call Customer
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Delivery Address Reminder */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Delivery Address</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{booking.pickup_address}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Scheduled for: {format(new Date(booking.start_at), "PP p")}
          </p>
        </CardContent>
      </Card>
      
      {/* Open in Delivery Portal */}
      <div className="pt-2">
        <Button
          variant="outline"
          className="w-full gap-2"
          asChild
        >
          <Link to={`/delivery/${booking.id}`} target="_blank">
            <ExternalLink className="h-4 w-4" />
            Open in Delivery Portal
          </Link>
        </Button>
      </div>
      
      {/* Notice about on-site verification */}
      {!hasArrived && (
        <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">On-Site Verification Required</AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-500">
            Customer ID and license verification will be performed by the driver at the delivery location. 
            The remaining steps (payment, agreement, walkaround) should be completed on-site.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface DeliveryStepProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  complete: boolean;
  active: boolean;
}

function DeliveryStep({ icon, label, description, complete, active }: DeliveryStepProps) {
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg transition-colors",
      complete && "bg-emerald-50 dark:bg-emerald-950/20",
      active && !complete && "bg-blue-50 dark:bg-blue-950/20",
      !complete && !active && "opacity-50"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
        complete && "bg-emerald-500 text-white",
        active && !complete && "bg-blue-500 text-white",
        !complete && !active && "bg-muted text-muted-foreground"
      )}>
        {complete ? <CheckCircle2 className="h-4 w-4" /> : icon}
      </div>
      <div>
        <p className={cn(
          "font-medium text-sm",
          complete && "text-emerald-700 dark:text-emerald-400",
          active && !complete && "text-blue-700 dark:text-blue-400"
        )}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
