import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Car,
  MapPin,
  Calendar,
  Clock,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
  AlertCircle,
  MessageCircle,
  Receipt,
  Send,
  FileText,
  Phone,
  Mail,
  Bell,
  CheckCircle,
  XCircle,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { generateReceiptPdf } from "@/lib/pdf/receipt-pdf";
import { useBookingReceipts } from "@/hooks/use-receipts";
import { 
  useCustomerTicketsV2, 
  useCustomerTicketByIdV2, 
  useCreateCustomerTicketV2, 
  useSendCustomerMessageV2 
} from "@/hooks/use-support-v2";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DriverLicenseUpload } from "@/components/booking/DriverLicenseUpload";
import { VerificationModal } from "@/components/booking/VerificationModal";
import { useBookingVerification } from "@/hooks/use-verification";
import { RentalAgreementSign } from "@/components/booking/RentalAgreementSign";
import { CustomerWalkaroundAcknowledge } from "@/components/booking/CustomerWalkaroundAcknowledge";
import { ReportIssueDialog } from "@/components/booking/ReportIssueDialog";
import { PriceDisclaimer } from "@/components/shared/PriceWithDisclaimer";
import { BookingProgressStepper } from "@/components/booking/BookingProgressStepper";
import { useRentalAgreement } from "@/hooks/use-rental-agreement";
import { CancelBookingDialog } from "@/components/booking/CancelBookingDialog";
import { useCustomerRealtimeSubscriptions } from "@/hooks/use-realtime-subscriptions";

// Notification type labels
const NOTIFICATION_LABELS: Record<string, string> = {
  booking_confirmed: "Booking Confirmed",
  payment_confirmation: "Payment Received",
  license_approved: "License Approved",
  license_rejected: "License Rejected",
  vehicle_assigned: "Vehicle Assigned",
  agreement_generated: "Agreement Ready",
  agreement_signed: "Agreement Signed",
  checkin_complete: "Check-in Complete",
  walkaround_complete: "Walkaround Complete",
  rental_activated: "Rental Started",
  rental_completed: "Rental Completed",
  payment_request: "Payment Request",
};

