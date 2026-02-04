/**
 * BookingConfirmed - Landing page after checkout showing booking confirmation
 */
import { useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle, MapPin, Calendar, Car, ArrowRight, Loader2 } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function BookingConfirmed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const bookingId = searchParams.get("booking_id");
  
  // Redirect if no booking ID
  useEffect(() => {
    if (!bookingId) {
      navigate("/dashboard");
    }
  }, [bookingId, navigate]);
  
  // Fetch booking
  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking-confirmed", bookingId],
    queryFn: async () => {
      if (!bookingId || !user) return null;
      
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          vehicle_id,
          locations (id, name, address, city)
        `)
        .eq("id", bookingId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      // Fetch category info separately
      let vehicles = null;
      if (data.vehicle_id) {
        const { data: category } = await supabase
          .from("vehicle_categories")
          .select("id, name, image_url")
          .eq("id", data.vehicle_id)
          .maybeSingle();
        if (category) {
          vehicles = {
            id: category.id,
            make: "",
            model: category.name,
            year: 0,
            image_url: category.image_url,
            category: category.name,
          };
        }
      }
      return { ...data, vehicles };
    },
    enabled: !!bookingId && !!user,
  });
  
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
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Success Header */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold">Booking Confirmed!</h1>
            <p className="text-muted-foreground">
              Your reservation has been successfully created
            </p>
            <Badge variant="outline" className="text-lg px-4 py-2 font-mono">
              {booking.booking_code}
            </Badge>
          </div>
          
          {/* Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Booking Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vehicle */}
              {booking.vehicles && (
                <div className="flex items-center gap-4">
                  {booking.vehicles.image_url && (
                    <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={booking.vehicles.image_url} 
                        alt={`${booking.vehicles.make} ${booking.vehicles.model}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">
                      {booking.vehicles.year} {booking.vehicles.make} {booking.vehicles.model}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {booking.vehicles.category}
                    </p>
                  </div>
                </div>
              )}
              
              <Separator />
              
              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Pick-up</p>
                  <p className="font-medium">{format(new Date(booking.start_at), "EEE, MMM d, yyyy")}</p>
                  <p className="text-sm text-primary">{format(new Date(booking.start_at), "h:mm a")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Return</p>
                  <p className="font-medium">{format(new Date(booking.end_at), "EEE, MMM d, yyyy")}</p>
                  <p className="text-sm text-primary">{format(new Date(booking.end_at), "h:mm a")}</p>
                </div>
              </div>
              
              {/* Location */}
              {booking.locations && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{booking.locations.name}</p>
                      <p className="text-sm text-muted-foreground">{booking.locations.address}</p>
                    </div>
                  </div>
                </>
              )}
              
              <Separator />
              
              {/* Total */}
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span>${booking.total_amount.toFixed(2)} CAD</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Next Steps CTA */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-semibold text-lg">Upload Your Driver's License</h3>
                  <p className="text-sm text-muted-foreground">
                    Required before pickup. Takes less than 2 minutes.
                  </p>
                </div>
                <Button asChild size="lg">
                  <Link to={`/booking/${booking.id}/license`}>
                    Upload Now
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* View Full Details */}
          <div className="text-center">
            <Button variant="outline" asChild>
              <Link to={`/booking/${booking.id}`}>View Full Booking Details</Link>
            </Button>
          </div>
        </div>
      </PageContainer>
    </CustomerLayout>
  );
}
