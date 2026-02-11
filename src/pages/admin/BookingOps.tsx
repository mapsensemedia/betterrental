import { useEffect, useRef, useState } from "react";
import { displayName } from "@/lib/format-customer";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { BookingEditPanel } from "@/components/admin/ops/BookingEditPanel";
import { PanelShell } from "@/components/shared/PanelShell";
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
import { MobileBookingSummary } from "@/components/admin/ops/MobileBookingSummary";
import { OpsActivityTimeline } from "@/components/admin/ops/OpsActivityTimeline";
import { CreateIncidentDialog } from "@/components/admin/CreateIncidentDialog";
import { CancelBookingDialog } from "@/components/admin/CancelBookingDialog";
import { DeliveryModeBanner } from "@/components/admin/ops/DeliveryModeBanner";

// Hooks
import { useBookingById, useUpdateBookingStatus } from "@/hooks/use-bookings";
import { useWalkaroundInspection } from "@/hooks/use-walkaround";
import { useVehiclePrepStatus } from "@/hooks/use-vehicle-prep";
import { useBookingConditionPhotos, REQUIRED_PHOTOS, getPhotoCompletionStatus } from "@/hooks/use-condition-photos";
import { useCheckInRecord } from "@/hooks/use-checkin";
import { usePaymentDepositStatus } from "@/hooks/use-payment-deposit";
import { useRentalAgreement } from "@/hooks/use-rental-agreement";
import { useBookingVerification } from "@/hooks/use-verification";
import { useCheckVehicleAvailability } from "@/hooks/use-vehicle-assignment";
import { useAvailableDrivers } from "@/hooks/use-available-drivers";
import { useRealtimeDeliveryStatuses } from "@/hooks/use-realtime-subscriptions";

