import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Lock,
} from "lucide-react";
import { type ReturnCompletion, type ReturnState, isStateAtLeast } from "@/lib/return-steps";
import { LateFeeApprovalCard } from "@/components/admin/return-ops/LateFeeApprovalCard";
import { useCalculateLateFee, useOverrideLateFee } from "@/hooks/use-late-return";
import { calculateLateFee } from "@/lib/pricing";
import { toast } from "sonner";

interface StepReturnCloseoutProps {
  booking: any;
  completion: ReturnCompletion;
  onCompleteReturn: () => void;
  isCompleting: boolean;
  returnState?: ReturnState;
  isLocked?: boolean;
  calculatedLateFee?: number;
  minutesLate?: number;
}

export function StepReturnCloseout({ 
  booking, 
  completion, 
  onCompleteReturn,
  isCompleting,
  returnState,
  isLocked,
  calculatedLateFee = 0,
  minutesLate = 0,
}: StepReturnCloseoutProps) {
  const [lateFeeApproved, setLateFeeApproved] = useState(false);
  const calculateLateFeeMutation = useCalculateLateFee();
  const overrideLateFee = useOverrideLateFee();

  // If calculatedLateFee wasn't passed from Issues step, compute it from minutesLate
  const effectiveCalculatedFee = useMemo(() => {
    if (calculatedLateFee > 0) return calculatedLateFee;
    if (minutesLate > 0) return calculateLateFee(minutesLate);
    return 0;
  }, [calculatedLateFee, minutesLate]);

  const isAlreadyCompleted = booking.status === "completed";
  const hasLateFee = minutesLate > 30; // Past grace period
  
  // Check prerequisites using state machine if available
  const intakeComplete = returnState 
    ? isStateAtLeast(returnState, "intake_done")
    : completion.intake.odometerRecorded || completion.intake.fuelRecorded;
  
  const evidenceComplete = returnState
    ? isStateAtLeast(returnState, "evidence_done")
    : completion.evidence.photosComplete;
  
  const issuesComplete = returnState
    ? isStateAtLeast(returnState, "issues_reviewed")
    : completion.issues.reviewed;
  
  const damageCheckComplete = issuesComplete || completion.issues.damagesRecorded;
  
  const prerequisites = [
    { 
      label: "Return intake recorded", 
      complete: intakeComplete,
      required: true,
    },
    { 
      label: "Evidence photos captured", 
      complete: evidenceComplete,
      required: true,
    },
    { 
      label: "Issues & damages reviewed", 
      complete: issuesComplete,
      required: true,
    },
    { 
      label: "Damage check completed", 
      complete: damageCheckComplete,
      required: true,
      description: damageCheckComplete 
        ? "Damage status confirmed" 
        : "Review issues step to confirm damage status",
    },
    // Late fee approval is required if there's a late fee
    ...(hasLateFee ? [{
      label: "Late fee approved",
      complete: lateFeeApproved || !!booking.late_return_fee || !!booking.late_return_fee_override,
      required: true,
      description: lateFeeApproved 
        ? "Late fee has been approved" 
        : "Approve the late fee below before completing",
    }] : []),
  ];

  const requiredComplete = prerequisites.filter(p => p.required).every(p => p.complete);
  const allComplete = prerequisites.every(p => p.complete);
  
  // GATING: Can only close out if ALL required items are complete
  const canCloseOut = returnState 
    ? isStateAtLeast(returnState, "issues_reviewed") && (!hasLateFee || lateFeeApproved || !!booking.late_return_fee || !!booking.late_return_fee_override)
    : requiredComplete;

  // Existing override data
  const existingOverride = booking.late_return_fee_override != null 
    ? {
        amount: Number(booking.late_return_fee_override),
        reason: booking.late_return_override_reason,
      }
    : null;

  const handleLateFeeApproval = async (approvedFee: number, reason?: string) => {
    try {
      if (reason || approvedFee !== effectiveCalculatedFee) {
        // Override: staff changed the amount
        await overrideLateFee.mutateAsync({
          bookingId: booking.id,
          overrideAmount: approvedFee,
          reason: reason || "Approved as calculated",
        });
      } else {
        // Standard approval: save calculated fee
        await calculateLateFeeMutation.mutateAsync({
          bookingId: booking.id,
          scheduledEndAt: booking.end_at,
          dailyRate: Number(booking.daily_rate),
          actualReturnAt: new Date().toISOString(),
        });
      }
      setLateFeeApproved(true);
      toast.success(`Late fee of $${approvedFee.toFixed(2)} approved`);
    } catch (err) {
      toast.error("Failed to save late fee");
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
      {isAlreadyCompleted ? (
        <Card className="border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Return completed</span>
            </div>
          </CardContent>
        </Card>
      ) : !canCloseOut ? (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-600">
            Complete all required steps before closing out the return
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Late Fee Approval Card */}
      {!isLocked && (
        <LateFeeApprovalCard
          calculatedFee={effectiveCalculatedFee}
          minutesLate={minutesLate}
          isApproved={lateFeeApproved || !!booking.late_return_fee || !!booking.late_return_fee_override}
          onApprove={handleLateFeeApproval}
          isApproving={calculateLateFeeMutation.isPending || overrideLateFee.isPending}
          existingOverride={existingOverride}
          persistedFee={Number(booking.late_return_fee) || 0}
        />
      )}

      {/* Prerequisites Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Closeout Checklist</CardTitle>
          <CardDescription>
            Verify all steps are complete before closing the return
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {prerequisites.map((prereq, i) => (
              <div 
                key={i} 
                className={`flex items-center justify-between p-3 rounded-lg ${
                  prereq.complete 
                    ? "bg-emerald-50 dark:bg-emerald-950/20" 
                    : prereq.required 
                      ? "bg-amber-50 dark:bg-amber-950/20"
                      : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  {prereq.complete ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <XCircle className={`h-5 w-5 ${prereq.required ? "text-amber-500" : "text-muted-foreground"}`} />
                  )}
                  <span className={prereq.complete ? "text-emerald-700 dark:text-emerald-300" : ""}>
                    {prereq.label}
                  </span>
                </div>
                {prereq.required && !prereq.complete && (
                  <Badge variant="secondary" className="text-xs">Required</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Return Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Booking Code</span>
            <Badge variant="outline" className="font-mono">{booking.booking_code}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vehicle</span>
            <span>
              {booking.vehicles?.year} {booking.vehicles?.make} {booking.vehicles?.model}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span>{booking.profiles?.full_name || booking.profiles?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Status</span>
            <Badge>{booking.status}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Complete Return Button */}
      {!isAlreadyCompleted && !isLocked && (
        <Button
          onClick={onCompleteReturn}
          disabled={!canCloseOut || isCompleting}
          size="lg"
          className="w-full"
        >
          {isCompleting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Completing Return...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Return
            </>
          )}
        </Button>
      )}

      {!allComplete && !isAlreadyCompleted && !isLocked && (
        <p className="text-xs text-center text-muted-foreground">
          Optional items can be completed later, but required items must be done first
        </p>
      )}
    </div>
  );
}
