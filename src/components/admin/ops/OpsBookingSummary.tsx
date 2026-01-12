import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DeliveryDetailsCard } from "@/components/admin/DeliveryDetailsCard";
import { 
  User, 
  Car, 
  MapPin, 
  Calendar, 
  DollarSign,
  Phone,
  Mail,
} from "lucide-react";

interface OpsBookingSummaryProps {
  booking: any;
}

export function OpsBookingSummary({ booking }: OpsBookingSummaryProps) {
  const vehicleName = booking.vehicles 
    ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
    : "No vehicle assigned";
    
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
        Booking Summary
      </h3>
      
      {/* Customer Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">{booking.profiles?.full_name || "Unknown"}</p>
          {booking.profiles?.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{booking.profiles.email}</span>
            </div>
          )}
          {booking.profiles?.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{booking.profiles.phone}</span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Vehicle Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Car className="h-4 w-4" />
            Vehicle
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium">{vehicleName}</p>
          {booking.vehicles?.category && (
            <Badge variant="outline" className="mt-1">
              {booking.vehicles.category}
            </Badge>
          )}
        </CardContent>
      </Card>
      
      {/* Rental Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Rental Period
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pickup</span>
            <span>{format(new Date(booking.start_at), "PPp")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Return</span>
            <span>{format(new Date(booking.end_at), "PPp")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span>{booking.total_days} days</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Delivery Details (if applicable) */}
      <DeliveryDetailsCard
        pickupAddress={booking.pickup_address}
        pickupLat={booking.pickup_lat}
        pickupLng={booking.pickup_lng}
        locationName={booking.locations?.name}
        locationAddress={booking.locations?.address}
        bookingId={booking.id}
        assignedDriverId={booking.assigned_driver_id}
        showDriverAssignment={true}
      />
      
      {/* Location */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {booking.pickup_address ? "Pickup Center" : "Location"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium">{booking.locations?.name || "Unknown"}</p>
          {booking.locations?.address && (
            <p className="text-muted-foreground text-xs mt-1">
              {booking.locations.address}
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Financials */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Daily Rate</span>
            <span>${Number(booking.daily_rate).toFixed(2)}</span>
          </div>
          {Number(booking.young_driver_fee) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Young driver fee</span>
              <span>${Number(booking.young_driver_fee).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${Number(booking.subtotal).toFixed(2)}</span>
          </div>
          {booking.tax_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>${Number(booking.tax_amount).toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${Number(booking.total_amount).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
