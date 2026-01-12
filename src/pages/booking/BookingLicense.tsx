/**
 * BookingLicense - Upload driver's license for booking
 */
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useBookingVerification } from "@/hooks/use-verification";
import { DriverLicenseUpload } from "@/components/booking/DriverLicenseUpload";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export default function BookingLicense() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: `/booking/${bookingId}/license` } });
    }
  }, [user, authLoading, navigate, bookingId]);
  
  // Fetch booking
  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ["booking-license", bookingId],
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
  
  // Fetch verification status
  const { data: verifications = [], isLoading: verificationsLoading } = useBookingVerification(bookingId || null);
  
  const licenseFront = verifications.find(v => v.document_type === "drivers_license_front");
  const licenseBack = verifications.find(v => v.document_type === "drivers_license_back");
  
  const isLicenseComplete = !!licenseFront && !!licenseBack && 
    licenseFront.status !== "rejected" && licenseBack.status !== "rejected";
  
  const isLicenseVerified = !!licenseFront && !!licenseBack && 
    licenseFront.status === "verified" && licenseBack.status === "verified";
  
  if (authLoading || bookingLoading || verificationsLoading) {
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
            <h1 className="text-2xl font-bold">Upload Driver's License</h1>
            <p className="text-muted-foreground mt-1">
              Required before pickup. Your license will be verified by our team.
            </p>
          </div>
          
          {/* License Upload Component */}
          <DriverLicenseUpload bookingId={bookingId!} />
          
          {/* Status & Next Step */}
          {isLicenseComplete && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold text-lg">
                      {isLicenseVerified ? "License Verified!" : "License Uploaded!"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isLicenseVerified 
                        ? "Your driver's license has been verified. You can now proceed to sign the rental agreement."
                        : "Your license is being reviewed. You can proceed to sign the rental agreement."}
                    </p>
                  </div>
                  <Button asChild size="lg">
                    <Link to={`/booking/${bookingId}/agreement`}>
                      Continue
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
