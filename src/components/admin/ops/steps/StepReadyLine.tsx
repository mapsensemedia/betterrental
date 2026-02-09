/**
 * StepReadyLine - Enforce mandatory prep checklist + photos + fuel/odometer + maintenance
 * Only shows for delivery bookings in the Ops panel
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VehiclePrepChecklist } from "@/components/admin/VehiclePrepChecklist";
import { PreInspectionPhotos } from "@/components/admin/PreInspectionPhotos";
import { UnitAssignmentCard } from "@/components/admin/UnitAssignmentCard";
import {
  CheckCircle2,
  XCircle,
  Wrench,
  Camera,
  Gauge,
  Fuel,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLockPricing } from "@/hooks/use-delivery-task";

interface StepReadyLineProps {
  bookingId: string;
  vehicleId?: string;
  vehicleName?: string;
  completion: {
    unitAssigned: boolean;
    checklistComplete: boolean;
    photosComplete: boolean;
    fuelRecorded: boolean;
    odometerRecorded: boolean;
    pricingLocked: boolean;
  };
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

export function StepReadyLine({
  bookingId,
  vehicleId,
  vehicleName,
  completion,
}: StepReadyLineProps) {
  const lockPricing = useLockPricing();

  const readyItems = [
    { label: "Vehicle Unit (VIN) Assigned", done: completion.unitAssigned, icon: ClipboardCheck },
    { label: "Prep Checklist Complete", done: completion.checklistComplete, icon: Wrench },
    { label: "Pre-Delivery Photos", done: completion.photosComplete, icon: Camera },
    { label: "Fuel Level Recorded", done: completion.fuelRecorded, icon: Fuel },
    { label: "Odometer Recorded", done: completion.odometerRecorded, icon: Gauge },
    { label: "Pricing Locked", done: completion.pricingLocked, icon: ClipboardCheck },
  ];

  const allReady = readyItems.every(i => i.done);

  return (
    <div className="space-y-4">
      {/* Ready Line Status Overview */}
      <Card className={allReady ? "border-emerald-200 dark:border-emerald-900" : undefined}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
              Ready Line Checklist
            </CardTitle>
            <Badge className={allReady
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-amber-500/10 text-amber-600"
            }>
              {readyItems.filter(i => i.done).length}/{readyItems.length}
            </Badge>
          </div>
          <CardDescription>
            All items must be complete before the vehicle can be dispatched
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {readyItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg text-sm",
                    item.done ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-muted"
                  )}
                >
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={item.done ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* VIN Assignment */}
      {vehicleId && (
        <UnitAssignmentCard
          bookingId={bookingId}
          vehicleId={vehicleId}
          vehicleName={vehicleName || "Vehicle"}
        />
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
              <CardTitle className="text-base">Pre-Delivery Photos</CardTitle>
            </div>
            <StatusIndicator complete={completion.photosComplete} />
          </div>
        </CardHeader>
        <CardContent>
          <PreInspectionPhotos bookingId={bookingId} />
        </CardContent>
      </Card>

      {/* Lock Pricing */}
      {!completion.pricingLocked && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lock Pricing Snapshot</CardTitle>
            <CardDescription>
              Freeze the current protection plan, add-ons, and totals so pricing cannot drift
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => lockPricing.mutate(bookingId)}
              disabled={lockPricing.isPending}
            >
              {lockPricing.isPending ? "Locking..." : "Lock Pricing Now"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
