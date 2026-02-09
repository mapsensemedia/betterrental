/**
 * StepDispatch - Assign driver + schedule dispatch window
 * Final step before vehicle leaves depot for delivery
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  Truck,
  User,
  AlertTriangle,
  Loader2,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAvailableDrivers } from "@/hooks/use-available-drivers";
import { useCompleteDeliveryStage } from "@/hooks/use-delivery-task";
import { checkDispatchReadiness, type BookingForDispatchCheck } from "@/lib/dispatch-readiness";

interface StepDispatchProps {
  bookingId: string;
  booking: any;
  driverAssigned: boolean;
  dispatched: boolean;
  assignedDriverId?: string | null;
  prepPhotoCount: number;
  readyLineComplete: boolean;
}

export function StepDispatch({
  bookingId,
  booking,
  driverAssigned,
  dispatched,
  assignedDriverId,
  prepPhotoCount,
  readyLineComplete,
}: StepDispatchProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const queryClient = useQueryClient();
  const { data: drivers, isLoading: driversLoading } = useAvailableDrivers();
  const { completeStage, isPending: stageLoading } = useCompleteDeliveryStage();

  // Check dispatch readiness
  const dispatchCheck = checkDispatchReadiness(
    {
      id: bookingId,
      depositStatus: booking?.deposit_status,
      assignedUnitId: booking?.assigned_unit_id,
      stripeDepositPiId: booking?.stripe_deposit_pi_id,
    } as BookingForDispatchCheck,
    prepPhotoCount
  );

  const assignDriverMutation = useMutation({
    mutationFn: async (driverId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("bookings")
        .update({ assigned_driver_id: driverId })
        .eq("id", bookingId);
      if (error) throw error;

      // Update delivery task
      await supabase
        .from("delivery_tasks")
        .update({ assigned_driver_id: driverId })
        .eq("booking_id", bookingId);

      // Create/update delivery status
      await supabase
        .from("delivery_statuses")
        .upsert({
          booking_id: bookingId,
          status: "assigned",
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "booking_id" });

      // Audit log
      if (user) {
        await supabase.from("audit_logs").insert({
          action: "driver_assigned",
          entity_type: "booking",
          entity_id: bookingId,
          user_id: user.id,
          new_data: { driver_id: driverId },
        });
      }
    },
    onSuccess: () => {
      toast.success("Driver assigned");
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["delivery-task", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["available-drivers"] });
    },
    onError: () => {
      toast.error("Failed to assign driver. Please try again.");
    },
  });

  const handleDispatch = async () => {
    try {
      await completeStage(bookingId, "dispatch");
      toast.success("Vehicle dispatched for delivery!");
    } catch {
      // Error handled in hook
    }
  };

  const currentDriverName = drivers?.find(d => d.id === assignedDriverId)?.fullName;
  const canDispatch = driverAssigned && dispatchCheck.isReady && readyLineComplete;

  return (
    <div className="space-y-4">
      {/* Dispatch Readiness */}
      {!dispatchCheck.isReady && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700">Not Ready for Dispatch</AlertTitle>
          <AlertDescription className="text-amber-600 space-y-1">
            {dispatchCheck.missingRequirements.map((msg, i) => (
              <div key={i}>• {msg}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Driver Assignment */}
      <Card className={driverAssigned ? "border-emerald-200 dark:border-emerald-900" : "border-amber-200 dark:border-amber-900"}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Driver Assignment</CardTitle>
            </div>
            {driverAssigned ? (
              <Badge className="bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Assigned
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <XCircle className="w-3 h-3 mr-1" /> Unassigned
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {driverAssigned && currentDriverName ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
              <User className="h-4 w-4 text-emerald-600" />
              <span className="font-medium">{currentDriverName}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId} disabled={driversLoading}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={driversLoading ? "Loading..." : "Select a driver"} />
                </SelectTrigger>
                <SelectContent>
                  {drivers?.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => assignDriverMutation.mutate(selectedDriverId)}
                disabled={!selectedDriverId || assignDriverMutation.isPending}
              >
                {assignDriverMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Address */}
      {booking?.pickup_address && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Delivery Destination
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{booking.pickup_address}</p>
          </CardContent>
        </Card>
      )}

      {/* Dispatch Button */}
      {!dispatched && (
        <Button
          className="w-full"
          size="lg"
          onClick={handleDispatch}
          disabled={!canDispatch || stageLoading}
        >
          {stageLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Truck className="h-4 w-4 mr-2" />
          )}
          Dispatch Vehicle for Delivery
        </Button>
      )}

      {dispatched && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Vehicle Dispatched</span>
            </div>
            <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
              The vehicle has been dispatched. Track progress in the Delivery Portal.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
