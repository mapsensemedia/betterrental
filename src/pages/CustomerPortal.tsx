import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  Car,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  Circle,
  AlertCircle,
  Bell,
  FileText,
  CreditCard,
  Key,
  ClipboardCheck,
  Wrench,
  UserCheck,
  Eye,
  Loader2,
  ChevronRight,
  Phone,
  Mail,
} from "lucide-react";

// Step definitions for customer view
const CUSTOMER_STEPS = [
  { id: "booking", title: "Booking Confirmed", icon: ClipboardCheck, description: "Your booking has been received" },
  { id: "verification", title: "Documents Verified", icon: UserCheck, description: "Driver's license approved" },
  { id: "vehicle", title: "Vehicle Assigned", icon: Car, description: "Your vehicle is ready" },
  { id: "payment", title: "Payment Complete", icon: CreditCard, description: "Payment and deposit collected" },
  { id: "agreement", title: "Agreement Signed", icon: FileText, description: "Rental agreement completed" },
  { id: "pickup", title: "Ready for Pickup", icon: Key, description: "Vehicle handover" },
];

interface BookingDetails {
  id: string;
  booking_code: string;
  status: string;
  start_at: string;
  end_at: string;
  total_amount: number;
  deposit_amount: number | null;
  vehicles: {
    make: string;
    model: string;
    year: number;
    image_url: string | null;
  } | null;
  locations: {
    name: string;
    address: string;
  } | null;
  profiles: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface Notification {
  id: string;
  notification_type: string;
  channel: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface StepStatus {
  booking: boolean;
  verification: boolean;
  vehicle: boolean;
  payment: boolean;
  agreement: boolean;
  pickup: boolean;
}

export default function CustomerPortal() {
  const { bookingCode: paramBookingCode } = useParams<{ bookingCode: string }>();
  const navigate = useNavigate();
  
  const [searchCode, setSearchCode] = useState(paramBookingCode || "");
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    booking: false,
    verification: false,
    vehicle: false,
    payment: false,
    agreement: false,
    pickup: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch booking when code changes
  useEffect(() => {
    if (paramBookingCode) {
      fetchBookingDetails(paramBookingCode);
    }
  }, [paramBookingCode]);

  const fetchBookingDetails = async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch booking
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, status, start_at, end_at, total_amount, deposit_amount,
          vehicles (make, model, year, image_url),
          locations (name, address),
          profiles:user_id (full_name, email, phone)
        `)
        .eq("booking_code", code.toUpperCase())
        .maybeSingle();

      if (bookingError) throw bookingError;
      
      if (!bookingData) {
        setError("Booking not found. Please check your booking code.");
        setBooking(null);
        return;
      }

      setBooking(bookingData as unknown as BookingDetails);

      // Fetch notifications
      const { data: notifData } = await supabase
        .from("notification_logs")
        .select("id, notification_type, channel, status, sent_at, created_at")
        .eq("booking_id", bookingData.id)
        .order("created_at", { ascending: false });

      setNotifications(notifData || []);

      // Fetch step completion status
      await fetchStepStatus(bookingData.id, bookingData.status);

    } catch (err: any) {
      console.error("Error fetching booking:", err);
      setError("Failed to load booking details.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStepStatus = async (bookingId: string, bookingStatus: string) => {
    try {
      // Check verification status
      const { data: verifications } = await supabase
        .from("verification_requests")
        .select("status, document_type")
        .eq("booking_id", bookingId);
      
      const licenseVerifications = verifications?.filter(v => 
        v.document_type === "drivers_license_front" || v.document_type === "drivers_license_back"
      ) || [];
      const isLicenseApproved = licenseVerifications.length > 0 && 
        licenseVerifications.every(v => v.status === "verified");

      // Check payments
      const { data: payments } = await supabase
        .from("payments")
        .select("payment_type, status")
        .eq("booking_id", bookingId)
        .eq("status", "completed");
      
      const hasPayment = payments?.some(p => p.payment_type === "rental") || false;
      const hasDeposit = payments?.some(p => p.payment_type === "deposit") || false;

      // Check agreement
      const { data: agreement } = await supabase
        .from("rental_agreements")
        .select("status")
        .eq("booking_id", bookingId)
        .maybeSingle();
      
      const isAgreementSigned = agreement?.status === "signed" || agreement?.status === "confirmed";

      // Determine step status
      const isActive = bookingStatus === "active" || bookingStatus === "completed";

      setStepStatus({
        booking: true, // If we have a booking, this is done
        verification: isLicenseApproved,
        vehicle: true, // Assume vehicle is assigned if booking exists
        payment: hasPayment && hasDeposit,
        agreement: isAgreementSigned,
        pickup: isActive,
      });
    } catch (err) {
      console.error("Error fetching step status:", err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      navigate(`/my-booking/${searchCode.trim().toUpperCase()}`);
    }
  };

  const getCurrentStep = (): number => {
    const steps = Object.values(stepStatus);
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i]) return i + 1;
    }
    return 0;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "booking_confirmed":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "license_approved":
      case "license_rejected":
        return <UserCheck className="w-4 h-4 text-blue-500" />;
      case "vehicle_assigned":
        return <Car className="w-4 h-4 text-purple-500" />;
      case "agreement_generated":
      case "agreement_signed":
        return <FileText className="w-4 h-4 text-orange-500" />;
      case "payment_confirmation":
      case "payment_request":
        return <CreditCard className="w-4 h-4 text-green-500" />;
      case "rental_activated":
      case "rental_completed":
        return <Key className="w-4 h-4 text-primary" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getNotificationTitle = (type: string) => {
    const titles: Record<string, string> = {
      booking_confirmed: "Booking Confirmed",
      license_approved: "License Approved",
      license_rejected: "License Rejected",
      vehicle_assigned: "Vehicle Assigned",
      agreement_generated: "Agreement Ready",
      agreement_signed: "Agreement Signed",
      payment_confirmation: "Payment Received",
      payment_request: "Payment Requested",
      rental_activated: "Rental Started",
      rental_completed: "Rental Completed",
      checkin_complete: "Check-in Complete",
      walkaround_complete: "Walkaround Complete",
    };
    return titles[type] || type.replace(/_/g, " ");
  };

  const currentStep = getCurrentStep();

  // Show search form if no booking code provided
  if (!paramBookingCode && !booking) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 pb-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <h1 className="heading-2 mb-2">Track Your Booking</h1>
            <p className="text-muted-foreground mb-8">
              Enter your booking code to view your rental status and receive updates
            </p>
            
            <form onSubmit={handleSearch} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter booking code (e.g., ABC12345)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                className="text-center text-lg font-mono tracking-wider h-14"
                maxLength={8}
              />
              <Button type="submit" size="lg" className="w-full" disabled={!searchCode.trim()}>
                Track Booking
              </Button>
            </form>

            <p className="text-sm text-muted-foreground mt-6">
              Your booking code was sent to you via email and SMS when you made your reservation.
            </p>
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 pb-16">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-48" />
                <Skeleton className="h-64" />
              </div>
              <Skeleton className="h-96" />
            </div>
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 pb-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="heading-2 mb-2">Booking Not Found</h1>
            <p className="text-muted-foreground mb-8">{error}</p>
            
            <form onSubmit={handleSearch} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter booking code"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                className="text-center text-lg font-mono tracking-wider h-14"
                maxLength={8}
              />
              <Button type="submit" size="lg" className="w-full">
                Try Again
              </Button>
            </form>
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }

  if (!booking) return null;

  const statusColor = {
    pending: "bg-amber-500",
    confirmed: "bg-blue-500",
    active: "bg-emerald-500",
    completed: "bg-slate-500",
    cancelled: "bg-destructive",
  }[booking.status] || "bg-muted";

  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="heading-2">Booking Status</h1>
                <Badge className={`${statusColor} text-white`}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </Badge>
              </div>
              <p className="text-muted-foreground font-mono text-lg">
                {booking.booking_code}
              </p>
            </div>
            
            <Button variant="outline" onClick={() => navigate("/my-booking")}>
              Track Another Booking
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress Steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rental Progress</CardTitle>
                  <CardDescription>
                    Step {currentStep} of {CUSTOMER_STEPS.length}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {CUSTOMER_STEPS.map((step, index) => {
                      const stepKey = step.id as keyof StepStatus;
                      const isComplete = stepStatus[stepKey];
                      const isCurrent = index === currentStep - 1 && !stepStatus.pickup;
                      const Icon = step.icon;

                      return (
                        <div
                          key={step.id}
                          className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${
                            isComplete ? "bg-emerald-50 dark:bg-emerald-950/20" :
                            isCurrent ? "bg-primary/5 border border-primary/20" :
                            "bg-muted/30"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isComplete ? "bg-emerald-500 text-white" :
                            isCurrent ? "bg-primary text-primary-foreground" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {isComplete ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <Icon className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${
                              isComplete ? "text-emerald-700 dark:text-emerald-400" :
                              isCurrent ? "text-primary" : "text-muted-foreground"
                            }`}>
                              {step.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {step.description}
                            </p>
                          </div>
                          {isComplete && (
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                          )}
                          {isCurrent && (
                            <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Notifications History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification History
                  </CardTitle>
                  <CardDescription>
                    All updates sent to you about this booking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-64">
                      <div className="space-y-3 pr-4">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                          >
                            {getNotificationIcon(notif.notification_type)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">
                                {getNotificationTitle(notif.notification_type)}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px]">
                                  {notif.channel === "email" ? <Mail className="w-3 h-3 mr-1" /> : <Phone className="w-3 h-3 mr-1" />}
                                  {notif.channel}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {notif.sent_at 
                                    ? format(new Date(notif.sent_at), "MMM d, h:mm a")
                                    : format(new Date(notif.created_at), "MMM d, h:mm a")}
                                </span>
                              </div>
                            </div>
                            <Badge 
                              variant={notif.status === "sent" ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {notif.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Booking Summary Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Booking Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Vehicle */}
                  {booking.vehicles && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Car className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {booking.vehicles.year} {booking.vehicles.make} {booking.vehicles.model}
                        </p>
                        <p className="text-sm text-muted-foreground">Vehicle</p>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Location */}
                  {booking.locations && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{booking.locations.name}</p>
                        <p className="text-sm text-muted-foreground">{booking.locations.address}</p>
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {format(new Date(booking.start_at), "EEE, MMM d")} - {format(new Date(booking.end_at), "EEE, MMM d")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.start_at), "h:mm a")} pickup
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Amount</span>
                      <span className="font-semibold">${booking.total_amount.toFixed(2)}</span>
                    </div>
                    {booking.deposit_amount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Security Deposit</span>
                        <span>${booking.deposit_amount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info */}
              {booking.profiles && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {booking.profiles.full_name && (
                      <p className="font-medium">{booking.profiles.full_name}</p>
                    )}
                    {booking.profiles.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {booking.profiles.email}
                      </div>
                    )}
                    {booking.profiles.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {booking.profiles.phone}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Need Help */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <p className="font-medium mb-2">Need Help?</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Contact our support team for any questions about your booking.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PageContainer>
    </CustomerLayout>
  );
}