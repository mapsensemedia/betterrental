import { useParams, useNavigate } from "react-router-dom";
import { DeliveryShell } from "@/components/delivery/DeliveryShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Building2,
  Navigation,
  FileText,
  ClipboardCheck,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

// New feature imports
import {
  useDeliveryDetail,
  useHandoverChecklist,
  useRealtimeDeliveryDetail,
  StatusBadge,
  DeliverySteps,
  DeliveryUnitInfo,
  DeliveryActions,
  HandoverChecklist,
} from "@/features/delivery";

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY DETAIL PAGE (REBUILT)
// ─────────────────────────────────────────────────────────────────────────────

export default function DeliveryDetail() {
  const { id: bookingId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Setup realtime subscription for this specific booking
  useRealtimeDeliveryDetail(bookingId);

  // Fetch delivery detail
  const { data: delivery, isLoading, error } = useDeliveryDetail(bookingId);

  // Calculate checklist state
  const checklist = useHandoverChecklist(delivery);

  if (isLoading) {
    return (
      <DeliveryShell>
        <DeliveryDetailSkeleton />
      </DeliveryShell>
    );
  }

  if (error || !delivery) {
    return (
      <DeliveryShell>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-lg font-medium mb-2">Delivery Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This delivery may have been cancelled or doesn't exist.
          </p>
          <Button variant="outline" onClick={() => navigate("/delivery")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deliveries
          </Button>
        </div>
      </DeliveryShell>
    );
  }

  const isToday = new Date(delivery.startAt).toDateString() === new Date().toDateString();

  return (
    <DeliveryShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/delivery")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{delivery.bookingCode}</h1>
              <StatusBadge status={delivery.deliveryStatus} showIcon />
            </div>
            <p className="text-sm text-muted-foreground">
              {delivery.customer?.fullName || "Customer"}
            </p>
          </div>
        </div>

        {/* Step Progress Indicator */}
        <Card>
          <CardContent className="py-6">
            <DeliverySteps currentStatus={delivery.deliveryStatus} />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <DeliveryActions 
          bookingId={delivery.id}
          currentStatus={delivery.deliveryStatus}
          onComplete={() => navigate("/delivery")}
        />

        {/* Delivery Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Delivery Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn(
              "text-lg font-medium",
              delivery.isUrgent && "text-amber-600",
              isToday && !delivery.isUrgent && "text-primary"
            )}>
              {isToday ? "Today" : format(new Date(delivery.startAt), "EEEE, MMMM d")}
              {" at "}
              {format(new Date(delivery.startAt), "h:mm a")}
            </p>
            {delivery.isUrgent && (
              <p className="text-sm text-amber-600 mt-1">⚠️ Urgent delivery</p>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Unit Information */}
        <DeliveryUnitInfo 
          unit={delivery.assignedUnit}
          vehicleName={delivery.category?.name}
        />

        {/* Dispatch Location */}
        {delivery.dispatchLocation && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Pick Up Vehicle From
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{delivery.dispatchLocation.name}</p>
              <p className="text-sm text-muted-foreground">{delivery.dispatchLocation.address}</p>
            </CardContent>
          </Card>
        )}

        {/* Delivery Address */}
        {delivery.pickupAddress && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Deliver To
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{delivery.pickupAddress}</p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  const dest = delivery.pickupLat && delivery.pickupLng
                    ? `${delivery.pickupLat},${delivery.pickupLng}`
                    : encodeURIComponent(delivery.pickupAddress || '');
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, "_blank");
                }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Open in Maps
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Customer Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customer Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-medium">
              {delivery.pickupContactName || delivery.customer?.fullName || "Customer"}
            </p>
            {delivery.pickupContactPhone && (
              <a 
                href={`tel:${delivery.pickupContactPhone}`}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Phone className="h-4 w-4" />
                {delivery.pickupContactPhone}
              </a>
            )}
            {delivery.customer?.email && (
              <a 
                href={`mailto:${delivery.customer.email}`}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Mail className="h-4 w-4" />
                {delivery.customer.email}
              </a>
            )}
          </CardContent>
        </Card>

        {/* Special Instructions */}
        {delivery.specialInstructions && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-amber-800">Special Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-900">{delivery.specialInstructions}</p>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Handover Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Handover Requirements</h2>
          
          <HandoverChecklist checklist={checklist} />

          {/* Agreement & Walkaround Links */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" asChild>
              <Link to={`/booking/${delivery.id}/agreement`}>
                <FileText className="h-4 w-4 mr-2" />
                Agreement
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/booking/${delivery.id}/walkaround`}>
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Walkaround
              </Link>
            </Button>
          </div>
        </div>

        {/* Status History */}
        {delivery.statusHistory && delivery.statusHistory.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Status History</h2>
              <div className="space-y-2">
                {delivery.statusHistory.map((entry) => (
                  <div 
                    key={entry.id}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <StatusBadge status={entry.status} size="sm" />
                    <div className="flex-1 min-w-0">
                      {entry.notes && (
                        <p className="text-sm">{entry.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DeliveryShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function DeliveryDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Steps */}
      <Skeleton className="h-24 w-full rounded-lg" />

      {/* Cards */}
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-32 w-full rounded-lg" />
      ))}
    </div>
  );
}