// Types
import { OPS_STEPS, OPS_STEPS_DELIVERY_PRE, getOpsSteps, type OpsStepId, type StepCompletion, getCurrentStepIndex, checkStepComplete } from "@/lib/ops-steps";
import { ArrowLeft, MoreVertical, X, Loader2, Wrench, Truck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

export default function BookingOps() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
  
  // Subscribe to real-time delivery status updates (driver marking en route, arrived, etc.)
  useRealtimeDeliveryStatuses(bookingId);
  
  // Check for vehicle conflicts
  const { data: vehicleAvailability } = useCheckVehicleAvailability(
    booking?.vehicle_id || null,
    booking?.start_at || null,
    booking?.end_at || null,
    bookingId // exclude current booking
  );
  
  // Get available drivers for delivery bookings
  const { data: drivers } = useAvailableDrivers();
  
  const [activeStep, setActiveStep] = useState<OpsStepId>("checkin");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: string | null }>({ 
    open: false, 
    action: null 
  });
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  // Prevent the auto-advance effect from overriding manual navigation
  const hasInitializedStepRef = useRef(false);

  // Determine if this is a delivery booking
  const isDeliveryBooking = !!booking?.pickup_address;
  
  // Get driver info for delivery bookings
  const assignedDriver = drivers?.find(d => d.id === booking?.assigned_driver_id);
  const driverInfo = assignedDriver 
    ? { fullName: assignedDriver.fullName, phone: assignedDriver.phone }
    : null;

  const handleStepClick = (stepId: OpsStepId) => {
    hasInitializedStepRef.current = true;
    setActiveStep(stepId);
  };
  
  // Compute completion status
  const pickupPhotos = photos?.pickup || [];
  const photoStatus = getPhotoCompletionStatus(pickupPhotos, 'pickup');
  const checkinPassed = checkinRecord?.checkInStatus === 'passed';
  const isPaymentComplete = depositData?.paymentStatus === 'paid';
  const isDepositCollected = depositData?.depositStatus === 'held' || depositData?.depositStatus === 'released';
  const isAgreementSigned = agreement?.status === 'signed' || agreement?.status === 'confirmed';
  
  // License status - now from profile
  const licenseOnFile = booking?.profiles?.driver_license_status === 'on_file';
  
  // Vehicle conflict detection
  const hasVehicleConflict = vehicleAvailability?.isAvailable === false && 
    (vehicleAvailability?.conflicts?.length || 0) > 0;
  const conflictDetails = vehicleAvailability?.conflicts || [];
  
  // Delivery status tracking
  const deliveryStatus = booking?.delivery_statuses?.status;
  const isDriverEnRoute = deliveryStatus === 'en_route' || deliveryStatus === 'picked_up';
  const isDriverArrived = deliveryStatus === 'delivered';
  
  
  // Get the correct steps based on booking type
  const steps = getOpsSteps(isDeliveryBooking);
  
  // Add prep and dispatch completion for delivery bookings
  const prepCompletion = isDeliveryBooking ? {
    unitAssigned: !!booking?.assigned_unit_id,
    vehiclePrepared: !!prepStatus?.allComplete,
  } : undefined;
  
  const dispatchCompletion = isDeliveryBooking ? {
    driverAssigned: !!booking?.assigned_driver_id,
    dispatched: deliveryStatus === 'picked_up' || deliveryStatus === 'en_route' || deliveryStatus === 'delivered',
  } : undefined;

  // Intake is auto-completed for delivery bookings
  const intakeCompletion = isDeliveryBooking ? {
    reviewed: true, // Auto-completed — no manual step needed
  } : undefined;

  const readyLineCompletion = isDeliveryBooking ? {
    unitAssigned: !!booking?.assigned_unit_id,
    checklistComplete: !!prepStatus?.allComplete,
    photosComplete: photoStatus.complete,
    fuelRecorded: false, // TODO: check inspection_metrics
    odometerRecorded: false, // TODO: check inspection_metrics
    pricingLocked: !!(booking as any)?.pricing_locked_at,
  } : undefined;

  const opsActivateCompletion = isDeliveryBooking ? {
    activated: booking?.status === 'active' || booking?.status === 'completed',
  } : undefined;
  
  const completion: StepCompletion = {
    checkin: {
      govIdVerified: checkinPassed || checkinRecord?.identityVerified || false,
      licenseOnFile: checkinPassed || licenseOnFile,
      nameMatches: checkinPassed || checkinRecord?.licenseNameMatches || false,
      licenseNotExpired: checkinPassed || checkinRecord?.licenseValid || false,
      ageVerified: checkinPassed || checkinRecord?.ageVerified || false,
      driverEnRoute: isDeliveryBooking ? isDriverEnRoute : undefined,
      driverArrived: isDeliveryBooking ? isDriverArrived : undefined,
    },
    payment: {
      paymentComplete: isPaymentComplete,
      depositCollected: isDepositCollected,
    },
    prep: prepCompletion,
    agreement: {
      agreementSigned: isAgreementSigned,
    },
    walkaround: {
      inspectionComplete: walkaround?.inspection_complete || false,
      fuelRecorded: walkaround?.fuel_level != null && walkaround.fuel_level >= 0,
      odometerRecorded: walkaround?.odometer_reading != null && walkaround.odometer_reading > 0,
    },
    photos: {
      photosComplete: photoStatus.complete,
    },
    dispatch: dispatchCompletion,
    handover: {
      activated: booking?.status === 'active' || booking?.status === 'completed',
      smsSent: !!booking?.handover_sms_sent_at,
      unitAssigned: !!booking?.assigned_unit_id,
    },
    // New delivery pipeline stages
    intake: intakeCompletion,
    readyLine: readyLineCompletion,
    opsActivate: opsActivateCompletion,
  };
  
  const currentStepIndex = getCurrentStepIndex(completion, isDeliveryBooking);
  
  // Set initial step only once when data loads - no auto-advance
  useEffect(() => {
    if (!hasInitializedStepRef.current && booking) {
      // Start on the first incomplete step, or last step if all complete
      const step = steps[currentStepIndex];
      if (step && step.id !== activeStep) {
        setActiveStep(step.id);
      }
      hasInitializedStepRef.current = true;
    }
  }, [booking, currentStepIndex, steps]);
  
  // Handle manual step completion - move to next step when user clicks button
  const handleCompleteStep = () => {
    const activeStepIndex = steps.findIndex(s => s.id === activeStep);
    const nextIndex = activeStepIndex + 1;
    if (nextIndex < steps.length) {
      setActiveStep(steps[nextIndex].id);
      toast.success(`Moving to ${steps[nextIndex].title}`);
    }
  };
  
  const handleBack = () => {
    // Context-aware navigation
    const isOpsContext = location.pathname.startsWith("/ops");
    const returnTo = searchParams.get("returnTo");
    if (returnTo) {
      navigate(returnTo);
    } else {
      navigate(isOpsContext ? "/ops/pickups" : "/admin/bookings");
    }
  };
  
  const handleActivateRental = () => {
    // Validate all prerequisites
    if (!booking?.assigned_unit_id) {
      toast.error("Assign a vehicle unit (VIN) before activation");
      return;
    }
    if (!checkStepComplete("walkaround", completion, isDeliveryBooking)) {
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
    setShowCancelDialog(true);
  };
  
  const confirmAction = () => {
    if (!bookingId) return;
    
    if (confirmDialog.action === "activate") {
      updateStatus.mutate(
        { bookingId, newStatus: "active" },
        {
          onSuccess: () => {
            toast.success("Rental activated successfully!", {
              description: "The customer now has the vehicle. Redirecting to active rental...",
              duration: 3000,
            });
            // Redirect to active rental detail page after short delay - context-aware
            const isOpsContext = location.pathname.startsWith("/ops");
            setTimeout(() => {
              navigate(isOpsContext ? `/ops/rental/${bookingId}` : `/admin/active-rentals/${bookingId}`);
            }, 1500);
          },
        }
      );
    }
    
    setConfirmDialog({ open: false, action: null });
  };

  // Quick link handlers for summary panel
  const handleOpenAgreement = () => {
    setActiveStep("agreement");
  };
  
  const handleOpenWalkaround = () => {
    setActiveStep("walkaround");
  };
  
  if (isLoading) {
    return (
      <PanelShell>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PanelShell>
    );
  }
  
  if (!booking) {
    return (
      <PanelShell>
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <p className="text-muted-foreground">Booking not found</p>
          <Button onClick={handleBack}>Back to Bookings</Button>
        </div>
      </PanelShell>
    );
  }
  
  const vehicleName = booking.vehicles 
    ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
    : "No vehicle assigned";
  
  const isRentalActive = booking.status === "active" || booking.status === "completed";
  
  return (
    <PanelShell hideNav>
      <div className="h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 border-b bg-background shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0 h-8 w-8 sm:h-9 sm:w-9">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-wrap">
                <h1 className="text-sm sm:text-base md:text-lg font-semibold truncate">Ops</h1>
                <Badge variant="outline" className="font-mono text-[10px] sm:text-xs shrink-0">
                  {booking.booking_code}
                </Badge>
                <Badge 
                  className={cn(
                    "shrink-0 text-[10px] sm:text-xs",
                    booking.status === "active" ? "bg-emerald-500" :
                    booking.status === "confirmed" ? "bg-blue-500" :
                    booking.status === "cancelled" ? "bg-destructive" :
                    "bg-amber-500"
                  )}
                >
                  {booking.status}
                </Badge>
                {hasVehicleConflict && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="destructive" className="shrink-0 text-[10px] gap-1 cursor-help">
                          <AlertCircle className="w-3 h-3" />
                          Conflict
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="font-semibold mb-1">Vehicle Scheduling Conflict</p>
                        <p className="text-xs">
                          {conflictDetails.length > 0 
                            ? `This vehicle overlaps with ${conflictDetails.length} other booking(s): ${conflictDetails.slice(0, 2).map((c) => c.bookingCode || 'Unknown').join(', ')}${conflictDetails.length > 2 ? '...' : ''}`
                            : "Vehicle is already booked during this period."
                          }
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {isDeliveryBooking && (
                  <Badge className="shrink-0 text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Truck className="w-3 h-3 mr-1" />
                    Delivery
                  </Badge>
                )}
              </div>
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 truncate">
                {booking.profiles?.full_name} • <span className="hidden xs:inline">{vehicleName}</span><span className="xs:hidden">{booking.vehicles?.make} {booking.vehicles?.model}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            {/* Mobile Summary Button */}
            <MobileBookingSummary
              booking={booking}
              completion={completion}
              onOpenAgreement={handleOpenAgreement}
              onOpenWalkaround={handleOpenWalkaround}
            />
            {!isRentalActive && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9">
                    <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {["pending", "confirmed"].includes(booking.status) && (
                    <>
                      <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                        Edit Booking Details
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem 
                    onClick={() => setShowIncidentDialog(true)}
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Report Incident
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={handleCancelBooking}
                  >
                    Cancel Booking
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Stepper Panel */}
          <OpsStepSidebar
            steps={steps}
            activeStep={activeStep}
            completion={completion}
            currentStepIndex={currentStepIndex}
            onStepClick={handleStepClick}
            isRentalActive={isRentalActive}
            isDelivery={isDeliveryBooking}
          />
          
          {/* Main Content Panel */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <ScrollArea className="flex-1">
              <div className="p-3 sm:p-4 md:p-6 max-w-3xl">
                {/* Delivery Mode Banner */}
                {isDeliveryBooking && (
                  <DeliveryModeBanner 
                    booking={booking}
                    driverName={driverInfo?.fullName}
                    className="mb-4"
                  />
                )}
                
                <OpsStepContent
                  stepId={activeStep}
                  booking={booking}
                  completion={completion}
                  onCompleteStep={handleCompleteStep}
                  onActivate={handleActivateRental}
                  isRentalActive={isRentalActive}
                  isDelivery={isDeliveryBooking}
                  driverInfo={driverInfo}
                  steps={steps}
                />
              </div>
            </ScrollArea>
            
            {/* Sticky Footer */}
            {!isRentalActive && activeStep === "handover" && checkStepComplete("walkaround", completion, isDeliveryBooking) && (
              <div className="border-t bg-background p-3 md:p-4 flex justify-end gap-2 md:gap-3">
                <Button
                  size="default"
                  className="h-9 md:h-10"
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
          
          {/* Right Summary Panel - STICKY with its own scroll - hidden on mobile/tablet */}
          <div className="hidden xl:flex w-72 2xl:w-80 border-l bg-muted/30 flex-col sticky top-0 h-[calc(100vh-4rem)]">
            <div className="flex-1 overflow-hidden flex flex-col">
              <OpsBookingSummary 
                booking={booking} 
                completion={completion}
                onOpenAgreement={handleOpenAgreement}
                onOpenWalkaround={handleOpenWalkaround}
                isDelivery={isDeliveryBooking}
                driverName={driverInfo?.fullName}
              />
            </div>
            {/* Activity Timeline in right panel */}
            <div className="border-t shrink-0">
              <OpsActivityTimeline bookingId={booking.id} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Confirm Dialog for Activate */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Rental</AlertDialogTitle>
            <AlertDialogDescription>
              This will start the rental period. The customer will receive the keys and the rental timer begins. This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              Activate Rental
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Report Incident Dialog */}
      {booking && (
        <>
          <CreateIncidentDialog
            open={showIncidentDialog}
            onOpenChange={setShowIncidentDialog}
            bookingId={booking.id}
            vehicleId={booking.vehicle_id}
            customerId={booking.user_id}
            bookingCode={booking.booking_code}
            vehicleName={vehicleName}
          />
          <CancelBookingDialog
            open={showCancelDialog}
            onOpenChange={setShowCancelDialog}
            bookingId={booking.id}
            bookingCode={booking.booking_code}
            customerName={displayName(booking.profiles?.full_name) || undefined}
            vehicleName={vehicleName}
            onSuccess={() => navigate(location.pathname.startsWith("/ops") ? "/ops/pickups" : "/admin/bookings")}
          />
        </>
      )}


      {/* Edit Booking Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Booking Details</DialogTitle>
            <DialogDescription>
              Update dates, location, or other booking information.
            </DialogDescription>
          </DialogHeader>
          {booking && <BookingEditPanel booking={booking} />}
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
