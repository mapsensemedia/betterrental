/**
 * BookingPickup - Pickup readiness screen
 */
import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  FileText, 
  CreditCard, 
  Car,
  Loader2,
  AlertCircle
} from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBookingVerification } from "@/hooks/use-verification";
import { useRentalAgreement } from "@/hooks/use-rental-agreement";
import { cn } from "@/lib/utils";

interface ReadinessItem {
  id: string;
  label: string;
  description: string;
  status: "complete" | "pending" | "incomplete";
  link?: string;
  linkText?: string;
}

export default function BookingPickup() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: `/booking/${bookingId}/pickup` } });
    }
  }, [user, authLoading, navigate, bookingId]);
  
  // Fetch booking
  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking-pickup", bookingId],
    queryFn: async () => {
      if (!bookingId || !user) return null;
      
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          vehicles (id, make, model, year),
          locations!location_id (id, name, address, city)
        `)
        .eq("id", bookingId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId && !!user,
  });
  
  // Fetch verifications
  const { data: verifications = [] } = useBookingVerification(bookingId || null);
  
  // Fetch agreement
  const { data: agreement } = useRentalAgreement(bookingId || null);
  
  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ["booking-pickup-payments", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("status", "completed");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!bookingId,
  });
  
  // Calculate statuses
  const licenseFront = verifications.find(v => v.document_type === "drivers_license_front");
  const licenseBack = verifications.find(v => v.document_type === "drivers_license_back");
  const isLicenseComplete = !!licenseFront && !!licenseBack && 
    licenseFront.status !== "rejected" && licenseBack.status !== "rejected";
  const isLicenseVerified = !!licenseFront && !!licenseBack && 
    licenseFront.status === "verified" && licenseBack.status === "verified";
  
  const isAgreementSigned = agreement?.status === "signed" || agreement?.status === "confirmed";
  
  const hasPayment = payments.some(p => p.payment_type === "rental");
  const hasDeposit = payments.some(p => p.payment_type === "deposit");
  
  // Build readiness items
  const readinessItems: ReadinessItem[] = [
    {
      id: "license",
      label: "Driver's License",
      description: isLicenseVerified 
        ? "Verified" 
        : isLicenseComplete 
          ? "Under review" 
          : "Upload required",
      status: isLicenseVerified ? "complete" : isLicenseComplete ? "pending" : "incomplete",
      link: `/booking/${bookingId}/license`,
      linkText: "Upload",
    },
    {
      id: "agreement",
      label: "Rental Agreement",
      description: isAgreementSigned ? "Signed" : "Signature required",
      status: isAgreementSigned ? "complete" : "incomplete",
      link: `/booking/${bookingId}/agreement`,
      linkText: "Sign",
    },
    {
      id: "payment",
      label: "Payment",
      description: hasPayment ? "Paid" : "Payment pending",
      status: hasPayment ? "complete" : "incomplete",
    },
    {
      id: "deposit",
      label: "Security Deposit",
      description: hasDeposit ? "Held" : "Will be collected at pickup",
      status: hasDeposit ? "complete" : "pending",
    },
  ];
  
  const allComplete = readinessItems.every(item => item.status === "complete");
  const hasIncomplete = readinessItems.some(item => item.status === "incomplete");
  
  if (authLoading || isLoading) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </PageContainer>
      </CustomerLayout>
    );
  }
  
  if (!booking) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Booking not found</p>
            <Button asChild>
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }
  
  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-16">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Back button */}
          <Button variant="ghost" asChild className="-ml-2">
            <Link to={`/booking/${bookingId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Booking
            </Link>
          </Button>
          
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Pickup Readiness</h1>
            <p className="text-muted-foreground mt-1">
              Complete these items before your pickup
            </p>
          </div>
          
          {/* Pickup Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{format(new Date(booking.start_at), "EEEE, MMMM d")}</p>
                    <p className="text-primary font-medium">{format(new Date(booking.start_at), "h:mm a")}</p>
                  </div>
                </div>
                {booking.locations && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <div>
                      <p>{booking.locations.name}</p>
                      <p>{booking.locations.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Readiness Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {allComplete ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                ) : hasIncomplete ? (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                ) : (
                  <Clock className="h-5 w-5 text-blue-600" />
                )}
                Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {readinessItems.map((item) => (
                <div 
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    item.status === "complete" && "bg-emerald-500/5 border-emerald-500/20",
                    item.status === "pending" && "bg-blue-500/5 border-blue-500/20",
                    item.status === "incomplete" && "bg-amber-500/5 border-amber-500/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.status === "complete" ? (
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    ) : item.status === "pending" ? (
                      <Clock className="h-5 w-5 text-blue-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-amber-600" />
                    )}
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  {item.status === "incomplete" && item.link && (
                    <Button asChild size="sm">
                      <Link to={item.link}>{item.linkText}</Link>
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Pickup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. Arrive at the pickup location at your scheduled time</p>
              <p>2. Present your booking pass QR code to staff</p>
              <p>3. Complete the vehicle walkaround inspection with staff</p>
              <p>4. Receive your keys and drive away!</p>
            </CardContent>
          </Card>
          
          {/* View Pass Button */}
          <Button asChild className="w-full" size="lg">
            <Link to={`/booking/${bookingId}/pass`}>
              View Booking Pass
            </Link>
          </Button>
        </div>
      </PageContainer>
    </CustomerLayout>
  );
}
