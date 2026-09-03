/**
 * Comprehensive Booking Detail Page
 * Shows complete booking information including all associated data
 */
import { useState } from "react";
import { toast } from "sonner";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { format, parseISO, differenceInHours } from "date-fns";
import { AgreementStructuredView } from "@/components/booking/AgreementStructuredView";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { RentalAgreement } from "@/hooks/use-rental-agreement";
import { PanelShell } from "@/components/shared/PanelShell";
import { useBookingById } from "@/hooks/use-bookings";
import { useBookingConditionPhotos } from "@/hooks/use-condition-photos";
import { PhotoLightbox } from "@/components/shared/PhotoLightbox";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateInvoicePdf } from "@/lib/pdf/invoice-pdf";
import { PaymentDepositPanel } from "@/components/admin/PaymentDepositPanel";
import { FinancialBreakdown } from "@/components/admin/ops/FinancialBreakdown";
import { extractEdgeFunctionError } from "@/lib/edge-function-error";
import { buildInvoicePdfData } from "@/lib/pdf/invoice-data-builder";
import {
  PVRT_DAILY_FEE,
  ACSRCH_DAILY_FEE,
  PST_RATE,
  GST_RATE,
} from "@/lib/pricing";
import { getProtectionRateForCategory } from "@/lib/protection-groups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SignedStorageImage } from "@/components/shared/SignedStorageImage";
import { AuditTimeline } from "@/components/shared/AuditTimeline";
import { VoidBookingDialog } from "@/components/admin/VoidBookingDialog";
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
import { useUpdateBookingStatus } from "@/hooks/use-bookings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PriceTooltip, PRICE_TOOLTIPS } from "@/components/shared/PriceTooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  Car, 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  Mail,
  CreditCard,
  FileText,
  Camera,
  AlertTriangle,
  Clock,
  Gauge,
  Download,
  Fuel,
  DollarSign,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Receipt,
  FileCheck,
  Shield,
  MoreVertical,
  Ban,
  Truck,
  Info,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateRentalAgreementPdf } from "@/lib/pdf/rental-agreement-pdf";
import { ChangeVehicleDialog } from "@/components/admin/ChangeVehicleDialog";
import { VehicleHistoryList } from "@/components/admin/VehicleHistoryList";
import { ProcessedBySection } from "@/components/admin/ProcessedBySection";
import { Pencil } from "lucide-react";