interface BookingData {
  id: string;
  booking_code: string;
  status: string;
  start_at: string;
  end_at: string;
  daily_rate: number;
  total_days: number;
  subtotal: number;
  tax_amount: number | null;
  deposit_amount: number | null;
  total_amount: number;
  notes: string | null;
  driver_age_band: string | null;
  young_driver_fee: number | null;
  // Delivery fields
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  // Card info
  card_last_four: string | null;
  card_type: string | null;
  card_holder_name: string | null;
  vehicles: {
    id: string;
    make: string;
    model: string;
    year: number;
    image_url: string | null;
    category: string;
  } | null;
  locations: {
    id: string;
    name: string;
    address: string;
    city: string;
  } | null;
}

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  
  // Real-time updates for customer bookings
  useCustomerRealtimeSubscriptions(user?.id);
  
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  
  // Ticket creation state
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  
  // Receipt state
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  
  // Driver's license is required before verification
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  
  // Issue reporting (for active rentals)
  const [showIssueDialog, setShowIssueDialog] = useState(false);

  const { data: verificationRequests = [], isLoading: verificationLoading } = useBookingVerification(id || null);

  const licenseFront = verificationRequests?.find((v) => v.document_type === "drivers_license_front") || null;
  const licenseBack = verificationRequests?.find((v) => v.document_type === "drivers_license_back") || null;

  // For gating, we only require upload (pending or verified). Rejected counts as incomplete.
  const isLicenseComplete =
    !!licenseFront &&
    !!licenseBack &&
    licenseFront.status !== "rejected" &&
    licenseBack.status !== "rejected";
  
  const { data: receipts = [] } = useBookingReceipts(id || null);
  const { data: tickets = [] } = useCustomerTicketsV2();
  const { data: ticketThread } = useCustomerTicketByIdV2(selectedTicketId);
  const createTicket = useCreateCustomerTicketV2();
  const sendMessage = useSendCustomerMessageV2();
  
  // Fetch rental agreement for stepper state
  const { data: agreement } = useRentalAgreement(id || null);
  
  // Fetch payment info for stepper
  const { data: payments = [] } = useQuery({
    queryKey: ["booking-payments", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_id", id)
        .eq("status", "completed");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });
  
  // Fetch walkaround inspection for stepper
  const { data: walkarounds = [] } = useQuery({
    queryKey: ["booking-walkarounds", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("walkaround_inspections")
        .select("*")
        .eq("booking_id", id)
        .eq("customer_acknowledged", true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });
  
  // Fetch notification history for this booking
  const { data: notifications = [] } = useQuery({
    queryKey: ["booking-notifications", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("notification_logs")
        .select("*")
        .eq("booking_id", id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });
  
  // Stepper state calculations
  const isLicenseVerified = !!licenseFront && !!licenseBack && 
    licenseFront.status === "verified" && licenseBack.status === "verified";
  const hasAgreementGenerated = !!agreement;
  const hasAgreementSigned = !!agreement && (agreement.status === "signed" || agreement.status === "confirmed");
  const hasPayment = payments.length > 0;
  const hasWalkaround = walkarounds.length > 0;
  
  // Filter tickets for this booking
  const bookingTickets = tickets.filter(t => t.bookingId === id);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: `/booking/${id}` } });
    }
  }, [user, authLoading, navigate, id]);

  // Handle payment cancelled - delete booking and redirect to search
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    
    if (paymentStatus === "cancelled" && id && user && !cleaningUp) {
      setCleaningUp(true);
      
      // Delete the unpaid booking
      const cleanupBooking = async () => {
        try {
          console.log("Payment cancelled, cleaning up booking:", id);
          
          // Delete child records first
          await supabase.from("booking_add_ons").delete().eq("booking_id", id);
          
          // Delete the booking
          const { error } = await supabase.from("bookings").delete().eq("id", id).eq("user_id", user.id);
          
          if (error) {
            console.error("Failed to delete cancelled booking:", error);
          } else {
            console.log("Successfully deleted unpaid booking");
          }
          
          toast.error("Payment was cancelled. Your booking has been removed.");
          navigate("/search");
        } catch (err) {
          console.error("Error cleaning up cancelled booking:", err);
          navigate("/search");
        }
      };
      
      cleanupBooking();
    }
  }, [searchParams, id, user, navigate, cleaningUp]);

  // Fetch booking
  useEffect(() => {
    async function fetchBooking() {
      if (!id || !user) return;

      try {
        const { data, error: fetchError } = await supabase
          .from("bookings")
          .select(`
            id,
            booking_code,
            status,
            start_at,
            end_at,
            daily_rate,
            total_days,
            subtotal,
            tax_amount,
            deposit_amount,
            total_amount,
            notes,
            driver_age_band,
            young_driver_fee,
            pickup_address,
            pickup_lat,
            pickup_lng,
            vehicle_id,
            card_last_four,
            card_type,
            card_holder_name,
            locations!location_id (id, name, address, city)
          `)
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching booking:", fetchError);
          setError("Failed to load booking details");
        } else if (!data) {
          setError("Booking not found");
        } else {
          // Fetch category info separately
          let vehicleData = null;
          if (data.vehicle_id) {
            const { data: category } = await supabase
              .from("vehicle_categories")
              .select("id, name, image_url")
              .eq("id", data.vehicle_id)
              .maybeSingle();
            if (category) {
              vehicleData = {
                id: category.id,
                make: "",
                model: category.name,
                year: 0,
                image_url: category.image_url,
                category: category.name,
              };
            }
          }
          setBooking({
            ...data,
            vehicles: vehicleData,
          } as BookingData);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchBooking();
    }
  }, [id, user]);

  // License reminder removed - license is now optional

  const handleCopyCode = async () => {
    if (!booking?.booking_code) return;
    try {
      await navigator.clipboard.writeText(booking.booking_code);
      setCopied(true);
      toast.success("Booking code copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const checkInUrl = booking 
    ? `${window.location.origin}/check-in?code=${booking.booking_code}`
    : "";

  const handleCreateTicket = () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error("Please fill in subject and message");
      return;
    }
    
    createTicket.mutate({
      subject: ticketSubject,
      message: ticketMessage,
      bookingId: id,
    }, {
      onSuccess: () => {
        setShowTicketDialog(false);
        setTicketSubject("");
        setTicketMessage("");
        toast.success("Support ticket created!");
      },
    });
  };

  const handleSendReply = () => {
    if (!replyMessage.trim() || !selectedTicketId) return;
    
    sendMessage.mutate({
      ticketId: selectedTicketId,
      message: replyMessage,
    }, {
      onSuccess: () => {
        setReplyMessage("");
      },
    });
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading booking...</p>
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold">Booking Not Found</h2>
              <p className="text-muted-foreground">
                {error || "We couldn't find this booking."}
              </p>
              <Button asChild className="mt-4">
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </PageContainer>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Back button */}
          <Button variant="ghost" asChild className="-ml-2">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                <Badge variant="outline" className="text-sm sm:text-lg px-2 sm:px-4 py-1 font-mono">
                  {booking.booking_code}
                </Badge>
                <StatusBadge status={booking.status as any} />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                {booking.vehicles?.year} {booking.vehicles?.make} {booking.vehicles?.model}
              </h1>
            </div>
          </div>

          {/* Progress Stepper */}
          <Card>
            <CardContent className="pt-6 pb-4">
              <BookingProgressStepper
                bookingStatus={booking.status}
                hasLicenseVerified={isLicenseVerified}
                hasAgreementGenerated={hasAgreementGenerated}
                hasAgreementSigned={hasAgreementSigned}
                hasPayment={hasPayment}
                hasWalkaround={hasWalkaround}
              />
            </CardContent>
          </Card>

          {/* Driver's License Upload - Optional */}
          {(booking.status === "pending" || booking.status === "confirmed") && (
            <Card className="border-muted bg-muted/5">
              <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-semibold">Upload Driver's License (Optional)</p>
                    <p className="text-sm text-muted-foreground">
                      Save time at pickup by uploading your license ahead of time.
                    </p>
                  </div>
                </div>
                {!isLicenseComplete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document
                        .querySelector("[data-license-section]")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    Upload now
                  </Button>
                )}
                {isLicenseComplete && (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                    <Check className="h-3 w-3 mr-1" />
                    Uploaded
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            {/* Main content - 2 columns */}
            <div className="md:col-span-2 space-y-6">
              {/* Vehicle */}
              {booking.vehicles && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Car className="h-5 w-5 text-primary" />
                      Vehicle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-4">
                    {booking.vehicles.image_url && (
                      <div className="w-32 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={booking.vehicles.image_url}
                          alt={`${booking.vehicles.make} ${booking.vehicles.model}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-lg">
                        {booking.vehicles.year} {booking.vehicles.make} {booking.vehicles.model}
                      </p>
                      <p className="text-muted-foreground capitalize">
                        {booking.vehicles.category}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dates & Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-5 w-5 text-primary" />
                    Reservation Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Pick-up</p>
                      <p className="font-medium">{format(new Date(booking.start_at), "EEE, MMM d, yyyy")}</p>
                      <p className="text-primary">{format(new Date(booking.start_at), "h:mm a")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Return</p>
                      <p className="font-medium">{format(new Date(booking.end_at), "EEE, MMM d, yyyy")}</p>
                      <p className="text-muted-foreground">{format(new Date(booking.end_at), "h:mm a")}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Location - show delivery address if present */}
                  {booking.pickup_address ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Delivery Address</p>
                          <p className="font-medium break-words">{booking.pickup_address}</p>
                        </div>
                      </div>
                      {booking.locations && (
                        <div className="flex items-start gap-3 pl-8">
                          <div className="text-sm text-muted-foreground">
                            <p className="italic">Dispatched from: {booking.locations.name}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : booking.locations && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{booking.locations.name}</p>
                        <p className="text-muted-foreground text-sm">{booking.locations.address}</p>
                        <p className="text-muted-foreground text-sm">{booking.locations.city}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Driver's License Upload - Required before verification */}
              {id && (
                <div data-license-section data-verification-section>
                  <DriverLicenseUpload bookingId={id} />
                </div>
              )}

              {/* Rental Agreement - Show for all non-completed/cancelled statuses when agreement exists, or always for pending/confirmed/active */}
              {id && booking.status !== "cancelled" && booking.status !== "completed" && (
                <RentalAgreementSign bookingId={id} />
              )}

              {/* Walkaround Acknowledgement - Customer confirms vehicle condition */}
              {id && (booking.status === "confirmed" || booking.status === "active") && (
                <CustomerWalkaroundAcknowledge bookingId={id} />
              )}

              {/* Payment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      ${Number(booking.daily_rate).toFixed(2)}* × {booking.total_days} days
                    </span>
                    <span>${(Number(booking.daily_rate) * booking.total_days).toFixed(2)}</span>
                  </div>
                  {booking.young_driver_fee && Number(booking.young_driver_fee) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Young driver fee ($15/day × {booking.total_days} days)</span>
                      <span>${Number(booking.young_driver_fee).toFixed(2)}</span>
                    </div>
                  )}
                  {booking.tax_amount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxes & Fees</span>
                      <span>${Number(booking.tax_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${Number(booking.total_amount).toFixed(2)}</span>
                  </div>
                  {booking.deposit_amount && Number(booking.deposit_amount) > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Security Deposit (held)</span>
                      <span>${Number(booking.deposit_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <PriceDisclaimer variant="summary" className="pt-2" />
                  
                  {/* Card on File */}
                  {booking.card_last_four && (
                    <>
                      <Separator className="my-3" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <CreditCard className="h-4 w-4" />
                          Card on File
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium uppercase px-1.5 py-0.5 bg-muted rounded">
                            {booking.card_type || 'Card'}
                          </span>
                          <span className="font-mono">•••• {booking.card_last_four}</span>
                        </div>
                      </div>
                      {booking.card_holder_name && (
                        <p className="text-xs text-muted-foreground text-right mt-1">
                          {booking.card_holder_name}
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - QR Code */}
            <div className="space-y-6">
              {/* Check-In QR Card */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="flex items-center justify-center gap-2 text-base">
                    <QrCode className="h-5 w-5 text-primary" />
                    Pickup Check-In
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  {/* Booking Code Display */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Booking Number</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-mono font-bold tracking-wider">
                        {booking.booking_code}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={handleCopyCode}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* QR Code - Always available */}
                  <div className="bg-card rounded-xl p-4 inline-block border border-border">
                    <QRCodeSVG
                      value={checkInUrl}
                      size={180}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Show this at pickup. If scanning fails, staff can type the code.
                  </p>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to={`/location/${booking.locations?.id}`}>
                      <MapPin className="h-4 w-4 mr-2" />
                      View Location Details
                    </Link>
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" className="w-full justify-start opacity-50 cursor-not-allowed">
                          <Clock className="h-4 w-4 mr-2" />
                          Modify Reservation
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Modifications coming soon — please contact support or cancel/rebook.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setShowTicketDialog(true)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                  {/* Report Issue - Only for active rentals */}
                  {booking.status === "active" && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                      onClick={() => setShowIssueDialog(true)}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Report an Issue
                    </Button>
                  )}
                  {/* Cancel Booking - For pending/confirmed bookings */}
                  {(booking.status === "pending" || booking.status === "confirmed") && (
                    <CancelBookingDialog
                      bookingId={booking.id}
                      bookingCode={booking.booking_code}
                      startAt={booking.start_at}
                      dailyRate={Number(booking.daily_rate)}
                      status={booking.status}
                      onCancelled={() => navigate("/dashboard")}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Receipts */}
              {receipts.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Receipts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {receipts.map((receipt: any) => (
                      <div
                        key={receipt.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedReceipt(receipt)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-mono text-sm font-medium">{receipt.receipt_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(receipt.issued_at), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Badge className="bg-green-500/10 text-green-600">
                            ${(receipt.totals_json as any)?.total?.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Notification History */}
              {notifications.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Updates & Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {notifications.slice(0, 5).map((notif: any) => (
                      <div
                        key={notif.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <div className="mt-0.5">
                          {notif.status === "sent" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : notif.status === "failed" ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {NOTIFICATION_LABELS[notif.notification_type] || notif.notification_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {notif.channel === "email" ? "Email" : "SMS"} • {format(new Date(notif.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                    {notifications.length > 5 && (
                      <p className="text-xs text-center text-muted-foreground pt-2">
                        +{notifications.length - 5} more updates
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {bookingTickets.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Support Tickets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {bookingTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedTicketId(ticket.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{ticket.subject}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {ticket.lastMessage?.message || "No messages"}
                            </p>
                          </div>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {ticket.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Create Ticket Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Contact Support
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="Brief description of your issue"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Describe your issue in detail..."
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                rows={4}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This ticket will be linked to booking {booking.booking_code}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTicket}
              disabled={createTicket.isPending || !ticketSubject.trim() || !ticketMessage.trim()}
            >
              {createTicket.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Thread Dialog */}
      <Dialog open={!!selectedTicketId} onOpenChange={() => setSelectedTicketId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {ticketThread?.subject || "Support Ticket"}
            </DialogTitle>
          </DialogHeader>
          
          {ticketThread && (
            <>
              <div className="flex-1 overflow-y-auto space-y-3 py-4 min-h-[200px] max-h-[400px]">
                {ticketThread.messages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl max-w-[85%] ${
                      msg.isStaff
                        ? "bg-primary/10 mr-auto"
                        : "bg-muted ml-auto"
                    }`}
                  >
                    <p className="text-xs font-medium mb-1">
                      {msg.isStaff ? "Support Team" : "You"}
                    </p>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
              
              {ticketThread.status !== "closed" && ticketThread.status !== "resolved" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Input
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={sendMessage.isPending || !replyMessage.trim()}
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Detail Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Receipt Details
            </DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Receipt Number</p>
                  <p className="font-mono font-bold text-lg">{selectedReceipt.receipt_number}</p>
                </div>
                <Badge className="bg-green-500/10 text-green-600">Issued</Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{user?.user_metadata?.full_name || user?.email || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Booking</p>
                  <Badge variant="outline" className="font-mono">{booking?.booking_code}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle</p>
                  <p className="font-medium">{booking?.vehicles ? `${booking.vehicles.make} ${booking.vehicles.model}` : "N/A"}</p>
                </div>
              </div>

              {booking?.start_at && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Pickup: </span>
                    <span className="font-medium">{format(new Date(booking.start_at), "MMM d, yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Return: </span>
                    <span className="font-medium">{format(new Date(booking.end_at), "MMM d, yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration: </span>
                    <span className="font-medium">{booking.total_days} day{booking.total_days !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Line Items */}
              <div className="space-y-2">
                {(selectedReceipt.line_items_json as any[])?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.description} {item.quantity > 1 ? `×${item.quantity}` : ""}</span>
                    <span>${Number(item.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-muted rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${(selectedReceipt.totals_json as any)?.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${(selectedReceipt.totals_json as any)?.tax?.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${(selectedReceipt.totals_json as any)?.total?.toFixed(2)}</span>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedReceipt.notes}</p>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    const totals = selectedReceipt.totals_json as any;
                    generateReceiptPdf({
                      receiptNumber: selectedReceipt.receipt_number,
                      status: "issued",
                      issuedAt: selectedReceipt.issued_at,
                      createdAt: selectedReceipt.created_at,
                      customerName: user?.user_metadata?.full_name || user?.email || "N/A",
                      customerEmail: user?.email || "",
                      bookingCode: booking?.booking_code || "",
                      vehicleName: booking?.vehicles ? `${booking.vehicles.make} ${booking.vehicles.model}` : "N/A",
                      startDate: booking?.start_at || "",
                      endDate: booking?.end_at || "",
                      totalDays: booking?.total_days || 0,
                      dailyRate: Number(booking?.daily_rate) || 0,
                      lineItems: (selectedReceipt.line_items_json as any[]) || [],
                      subtotal: totals?.subtotal || 0,
                      tax: totals?.tax || 0,
                      total: totals?.total || 0,
                      depositAmount: booking?.deposit_amount ? Number(booking.deposit_amount) : null,
                      differentDropoffFee: Number((booking as any)?.different_dropoff_fee || 0),
                      notes: selectedReceipt.notes,
                    });
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verification Modal - appears after booking loaded with pending status */}
      <VerificationModal
        open={showVerificationModal}
        onOpenChange={setShowVerificationModal}
        bookingCode={booking?.booking_code || ""}
        onUploadNow={() => {
          setShowVerificationModal(false);
          const licenseSection = document.querySelector('[data-license-section]');
          licenseSection?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Report Issue Dialog - for active rentals */}
      {booking && (
        <ReportIssueDialog
          open={showIssueDialog}
          onOpenChange={setShowIssueDialog}
          bookingId={booking.id}
          bookingCode={booking.booking_code}
        />
      )}
    </CustomerLayout>
  );
}
