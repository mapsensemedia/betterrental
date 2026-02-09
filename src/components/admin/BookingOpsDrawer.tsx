import { useState, useRef } from "react";
import { displayName } from "@/lib/format-customer";
import { format } from "date-fns";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// Components
import { OpsTopBar } from "./ops/OpsTopBar";
import { NextStepCard } from "./ops/NextStepCard";
import { ReadinessBadges, type ReadinessItem } from "./ops/ReadinessBadges";
import { CompactTaskRow } from "./ops/CompactTaskRow";
import { IntakeChecklist } from "./IntakeChecklist";
import { VehiclePrepChecklist } from "./VehiclePrepChecklist";
import { PreInspectionPhotos } from "./PreInspectionPhotos";
import { VehicleReadyGate } from "./VehicleReadyGate";
import { VehicleAssignment } from "./VehicleAssignment";
import { CheckInSection } from "./CheckInSection";
import { PaymentDepositPanel } from "./PaymentDepositPanel";
import { RentalAgreementPanel } from "./RentalAgreementPanel";
import { WalkaroundInspection } from "./WalkaroundInspection";
import { BookingModificationPanel } from "./ops/BookingModificationPanel";
import { BookingEditPanel } from "./ops/BookingEditPanel";
import { CounterUpsellPanel } from "./ops/CounterUpsellPanel";
import { useAvailableDrivers } from "@/hooks/use-available-drivers";
import { useAssignDriver, useUnassignDriver } from "@/hooks/use-assign-driver";

// Hooks
import { useBookingById, useUpdateBookingStatus } from "@/hooks/use-bookings";
import { useBookingReceipts, useCreateReceipt, useIssueReceipt } from "@/hooks/use-receipts";
import { useUpdateVerificationStatus } from "@/hooks/use-verification";
import { useIntakeStatus } from "@/hooks/use-intake-status";
import { useWalkaroundInspection } from "@/hooks/use-walkaround";
import { useVehiclePrepStatus } from "@/hooks/use-vehicle-prep";
import { useBookingConditionPhotos, REQUIRED_PHOTOS, getPhotoCompletionStatus } from "@/hooks/use-condition-photos";
import { useCheckInRecord } from "@/hooks/use-checkin";
import { usePaymentDepositStatus } from "@/hooks/use-payment-deposit";
import { useRentalAgreement } from "@/hooks/use-rental-agreement";
import { useOpsNextStep } from "@/hooks/use-ops-next-step";
import { useSignedStorageUrl } from "@/hooks/use-signed-storage-url";

