/**
 * StepIntake - Review booking details, verify customer info, assign vehicle, confirm delivery window
 * First step in the Ops delivery pipeline
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  User,
  Car,
  MapPin,
  Calendar,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { displayName } from "@/lib/format-customer";
import { useCompleteDeliveryStage } from "@/hooks/use-delivery-task";

interface StepIntakeProps {
  booking: any;
  isComplete: boolean;
  onStepComplete?: () => void;
}

export function StepIntake({ booking, isComplete, onStepComplete }: StepIntakeProps) {
  const { completeStage, isPending } = useCompleteDeliveryStage();

  const handleComplete = async () => {
    try {
      await completeStage(booking.id, "intake");
      onStepComplete?.();
    } catch {
      // Error handled in hook
    }
  };

  const customerName = displayName(booking.profiles?.full_name);
  const customerEmail = booking.profiles?.email;
  const customerPhone = booking.profiles?.phone;
  const vehicleName = booking.vehicle_categories?.name || booking.vehicles?.name || "Vehicle";

  return (
    <div className="space-y-4">
      {/* Booking Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Booking Review
            </CardTitle>
            {isComplete && (
              <Badge className="bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Reviewed
              </Badge>
            )}
          </div>
          <CardDescription>
            Review all booking details before proceeding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Customer
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>{" "}
                <span className="font-medium">{customerName}</span>
              </div>
              {customerEmail && (
                <div>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span>{customerEmail}</span>
                </div>
              )}
              {customerPhone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span>{customerPhone}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Vehicle */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Car className="w-4 h-4 text-muted-foreground" />
              Vehicle
            </h4>
            <p className="text-sm">{vehicleName}</p>
            {booking.assigned_unit_id && (
              <Badge variant="outline" className="text-xs">
                VIN Assigned
              </Badge>
            )}
          </div>

          <Separator />

          {/* Dates */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Rental Period
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Pickup:</span>{" "}
                {format(new Date(booking.start_at), "MMM d, h:mm a")}
              </div>
              <div>
                <span className="text-muted-foreground">Return:</span>{" "}
                {format(new Date(booking.end_at), "MMM d, h:mm a")}
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>{" "}
                {booking.total_days} day{booking.total_days !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <Separator />

          {/* Delivery Address */}
          {booking.pickup_address && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Delivery Address
              </h4>
              <p className="text-sm">{booking.pickup_address}</p>
              {booking.special_instructions && (
                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-sm text-amber-800 dark:text-amber-300">
                  <strong>Instructions:</strong> {booking.special_instructions}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete Intake Button */}
      {!isComplete && (
        <Button
          className="w-full"
          size="lg"
          onClick={handleComplete}
          disabled={isPending}
        >
          {isPending ? "Completing..." : "Mark Intake Complete"}
        </Button>
      )}
    </div>
  );
}
