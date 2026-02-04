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
import { VehiclePrepChecklist } from "@/components/admin/VehiclePrepChecklist";
import { PreInspectionPhotos } from "@/components/admin/PreInspectionPhotos";
import { UnitAssignmentCard } from "@/components/admin/UnitAssignmentCard";
import { 
  CheckCircle2, 
  XCircle, 
  Wrench, 
  Camera, 
  Truck,
  User,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAvailableDrivers } from "@/hooks/use-available-drivers";

interface StepPrepProps {
  bookingId: string;
  vehicleId?: string;
  vehicleName?: string;
  completion: {
    checklistComplete: boolean;
    photosComplete: boolean;
    driverAssigned?: boolean;
    unitAssigned?: boolean;
  };
  isDelivery?: boolean;
  assignedDriverId?: string | null;
  onDriverAssigned?: () => void;
}

export function StepPrep({ 
  bookingId, 
  vehicleId,
  vehicleName,
  completion, 
  isDelivery = false,
  assignedDriverId,
  onDriverAssigned,
}: StepPrepProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const queryClient = useQueryClient();
  const { data: drivers, isLoading: driversLoading } = useAvailableDrivers();
  
  const assignDriverMutation = useMutation({
    mutationFn: async (driverId: string) => {
      const { error } = await supabase
        .from("bookings")
        .update({ assigned_driver_id: driverId })
        .eq("id", bookingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Driver assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["available-drivers"] });
      onDriverAssigned?.();
    },
    onError: (error) => {
      toast.error("Failed to assign driver", { description: error.message });
    },
  });
  
  const handleAssignDriver = () => {
    if (selectedDriverId) {
      assignDriverMutation.mutate(selectedDriverId);
    }
  };
  
  const currentDriverName = drivers?.find(d => d.id === assignedDriverId)?.fullName;
  
  return (
    <div className="space-y-4">
      {/* VIN Unit Assignment - For all bookings */}
      {vehicleId && (
        <UnitAssignmentCard
          bookingId={bookingId}
          vehicleId={vehicleId}
          vehicleName={vehicleName || "Vehicle"}
        />
      )}

      {/* Driver Assignment Card - Only for delivery bookings */}
      {isDelivery && (
        <Card className={completion.driverAssigned ? "border-emerald-200 dark:border-emerald-900" : "border-amber-200 dark:border-amber-900"}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Driver Assignment</CardTitle>
              </div>
              <StatusIndicator complete={completion.driverAssigned || false} label="Assigned" />
            </div>
            <CardDescription>
              Assign a driver before dispatching the vehicle
            </CardDescription>
          </CardHeader>
          <CardContent>
            {completion.driverAssigned && currentDriverName ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                <User className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">{currentDriverName}</span>
                <Badge className="ml-auto bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Assigned
                </Badge>
              </div>
            ) : (
              <div className="space-y-3">
                <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-700 dark:text-amber-400">Driver Required</AlertTitle>
                  <AlertDescription className="text-amber-600 dark:text-amber-500">
                    A driver must be assigned before the vehicle can be dispatched for delivery.
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2">
                  <Select 
                    value={selectedDriverId} 
                    onValueChange={setSelectedDriverId}
                    disabled={driversLoading}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={driversLoading ? "Loading drivers..." : "Select a driver"} />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers?.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.fullName}
                        </SelectItem>
                      ))}
                      {(!drivers || drivers.length === 0) && !driversLoading && (
                        <SelectItem value="" disabled>
                          No drivers available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAssignDriver}
                    disabled={!selectedDriverId || assignDriverMutation.isPending}
                  >
                    {assignDriverMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Assign"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Vehicle Prep Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Vehicle Prep Checklist</CardTitle>
            </div>
            <StatusIndicator complete={completion.checklistComplete} />
          </div>
          <CardDescription>
            Ensure the vehicle is ready for {isDelivery ? "dispatch" : "customer pickup"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VehiclePrepChecklist bookingId={bookingId} />
        </CardContent>
      </Card>
      
      {/* Pre-Inspection Photos */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Pre-Inspection Photos</CardTitle>
            </div>
            <StatusIndicator complete={completion.photosComplete} />
          </div>
          <CardDescription>
            Capture all required photos before {isDelivery ? "dispatch" : "customer pickup"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PreInspectionPhotos bookingId={bookingId} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIndicator({ complete, label = "Complete" }: { complete: boolean; label?: string }) {
  if (complete) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <XCircle className="w-3 h-3 mr-1" />
      Incomplete
    </Badge>
  );
}
