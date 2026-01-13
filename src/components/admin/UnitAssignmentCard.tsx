import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car,
  Hash,
  Gauge,
  Loader2,
  Wand2,
  CheckCircle2,
} from "lucide-react";
import {
  useAvailableUnits,
  useAutoAssignUnit,
  useAssignUnit,
  useBookingAssignedUnit,
} from "@/hooks/use-unit-assignment";

interface UnitAssignmentCardProps {
  bookingId: string;
  vehicleId: string;
  vehicleName: string;
  onAssigned?: () => void;
}

export function UnitAssignmentCard({
  bookingId,
  vehicleId,
  vehicleName,
  onAssigned,
}: UnitAssignmentCardProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  const { data: availableUnits, isLoading: unitsLoading } = useAvailableUnits(vehicleId);
  const { data: assignedUnit, isLoading: assignedLoading } = useBookingAssignedUnit(bookingId);
  const autoAssign = useAutoAssignUnit();
  const manualAssign = useAssignUnit();

  const handleAutoAssign = async () => {
    await autoAssign.mutateAsync({ bookingId, vehicleId });
    onAssigned?.();
  };

  const handleManualAssign = async () => {
    if (!selectedUnitId) return;
    await manualAssign.mutateAsync({ bookingId, unitId: selectedUnitId });
    onAssigned?.();
  };

  const isLoading = unitsLoading || assignedLoading;
  const isPending = autoAssign.isPending || manualAssign.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Already assigned
  if (assignedUnit) {
    return (
      <Card className="border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            VIN Unit Assigned
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-mono font-medium text-sm">{assignedUnit.vin}</p>
              <div className="flex gap-2 text-xs text-muted-foreground">
                {assignedUnit.licensePlate && (
                  <span>{assignedUnit.licensePlate}</span>
                )}
                {assignedUnit.color && (
                  <Badge variant="outline" className="text-xs py-0 h-4">
                    {assignedUnit.color}
                  </Badge>
                )}
              </div>
            </div>
            {assignedUnit.currentMileage && (
              <div className="ml-auto text-right">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Gauge className="w-3 h-3" />
                  {assignedUnit.currentMileage.toLocaleString()} mi
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No units available
  if (!availableUnits || availableUnits.length === 0) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <Hash className="w-4 h-4" />
            No VIN Units Available
          </CardTitle>
          <CardDescription>
            All {vehicleName} units are currently assigned to other bookings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Assign VIN Unit
        </CardTitle>
        <CardDescription>
          {availableUnits.length} unit{availableUnits.length !== 1 ? "s" : ""} available for {vehicleName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            onClick={handleAutoAssign}
            disabled={isPending}
            className="flex-1"
          >
            {autoAssign.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            Auto-Assign
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or select manually
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a unit" />
            </SelectTrigger>
            <SelectContent>
              {availableUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{unit.vin.slice(-8)}</span>
                    {unit.licensePlate && (
                      <Badge variant="outline" className="text-xs py-0">
                        {unit.licensePlate}
                      </Badge>
                    )}
                    {unit.color && (
                      <span className="text-xs text-muted-foreground">
                        {unit.color}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleManualAssign}
            disabled={!selectedUnitId || isPending}
            variant="outline"
          >
            {manualAssign.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Assign"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
