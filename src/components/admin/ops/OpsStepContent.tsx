import { useState } from "react";
import { displayName } from "@/lib/format-customer";
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
import { StepIntake } from "./steps/StepIntake";
import { StepReadyLine } from "./steps/StepReadyLine";
import { StepDispatch } from "./steps/StepDispatch";
import { OpsBackupActivation } from "./steps/OpsBackupActivation";
import { CounterUpsellPanel } from "./CounterUpsellPanel";
import { BookingEditPanel } from "./BookingEditPanel";
import { VehicleAssignment } from "../VehicleAssignment";
import { CategoryUpgradeDialog } from "../CategoryUpgradeDialog";

type BookingStatus = "draft" | "pending" | "confirmed" | "active" | "completed" | "cancelled";

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
  const [showCategoryUpgrade, setShowCategoryUpgrade] = useState(false);
  
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
      
      {/* Removed: "Pending Items" banner was noise - the step forms themselves show what's needed */}
      
        {/* Step-specific Content */}
        <div className="space-y-4">
          {/* NEW: Intake step for delivery */}
          {stepId === "intake" && isDelivery && (
            <StepIntake 
              booking={booking}
              isComplete={completion.intake?.reviewed || false}
              onStepComplete={onCompleteStep}
            />
          )}
          {stepId === "checkin" && (
            <>
              <StepCheckin 
                booking={booking}
                completion={completion.checkin}
                onStepComplete={onCompleteStep}
                vehicleName={booking.vehicle_categories?.name || "Vehicle"}
              />
              {/* Edit Booking Details — available during checkin for counter edits */}
              {(bookingStatus === "pending" || bookingStatus === "confirmed") && (
                <BookingEditPanel booking={booking} />
              )}
              {/* Vehicle Assignment — available during checkin */}
              {(bookingStatus === "pending" || bookingStatus === "confirmed") && (
                <VehicleAssignment
                  bookingId={booking.id}
                  currentVehicleId={booking.vehicle_id}
                  currentVehicle={booking.vehicles}
                  locationId={booking.location_id}
                  startAt={booking.start_at}
                  endAt={booking.end_at}
                  onChangeCategoryClick={() => setShowCategoryUpgrade(true)}
                />
              )}
              {/* Counter Upsell */}
              {(bookingStatus === "pending" || bookingStatus === "confirmed") && (
                <CounterUpsellPanel bookingId={booking.id} rentalDays={booking.total_days || 1} />
              )}
            </>
          )}
          {stepId === "payment" && (
            <StepPayment 
              bookingId={booking.id}
              completion={completion.payment}
            />
          )}
          {/* NEW: Ready Line step for delivery (replaces prep+photos) */}
          {stepId === "ready_line" && isDelivery && (
            <StepReadyLine
              bookingId={booking.id}
              vehicleId={booking.vehicle_id}
              vehicleName={booking.vehicle_categories?.name || "Vehicle"}
              completion={{
                unitAssigned: !!booking.assigned_unit_id,
                checklistComplete: completion.readyLine?.checklistComplete || false,
                photosComplete: completion.readyLine?.photosComplete || false,
                fuelRecorded: completion.readyLine?.fuelRecorded || false,
                odometerRecorded: completion.readyLine?.odometerRecorded || false,
                pricingLocked: completion.readyLine?.pricingLocked || false,
              }}
            />
          )}
          {stepId === "prep" && !isDelivery && (
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
              isDelivery={false}
              assignedDriverId={booking.assigned_driver_id}
            />
          )}
          {/* NEW: Dispatch step for delivery */}
          {stepId === "dispatch" && isDelivery && (
            <StepDispatch
              bookingId={booking.id}
              booking={booking}
              driverAssigned={completion.dispatch?.driverAssigned || false}
              dispatched={completion.dispatch?.dispatched || false}
              assignedDriverId={booking.assigned_driver_id}
              prepPhotoCount={0}
              readyLineComplete={completion.readyLine?.checklistComplete || false}
            />
          )}
          {/* NEW: Ops Backup Activation for delivery */}
          {stepId === "ops_activate" && isDelivery && (
            <OpsBackupActivation
              bookingId={booking.id}
              deliveryTask={null}
              deliveryStatus={booking.delivery_statuses?.status || null}
              handoverPhotosCount={0}
              fuelRecorded={false}
              odometerRecorded={false}
              idCheckResult={null}
              idCheckRequired={true}
              isAlreadyActive={booking.status === "active" || booking.status === "completed"}
            />
          )}
          {stepId === "agreement" && (
            <StepAgreement 
              bookingId={booking.id}
              customerName={displayName(booking.profiles?.full_name)}
              completion={completion.agreement}
            />
          )}
          {stepId === "walkaround" && (
            <StepWalkaround 
              bookingId={booking.id}
              completion={completion.walkaround}
            />
          )}
          {stepId === "photos" && !isDelivery && (
            <StepPhotos 
              bookingId={booking.id}
              completion={completion.photos}
            />
          )}
          {stepId === "handover" && !isDelivery && (
            <>
              <StepHandover 
                booking={booking}
                completion={completion}
                onActivate={onActivate}
                isBookingCompleted={isBookingCompleted}
              />
              {/* Allow vehicle change and booking edits on the handover step before activation */}
              {(bookingStatus === "pending" || bookingStatus === "confirmed") && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
                  <VehicleAssignment
                    bookingId={booking.id}
                    currentVehicleId={booking.vehicle_id}
                    currentVehicle={booking.vehicles}
                    locationId={booking.location_id}
                    startAt={booking.start_at}
                    endAt={booking.end_at}
                    onChangeCategoryClick={() => setShowCategoryUpgrade(true)}
                  />
                  <BookingEditPanel booking={booking} />
                </div>
              )}
            </>
          )}
        </div>

      {/* Category Upgrade Dialog */}
      <CategoryUpgradeDialog
        open={showCategoryUpgrade}
        onOpenChange={setShowCategoryUpgrade}
        booking={booking}
      />
      
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
