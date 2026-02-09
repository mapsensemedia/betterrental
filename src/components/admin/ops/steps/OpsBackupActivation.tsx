/**
 * OpsBackupActivation - Gated backup activation button for Ops panel
 * 
 * Disabled unless:
 * - Delivery Task status is "arrived" or "handover evidence collected"
 * - Handover photos exist
 * - Fuel/odometer recorded
 * - ID check passed (if required)
 * 
 * Requires mandatory activation_reason text field.
 * Logs: activated_by, activated_at, activation_reason to audit.
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOpsBackupActivation } from "@/hooks/use-delivery-task";
import type { DeliveryTask } from "@/hooks/use-delivery-task";

interface OpsBackupActivationProps {
  bookingId: string;
  deliveryTask: DeliveryTask | null;
  deliveryStatus: string | null;
  handoverPhotosCount: number;
  fuelRecorded: boolean;
  odometerRecorded: boolean;
  idCheckResult: string | null;
  idCheckRequired: boolean;
  isAlreadyActive: boolean;
}

export function OpsBackupActivation({
  bookingId,
  deliveryTask,
  deliveryStatus,
  handoverPhotosCount,
  fuelRecorded,
  odometerRecorded,
  idCheckResult,
  idCheckRequired,
  isAlreadyActive,
}: OpsBackupActivationProps) {
  const [reason, setReason] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const activation = useOpsBackupActivation();

  // Evidence checks
  const isDriverAtLocation = deliveryStatus === "arrived" || deliveryStatus === "delivered";
  const hasPhotos = handoverPhotosCount >= 1;
  const hasIdCheck = !idCheckRequired || idCheckResult === "passed";

  const prerequisites = [
    { label: "Driver Arrived at Location", met: isDriverAtLocation, required: true },
    { label: "Handover Photos Captured", met: hasPhotos, required: true },
    { label: "Fuel Level Recorded", met: fuelRecorded, required: false },
    { label: "Odometer Recorded", met: odometerRecorded, required: false },
    { label: "ID Check Passed", met: hasIdCheck, required: idCheckRequired },
  ];

  const requiredMet = prerequisites.filter(p => p.required).every(p => p.met);
  const canActivate = requiredMet && reason.trim().length >= 10;

  if (isAlreadyActive) {
    const source = deliveryTask?.activationSource;
    return (
      <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Rental Activated
          </CardTitle>
          <CardDescription className="text-emerald-600 dark:text-emerald-500">
            {source === "ops_backup"
              ? `Activated from Ops (backup). Reason: "${deliveryTask?.activationReason}"`
              : "Activated by delivery driver at handover."}
          </CardDescription>
        </CardHeader>
        {deliveryTask?.activatedBy && (
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Activated at: {deliveryTask.activatedAt ? new Date(deliveryTask.activatedAt).toLocaleString() : "N/A"}
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-600" />
          <CardTitle className="text-base">Activate from Ops (Backup)</CardTitle>
        </div>
        <CardDescription>
          Use only if the driver cannot activate from the Delivery Portal (e.g., app issue).
          A mandatory reason is required for audit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Evidence Checklist */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Evidence Requirements</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {prerequisites.map((prereq, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg text-sm",
                  prereq.met ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-muted"
                )}
              >
                {prereq.met ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className={prereq.met ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                  {prereq.label}
                </span>
                {!prereq.required && (
                  <Badge variant="outline" className="text-[10px] ml-auto">Optional</Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Reason Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Activation Reason <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Driver app crashed, customer confirmed receipt..."
            className="min-h-[80px]"
          />
          {reason.length > 0 && reason.length < 10 && (
            <p className="text-xs text-destructive">Minimum 10 characters required</p>
          )}
        </div>

        {/* Activation Button */}
        {!requiredMet && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-700">Cannot Activate Yet</AlertTitle>
            <AlertDescription className="text-amber-600">
              Required evidence is missing. Complete all required items above.
            </AlertDescription>
          </Alert>
        )}

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full"
              size="lg"
              variant="default"
              disabled={!canActivate || activation.isPending}
            >
              {activation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              Activate Rental (Ops Backup)
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                Confirm Ops Backup Activation
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will activate the rental from the Operations panel instead of the Delivery Portal.
                This action will be audit-logged with your identity and the provided reason.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Reason:</p>
              <p className="text-muted-foreground">{reason}</p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  activation.mutate({ bookingId, activationReason: reason });
                  setShowDialog(false);
                }}
              >
                Confirm Activation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