import { 
  CreditCard, 
  FileCheck, 
  Camera, 
  AlertTriangle,
  Clock,
  DollarSign,
  Fuel,
  Gauge,
  FileText,
  Banknote,
  Receipt,
  Eye,
  Wrench,
  UserCheck,
  ClipboardCheck,
  CalendarClock,
  ShoppingCart,
  User,
  Truck,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingOpsDrawerProps {
  bookingId: string | null;
  open: boolean;
  onClose: () => void;
}

const statusFlow: BookingStatus[] = ["pending", "confirmed", "active", "completed"];

export function BookingOpsDrawer({ bookingId, open, onClose }: BookingOpsDrawerProps) {
  const { data: booking, isLoading } = useBookingById(bookingId);
  const updateStatus = useUpdateBookingStatus();
  const { data: receipts = [] } = useBookingReceipts(bookingId);
  const createReceipt = useCreateReceipt();
  const issueReceipt = useIssueReceipt();
  const updateVerification = useUpdateVerificationStatus();
  const intakeStatus = useIntakeStatus(booking);
  const { data: walkaround } = useWalkaroundInspection(bookingId);
  const { data: prepStatus } = useVehiclePrepStatus(bookingId || "");
  const { data: photos } = useBookingConditionPhotos(bookingId || "");
  const { data: checkinRecord } = useCheckInRecord(bookingId || "");
  const { data: depositData } = usePaymentDepositStatus(bookingId || "");
  const { data: agreement } = useRentalAgreement(bookingId || "");
  const { data: drivers } = useAvailableDrivers();
  const assignDriver = useAssignDriver();
  const unassignDriver = useUnassignDriver();
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const isDeliveryBooking = !!booking?.pickup_address;

  // Refs for scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = (section: string) => {
    setExpandedSections(prev => [...new Set([...prev, section])]);
    setTimeout(() => {
      sectionRefs.current[section]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Compute readiness
  const pickupPhotos = photos?.pickup || [];
  const photoStatus = getPhotoCompletionStatus(pickupPhotos, 'pickup');
  const isCheckedIn = checkinRecord?.checkInStatus === 'passed' || checkinRecord?.checkInStatus === 'needs_review';
  const isPaymentComplete = depositData?.paymentStatus === 'paid';
  const isDepositCollected = depositData?.depositStatus === 'held' || depositData?.depositStatus === 'released';
  const isAgreementSigned = agreement?.status === 'signed' || agreement?.status === 'confirmed';
  
  // Next step logic
  const { step: nextStep, isComplete: allStepsComplete } = useOpsNextStep({
    status: booking?.status || "pending",
    vehicleAssigned: !!booking?.vehicle_id,
    prepComplete: prepStatus?.allComplete || false,
    prepCount: { done: prepStatus?.completedCount || 0, total: prepStatus?.totalCount || 6 },
    photosComplete: photoStatus.complete,
    photosCount: { done: photoStatus.uploaded.length, total: REQUIRED_PHOTOS.length },
    checkedIn: isCheckedIn,
    paymentComplete: isPaymentComplete,
    depositCollected: isDepositCollected,
    agreementSigned: isAgreementSigned,
    walkaroundComplete: walkaround?.inspection_complete || false,
    walkaroundAcknowledged: walkaround?.customer_acknowledged || false,
    onActivate: () => handleStatusChange("active"),
    scrollTo: scrollToSection,
  });
  
  // State
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; status: BookingStatus | null }>({ 
    open: false, 
    status: null 
  });
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  
  // Receipt dialog
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptDraft, setReceiptDraft] = useState<{
    lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    notes: string;
  }>({ lineItems: [], notes: "" });
  
  // Verification dialog
  const [verificationReviewOpen, setVerificationReviewOpen] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<any | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");

  const { data: selectedVerificationUrl } = useSignedStorageUrl({
    bucket: "verification-documents",
    path: selectedVerification?.document_url ?? null,
    expiresIn: 60 * 30,
    enabled: verificationReviewOpen,
  });

  const handleStatusChange = (newStatus: BookingStatus) => {
    if (newStatus === "active" && booking?.status === "confirmed") {
      if (!walkaround?.inspection_complete) {
        toast.error("Walkaround inspection must be completed before handover");
        return;
      }
    }
    setConfirmDialog({ open: true, status: newStatus });
  };

  const confirmStatusChange = () => {
    if (confirmDialog.status && bookingId) {
      updateStatus.mutate({ bookingId, newStatus: confirmDialog.status });
      setConfirmDialog({ open: false, status: null });
    }
  };

  const hasReceipt = receipts.length > 0;
  const issuedReceipts = receipts.filter((r: any) => r.status === 'issued');

  const handleOpenReceiptDialog = () => {
    if (!booking) return;
    const lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }> = [];
    lineItems.push({
      description: `${booking.vehicles?.year} ${booking.vehicles?.make} ${booking.vehicles?.model} - ${booking.total_days} days`,
      quantity: booking.total_days,
      unitPrice: Number(booking.daily_rate),
      total: Number(booking.subtotal),
    });
    booking.addOns?.forEach((addon: any) => {
      lineItems.push({
        description: addon.add_ons?.name || 'Add-on',
        quantity: addon.quantity || 1,
        unitPrice: Number(addon.price) / (addon.quantity || 1),
        total: Number(addon.price),
      });
    });
    setReceiptDraft({ lineItems, notes: "" });
    setReceiptDialogOpen(true);
  };

  const handleCreateAndIssueReceipt = async () => {
    if (!booking) return;
    const subtotal = receiptDraft.lineItems.reduce((sum, item) => sum + item.total, 0);
    const tax = Number(booking.tax_amount) || 0;
    const total = subtotal + tax;
    try {
      const result = await createReceipt.mutateAsync({
        bookingId: booking.id,
        lineItems: receiptDraft.lineItems,
        totals: { subtotal, tax, total },
        notes: receiptDraft.notes || undefined,
      });
      await issueReceipt.mutateAsync(result.id);
      setReceiptDialogOpen(false);
    } catch (error) {
      console.error('Failed to create receipt:', error);
    }
  };

  const handleVerificationReview = (verification: any) => {
    setSelectedVerification(verification);
    setVerificationNotes(verification.reviewer_notes || "");
    setVerificationReviewOpen(true);
  };

  const handleUpdateVerification = (status: 'verified' | 'rejected') => {
    if (!selectedVerification) return;
    updateVerification.mutate({
      requestId: selectedVerification.id,
      status,
      notes: verificationNotes,
    }, {
      onSuccess: () => {
        setVerificationReviewOpen(false);
        setSelectedVerification(null);
        setVerificationNotes("");
      },
    });
  };

  // Readiness badges
  const readinessItems: ReadinessItem[] = booking ? [
    {
      id: "vehicle",
      label: "Vehicle",
      status: booking.vehicle_id ? "complete" : "incomplete",
      onClick: () => scrollToSection("vehicle"),
    },
    {
      id: "id",
      label: "ID Verified",
      status: booking.verifications?.some((v: any) => v.status === "verified") ? "complete" : 
              booking.verifications?.some((v: any) => v.status === "pending") ? "pending" : "incomplete",
      onClick: () => scrollToSection("checkin"),
    },
    {
      id: "payment",
      label: "Payment",
      status: isPaymentComplete ? "complete" : "incomplete",
      onClick: () => scrollToSection("payment"),
    },
    {
      id: "deposit",
      label: "Deposit",
      status: isDepositCollected ? "complete" : "incomplete",
      onClick: () => scrollToSection("payment"),
    },
    {
      id: "agreement",
      label: "Agreement",
      status: isAgreementSigned ? "complete" : "incomplete",
      onClick: () => scrollToSection("agreement"),
    },
    {
      id: "walkaround",
      label: "Walkaround",
      status: walkaround?.inspection_complete && walkaround?.customer_acknowledged ? "complete" : 
              walkaround?.inspection_complete ? "pending" : "incomplete",
      onClick: () => scrollToSection("walkaround"),
    },
  ] : [];

  if (!open) return null;

  const vehicleName = booking?.vehicles 
    ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
    : "No vehicle";

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent className="w-full sm:max-w-xl overflow-hidden p-0 flex flex-col">
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b bg-muted/30 shrink-0">
            <SheetTitle className="text-base">Booking Operations</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1" ref={scrollContainerRef}>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
              </div>
            ) : booking ? (
              <div className="p-4 space-y-4">
                {/* Top Bar */}
                <OpsTopBar
                  bookingCode={booking.booking_code}
                  status={booking.status}
                  customerName={displayName(booking.profiles?.full_name, null)}
                  vehicleName={vehicleName}
                  pickupDate={booking.start_at}
                  locationName={booking.locations?.name || null}
                  onCancel={() => handleStatusChange("cancelled")}
                  onChangeVehicle={() => scrollToSection("vehicle")}
                  canChangeVehicle={["pending", "confirmed"].includes(booking.status)}
                  onEditBooking={() => scrollToSection("edit-booking")}
                  canEditBooking={["pending", "confirmed"].includes(booking.status)}
                />

                <Separator />

                {/* Next Step Card */}
                <NextStepCard 
                  step={nextStep} 
                  isComplete={allStepsComplete || booking.status === "active"} 
                />

                {/* Readiness Badges */}
                {booking.status === "confirmed" && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Readiness</p>
                    <ReadinessBadges items={readinessItems} />
                  </div>
                )}

                <Separator />

                {/* Collapsible Details */}
                <Accordion 
                  type="multiple" 
                  value={expandedSections}
                  onValueChange={setExpandedSections}
                  className="space-y-2"
                >
                  {/* Intake Section */}
                  {(booking.status === "pending" || booking.status === "confirmed") && (
                    <AccordionItem value="intake" className="border rounded-lg">
                      <div ref={(el) => (sectionRefs.current["intake"] = el)}>
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <ClipboardCheck className="w-4 h-4" />
                            Intake Checklist
                            <Badge variant={intakeStatus.isComplete ? "default" : "secondary"} className="ml-2 text-xs">
                              {intakeStatus.completedCount}/{intakeStatus.totalRequired}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <IntakeChecklist intakeStatus={intakeStatus} />
                        </AccordionContent>
                      </div>
                    </AccordionItem>
                  )}

                  {/* Vehicle Assignment */}
                  {(booking.status === "pending" || booking.status === "confirmed") && (
                    <AccordionItem value="vehicle" className="border rounded-lg">
                      <div ref={(el) => (sectionRefs.current["vehicle"] = el)}>
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                          <CompactTaskRow
                            title="Vehicle Assignment"
                            isComplete={!!booking.vehicle_id}
                            summary={booking.vehicle_id ? vehicleName : "No vehicle assigned"}
                          />
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <VehicleAssignment
                            bookingId={booking.id}
                            currentVehicleId={booking.vehicle_id}
                            currentVehicle={booking.vehicles}
                            locationId={booking.location_id}
                            startAt={booking.start_at}
                            endAt={booking.end_at}
                          />
                        </AccordionContent>
                      </div>
                    </AccordionItem>
                  )}

                  {/* Vehicle Prep */}
                  {booking.status === "confirmed" && (
                    <AccordionItem value="prep" className="border rounded-lg">
                      <div ref={(el) => (sectionRefs.current["prep"] = el)}>
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                          <CompactTaskRow
                            title="Vehicle Prep"
                            isComplete={prepStatus?.allComplete || false}
                            summary={prepStatus?.allComplete 
                              ? "All items complete" 
                              : `${prepStatus?.completedCount || 0}/${prepStatus?.totalCount || 6} items`}
                          />
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <VehiclePrepChecklist bookingId={booking.id} />
                        </AccordionContent>
                      </div>
                    </AccordionItem>
                  )}

                  {/* Pre-Inspection Photos */}
                  {booking.status === "confirmed" && (
                    <AccordionItem value="photos" className="border rounded-lg">
                      <div ref={(el) => (sectionRefs.current["photos"] = el)}>
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                          <CompactTaskRow
                            title="Pre-Inspection Photos"
                            isComplete={photoStatus.complete}
                            summary={photoStatus.complete 
                              ? "All photos captured" 
                              : `Missing: ${photoStatus.missing.join(", ")}`}
                          />
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <PreInspectionPhotos bookingId={booking.id} />
                        </AccordionContent>
                      </div>
                    </AccordionItem>
                  )}

                  {/* Check-In */}
                  {booking.status === "confirmed" && (
                    <AccordionItem value="checkin" className="border rounded-lg">
                      <div ref={(el) => (sectionRefs.current["checkin"] = el)}>
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                          <CompactTaskRow
                            title="Customer Check-In"
                            isComplete={isCheckedIn}
                            summary={isCheckedIn ? "Verified" : "Pending verification"}
                          />
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <CheckInSection
                            bookingId={booking.id}
                            bookingStartAt={booking.start_at}
                            customerName={displayName(booking.profiles?.full_name, null)}
                            licenseOnFile={booking.profiles?.driver_license_status === 'on_file'}
                            licenseExpiryFromProfile={booking.profiles?.driver_license_expiry || null}
                          />
                        </AccordionContent>
                      </div>
                    </AccordionItem>
                  )}

                  {/* Payment & Deposit */}
                  {booking.status === "confirmed" && (
                    <AccordionItem value="payment" className="border rounded-lg">
                      <div ref={(el) => (sectionRefs.current["payment"] = el)}>
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                          <CompactTaskRow
                            title="Payment & Deposit"
                            isComplete={isPaymentComplete && isDepositCollected}
                            summary={
                              isPaymentComplete && isDepositCollected 
                                ? "Authorization Held" 
                                : "Awaiting Checkout"
                            }
                          />
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <PaymentDepositPanel bookingId={booking.id} />
                        </AccordionContent>
                      </div>
                    </AccordionItem>
                  )}

                  {/* Agreement */}
                  {booking.status === "confirmed" && (
                    <AccordionItem value="agreement" className="border rounded-lg">
                      <div ref={(el) => (sectionRefs.current["agreement"] = el)}>
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                          <CompactTaskRow
                            title="Rental Agreement"
                            isComplete={isAgreementSigned}
                            summary={isAgreementSigned ? "Signed" : "Awaiting signature"}
                          />
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <RentalAgreementPanel bookingId={booking.id} customerName={displayName(booking.profiles?.full_name)} />
                        </AccordionContent>
                      </div>
                    </AccordionItem>
                  )}

                  {/* Walkaround */}
                  {booking.status === "confirmed" && (
                    <AccordionItem value="walkaround" className="border rounded-lg">
                      <div ref={(el) => (sectionRefs.current["walkaround"] = el)}>
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                          <CompactTaskRow
                            title="Walkaround Inspection"
                            isComplete={walkaround?.inspection_complete && walkaround?.customer_acknowledged}
                            summary={
                              walkaround?.inspection_complete && walkaround?.customer_acknowledged
                                ? "Complete & acknowledged"
                                : walkaround?.inspection_complete
                                  ? "Awaiting customer acknowledgement"
                                  : "Not started"
                            }
                          />
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <WalkaroundInspection bookingId={booking.id} />
                        </AccordionContent>
                      </div>
                    </AccordionItem>
                  )}

                  {/* Vehicle Ready Gate */}
                  {booking.status === "confirmed" && (
                    <AccordionItem value="ready" className="border rounded-lg">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Wrench className="w-4 h-4" />
                          Vehicle Ready Gate
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <VehicleReadyGate bookingId={booking.id} currentStatus={booking.status} />
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Driver Assignment (Delivery Bookings) */}
                  {isDeliveryBooking && (booking.status === "confirmed" || booking.status === "pending") && (
                    <AccordionItem value="driver" className="border rounded-lg">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                        <CompactTaskRow
                          title="Driver Assignment"
                          isComplete={!!booking.assigned_driver_id}
                          summary={
                            booking.assigned_driver_id
                              ? drivers?.find((d: any) => d.id === booking.assigned_driver_id)?.fullName || "Assigned"
                              : "No driver assigned"
                          }
                        />
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        {booking.assigned_driver_id ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <User className="h-4 w-4 text-emerald-600" />
                              <span className="font-medium text-sm">
                                {drivers?.find((d: any) => d.id === booking.assigned_driver_id)?.fullName || "Assigned Driver"}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-destructive"
                              onClick={() => unassignDriver.mutate(booking.id)}
                              disabled={unassignDriver.isPending}
                            >
                              Unassign Driver
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select a driver" />
                              </SelectTrigger>
                              <SelectContent>
                                {drivers?.map((driver: any) => (
                                  <SelectItem key={driver.id} value={driver.id}>
                                    <div className="flex items-center gap-2">
                                      <User className="h-3 w-3" />
                                      {driver.fullName}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (selectedDriverId) {
                                  assignDriver.mutate(
                                    { bookingId: booking.id, driverId: selectedDriverId },
                                    { onSuccess: () => setSelectedDriverId("") }
                                  );
                                }
                              }}
                              disabled={!selectedDriverId || assignDriver.isPending}
                            >
                              {assignDriver.isPending ? "..." : "Assign"}
                            </Button>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Receipts */}
                  <AccordionItem value="receipts" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Receipt className="w-4 h-4" />
                        Receipts
                        {issuedReceipts.length > 0 && (
                          <Badge className="ml-2 text-xs bg-emerald-500">{issuedReceipts.length}</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-3">
                      {issuedReceipts.length > 0 ? (
                        <div className="space-y-2">
                          {issuedReceipts.map((receipt: any) => (
                            <div key={receipt.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                              <div>
                                <p className="font-mono text-sm">{receipt.receipt_number}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(receipt.issued_at), "PPp")}
                                </p>
                              </div>
                              <Badge className="bg-emerald-500/10 text-emerald-600">
                                ${(receipt.totals_json as any)?.total?.toFixed(2)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No receipts issued yet</p>
                      )}
                      <Button size="sm" className="w-full" onClick={handleOpenReceiptDialog}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        {hasReceipt ? "New Receipt" : "Create Receipt"}
                      </Button>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Counter Upsell */}
                  {(booking.status === "pending" || booking.status === "confirmed" || booking.status === "active") && (
                    <AccordionItem value="upsell" className="border rounded-lg">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <ShoppingCart className="w-4 h-4" />
                          Counter Upsell
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <CounterUpsellPanel bookingId={booking.id} rentalDays={booking.total_days} />
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Edit Booking Details */}
                  <AccordionItem value="edit-booking" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CalendarClock className="w-4 h-4" />
                        {(booking.status === "pending" || booking.status === "confirmed") 
                          ? "Edit Booking Details" 
                          : "Booking Details"}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <BookingEditPanel booking={booking} />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Modify Rental Duration (for active bookings) */}
                  {booking.status === "active" && (
                    <AccordionItem value="modify" className="border rounded-lg">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <CalendarClock className="w-4 h-4" />
                          Extend Rental Duration
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <BookingModificationPanel booking={booking} />
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Booking not found</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Confirm Status Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, status: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.status === "cancelled" 
                ? "Are you sure you want to cancel this booking? This action cannot be undone."
                : confirmDialog.status === "active"
                  ? "This will activate the rental. The customer will receive keys and the rental period begins."
                  : `Change booking status to "${confirmDialog.status}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStatusChange}
              className={confirmDialog.status === "cancelled" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {confirmDialog.status === "active" ? "Activate Rental" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {receiptDraft.lineItems.map((item, i) => (
              <div key={i} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg text-sm">
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} × ${item.unitPrice.toFixed(2)}</p>
                </div>
                <span className="font-medium">${item.total.toFixed(2)}</span>
              </div>
            ))}
            {booking && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${receiptDraft.lineItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${Number(booking.tax_amount || 0).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${(receiptDraft.lineItems.reduce((sum, item) => sum + item.total, 0) + Number(booking.tax_amount || 0)).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAndIssueReceipt} disabled={createReceipt.isPending || issueReceipt.isPending}>
              {createReceipt.isPending || issueReceipt.isPending ? "Creating..." : "Issue Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verification Review Dialog */}
      <Dialog open={verificationReviewOpen} onOpenChange={setVerificationReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Document</DialogTitle>
          </DialogHeader>
          {selectedVerification && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Document Type</Label>
                <p className="text-sm font-medium">{selectedVerification.document_type}</p>
              </div>
              <div className="border rounded-lg p-2">
                <img
                  src={selectedVerificationUrl || "/placeholder.svg"}
                  alt="Verification document"
                  loading="lazy"
                  className="max-w-full max-h-[300px] object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Review notes..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVerificationReviewOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleUpdateVerification('rejected')} disabled={updateVerification.isPending}>
              Reject
            </Button>
            <Button onClick={() => handleUpdateVerification('verified')} disabled={updateVerification.isPending}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
