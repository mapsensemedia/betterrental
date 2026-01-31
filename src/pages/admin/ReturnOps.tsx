import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBookingById, useUpdateBookingStatus } from "@/hooks/use-bookings";
import { useBookingConditionPhotos } from "@/hooks/use-condition-photos";
import { usePaymentDepositStatus } from "@/hooks/use-payment-deposit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  RETURN_STEPS, 
  type ReturnStepId, 
  type ReturnCompletion,
  type ReturnState,
  getCurrentStepFromState,
  isStepComplete,
  canAccessStep,
  isStateAtLeast,
} from "@/lib/return-steps";
import { useCompleteReturnStep, useInitiateReturn } from "@/hooks/use-return-state";
import { ReturnStepSidebar } from "@/components/admin/return-ops/ReturnStepSidebar";
import { ReturnBookingSummary } from "@/components/admin/return-ops/ReturnBookingSummary";
import { StepReturnIntake } from "@/components/admin/return-ops/steps/StepReturnIntake";
import { StepReturnEvidence } from "@/components/admin/return-ops/steps/StepReturnEvidence";
import { StepReturnIssues } from "@/components/admin/return-ops/steps/StepReturnIssues";
import { StepReturnCloseout } from "@/components/admin/return-ops/steps/StepReturnCloseout";
import { StepReturnDeposit } from "@/components/admin/return-ops/steps/StepReturnDeposit";
import { ArrowLeft, X, Loader2, ArrowRight, Lock, AlertTriangle } from "lucide-react";