function snakeToTitle(str: string): string {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function InspectionNotesDisplay({ notes }: { notes: string }) {
  try {
    const parsed = JSON.parse(notes);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return <p className="text-xs text-muted-foreground">{notes}</p>;
    }
    const entries = Object.entries(parsed);
    if (entries.length === 0) return <p className="text-xs text-muted-foreground">{notes}</p>;

    return (
      <div className="space-y-1 mt-1">
        {entries.map(([key, val]: [string, any]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            {val?.checked ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            )}
            <span className="text-muted-foreground">{snakeToTitle(key)}</span>
            {val?.checkedAt && (
              <span className="text-muted-foreground/60 ml-auto">
                {format(new Date(val.checkedAt), "MMM d, h:mm a")}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  } catch {
    return <p className="text-xs text-muted-foreground">{notes}</p>;
  }
}

function AssignedUnitCard({ unitId }: { unitId: string | null }) {
  const { data: unit, isLoading } = useQuery({
    queryKey: ["assigned-unit", unitId],
    queryFn: async () => {
      if (!unitId) return null;
      const { data } = await supabase
        .from("vehicle_units")
        .select("vin, license_plate, color, status")
        .eq("id", unitId)
        .maybeSingle();
      return data;
    },
    enabled: !!unitId,
  });

  const statusLabels: Record<string, string> = {
    available: "Available",
    on_rent: "On Rent",
    maintenance: "Maintenance",
    retired: "Retired",
    inactive: "Inactive",
  };

  const statusColors: Record<string, string> = {
    available: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    on_rent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    maintenance: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    retired: "bg-muted text-muted-foreground",
    inactive: "bg-muted text-muted-foreground",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Assigned Vehicle Unit
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!unitId ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            <span>No vehicle unit assigned</span>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : !unit ? (
          <p className="text-sm text-muted-foreground">Unit not found</p>
        ) : (
          <div className="space-y-2.5">
            {unit.vin && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">VIN</span>
                <span className="font-mono font-medium">{unit.vin}</span>
              </div>
            )}
            {unit.license_plate && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">License Plate</span>
                <span className="font-mono font-medium bg-muted px-2 py-0.5 rounded">{unit.license_plate}</span>
              </div>
            )}
            {unit.color && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Color</span>
                <span className="capitalize">{unit.color}</span>
              </div>
            )}
            {unit.status && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusColors[unit.status] || "bg-muted text-muted-foreground")}>
                  {statusLabels[unit.status] || unit.status}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AssignedVehicleSection({ booking }: { booking: any }) {
  const [editOpen, setEditOpen] = useState(false);
  const { data: currentUnit } = useQuery({
    queryKey: ["vehicle-unit", booking.assigned_unit_id],
    queryFn: async () => {
      if (!booking.assigned_unit_id) return null;
      const { data, error } = await supabase
        .from("vehicle_units")
        .select("id, vin, license_plate, current_mileage")
        .eq("id", booking.assigned_unit_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!booking.assigned_unit_id,
  });

  const canEdit = booking.status === "active" && !!booking.assigned_unit_id;

  return (
    <div className="space-y-3">
      <div className="relative">
        <AssignedUnitCard unitId={booking.assigned_unit_id} />
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            className="absolute top-3 right-3 h-7 gap-1.5"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-3 w-3" />
            Change
          </Button>
        )}
      </div>
      <VehicleHistoryList bookingId={booking.id} />
      {canEdit && (
        <ChangeVehicleDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          bookingId={booking.id}
          bookingCategoryId={booking.vehicle_id ?? null}
          locationId={booking.location_id}
          currentUnit={currentUnit as any}
        />
      )}
    </div>
  );
}

export default function BookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isOpsContext = location.pathname.startsWith("/ops");
  const returnTo = searchParams.get("returnTo") || (isOpsContext ? "/ops/bookings" : "/admin/bookings");
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isGeneratingAgreement, setIsGeneratingAgreement] = useState(false);
  const [viewingAgreement, setViewingAgreement] = useState<any | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const updateStatus = useUpdateBookingStatus();
  const queryClient = useQueryClient();

  const { data: booking, isLoading, refetch } = useBookingById(bookingId || null);
  const { data: photos, isLoading: photosLoading } = useBookingConditionPhotos(bookingId || "");

  // Fetch damages for this booking
  const { data: damages = [] } = useQuery({
    queryKey: ["booking-damages-detail", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data } = await supabase
        .from("damage_reports")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!bookingId,
  });

  // Fetch inspection metrics
  const { data: inspectionMetrics = [] } = useQuery({
    queryKey: ["booking-inspections-detail", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data } = await supabase
        .from("inspection_metrics")
        .select("*")
        .eq("booking_id", bookingId)
        .order("recorded_at", { ascending: true });
      return data || [];
    },
    enabled: !!bookingId,
  });

  // Fetch deposit ledger
  const { data: depositLedger = [] } = useQuery({
    queryKey: ["booking-deposit-ledger", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data } = await supabase
        .from("deposit_ledger")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!bookingId,
  });

  // Fetch receipts
  const { data: receipts = [] } = useQuery({
    queryKey: ["booking-receipts", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data } = await supabase
        .from("receipts")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!bookingId,
  });

  // Fetch final invoices
  const { data: finalInvoices = [] } = useQuery({
    queryKey: ["booking-final-invoices", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data } = await supabase
        .from("final_invoices")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!bookingId,
  });

  // Fetch incident cases
  const { data: incidents = [] } = useQuery({
    queryKey: ["booking-incidents-detail", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data } = await supabase
        .from("incident_cases")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!bookingId,
  });

  // Fetch rental agreements
  const { data: rentalAgreements = [] } = useQuery({
    queryKey: ["booking-agreements-detail", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data } = await supabase
        .from("rental_agreements")
        .select("id, status, agreement_type, customer_signed_at, signature_png_url, created_at, agreement_content, terms_json, customer_signature, staff_confirmed_by, staff_confirmed_at, signed_manually, signed_manually_at, signed_manually_by, customer_ip_address, updated_at, booking_id")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!bookingId,
  });

  const handleGenerateInvoice = async () => {
    if (!bookingId) return;
    setIsGeneratingInvoice(true);
    try {
      const { data, error } = await supabase.functions.invoke("close-account", {
        body: { bookingId },
      });
      if (error) throw error;
      toast.success("Invoice generated successfully");
      queryClient.invalidateQueries({ queryKey: ["booking-final-invoices", bookingId] });
      refetch();
    } catch (err: any) {
      const msg = await extractEdgeFunctionError(null, err);
      toast.error("Failed to generate invoice: " + msg);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleGenerateAgreement = async (agreementType: "initial" | "extension" = "initial") => {
    if (!bookingId) return;
    setIsGeneratingAgreement(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-agreement", {
        body: { bookingId, agreementType },
      });
      if (error) throw error;
      if (data?.alreadyExists) {
        toast.info(agreementType === "extension" ? "Extension agreement already exists" : "Agreement already exists for this booking");
      } else {
        toast.success(`${agreementType === "extension" ? "Extension" : ""} Agreement generated successfully`);
        queryClient.invalidateQueries({ queryKey: ["booking-agreements-detail", bookingId] });
      }
    } catch (err: any) {
      const msg = await extractEdgeFunctionError(null, err);
      toast.error("Failed to generate agreement: " + msg);
    } finally {
      setIsGeneratingAgreement(false);
    }
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
          <Button onClick={() => navigate(returnTo)}>Go Back</Button>
        </div>
      </PanelShell>
    );
  }

  const vehicleName = booking.vehicles 
    ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
    : "No vehicle";

  const pickupPhotos = photos?.pickup || [];
  const returnPhotos = photos?.return || [];
  const lightboxPhotos = [...pickupPhotos, ...returnPhotos].map((p: any) => ({
    id: p.id,
    photo_url: String(p.photo_url).replace("condition-photos/", ""),
    photo_type: p.photo_type,
    phase: p.phase,
    captured_at: p.captured_at,
    notes: p.notes ?? undefined,
  }));

  const pickupInspection = inspectionMetrics.find(m => m.phase === "pickup");
  const returnInspection = inspectionMetrics.find(m => m.phase === "return");

  // Calculate actual rental duration if completed
  const actualDuration = booking.actual_return_at && booking.start_at
    ? differenceInHours(parseISO(booking.actual_return_at), parseISO(booking.start_at))
    : null;

  return (
    <PanelShell>
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(returnTo)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold">Booking Details</h1>
                  <Badge variant="outline" className="font-mono text-sm">{booking.booking_code}</Badge>
                  <StatusBadge status={booking.status} />
                </div>
                <p className="text-muted-foreground text-sm mt-1">
                  {vehicleName} • {booking.profiles?.full_name || "Customer"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Ops context: direct wizard launchers so staff don't have to backtrack */}
              {isOpsContext && (booking.status === "draft" || booking.status === "pending" || booking.status === "confirmed") && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/ops/booking/${bookingId}/handover`)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Handover
                </Button>
              )}
              {isOpsContext && booking.status === "active" && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/ops/return/${bookingId}`)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Process Return
                </Button>
              )}
              {/* Admin context: direct wizard launchers (mirror ops shortcuts) */}
              {!isOpsContext && (booking.status === "draft" || booking.status === "pending" || booking.status === "confirmed") && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/ops/booking/${bookingId}/handover?returnTo=${returnTo}`)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Handover
                </Button>
              )}
              {!isOpsContext && booking.status === "active" && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/ops/return/${bookingId}?returnTo=${returnTo}`)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Process Return
                </Button>
              )}
              {/* Activate Rental - for confirmed bookings (admin only) */}
              {!isOpsContext && booking.status === "confirmed" && (
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => setShowActivateDialog(true)}
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Activate Rental
                </Button>
              )}

              {/* View Active Rental tracking */}
              {booking.status === "active" && (
                <Button 
                  size="sm"
                  onClick={() => navigate(isOpsContext ? `/ops/rental/${bookingId}` : `/admin/active-rentals/${bookingId}`)}
                >
                  <Car className="h-4 w-4 mr-2" />
                  View Active Rental
                </Button>
              )}
              {/* Open in Operations - for actionable bookings */}
              {!isOpsContext && (booking.status === "pending" || booking.status === "confirmed" || booking.status === "active") && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/ops/booking/${bookingId}?returnTo=${returnTo}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Operations
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
              
              {/* Admin Actions Dropdown - only for non-completed/cancelled bookings */}
              {booking.status !== "completed" && booking.status !== "cancelled" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setShowVoidDialog(true)}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Void Booking
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="photos">
                Photos
                {(pickupPhotos.length > 0 || returnPhotos.length > 0) && (
                  <Badge variant="secondary" className="ml-1">{pickupPhotos.length + returnPhotos.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="damages">
                Damages
                {damages.length > 0 && (
                  <Badge variant="destructive" className="ml-1">{damages.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Customer Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium">{booking.profiles?.full_name || "Unknown"}</p>
                      {booking.profiles?.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {booking.profiles.email}
                        </div>
                      )}
                      {booking.profiles?.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {booking.profiles.phone}
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="text-sm">
                      <span className="text-muted-foreground">License Status: </span>
                      <Badge variant={
                        booking.profiles?.driver_license_status === "approved" ? "default" :
                        booking.profiles?.driver_license_status === "rejected" ? "destructive" : "secondary"
                      }>
                        {booking.profiles?.driver_license_status || "Pending"}
                      </Badge>
                      {(!booking.profiles?.driver_license_status || booking.profiles?.driver_license_status === "pending") && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          License can be uploaded by the customer from their booking page.
                        </p>
                      )}
                    </div>
                    {/* License Photos */}
                    {(() => {
                      const extractPath = (url: string | null | undefined) => {
                        if (!url) return null;
                        const match = url.match(/driver-licenses\/(.+?)(?:\?|$)/);
                        return match ? match[1] : null;
                      };
                      const frontPath = extractPath(booking.profiles?.driver_license_front_url);
                      const backPath = extractPath(booking.profiles?.driver_license_back_url);
                      if (!frontPath && !backPath) return (
                        <p className="text-xs text-muted-foreground italic">No license photos uploaded</p>
                      );
                      return (
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: "Front", path: frontPath },
                            { label: "Back", path: backPath },
                          ].map(({ label, path }) => path ? (
                            <div key={label} className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">{label}</p>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button className="w-full aspect-[3/2] rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition-all cursor-pointer">
                                    <SignedStorageImage
                                      bucket="driver-licenses"
                                      path={path}
                                      alt={`License ${label}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Driver's License — {label}</DialogTitle>
                                  </DialogHeader>
                                  <SignedStorageImage
                                    bucket="driver-licenses"
                                    path={path}
                                    alt={`License ${label} full size`}
                                    className="w-full max-h-[70vh] object-contain rounded-md"
                                  />
                                </DialogContent>
                              </Dialog>
                            </div>
                          ) : (
                            <div key={label} className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">{label}</p>
                              <div className="w-full aspect-[3/2] rounded-md border bg-muted flex items-center justify-center">
                                <p className="text-xs text-muted-foreground">Not uploaded</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Vehicle Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Vehicle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="font-medium">{vehicleName}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {booking.vehicles?.transmission && (
                        <div>
                          <span className="text-muted-foreground">Transmission: </span>
                          {booking.vehicles.transmission}
                        </div>
                      )}
                      {booking.vehicles?.fuel_type && (
                        <div>
                          <span className="text-muted-foreground">Fuel: </span>
                          {booking.vehicles.fuel_type}
                        </div>
                      )}
                      {booking.vehicles?.seats && (
                        <div>
                          <span className="text-muted-foreground">Seats: </span>
                          {booking.vehicles.seats}
                        </div>
                      )}
                      {booking.vehicles?.category && (
                        <div>
                          <span className="text-muted-foreground">Category: </span>
                          {booking.vehicles.category}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Assigned Vehicle Unit */}
                <AssignedVehicleSection booking={booking} />

                {/* Rental Period */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Rental Period
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-muted-foreground shrink-0">Pickup:</span>
                        <span className="text-right">{format(parseISO(booking.start_at), "PPp")}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-muted-foreground shrink-0">Scheduled Return:</span>
                        <span className="text-right">{format(parseISO(booking.end_at), "PPp")}</span>
                      </div>
                      {booking.actual_return_at && (
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-muted-foreground shrink-0">Actual Return:</span>
                          <span className="text-right">{format(parseISO(booking.actual_return_at), "PPp")}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>{booking.total_days} day{booking.total_days !== 1 ? "s" : ""}</span>
                      </div>
                      {actualDuration !== null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Actual Duration:</span>
                          <span>{Math.round(actualDuration / 24)} day{Math.round(actualDuration / 24) !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Location */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {booking.locations && (
                      <>
                        <p className="font-medium">{booking.locations.name}</p>
                        <p className="text-muted-foreground">{booking.locations.address}</p>
                        <p className="text-muted-foreground">{booking.locations.city}</p>
                        {booking.locations.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {booking.locations.phone}
                          </div>
                        )}
                      </>
                    )}
                    {booking.pickup_address && (
                      <div className="mt-3 pt-3 border-t">
                        <Badge className="bg-blue-500 mb-2">Delivery</Badge>
                        <p className="text-muted-foreground">{booking.pickup_address}</p>
                      </div>
                    )}
                    {/* Drop-off Location */}
                    {booking.return_location_id && booking.return_location_id !== booking.location_id && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Drop-off Location</p>
                        <p className="font-medium">{(booking as any).return_locations?.name || "Different location"}</p>
                        {(booking as any).return_locations?.address && (
                          <p className="text-muted-foreground text-sm">{(booking as any).return_locations.address}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Inspection Metrics */}
                {(pickupInspection || returnInspection) && (
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        Inspection Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {pickupInspection && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">At Pickup</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Gauge className="h-4 w-4 text-muted-foreground" />
                                <span>{pickupInspection.odometer?.toLocaleString() || "N/A"} mi</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Fuel className="h-4 w-4 text-muted-foreground" />
                                <span>{pickupInspection.fuel_level || "N/A"}%</span>
                              </div>
                            </div>
                            {pickupInspection.exterior_notes && (
                              <InspectionNotesDisplay notes={pickupInspection.exterior_notes} />
                            )}
                          </div>
                        )}
                        {returnInspection && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">At Return</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Gauge className="h-4 w-4 text-muted-foreground" />
                                <span>{returnInspection.odometer?.toLocaleString() || "N/A"} mi</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Fuel className="h-4 w-4 text-muted-foreground" />
                                <span>{returnInspection.fuel_level || "N/A"}%</span>
                              </div>
                            </div>
                            {returnInspection.exterior_notes && (
                              <InspectionNotesDisplay notes={returnInspection.exterior_notes} />
                            )}
                          </div>
                        )}
                      </div>
                      {pickupInspection && returnInspection && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm">
                            <span className="text-muted-foreground">Distance Driven: </span>
                            <span className="font-medium">
                              {((returnInspection.odometer || 0) - (pickupInspection.odometer || 0)).toLocaleString()} km
                            </span>
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {booking.notes && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Financial Summary (quick glance on Overview tab) */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Financial Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground shrink-0">Daily Rate:</span>
                        <span className="text-right">${Number(booking.daily_rate).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground shrink-0">Duration:</span>
                        <span className="text-right">{booking.total_days} day{booking.total_days !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground shrink-0">Subtotal (all charges):</span>
                        <span className="text-right">${Number(booking.subtotal).toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/80">
                        Includes surcharges, discounts, fees and extras — see the Financial tab for the full itemization.
                      </p>

                      {booking.tax_amount && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground shrink-0">Tax:</span>
                          <span className="text-right">${Number(booking.tax_amount).toFixed(2)}</span>
                        </div>
                       )}
                    </div>
                    {Number(booking.upgrade_daily_fee) > 0 && (
                      <div className="flex justify-between gap-2 text-emerald-600">
                        <span className="shrink-0">Upgrade (${Number(booking.upgrade_daily_fee).toFixed(2)}/day × {booking.total_days}d):</span>
                        <span className="text-right">${(Number(booking.upgrade_daily_fee) * booking.total_days).toFixed(2)}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold text-base gap-2">
                      <span>Total:</span>
                      <span className="text-right">${Number(booking.total_amount).toFixed(2)} CAD</span>
                    </div>
                    {booking.deposit_amount && (
                      <div className="flex justify-between text-sm gap-2">
                        <span className="text-muted-foreground shrink-0">Deposit:</span>
                        <span className="text-right">
                          ${Number(booking.deposit_amount).toFixed(2)}
                          {booking.deposit_status && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              {booking.deposit_status}
                            </Badge>
                          )}
                        </span>
                      </div>
                    )}
                    {booking.card_last_four && (
                      <div className="flex justify-between text-sm gap-2">
                        <span className="text-muted-foreground shrink-0">Card on File:</span>
                        <span className="font-mono text-right truncate">
                          {booking.card_type?.toUpperCase() || "Card"} •••• {booking.card_last_four}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Who handled this rental — same block as the active rental view,
                  surfaced here because this is the first page opened for a booking. */}
              <BookingDocumentsCard bookingId={booking.id} />
              <ProcessedBySection bookingId={booking.id} />
            </TabsContent>


            {/* Photos Tab */}
            <TabsContent value="photos" className="space-y-6">
              {pickupPhotos.length === 0 && returnPhotos.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Camera className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No condition photos captured</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Pickup Photos */}
                  {pickupPhotos.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Pickup Condition Photos</CardTitle>
                        <CardDescription>{pickupPhotos.length} photos captured — click to enlarge</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {pickupPhotos.map((photo: any, idx: number) => (
                            <button
                              type="button"
                              key={photo.id}
                              onClick={() => setLightboxIndex(idx)}
                              aria-label={`View ${photo.photo_type} photo`}
                              className="aspect-square rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                            >
                              <SignedStorageImage 
                                bucket="condition-photos"
                                path={photo.photo_url.replace("condition-photos/", "")}
                                alt={photo.photo_type}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Return Photos */}
                  {returnPhotos.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Return Condition Photos</CardTitle>
                        <CardDescription>{returnPhotos.length} photos captured — click to enlarge</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {returnPhotos.map((photo: any, idx: number) => (
                            <button
                              type="button"
                              key={photo.id}
                              onClick={() => setLightboxIndex(pickupPhotos.length + idx)}
                              aria-label={`View ${photo.photo_type} photo`}
                              className="aspect-square rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                            >
                              <SignedStorageImage 
                                bucket="condition-photos"
                                path={photo.photo_url.replace("condition-photos/", "")}
                                alt={photo.photo_type}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <PhotoLightbox
                    photos={lightboxPhotos}
                    initialIndex={lightboxIndex ?? 0}
                    isOpen={lightboxIndex !== null}
                    onClose={() => setLightboxIndex(null)}
                    title="Condition Photos"
                  />
                </div>
              )}
            </TabsContent>


            {/* Damages Tab */}
            <TabsContent value="damages" className="space-y-6">
              {damages.length === 0 && incidents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500/50 mb-4" />
                    <p className="text-muted-foreground">No damages or incidents reported</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Damage Reports */}
                  {damages.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          Damage Reports
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {damages.map((damage: any) => (
                          <div key={damage.id} className="p-4 rounded-lg border space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{damage.location_on_vehicle}</p>
                                <p className="text-sm text-muted-foreground">{damage.description}</p>
                              </div>
                              <div className="text-right">
                              <Badge variant={
                                damage.severity === "major" ? "destructive" :
                                damage.severity === "moderate" ? "default" : "secondary"
                              }>
                                {damage.severity}
                              </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(parseISO(damage.created_at), "PPp")}
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">{damage.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Incident Cases */}
                  {incidents.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="h-4 w-4 text-amber-500" />
                          Incident Cases
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {incidents.map((incident: any) => (
                          <div key={incident.id} className="p-4 rounded-lg border space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{incident.incident_type}</p>
                                <p className="text-sm text-muted-foreground">{incident.description}</p>
                              </div>
                              <div className="text-right space-y-1">
                                <Badge variant={
                                  incident.severity === "major" ? "destructive" :
                                  incident.severity === "moderate" ? "default" : "secondary"
                                }>
                                  {incident.severity}
                                </Badge>
                                <Badge variant="outline">{incident.status}</Badge>
                              </div>
                            </div>
                            {incident.claim_number && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Claim #: </span>
                                {incident.claim_number}
                              </p>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Financial Tab */}
            <TabsContent value="financial" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Pricing Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Pricing Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/*
                      Shared, self-reconciling itemization: every charge line
                      (weekend surcharge, duration discount, delivery, drop-off,
                      regulatory fees) is listed explicitly and sums exactly to
                      the stored subtotal, then tax and total.
                    */}
                    <FinancialBreakdown booking={booking} />

                    {/* Tax split detail */}
                    {booking.tax_amount && Number(booking.tax_amount) > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs items-center">
                            <span className="text-muted-foreground">PST ({(PST_RATE * 100).toFixed(0)}%)</span>
                            <span>${(Number(booking.subtotal) * PST_RATE).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs items-center">
                            <span className="text-muted-foreground">GST ({(GST_RATE * 100).toFixed(0)}%)</span>
                            <span>${(Number(booking.subtotal) * GST_RATE).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs items-center">
                            <span className="text-muted-foreground flex items-center">
                              Total Tax
                              <PriceTooltip content={PRICE_TOOLTIPS.totalTax} />
                            </span>
                            <span>${Number(booking.tax_amount).toFixed(2)}</span>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Card on File */}
                    {booking.card_last_four && (
                      <>
                        <Separator />
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Card on File:</span>
                            <span className="font-mono">
                              {booking.card_type?.toUpperCase() || "Card"} •••• {booking.card_last_four}
                            </span>
                          </div>
                          {booking.card_holder_name && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Cardholder:</span>
                              <span>{booking.card_holder_name}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Deposit */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Security Deposit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">${Number(booking.deposit_amount || 0).toFixed(2)}</span>
                    </div>
                    {depositLedger.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          {depositLedger.map((entry: any) => (
                            <div key={entry.id} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{entry.action}:</span>
                              <span className={entry.action === "withheld" ? "text-destructive" : ""}>
                                ${Number(entry.amount).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Payments */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {booking.payments && booking.payments.length > 0 ? (
                      booking.payments.map((payment: any) => (
                        <div key={payment.id} className="flex items-center justify-between text-sm gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">${Number(payment.amount).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground truncate">{payment.payment_type}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                              {payment.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(parseISO(payment.created_at), "PP")}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No payment records found</p>
                    )}
                  </CardContent>
                </Card>

                {/* Final Invoices */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Final Invoice
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {finalInvoices.length > 0 ? (
                      finalInvoices.map((invoice: any) => (
                        <div key={invoice.id} className="space-y-3">
                          <div className="flex items-center justify-between text-sm gap-2">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{invoice.invoice_number}</p>
                              <p className="text-xs text-muted-foreground">
                                {invoice.issued_at ? format(parseISO(invoice.issued_at), "PPp") : "Draft"}
                              </p>
                            </div>
                            <Badge variant={invoice.status === "issued" ? "default" : "secondary"}>
                              {invoice.status}
                            </Badge>
                          </div>
                          <Separator />
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">Rental Subtotal</span>
                              <span>${Number(invoice.rental_subtotal).toFixed(2)}</span>
                            </div>
                            {Number(invoice.addons_total) > 0 && (
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Add-ons</span>
                                <span>${Number(invoice.addons_total).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">Taxes</span>
                              <span>${Number(invoice.taxes_total).toFixed(2)}</span>
                            </div>
                            {Number(invoice.late_fees) > 0 && (
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Late Fees</span>
                                <span>${Number(invoice.late_fees).toFixed(2)}</span>
                              </div>
                            )}
                            {Number(invoice.damage_charges) > 0 && (
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Damage Charges</span>
                                <span className="text-destructive">${Number(invoice.damage_charges).toFixed(2)}</span>
                              </div>
                            )}
                            <Separator />
                            <div className="flex justify-between gap-2 font-semibold">
                              <span>Grand Total</span>
                              <span>${Number(invoice.grand_total).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">Payments Received</span>
                              <span>${Number(invoice.payments_received).toFixed(2)}</span>
                            </div>
                            {Number(invoice.amount_due) > 0 && (
                              <div className="flex justify-between gap-2 font-medium text-destructive">
                                <span>Amount Due</span>
                                <span>${Number(invoice.amount_due).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={async () => {
                              try {
                                const pdfData = await buildInvoicePdfData(booking.id, {
                                  invoice_number: invoice.invoice_number,
                                  status: invoice.status,
                                  issued_at: invoice.issued_at,
                                  grand_total: Number(invoice.grand_total),
                                  rental_subtotal: Number(invoice.rental_subtotal),
                                  taxes_total: Number(invoice.taxes_total),
                                  late_fees: Number(invoice.late_fees || 0),
                                  damage_charges: Number(invoice.damage_charges || 0),
                                  payments_received: Number(invoice.payments_received || 0),
                                  amount_due: Number(invoice.amount_due || 0),
                                  deposit_held: Number(invoice.deposit_held || 0),
                                  deposit_released: Number(invoice.deposit_released || 0),
                                  deposit_captured: Number(invoice.deposit_captured || 0),
                                  notes: invoice.notes,
                                });
                                await generateInvoicePdf(pdfData);
                              } catch (error) {
                                console.error("Invoice PDF generation failed:", error);
                              }
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Invoice PDF
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 space-y-3">
                        <p className="text-sm text-muted-foreground">No invoice generated</p>
                        {(booking.status === "completed" || booking.status === "active") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateInvoice}
                            disabled={isGeneratingInvoice}
                          >
                            {isGeneratingInvoice ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4 mr-2" />
                            )}
                            Generate Invoice
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Receipts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Receipts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {receipts.length > 0 ? (
                      receipts.map((receipt: any) => (
                        <div key={receipt.id} className="flex items-center justify-between text-sm gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{receipt.receipt_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(receipt.created_at), "PP")}
                            </p>
                          </div>
                          <Badge variant={receipt.status === "issued" ? "default" : "secondary"}>
                            {receipt.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No receipts found</p>
                    )}
                  </CardContent>
                </Card>

                {/* Add-ons */}
                {booking.addOns && booking.addOns.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileCheck className="h-4 w-4" />
                        Add-ons
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {booking.addOns.map((addon: any) => (
                        <div key={addon.id} className="flex justify-between text-sm gap-2">
                          <span className="truncate">{addon.add_ons?.name || "Add-on"}</span>
                          <span className="shrink-0">${Number(addon.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Payment Collection */}
                {bookingId && (
                  <PaymentDepositPanel bookingId={bookingId} bookingStatus={booking.status} />
                )}

                {/* Rental Agreement */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileCheck className="h-4 w-4" />
                      Rental Agreement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {rentalAgreements.length > 0 ? (
                      rentalAgreements.map((agreement: any) => (
                        <div key={agreement.id} className="space-y-2 p-3 rounded-lg border">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {agreement.agreement_type === "extension" ? "Extension" : "Initial"}
                              </Badge>
                              {agreement.customer_signed_at ? (
                                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Signed ✓
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                                  Pending Signature
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(agreement.created_at), "PP")}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setViewingAgreement(agreement)}
                            >
                              <FileText className="w-3 h-3 mr-2" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => generateRentalAgreementPdf(agreement, booking.id)}
                            >
                              <Download className="w-3 h-3 mr-2" />
                              PDF
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 space-y-3">
                        <p className="text-sm text-muted-foreground">No agreement generated</p>
                        {(booking.status === "confirmed" || booking.status === "active" || booking.status === "completed") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateAgreement("initial")}
                            disabled={isGeneratingAgreement}
                          >
                            {isGeneratingAgreement ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4 mr-2" />
                            )}
                            Generate Agreement
                          </Button>
                        )}
                      </div>
                    )}
                    {/* Generate Extension button - show when agreements exist */}
                    {rentalAgreements.length > 0 && (booking.status === "active" || booking.status === "completed") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleGenerateAgreement("extension")}
                        disabled={isGeneratingAgreement}
                      >
                        {isGeneratingAgreement ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        Generate Extension Agreement
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Audit History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {booking.auditLogs && booking.auditLogs.length > 0 ? (
                    <AuditTimeline events={booking.auditLogs.map((log: any) => ({
                      id: log.id,
                      action: log.action,
                      entityType: log.entity_type,
                      entityId: log.entity_id,
                      userId: log.user_id,
                      createdAt: log.created_at,
                      oldData: log.old_data,
                      newData: log.new_data,
                    }))} />
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No audit history available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </TooltipProvider>
      
      {/* Void Booking Dialog */}
      {bookingId && booking && (
        <VoidBookingDialog
          open={showVoidDialog}
          onOpenChange={setShowVoidDialog}
          bookingId={bookingId}
          bookingCode={booking.booking_code}
          panelSource={isOpsContext ? "ops" : "admin"}
          onSuccess={() => navigate(returnTo)}
        />
      )}

      {/* Activate Rental Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Rental</AlertDialogTitle>
            <AlertDialogDescription>
              Activate this rental for {booking.profiles?.full_name || "customer"} — {vehicleName}? This will mark the vehicle as on-rent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!bookingId) return;
                updateStatus.mutate(
                  { bookingId, newStatus: "active" as any },
                  {
                    onSuccess: () => {
                      toast.success("Rental activated successfully!");
                      refetch();
                    },
                    onError: (err: any) => {
                      toast.error("Failed to activate rental", { description: err.message });
                    },
                  }
                );
              }}
            >
              Activate Rental
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Agreement View Dialog */}
      <Dialog open={!!viewingAgreement} onOpenChange={(open) => !open && setViewingAgreement(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Rental Agreement
              {viewingAgreement?.status && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {viewingAgreement.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            {viewingAgreement?.terms_json ? (
              <AgreementStructuredView
                agreement={viewingAgreement as RentalAgreement}
                bookingId={bookingId || ""}
              />
            ) : viewingAgreement?.agreement_content ? (
              <div className="prose prose-sm max-w-none p-4" dangerouslySetInnerHTML={{ __html: viewingAgreement.agreement_content }} />
            ) : (
              <p className="text-sm text-muted-foreground p-4">No agreement content available.</p>
            )}

            <Separator className="my-4" />

            {viewingAgreement?.customer_signed_at ? (
              <div className="p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Signed on {format(parseISO(viewingAgreement.customer_signed_at), "PPp")}
                </p>
                {viewingAgreement.customer_signature && (
                  <div className="border rounded-md p-3 bg-muted/30 space-y-1">
                    <p className="text-sm font-medium text-center">{viewingAgreement.customer_signature}</p>
                    {(viewingAgreement as any).signed_manually && (
                      <p className="text-xs text-muted-foreground text-center">Signed in person</p>
                    )}
                  </div>
                )}
                {!((viewingAgreement as any).signed_manually) && viewingAgreement.signature_png_url && (
                  <div className="border rounded-md p-3 bg-muted/30">
                    <img
                      src={viewingAgreement.signature_png_url}
                      alt="Customer signature"
                      className="max-h-24 mx-auto"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4">
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending Signature
                </Badge>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
