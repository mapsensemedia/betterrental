import { useParams, useNavigate } from "react-router-dom";
import { DeliveryShell } from "@/components/delivery/DeliveryShell";
import { DeliveryStatusBadge } from "@/components/delivery/DeliveryStatusBadge";
import { DeliveryHandoverCapture } from "@/components/delivery/DeliveryHandoverCapture";
import { RentalAgreementSign } from "@/components/booking/RentalAgreementSign";
import { useDeliveryById, type DeliveryStatus } from "@/hooks/use-my-deliveries";
import { useRealtimeDeliveryStatuses } from "@/hooks/use-realtime-subscriptions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Car,
  User,
  Navigation,
  Building,
  MessageSquare,
  FileText,
} from "lucide-react";

export default function DeliveryDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { data: delivery, isLoading, error, refetch } = useDeliveryById(bookingId);
  
  // Subscribe to real-time delivery status updates
  useRealtimeDeliveryStatuses(bookingId);

  const handleNavigate = () => {
    if (delivery?.pickup_lat && delivery?.pickup_lng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${delivery.pickup_lat},${delivery.pickup_lng}`,
        "_blank"
      );
    } else if (delivery?.pickup_address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.pickup_address)}`,
        "_blank"
      );
    }
  };

  const handleCall = () => {
    if (delivery?.pickup_contact_phone) {
      window.open(`tel:${delivery.pickup_contact_phone}`, "_self");
    }
  };

  if (isLoading) {
    return (
      <DeliveryShell>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DeliveryShell>
    );
  }

  if (error || !delivery) {
    return (
      <DeliveryShell>
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load delivery details</p>
          <Button variant="outline" onClick={() => navigate("/delivery")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deliveries
          </Button>
        </div>
      </DeliveryShell>
    );
  }

  const currentStatus = (delivery.currentStatus || "assigned") as DeliveryStatus;
  const categoryData = delivery.category;
  const unitData = delivery.assignedUnit;
  const locationData = Array.isArray(delivery.locations) ? delivery.locations[0] : delivery.locations;

  return (
    <DeliveryShell>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/delivery")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{delivery.booking_code}</h1>
              <p className="text-sm text-muted-foreground">Delivery Details</p>
            </div>
          </div>
          <DeliveryStatusBadge status={currentStatus} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto py-3"
            onClick={handleNavigate}
            disabled={!delivery.pickup_address && !delivery.pickup_lat}
          >
            <Navigation className="h-5 w-5 mr-2" />
            Navigate
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3"
            onClick={handleCall}
            disabled={!delivery.pickup_contact_phone}
          >
            <Phone className="h-5 w-5 mr-2" />
            Call Customer
          </Button>
        </div>

        {/* Delivery Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {delivery.pickup_address ? (
              <p className="text-base">{delivery.pickup_address}</p>
            ) : (
              <div className="flex items-start gap-2">
                <Building className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{locationData?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {locationData?.address}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(new Date(delivery.start_at), "EEEE, MMMM d")} at{" "}
                {format(new Date(delivery.start_at), "h:mm a")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                {delivery.pickup_contact_name || delivery.customer?.full_name || "Unknown"}
              </span>
            </div>

            {(delivery.pickup_contact_phone || delivery.customer?.phone) && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${delivery.pickup_contact_phone || delivery.customer?.phone}`}
                  className="text-primary hover:underline"
                >
                  {delivery.pickup_contact_phone || delivery.customer?.phone}
                </a>
              </div>
            )}

            {delivery.customer?.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{delivery.customer.email}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {categoryData?.image_url && (
                <img
                  src={categoryData.image_url}
                  alt="Vehicle"
                  className="w-24 h-16 object-cover rounded-lg"
                />
              )}
              <div>
                <p className="font-medium">{categoryData?.name || "Unknown Vehicle"}</p>
                {unitData?.licensePlate && (
                  <p className="text-sm text-muted-foreground font-mono">{unitData.licensePlate}</p>
                )}
                {unitData?.color && (
                  <p className="text-xs text-muted-foreground">Color: {unitData.color}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Special Instructions */}
        {delivery.special_instructions && (
          <Card className="border-warning/30 bg-warning/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-warning-foreground">
                <MessageSquare className="h-5 w-5" />
                Special Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{delivery.special_instructions}</p>
            </CardContent>
          </Card>
        )}

        {/* Rental Agreement - For driver to obtain customer signature on delivery */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Rental Agreement
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 pb-4">
              <RentalAgreementSign bookingId={delivery.id} />
            </div>
          </CardContent>
        </Card>

        {/* Status Update */}
        <DeliveryHandoverCapture
          bookingId={delivery.id}
          currentStatus={currentStatus}
          onComplete={() => refetch()}
        />

        {/* Status History */}
        {delivery.statusHistory && delivery.statusHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {delivery.statusHistory.map((status: any, index: number) => (
                  <div key={status.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <DeliveryStatusBadge status={status.status as DeliveryStatus} />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(status.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      {status.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {status.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DeliveryShell>
  );
}
