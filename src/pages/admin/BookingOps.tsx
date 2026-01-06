import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Components
import { OpsStepSidebar } from "@/components/admin/ops/OpsStepSidebar";
import { OpsStepContent } from "@/components/admin/ops/OpsStepContent";
import { OpsBookingSummary } from "@/components/admin/ops/OpsBookingSummary";

// Hooks
import { useBookingById, useUpdateBookingStatus } from "@/hooks/use-bookings";
import { useWalkaroundInspection } from "@/hooks/use-walkaround";
import { useVehiclePrepStatus } from "@/hooks/use-vehicle-prep";
import { useBookingConditionPhotos, REQUIRED_PHOTOS, getPhotoCompletionStatus } from "@/hooks/use-condition-photos";
import { useCheckInRecord } from "@/hooks/use-checkin";
import { usePaymentDepositStatus } from "@/hooks/use-payment-deposit";
import { useRentalAgreement } from "@/hooks/use-rental-agreement";
import { useBookingVerification } from "@/hooks/use-verification";

// Types
import { OPS_STEPS, type OpsStepId, type StepCompletion, getCurrentStepIndex, checkStepComplete } from "@/lib/ops-steps";
import { ArrowLeft, MoreVertical, X, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

export default function BookingOps() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const { data: booking, isLoading } = useBookingById(bookingId || null);
  const updateStatus = useUpdateBookingStatus();
  const { data: walkaround } = useWalkaroundInspection(bookingId || null);
  const { data: prepStatus } = useVehiclePrepStatus(bookingId || "");
  const { data: photos } = useBookingConditionPhotos(bookingId || "");
  const { data: checkinRecord } = useCheckInRecord(bookingId || "");
  const { data: depositData } = usePaymentDepositStatus(bookingId || "");
  const { data: agreement } = useRentalAgreement(bookingId || "");
  const { data: verifications } = useBookingVerification(bookingId || null);
  
  const [activeStep, setActiveStep] = useState<OpsStepId>("intake");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: string | null }>({ 
    open: false, 
    action: null 
  });

  // Prevent the auto-advance effect from overriding manual navigation
  const hasInitializedStepRef = useRef(false);

  const handleStepClick = (stepId: OpsStepId) => {
    hasInitializedStepRef.current = true;
    setActiveStep(stepId);
  };
  
  // Compute completion status
  const pickupPhotos = photos?.pickup || [];
  const photoStatus = getPhotoCompletionStatus(pickupPhotos, 'pickup');
  const isCheckedIn = checkinRecord?.checkInStatus === 'passed' || checkinRecord?.checkInStatus === 'needs_review';
  const isPaymentComplete = depositData?.paymentStatus === 'paid';
  const isDepositCollected = depositData?.depositStatus === 'held' || depositData?.depositStatus === 'released';
  const isAgreementSigned = agreement?.status === 'signed' || agreement?.status === 'confirmed';
  
  // License status
  const licenseVerifications = verifications?.filter(v => 
    v.document_type === 'drivers_license_front' || v.document_type === 'drivers_license_back'
  ) || [];
  const hasLicenseUploaded = licenseVerifications.length > 0;
  const isLicenseApproved = licenseVerifications.length > 0 && 
    licenseVerifications.every(v => v.status === 'verified');
  
  const completion: StepCompletion = {
    intake: {
      vehicleAssigned: !!booking?.vehicle_id,
      licenseUploaded: hasLicenseUploaded,
      licenseApproved: isLicenseApproved,
    },
    prep: {
      checklistComplete: prepStatus?.allComplete || false,
      photosComplete: photoStatus.complete,
    },
    checkin: {
      identityVerified: isCheckedIn,
      timingConfirmed: isCheckedIn,
    },
    payment: {
      paymentComplete: isPaymentComplete,
      depositCollected: isDepositCollected,
    },
    agreement: {
      agreementSigned: isAgreementSigned,
    },
    walkaround: {
      inspectionComplete: walkaround?.inspection_complete || false,
      customerAcknowledged: walkaround?.customer_acknowledged || false,
    },
    handover: {
      activated: booking?.status === 'active' || booking?.status === 'completed',
    },
  };
  
  const currentStepIndex = getCurrentStepIndex(completion);
  
  // Set initial step to the current step, then only auto-advance when the user completes the active step
  useEffect(() => {
    // Initial sync once data is loaded
    if (!hasInitializedStepRef.current) {
      const step = OPS_STEPS[currentStepIndex];
      if (step && step.id !== activeStep) {
        setActiveStep(step.id);
      }
      hasInitializedStepRef.current = true;
      return;
    }

    const activeStepIndex = OPS_STEPS.findIndex(s => s.id === activeStep);
    if (activeStepIndex === currentStepIndex - 1 && currentStepIndex < OPS_STEPS.length) {
      const nextStep = OPS_STEPS[currentStepIndex];
      setActiveStep(nextStep.id);
      toast.success(`Step completed — moving to ${nextStep.title}`);
    }
  }, [currentStepIndex, activeStep]);
  
  const handleBack = () => {
    const returnTo = searchParams.get("returnTo") || "/admin/bookings";
    navigate(returnTo);
  };
  
  const handleActivateRental = () => {
    // Validate all prerequisites
    if (!checkStepComplete("walkaround", completion)) {
      toast.error("Complete walkaround inspection before activating");
      return;
    }
    if (!isPaymentComplete) {
      toast.error("Payment must be collected before activation");
      return;
    }
    if (!isAgreementSigned) {
      toast.error("Agreement must be signed before activation");
      return;
    }
    
    setConfirmDialog({ open: true, action: "activate" });
  };
  
  const handleCancelBooking = () => {
    setConfirmDialog({ open: true, action: "cancel" });
  };
  
  const confirmAction = () => {
    if (!bookingId) return;
    
    if (confirmDialog.action === "activate") {
      updateStatus.mutate(
        { bookingId, newStatus: "active" },
        {
          onSuccess: () => {
            toast.success("Rental activated successfully!");
          },
        }
      );
    } else if (confirmDialog.action === "cancel") {
      updateStatus.mutate(
        { bookingId, newStatus: "cancelled" },
        {
          onSuccess: () => {
            toast.success("Booking cancelled");
            navigate("/admin/bookings");
          },
        }
      );
    }
    
    setConfirmDialog({ open: false, action: null });
  };
  
  const handleCompleteStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < OPS_STEPS.length) {
      setActiveStep(OPS_STEPS[nextIndex].id);
    }
  };
  
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
          <Button onClick={handleBack}>Back to Bookings</Button>
        </div>
      </AdminShell>
    );
  }
  
  const vehicleName = booking.vehicles 
    ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
    : "No vehicle assigned";
  
  const isRentalActive = booking.status === "active" || booking.status === "completed";
  
  return (
    <AdminShell hideNav>
      <div className="h-[calc(100vh-2rem)] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold">Operations Console</h1>
                <Badge variant="outline" className="font-mono">
                  {booking.booking_code}
                </Badge>
                <Badge 
                  className={
                    booking.status === "active" ? "bg-emerald-500" :
                    booking.status === "confirmed" ? "bg-blue-500" :
                    booking.status === "cancelled" ? "bg-destructive" :
                    "bg-amber-500"
                  }
                >
                  {booking.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {booking.profiles?.full_name} • {vehicleName} • {format(new Date(booking.start_at), "PPp")}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isRentalActive && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={handleCancelBooking}
                  >
                    Cancel Booking
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Stepper Panel */}
          <OpsStepSidebar
            steps={OPS_STEPS}
            activeStep={activeStep}
            completion={completion}
            currentStepIndex={currentStepIndex}
            onStepClick={handleStepClick}
            isRentalActive={isRentalActive}
          />
          
          {/* Main Content Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-6 max-w-3xl">
                <OpsStepContent
                  stepId={activeStep}
                  booking={booking}
                  completion={completion}
                  verifications={verifications || []}
                  onCompleteStep={handleCompleteStep}
                  onActivate={handleActivateRental}
                  isRentalActive={isRentalActive}
                />
              </div>
            </ScrollArea>
            
            {/* Sticky Footer */}
            {!isRentalActive && activeStep === "handover" && checkStepComplete("walkaround", completion) && (
              <div className="border-t bg-background p-4 flex justify-end gap-3">
                <Button
                  size="lg"
                  onClick={handleActivateRental}
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    "Activate Rental"
                  )}
                </Button>
              </div>
            )}
          </div>
          
          {/* Right Summary Panel (hidden on smaller screens) */}
          <div className="hidden xl:block w-80 border-l bg-muted/30">
            <OpsBookingSummary booking={booking} />
          </div>
        </div>
      </div>
      
      {/* Confirm Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "activate" ? "Activate Rental" : "Cancel Booking"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "activate" 
                ? "This will start the rental period. The customer will receive the keys and the rental timer begins. This action cannot be easily undone."
                : "Are you sure you want to cancel this booking? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction}
              className={confirmDialog.action === "cancel" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {confirmDialog.action === "activate" ? "Activate Rental" : "Cancel Booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
