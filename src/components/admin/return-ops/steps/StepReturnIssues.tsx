import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DamageReportDialog } from "@/components/admin/DamageReportDialog";
import { useCreateAlert } from "@/hooks/use-alerts";
import { toast } from "sonner";
import { format, differenceInMinutes } from "date-fns";
import { 
  calculateLateFee,
  LATE_RETURN_GRACE_MINUTES,
  LATE_RETURN_HOURLY_RATE,
} from "@/lib/pricing";
import { 
  Flag, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Plus,
  ShieldAlert,
  Lock,
  DollarSign,
} from "lucide-react";

interface StepReturnIssuesProps {
  booking: any;
  vehicleId: string;
  completion: {
    reviewed: boolean;
    damagesRecorded: boolean;
  };
  onMarkReviewed: () => void;
  onDamagesUpdated: (totalCost: number) => void;
  onLateFeeCalculated?: (lateFee: number) => void;
  isMarking: boolean;
  isLocked?: boolean;
  isComplete?: boolean;
}

export function StepReturnIssues({ 
  booking, 
  vehicleId,
  completion, 
  onMarkReviewed,
  onDamagesUpdated,
  onLateFeeCalculated,
  isMarking,
  isLocked,
  isComplete,
}: StepReturnIssuesProps) {
  const [acknowledged, setAcknowledged] = useState(completion.reviewed || isComplete);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagMessage, setFlagMessage] = useState("");
  const [damageDialogOpen, setDamageDialogOpen] = useState(false);
  const createAlert = useCreateAlert();
  
  const endDate = new Date(booking.end_at);
  const now = new Date();
  const isLateReturn = now > endDate && booking.status === "active";
  const minutesLate = isLateReturn ? differenceInMinutes(now, endDate) : 0;
  const hoursLate = Math.floor(minutesLate / 60);
  const minsLate = minutesLate % 60;
  
  // Calculate late fee using central pricing utility
  const lateFee = calculateLateFee(minutesLate);

  // Fetch vehicle info for damage dialog
  const { data: vehicle } = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("make, model, year")
        .eq("id", vehicleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
  });

  // Fetch damage reports for this booking
  const { data: damages, isLoading: loadingDamages, refetch: refetchDamages } = useQuery({
    queryKey: ["booking-damages", booking.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("damage_reports")
        .select("*")
        .eq("booking_id", booking.id);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch admin alerts for this booking
  const { data: alerts } = useQuery({
    queryKey: ["booking-alerts", booking.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_alerts")
        .select("*")
        .eq("booking_id", booking.id)
        .neq("status", "resolved");
      
      if (error) throw error;
      return data || [];
    },
  });

  const hasDamages = damages && damages.length > 0;
  const totalDamageCost = damages?.reduce((sum, d) => sum + (d.estimated_cost || 0), 0) || 0;

  // Update parent with damage costs
  useEffect(() => {
    onDamagesUpdated(totalDamageCost);
  }, [totalDamageCost, onDamagesUpdated]);

  // Update parent with late fee
  useEffect(() => {
    if (onLateFeeCalculated) {
      onLateFeeCalculated(lateFee);
    }
  }, [lateFee, onLateFeeCalculated]);

  const vehicleName = vehicle 
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` 
    : "Vehicle";

  // Build flags list
  const flags = [];
  if (isLateReturn) {
    flags.push({
      id: "late",
      type: "warning",
      title: "Late Return",
      description: `Vehicle returned ${hoursLate > 0 ? `${hoursLate}h ` : ""}${minsLate}m late`,
      fee: lateFee,
    });
  }
  
  // Add any active alerts as flags
  alerts?.forEach(alert => {
    flags.push({
      id: alert.id,
      type: "alert",
      title: alert.title,
      description: alert.message || "Issue reported",
      fee: 0,
    });
  });

  const hasIssues = flags.length > 0 || hasDamages;
  const stepIsComplete = isComplete || completion.reviewed;

  const handleFlagIssue = async () => {
    if (!flagMessage.trim()) return;
    
    try {
      await createAlert.mutateAsync({
        alertType: "customer_issue",
        title: `Return issue flagged for ${booking.booking_code}`,
        message: flagMessage,
        bookingId: booking.id,
        vehicleId: booking.vehicle_id,
        userId: booking.user_id,
      });
      toast.success("Issue flagged successfully");
      setFlagDialogOpen(false);
      setFlagMessage("");
    } catch (err) {
      toast.error("Failed to flag issue");
    }
  };

  return (
    <div className="space-y-6">
      {/* Locked Warning */}
      {isLocked && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-600">
            Complete previous steps to unlock this step.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <Card className={stepIsComplete 
        ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" 
        : hasIssues 
          ? "border-destructive/50 bg-destructive/5"
          : "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20"
      }>
        <CardContent className="py-4">
          <div className={`flex items-center gap-2 ${
            stepIsComplete ? "text-emerald-600" : hasIssues ? "text-destructive" : "text-emerald-600"
          }`}>
            {stepIsComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Issues reviewed</span>
              </>
            ) : hasIssues ? (
              <>
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">
                  {flags.length + (hasDamages ? damages.length : 0)} issue{flags.length + (hasDamages ? damages.length : 0) !== 1 ? "s" : ""} to review
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">No issues detected</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Return Timing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Return Timing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Due Back</span>
            <span>{format(endDate, "PPp")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Actual Return</span>
            <span>{format(now, "PPp")}</span>
          </div>
          {isLateReturn && (
            <>
              <div className="flex justify-between text-sm text-destructive">
                <span>Late By</span>
                <span className="font-medium">
                  {hoursLate > 0 ? `${hoursLate}h ` : ""}{minsLate}m
                </span>
              </div>
              {lateFee > 0 && (
                <div className="flex justify-between text-sm pt-2 border-t mt-2">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Late Return Fee
                  </span>
                  <span className="font-semibold text-destructive">
                    ${lateFee.toFixed(2)} CAD
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                ${LATE_RETURN_HOURLY_RATE} CAD/hr after {LATE_RETURN_GRACE_MINUTES}min grace
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Flags Section */}
      {flags.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Flag className="h-4 w-4 text-amber-600" />
              Flagged Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {flags.map((flag) => (
              <div 
                key={flag.id} 
                className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300 text-sm">
                      {flag.title}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      {flag.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Damages Section */}
      <Card className={hasDamages ? "border-destructive/30" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Damage Reports
            </CardTitle>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setDamageDialogOpen(true)}
              disabled={isLocked}
            >
              <Plus className="h-4 w-4 mr-1" />
              Report Damage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingDamages ? (
            <div className="py-6 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
              Loading...
            </div>
          ) : hasDamages ? (
            <div className="space-y-3">
              {damages.map((damage) => (
                <div 
                  key={damage.id} 
                  className="p-3 rounded-lg border border-destructive/30 bg-destructive/5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          damage.severity === "severe" ? "destructive" :
                          damage.severity === "moderate" ? "secondary" : "outline"
                        } className="text-xs">
                          {damage.severity}
                        </Badge>
                        <span className="text-sm font-medium">{damage.location_on_vehicle}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {damage.description}
                      </p>
                    </div>
                    {damage.estimated_cost && (
                      <span className="text-destructive font-semibold text-sm">
                        ${damage.estimated_cost.toFixed(2)} CAD
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Total Damage Cost */}
              <div className="pt-3 border-t flex items-center justify-between">
                <span className="font-medium">Total Damage Estimate</span>
                <span className="text-lg font-bold text-destructive">
                  ${totalDamageCost.toFixed(2)} CAD
                </span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
              <p className="font-medium text-emerald-600 text-sm">No damages reported</p>
              <p className="text-xs text-muted-foreground mt-1">
                Vehicle returned in good condition
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flag New Issue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Flag Additional Issue
          </CardTitle>
          <CardDescription className="text-xs">
            Create an alert for any other problems found during inspection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setFlagDialogOpen(true)}
            disabled={isLocked}
          >
            <Plus className="h-4 w-4 mr-2" />
            Flag Issue
          </Button>
        </CardContent>
      </Card>

      {/* Flag Issue Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag an Issue</DialogTitle>
            <DialogDescription>
              Create an alert for this return. This will notify the team.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe the issue..."
            value={flagMessage}
            onChange={(e) => setFlagMessage(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleFlagIssue}
              disabled={createAlert.isPending || !flagMessage.trim()}
            >
              {createAlert.isPending ? "Flagging..." : "Flag Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Damage Report Dialog */}
      <DamageReportDialog
        open={damageDialogOpen}
        onOpenChange={(open) => {
          setDamageDialogOpen(open);
          if (!open) refetchDamages();
        }}
        vehicleId={vehicleId}
        vehicleName={vehicleName}
        bookingId={booking.id}
        bookingCode={booking.booking_code}
      />

      {/* Acknowledge & Continue */}
      {!stepIsComplete && !isLocked && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <Checkbox 
              id="acknowledge" 
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <label htmlFor="acknowledge" className="text-sm cursor-pointer">
              I have reviewed all issues and damages for this return
            </label>
          </div>
          
          <Button
            onClick={onMarkReviewed}
            disabled={!acknowledged || isMarking}
            className="w-full"
            size="lg"
          >
            {isMarking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Confirm Issues Reviewed & Complete Step"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
