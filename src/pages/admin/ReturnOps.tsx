import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBookingById, useUpdateBookingStatus } from "@/hooks/use-bookings";
import { useBookingConditionPhotos, getPhotoCompletionStatus } from "@/hooks/use-condition-photos";
import { usePaymentDepositStatus } from "@/hooks/use-payment-deposit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RETURN_STEPS, type ReturnStepId, type ReturnCompletion, getCurrentReturnStepIndex, checkReturnStepComplete } from "@/lib/return-steps";
import { ReturnStepSidebar } from "@/components/admin/return-ops/ReturnStepSidebar";
import { ReturnBookingSummary } from "@/components/admin/return-ops/ReturnBookingSummary";
import { StepReturnIntake } from "@/components/admin/return-ops/steps/StepReturnIntake";
import { StepReturnEvidence } from "@/components/admin/return-ops/steps/StepReturnEvidence";
import { StepReturnFlags } from "@/components/admin/return-ops/steps/StepReturnFlags";
import { StepReturnFees } from "@/components/admin/return-ops/steps/StepReturnFees";
import { StepReturnCloseout } from "@/components/admin/return-ops/steps/StepReturnCloseout";
import { StepReturnDeposit } from "@/components/admin/return-ops/steps/StepReturnDeposit";
import { ArrowLeft, X, Loader2, ArrowRight } from "lucide-react";

export default function ReturnOps() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: booking, isLoading, refetch: refetchBooking } = useBookingById(bookingId || null);
  const updateStatus = useUpdateBookingStatus();
  const { data: photos, refetch: refetchPhotos } = useBookingConditionPhotos(bookingId || "");
  const { data: depositData, refetch: refetchDeposit } = usePaymentDepositStatus(bookingId || "");
  
  const [activeStep, setActiveStep] = useState<ReturnStepId>("intake");
  const hasInitializedRef = useRef(false);

  // Local state for flags/fees reviewed (persisted in session)
  const [flagsReviewed, setFlagsReviewed] = useState(() => {
    const stored = sessionStorage.getItem(`return-flags-${bookingId}`);
    return stored === 'true';
  });
  const [feesReviewed, setFeesReviewed] = useState(() => {
    const stored = sessionStorage.getItem(`return-fees-${bookingId}`);
    return stored === 'true';
  });

  // Persist reviewed state to session storage
  useEffect(() => {
    if (bookingId) {
      sessionStorage.setItem(`return-flags-${bookingId}`, String(flagsReviewed));
    }
  }, [flagsReviewed, bookingId]);

  useEffect(() => {
    if (bookingId) {
      sessionStorage.setItem(`return-fees-${bookingId}`, String(feesReviewed));
    }
  }, [feesReviewed, bookingId]);

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
  const { data: damages } = useQuery({
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

  // Compute completion - use minimum required photos (at least 4 of 6)
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
    flags: {
      reviewed: flagsReviewed || isCompleted,
    },
    fees: {
      reviewed: feesReviewed || isCompleted,
      damagesRecorded: (damages?.length || 0) > 0,
    },
    closeout: {
      completed: isCompleted,
    },
    deposit: {
      processed: depositReleased || noDepositRequired || isCompleted,
    },
  };

  const currentStepIndex = getCurrentReturnStepIndex(completion);

  // Initialize to first incomplete step
  useEffect(() => {
    if (!hasInitializedRef.current && booking) {
      const step = RETURN_STEPS[currentStepIndex];
      if (step) setActiveStep(step.id);
      hasInitializedRef.current = true;
    }
  }, [booking, currentStepIndex]);

  const handleStepClick = (stepId: ReturnStepId) => {
    setActiveStep(stepId);
  };

  const handleMarkFlagsReviewed = () => {
    setFlagsReviewed(true);
    toast.success("Flags marked as reviewed");
  };

  const handleMarkFeesReviewed = () => {
    setFeesReviewed(true);
    toast.success("Fees marked as reviewed");
  };

  const handleCompleteReturn = () => {
    if (!bookingId) return;
    updateStatus.mutate(
      { bookingId, newStatus: "completed" },
      {
        onSuccess: () => {
          toast.success("Return completed successfully");
          // Invalidate all related queries
          queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
          queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
          queryClient.invalidateQueries({ queryKey: ["active-rentals"] });
          queryClient.invalidateQueries({ queryKey: ["returns"] });
          refetchBooking();
          // Clear session storage
          sessionStorage.removeItem(`return-flags-${bookingId}`);
          sessionStorage.removeItem(`return-fees-${bookingId}`);
        },
      }
    );
  };

  const handleNextStep = () => {
    const idx = RETURN_STEPS.findIndex(s => s.id === activeStep);
    if (idx < RETURN_STEPS.length - 1) {
      setActiveStep(RETURN_STEPS[idx + 1].id);
    }
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
    }
  }, [activeStep, refetchPhotos, refetchMetrics, refetchDeposit]);

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

  const showNextButton = checkReturnStepComplete(activeStep, completion) && activeStep !== "deposit" && !isCompleted;

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
            currentStepIndex={currentStepIndex}
            onStepClick={handleStepClick}
            isCompleted={isCompleted}
          />

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <ScrollArea className="flex-1">
              <div className="p-4 sm:p-6 max-w-3xl space-y-6">
                {activeStep === "intake" && (
                  <StepReturnIntake bookingId={booking.id} completion={completion.intake} />
                )}
                {activeStep === "evidence" && (
                  <StepReturnEvidence bookingId={booking.id} completion={completion.evidence} />
                )}
                {activeStep === "flags" && (
                  <StepReturnFlags 
                    booking={booking} 
                    completion={completion.flags}
                    onMarkReviewed={handleMarkFlagsReviewed}
                    isMarking={false}
                  />
                )}
                {activeStep === "fees" && (
                  <StepReturnFees 
                    bookingId={booking.id}
                    vehicleId={booking.vehicle_id}
                    completion={completion.fees}
                    onMarkReviewed={handleMarkFeesReviewed}
                    isMarking={false}
                  />
                )}
                {activeStep === "closeout" && (
                  <StepReturnCloseout 
                    booking={booking}
                    completion={completion}
                    onCompleteReturn={handleCompleteReturn}
                    isCompleting={updateStatus.isPending}
                  />
                )}
                {activeStep === "deposit" && (
                  <StepReturnDeposit 
                    bookingId={booking.id}
                    booking={booking}
                    completion={completion.deposit}
                  />
                )}

                {showNextButton && (
                  <div className="pt-4 flex justify-end">
                    <Button onClick={handleNextStep}>
                      Continue to Next Step
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="hidden xl:block w-80 border-l bg-muted/30">
            <ReturnBookingSummary booking={booking} />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
