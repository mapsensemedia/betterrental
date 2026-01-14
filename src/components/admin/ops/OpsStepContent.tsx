import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  OPS_STEPS, 
  type OpsStepId, 
  type StepCompletion,
  checkStepComplete,
  getMissingItems,
  getStepStatus,
  getCurrentStepIndex,
  getBlockingIssues,
  ACTION_LABELS,
} from "@/lib/ops-steps";
import { 
  Check, 
  Lock, 
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Step-specific components
import { StepIntake } from "./steps/StepIntake";
import { StepPrep } from "./steps/StepPrep";
import { StepCheckin } from "./steps/StepCheckin";
import { StepPayment } from "./steps/StepPayment";
import { StepAgreement } from "./steps/StepAgreement";
import { StepWalkaround } from "./steps/StepWalkaround";
import { StepHandover } from "./steps/StepHandover";

type BookingStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled";

interface OpsStepContentProps {
  stepId: OpsStepId;
  booking: any;
  completion: StepCompletion;
  verifications: any[];
  onCompleteStep: () => void;
  onActivate: () => void;
  isRentalActive: boolean;
}

// Helper to check if we can advance to the next step
function canAdvanceToNextStep(stepId: OpsStepId, completion: StepCompletion): boolean {
  const currentStepComplete = checkStepComplete(stepId, completion);
  const currentIndex = OPS_STEPS.findIndex(s => s.id === stepId);
  const hasNextStep = currentIndex < OPS_STEPS.length - 1;
  
  // Also check that there are no blocking issues
  const blockingIssues = getBlockingIssues(stepId, completion);
  const isBlocked = blockingIssues.length > 0;
  
  return currentStepComplete && hasNextStep && !isBlocked;
}

export function OpsStepContent({ 
  stepId, 
  booking, 
  completion,
  verifications,
  onCompleteStep,
  onActivate,
  isRentalActive,
}: OpsStepContentProps) {
  const step = OPS_STEPS.find(s => s.id === stepId);
  if (!step) return null;
  
  const bookingStatus = booking?.status as BookingStatus;
  const isBookingCompleted = bookingStatus === "completed";
  const isBookingCancelled = bookingStatus === "cancelled";
  
  const currentStepIndex = getCurrentStepIndex(completion);
  const { status, reason, isBlocked } = getStepStatus(stepId, completion, currentStepIndex);
  const isComplete = checkStepComplete(stepId, completion);
  const isLocked = status === "locked" && !isRentalActive;
  const missing = getMissingItems(stepId, completion);
  const blockingIssues = getBlockingIssues(stepId, completion);
  const showNextStepButton = canAdvanceToNextStep(stepId, completion) && stepId !== "handover";
  
  // For locked steps (prior to completion), show locked state
  if (isLocked) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-muted-foreground">{step.title}</h2>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          </div>
        </div>
        
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Step Locked</AlertTitle>
          <AlertDescription>
            {reason || "Complete the previous steps to unlock this step."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Render step content
  return (
    <div className="space-y-6">
      {/* Step Header with Status */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold",
            isComplete ? "bg-emerald-500" : 
            isBlocked ? "bg-destructive" : 
            "bg-primary"
          )}>
            {isComplete ? <Check className="w-5 h-5" /> : 
             isBlocked ? <AlertTriangle className="w-5 h-5" /> :
             step.number}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold">{step.title}</h2>
              {isComplete && (
                <Badge className="bg-emerald-500">Complete</Badge>
              )}
              {isBlocked && (
                <Badge variant="destructive">Blocked</Badge>
              )}
            </div>
            <p className="text-muted-foreground">{step.description}</p>
          </div>
        </div>
      </div>
      
      {/* Blocking Issues Alert - Critical, must resolve before proceeding */}
      {blockingIssues.length > 0 && (
        <Alert variant="destructive">
          <Ban className="h-4 w-4" />
          <AlertTitle>Cannot Complete Step</AlertTitle>
          <AlertDescription className="space-y-2">
            {blockingIssues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{issue.message}</span>
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Missing Items Alert - Informational, for non-blocking requirements */}
      {!isComplete && !isBlocked && missing.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">Required Items</AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-500">
            Complete the following to proceed: {missing.join(", ")}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Step-specific Content */}
      <div className="space-y-4">
        {stepId === "intake" && (
          <StepIntake 
            booking={booking} 
            completion={completion.intake}
            verifications={verifications}
          />
        )}
        {stepId === "prep" && (
          <StepPrep 
            bookingId={booking.id} 
            completion={completion.prep}
          />
        )}
        {stepId === "checkin" && (
          <StepCheckin 
            booking={booking}
            completion={completion.checkin}
            verifications={verifications}
          />
        )}
        {stepId === "payment" && (
          <StepPayment 
            bookingId={booking.id}
            completion={completion.payment}
          />
        )}
        {stepId === "agreement" && (
          <StepAgreement 
            bookingId={booking.id}
            completion={completion.agreement}
          />
        )}
        {stepId === "walkaround" && (
          <StepWalkaround 
            bookingId={booking.id}
            completion={completion.walkaround}
          />
        )}
        {stepId === "handover" && (
          <StepHandover 
            booking={booking}
            completion={completion}
            onActivate={onActivate}
            isBookingCompleted={isBookingCompleted}
          />
        )}
      </div>
      
      {/* Primary Step Action - One button to rule them all */}
      {showNextStepButton && !isBookingCompleted && !isBookingCancelled && (
        <div className="pt-4 flex justify-end border-t">
          <Button onClick={onCompleteStep} size="lg">
            {ACTION_LABELS.continue}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
