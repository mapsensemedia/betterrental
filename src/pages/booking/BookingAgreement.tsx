/**
 * BookingAgreement - View and sign rental agreement
 */
import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useRentalAgreement, useGenerateAgreement } from "@/hooks/use-rental-agreement";
import { useBookingVerification } from "@/hooks/use-verification";
import { RentalAgreementSign } from "@/components/booking/RentalAgreementSign";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function BookingAgreement() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const { data: agreement, isLoading: agreementLoading } = useRentalAgreement(bookingId || null);
  const generateAgreement = useGenerateAgreement();
  const { data: verifications = [] } = useBookingVerification(bookingId || null);
  
  // Check license status
  const licenseFront = verifications.find(v => v.document_type === "drivers_license_front");
  const licenseBack = verifications.find(v => v.document_type === "drivers_license_back");
  const isLicenseComplete = !!licenseFront && !!licenseBack && 
    licenseFront.status !== "rejected" && licenseBack.status !== "rejected";
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: `/booking/${bookingId}/agreement` } });
    }
  }, [user, authLoading, navigate, bookingId]);
  
  // Fetch booking
  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ["booking-agreement", bookingId],
    queryFn: async () => {
      if (!bookingId || !user) return null;
      
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_code, status, user_id")
        .eq("id", bookingId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId && !!user,
  });
  
  // Auto-generate agreement if license is complete and no agreement exists
  useEffect(() => {
    if (bookingId && isLicenseComplete && !agreement && !agreementLoading && !generateAgreement.isPending) {
      generateAgreement.mutate(bookingId);
    }
  }, [bookingId, isLicenseComplete, agreement, agreementLoading]);
  
  const isAgreementSigned = agreement?.status === "signed" || agreement?.status === "confirmed";
  
  if (authLoading || bookingLoading || agreementLoading) {
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
  
  // License not uploaded yet
  if (!isLicenseComplete) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 pb-16">
          <div className="max-w-2xl mx-auto space-y-6">
            <Button variant="ghost" asChild className="-ml-2">
              <Link to={`/booking/${bookingId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Booking
              </Link>
            </Button>
            
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <AlertCircle className="h-12 w-12 text-amber-600" />
                  <div>
                    <h3 className="font-semibold text-lg">License Required First</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Please upload your driver's license before signing the rental agreement.
                    </p>
                  </div>
                  <Button asChild>
                    <Link to={`/booking/${bookingId}/license`}>
                      Upload License
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
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
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Rental Agreement</h1>
              <p className="text-muted-foreground">
                Review and sign your rental agreement
              </p>
            </div>
          </div>
          
          {/* Generating state */}
          {generateAgreement.isPending && (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Generating agreement...</span>
              </CardContent>
            </Card>
          )}
          
          {/* Agreement Component */}
          {!generateAgreement.isPending && (
            <RentalAgreementSign bookingId={bookingId!} />
          )}
          
          {/* Next Step */}
          {isAgreementSigned && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold text-lg">Agreement Signed!</h3>
                    <p className="text-sm text-muted-foreground">
                      You're all set. View your booking pass with QR code for pickup.
                    </p>
                  </div>
                  <Button asChild size="lg">
                    <Link to={`/booking/${bookingId}/pass`}>
                      View Pass
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    </CustomerLayout>
  );
}
