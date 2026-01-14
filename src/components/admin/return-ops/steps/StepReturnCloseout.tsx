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

interface StepReturnCloseoutProps {
  booking: any;
  completion: ReturnCompletion;
  onCompleteReturn: () => void;
  isCompleting: boolean;
  returnState?: ReturnState;
  isLocked?: boolean;
}

export function StepReturnCloseout({ 
  booking, 
  completion, 
  onCompleteReturn,
  isCompleting,
  returnState,
  isLocked,
}: StepReturnCloseoutProps) {
  const isAlreadyCompleted = booking.status === "completed";
  
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
  
  const prerequisites = [
    { 
      label: "Return intake recorded", 
      complete: intakeComplete,
      required: true,
    },
    { 
      label: "Evidence photos captured", 
      complete: evidenceComplete,
      required: false,
    },
    { 
      label: "Issues & damages reviewed", 
      complete: issuesComplete,
      required: true,
    },
  ];

  const requiredComplete = prerequisites.filter(p => p.required).every(p => p.complete);
  const allComplete = prerequisites.every(p => p.complete);
  
  // GATING: Can only close out if issues have been reviewed (state machine)
  const canCloseOut = returnState 
    ? isStateAtLeast(returnState, "issues_reviewed")
    : requiredComplete;

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