export default function ReturnOps() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: booking, isLoading, refetch: refetchBooking } = useBookingById(bookingId || null);
  const updateStatus = useUpdateBookingStatus();
  const { data: photos, refetch: refetchPhotos } = useBookingConditionPhotos(bookingId || "");
  const { data: depositData, refetch: refetchDeposit } = usePaymentDepositStatus(bookingId || "");
  
  const completeStep = useCompleteReturnStep();
  const initiateReturn = useInitiateReturn();
  
  const [activeStep, setActiveStep] = useState<ReturnStepId>("intake");
  const [totalDamageCost, setTotalDamageCost] = useState(0);
  const [isException, setIsException] = useState(false);
  const hasInitializedRef = useRef(false);

  // Get return state from booking - cast through any since types may not be updated yet
  const bookingData = booking as any;
  const returnState: ReturnState = bookingData?.return_state || "not_started";

  // Auto-initiate return if not started
  useEffect(() => {
    if (booking && returnState === "not_started" && !initiateReturn.isPending) {
      initiateReturn.mutate(booking.id);
    }
  }, [booking, returnState, initiateReturn]);

  // Fetch return metrics
  const { data: returnMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ["return-inspection-metrics", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("inspection_metrics")
        .select("*")
        .eq("booking_id", bookingId!)
        .eq("phase", "return")
        .maybeSingle();
      return data;
    },
    enabled: !!bookingId,
  });

  // Fetch damages
  const { data: damages, refetch: refetchDamages } = useQuery({
    queryKey: ["booking-damages", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("damage_reports")
        .select("*")
        .eq("booking_id", bookingId!);
      return data || [];
    },
    enabled: !!bookingId,
  });

  // Compute completion status (for UI display, but state machine is authoritative)
  const returnPhotos = photos?.return || [];
  const hasMinimumPhotos = returnPhotos.length >= 4;
  const isCompleted = booking?.status === "completed";
  const depositReleased = depositData?.depositStatus === "released";
  const noDepositRequired = !booking?.deposit_amount || booking?.deposit_amount === 0;

  const completion: ReturnCompletion = {
    intake: {
      timeRecorded: !!returnMetrics,
      odometerRecorded: !!returnMetrics?.odometer,
      fuelRecorded: !!returnMetrics?.fuel_level,
    },
    evidence: {
      photosComplete: hasMinimumPhotos,
    },
    issues: {
      reviewed: isStateAtLeast(returnState, "issues_reviewed"),
      // damagesRecorded is true when:
      // 1. Issues step has been reviewed (state machine says so), OR
      // 2. There are actual damage reports
      // This ensures "no damage" is a valid completion state
      damagesRecorded: isStateAtLeast(returnState, "issues_reviewed") || (damages?.length || 0) > 0,
    },
    closeout: {
      completed: isCompleted,
    },
    deposit: {
      processed: depositReleased || noDepositRequired || isCompleted,
    },
  };

  // Determine if there are issues that make this an exception return
  useEffect(() => {
    if ((damages?.length || 0) > 0 || totalDamageCost > 0) {
      setIsException(true);
    }
  }, [damages, totalDamageCost]);

  // Initialize to current step based on state
  useEffect(() => {
    if (!hasInitializedRef.current && booking) {
      const currentStep = getCurrentStepFromState(returnState);
      setActiveStep(currentStep);
      hasInitializedRef.current = true;
    }
  }, [booking, returnState]);

  const handleStepClick = (stepId: ReturnStepId) => {
    // GATING: Only allow clicking on accessible steps
    if (!canAccessStep(stepId, returnState)) {
      toast.error("Complete previous steps first");
      return;
    }
    setActiveStep(stepId);
  };

  const handleDamagesUpdated = useCallback((cost: number) => {
    setTotalDamageCost(cost);
    if (cost > 0) {
      setIsException(true);
    }
  }, []);

  // Complete step handlers with STATE MACHINE
  const handleCompleteIntake = async () => {
    if (!bookingId) return;
    
    // Refetch metrics to ensure we have the latest data
    const { data: latestMetrics } = await refetchMetrics();
    
    if (!latestMetrics?.odometer) {
      toast.error("Record odometer reading first");
      return;
    }
    
    await completeStep.mutateAsync({
      bookingId,
      stepId: "intake",
      currentState: returnState,
    });
    
    setActiveStep("evidence");
    refetchBooking();
  };

  const handleCompleteEvidence = async () => {
    if (!bookingId) return;
    
    // Evidence is optional for normal returns, required for exception
    if (isException && !hasMinimumPhotos) {
      toast.error("Capture at least 4 photos for exception returns");
      return;
    }
    
    await completeStep.mutateAsync({
      bookingId,
      stepId: "evidence",
      currentState: returnState,
    });
    
    setActiveStep("issues");
    refetchBooking();
  };

  const handleCompleteIssues = async () => {
    if (!bookingId) return;
    
    await completeStep.mutateAsync({
      bookingId,
      stepId: "issues",
      currentState: returnState,
      isException,
      exceptionReason: isException ? `Damage cost: $${totalDamageCost}` : undefined,
    });
    
    setActiveStep("closeout");
    refetchBooking();
  };

  const handleCompleteReturn = async () => {
    if (!bookingId) return;
    
    await completeStep.mutateAsync({
      bookingId,
      stepId: "closeout",
      currentState: returnState,
    });
    
    queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
    queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["active-rentals"] });
    queryClient.invalidateQueries({ queryKey: ["returns"] });
    
    setActiveStep("deposit");
    refetchBooking();
  };

  const handleDepositComplete = () => {
    toast.success("Return completed successfully! Redirecting...");
    // Short delay to allow the user to see the success state
    setTimeout(() => {
      navigate("/admin/returns");
    }, 1500);
  };

  const handleBack = () => navigate("/admin/returns");

  // Refetch data when switching steps
  useEffect(() => {
    if (activeStep === "evidence") {
      refetchPhotos();
    } else if (activeStep === "intake") {
      refetchMetrics();
    } else if (activeStep === "deposit") {
      refetchDeposit();
    } else if (activeStep === "issues") {
      refetchDamages();
    }
  }, [activeStep, refetchPhotos, refetchMetrics, refetchDeposit, refetchDamages]);

  if (isLoading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminShell>
    );
  }

  if (!booking) {
    return (
      <AdminShell>
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <p className="text-muted-foreground">Booking not found</p>
          <Button onClick={handleBack}>Back to Returns</Button>
        </div>
      </AdminShell>
    );
  }

  const vehicleName = booking.vehicles 
    ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
    : "No vehicle";

  // Check if current step can proceed
  const canProceedFromCurrentStep = () => {
    switch (activeStep) {
      case "intake":
        return !!returnMetrics?.odometer;
      case "evidence":
        return !isException || hasMinimumPhotos;
      case "issues":
        return true; // Always can proceed after reviewing
      case "closeout":
        return isStateAtLeast(returnState, "issues_reviewed");
      case "deposit":
        return isCompleted;
      default:
        return false;
    }
  };

  const stepIsLocked = !canAccessStep(activeStep, returnState);
  const currentStepComplete = isStepComplete(activeStep, returnState);

  return (
    <AdminShell hideNav>
      <div className="h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b bg-background shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-semibold">Return Console</h1>
                <Badge variant="outline" className="font-mono text-xs">{booking.booking_code}</Badge>
                <Badge className={isCompleted ? "bg-emerald-500" : "bg-amber-500"}>
                  {booking.status}
                </Badge>
                {isException && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Exception
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {booking.profiles?.full_name} • {vehicleName}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <ReturnStepSidebar
            steps={RETURN_STEPS}
            activeStep={activeStep}
            completion={completion}
            currentStepIndex={RETURN_STEPS.findIndex(s => s.id === getCurrentStepFromState(returnState))}
            onStepClick={handleStepClick}
            isCompleted={isCompleted}
            returnState={returnState}
          />

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <ScrollArea className="flex-1">
              <div className="p-4 sm:p-6 max-w-3xl space-y-6">
                {/* Locked Step Warning */}
                {stepIsLocked && (
                  <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-600">
                      This step is locked. Complete the previous steps first.
                    </AlertDescription>
                  </Alert>
                )}

                {activeStep === "intake" && (
                  <StepReturnIntake 
                    bookingId={booking.id} 
                    completion={completion.intake}
                    onComplete={handleCompleteIntake}
                    isLocked={stepIsLocked}
                    isComplete={isStepComplete("intake", returnState)}
                  />
                )}
                {activeStep === "evidence" && (
                  <StepReturnEvidence 
                    bookingId={booking.id} 
                    completion={completion.evidence}
                    onComplete={handleCompleteEvidence}
                    isLocked={stepIsLocked}
                    isComplete={isStepComplete("evidence", returnState)}
                    isException={isException}
                  />
                )}
                {activeStep === "issues" && (
                  <StepReturnIssues 
                    booking={booking}
                    vehicleId={booking.vehicle_id}
                    completion={completion.issues}
                    onMarkReviewed={handleCompleteIssues}
                    onDamagesUpdated={handleDamagesUpdated}
                    isMarking={completeStep.isPending}
                    isLocked={stepIsLocked}
                    isComplete={isStepComplete("issues", returnState)}
                  />
                )}
                {activeStep === "closeout" && (
                  <StepReturnCloseout 
                    booking={booking}
                    completion={completion}
                    onCompleteReturn={handleCompleteReturn}
                    isCompleting={completeStep.isPending}
                    returnState={returnState}
                    isLocked={stepIsLocked}
                  />
                )}
                {activeStep === "deposit" && (
                  <StepReturnDeposit 
                    bookingId={booking.id}
                    booking={booking}
                    completion={completion.deposit}
                    totalDamageCost={totalDamageCost}
                    isLocked={stepIsLocked}
                    onComplete={handleDepositComplete}
                  />
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="hidden xl:block w-80 border-l bg-muted/30">
            <ReturnBookingSummary booking={booking} isException={isException} />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
