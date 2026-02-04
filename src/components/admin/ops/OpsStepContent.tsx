import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  OPS_STEPS,
  type OpsStep, 
  type OpsStepId, 
  type StepCompletion,
  checkStepComplete,
  getMissingItems,
  getStepStatus,
  getCurrentStepIndex,
  getBlockingIssues,
  getStepForDisplay,
  ACTION_LABELS,
  getOpsSteps,
} from "@/lib/ops-steps";
import { 
  Check, 
  AlertCircle,
  ArrowRight,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Step-specific components
import { StepCheckin } from "./steps/StepCheckin";
import { StepPayment } from "./steps/StepPayment";
import { StepPrep } from "./steps/StepPrep";
import { StepAgreement } from "./steps/StepAgreement";
import { StepWalkaround } from "./steps/StepWalkaround";
import { StepPhotos } from "./steps/StepPhotos";
import { StepHandover } from "./steps/StepHandover";
import { StepEnRoute } from "./steps/StepEnRoute";

type BookingStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled";

interface OpsStepContentProps {
  stepId: OpsStepId;
  booking: any;
  completion: StepCompletion;
  onCompleteStep: () => void;
  onActivate: () => void;
  isRentalActive: boolean;
  isDelivery?: boolean;
  driverInfo?: { fullName: string; phone?: string | null } | null;
  steps?: OpsStep[];
}

// Helper to check if we can advance to the next step
function canAdvanceToNextStep(stepId: OpsStepId, completion: StepCompletion, isDelivery: boolean = false, steps: OpsStep[]): boolean {
  const currentStepComplete = checkStepComplete(stepId, completion, isDelivery);
  const currentIndex = steps.findIndex(s => s.id === stepId);
  const hasNextStep = currentIndex < steps.length - 1;
  
  // Also check that there are no blocking issues
  const blockingIssues = getBlockingIssues(stepId, completion, isDelivery);
  const isBlocked = blockingIssues.length > 0;
  
  return currentStepComplete && hasNextStep && !isBlocked;
}

export function OpsStepContent({ 
  stepId, 
  booking, 
  completion,
  onCompleteStep,
  onActivate,
  isRentalActive,
  isDelivery = false,
  driverInfo,
  steps: propSteps,
}: OpsStepContentProps) {
  // Use provided steps or get default
  const steps = propSteps || getOpsSteps(isDelivery);
  
  const step = steps.find(s => s.id === stepId);
  if (!step) return null;
  
  const stepDisplay = getStepForDisplay(step, isDelivery);
  const bookingStatus = booking?.status as BookingStatus;
  const isBookingCompleted = bookingStatus === "completed";
  const isBookingCancelled = bookingStatus === "cancelled";
  
  const currentStepIndex = getCurrentStepIndex(completion, isDelivery);
  const { status, reason } = getStepStatus(stepId, completion, currentStepIndex, isDelivery);
  const isComplete = checkStepComplete(stepId, completion, isDelivery);
  const missing = getMissingItems(stepId, completion, isDelivery);
  const blockingIssues = getBlockingIssues(stepId, completion, isDelivery);
  const isBlocked = blockingIssues.length > 0;
  const showNextStepButton = canAdvanceToNextStep(stepId, completion, isDelivery, steps) && stepId !== "handover" && stepId !== "dispatch";
  
  // Render step content - no locks, staff can access any step
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
                <h2 className="text-xl font-semibold">{stepDisplay.title}</h2>
                {isComplete && (
                  <Badge className="bg-emerald-500">Complete</Badge>
                )}
                {isBlocked && (
                  <Badge variant="destructive">Blocked</Badge>
                )}
              </div>
              <p className="text-muted-foreground">{stepDisplay.description}</p>
            </div>
          </div>
        </div>
        
        {/* Blocking Issues Alert */}
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
      
      {/* Missing Items Alert - informational only, not blocking */}
      {!isComplete && !isBlocked && missing.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">Pending Items</AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-500">
            Items to complete: {missing.join(", ")}
          </AlertDescription>
        </Alert>
      )}
      
        {/* Step-specific Content */}
        <div className="space-y-4">
        {stepId === "checkin" && (
            isDelivery ? (
              <StepEnRoute 
                booking={booking}
                driverInfo={driverInfo}
                completion={completion.checkin}
              />
            ) : (
              <StepCheckin 
                booking={booking}
                completion={completion.checkin}
                onStepComplete={onCompleteStep}
                vehicleName={booking.vehicle_categories?.name || "Vehicle"}
              />
            )
          )}
          {stepId === "payment" && (
            <StepPayment 
              bookingId={booking.id}
              completion={completion.payment}
            />
          )}
          {stepId === "prep" && (
            <StepPrep 
              bookingId={booking.id}
              vehicleId={booking.vehicle_id}
              vehicleName={booking.vehicle_categories?.name || "Vehicle"}
              completion={{
                checklistComplete: completion.prep?.vehiclePrepared || false,
                photosComplete: completion.photos.photosComplete,
                driverAssigned: completion.dispatch?.driverAssigned,
                unitAssigned: !!booking.assigned_unit_id,
              }}
              isDelivery={isDelivery}
              assignedDriverId={booking.assigned_driver_id}
            />
          )}
          {stepId === "agreement" && (
            <StepAgreement 
              bookingId={booking.id}
              customerName={booking.profiles?.full_name}
              completion={completion.agreement}
            />
          )}
          {stepId === "walkaround" && (
            <StepWalkaround 
              bookingId={booking.id}
              completion={completion.walkaround}
            />
          )}
          {stepId === "photos" && (
            <StepPhotos 
              bookingId={booking.id}
              completion={completion.photos}
            />
          )}
          {stepId === "dispatch" && isDelivery && (
            <StepHandover 
              booking={booking}
              completion={completion}
              onActivate={onActivate}
              isBookingCompleted={isBookingCompleted}
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
      
      {/* Primary Step Action */}
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
