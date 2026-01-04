import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VehiclePrepChecklist } from "@/components/admin/VehiclePrepChecklist";
import { PreInspectionPhotos } from "@/components/admin/PreInspectionPhotos";
import { CheckCircle2, XCircle, Wrench, Camera } from "lucide-react";

interface StepPrepProps {
  bookingId: string;
  completion: {
    checklistComplete: boolean;
    photosComplete: boolean;
  };
}

export function StepPrep({ bookingId, completion }: StepPrepProps) {
  return (
    <div className="space-y-4">
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
            Ensure the vehicle is ready for customer pickup
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
            Capture all required photos before customer pickup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PreInspectionPhotos bookingId={bookingId} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIndicator({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Complete
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
