import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-admin";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Calendar, 
  Clock, 
  FileCheck, 
  AlertCircle, 
  ArrowRight,
  Home,
  Loader2
} from "lucide-react";

interface BookingData {
  id: string;
  booking_code: string;
  start_at: string;
  end_at: string;
  status: string;
  locations: {
    id: string;
    name: string;
    address: string;
    city: string;
  } | null;
}

export default function CheckIn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code");
  
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();

  // Fetch booking by code
  useEffect(() => {
    async function fetchBooking() {
      if (!code) {
        setError("No booking code provided");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("bookings")
          .select(`
            id,
            booking_code,
            start_at,
            end_at,
            status,
            locations (id, name, address, city)
          `)
          .eq("booking_code", code.toUpperCase())
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching booking:", fetchError);
          setError("Failed to look up booking");
        } else if (!data) {
          setError("Invalid or expired booking code");
        } else {
          setBooking(data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [code]);

  // Redirect admin/staff to booking ops view
  useEffect(() => {
    if (!isAdminLoading && isAdmin && booking) {
      navigate(`/admin/bookings?code=${booking.booking_code}`);
    }
  }, [isAdmin, isAdminLoading, booking, navigate]);

  // Loading state
  if (loading || isAdminLoading) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Looking up booking...</p>
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
                {error || "The booking code you scanned is invalid or has expired."}
              </p>
              <Button asChild className="mt-4">
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" />
                  Return Home
                </Link>
              </Button>
            </CardContent>
          </Card>
        </PageContainer>
      </CustomerLayout>
    );
  }

  // If admin is still being checked but we have booking, wait
  if (isAdmin === undefined) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </PageContainer>
      </CustomerLayout>
    );
  }

  // Customer-safe check-in view
  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-16">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <Badge variant="outline" className="text-lg px-4 py-1 font-mono">
              {booking.booking_code}
            </Badge>
            <h1 className="heading-2">Check-In Information</h1>
            <p className="text-muted-foreground">
              Present this code to staff at the pickup location
            </p>
          </div>

          {/* Pickup Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5 text-primary" />
                Pickup Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.locations ? (
                <>
                  <p className="font-semibold text-lg">{booking.locations.name}</p>
                  <p className="text-muted-foreground">{booking.locations.address}</p>
                  <p className="text-muted-foreground">{booking.locations.city}</p>
                </>
              ) : (
                <p className="text-muted-foreground">Location details unavailable</p>
              )}
            </CardContent>
          </Card>

          {/* Date/Time Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-primary" />
                Reservation Times
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pick-up</p>
                  <p className="font-medium">{format(new Date(booking.start_at), "EEEE, MMMM d, yyyy")}</p>
                  <p className="text-primary font-semibold">{format(new Date(booking.start_at), "h:mm a")}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Return</p>
                  <p className="font-medium">{format(new Date(booking.end_at), "EEEE, MMMM d, yyyy")}</p>
                  <p className="text-muted-foreground">{format(new Date(booking.end_at), "h:mm a")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck className="h-5 w-5 text-primary" />
                What to Bring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Valid driver's license
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Credit/debit card matching booking
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Proof of insurance (if not purchasing ours)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  This booking confirmation code
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
            <Button className="flex-1" asChild>
              <Link to={`/booking/${booking.id}`}>
                View Full Details
              </Link>
            </Button>
          </div>
        </div>
      </PageContainer>
    </CustomerLayout>
  );
}
