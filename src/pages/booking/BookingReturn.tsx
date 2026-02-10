/**
 * BookingReturn - Return information and issue reporting
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  Fuel, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  MessageCircle
} from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportIssueDialog } from "@/components/booking/ReportIssueDialog";

export default function BookingReturn() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: `/booking/${bookingId}/return` } });
    }
  }, [user, authLoading, navigate, bookingId]);
  
  // Fetch booking
  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking-return", bookingId],
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
  
  // Fetch deposit status
  const { data: depositPayments = [] } = useQuery({
    queryKey: ["booking-return-deposits", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("payment_type", "deposit");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!bookingId,
  });
  
  const depositPayment = depositPayments[0];
  const depositStatus = depositPayment?.status === "refunded" 
    ? "Returned" 
    : depositPayment?.status === "completed" 
      ? "Held" 
      : "Pending";
  
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
  
  const isActive = booking.status === "active";
  const isCompleted = booking.status === "completed";
  
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
            <h1 className="text-2xl font-bold">
              {isCompleted ? "Return Complete" : "Return Information"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isCompleted 
                ? "Your rental has been completed. Thank you for renting with us!"
                : "Important information for returning your vehicle"}
            </p>
          </div>
          
          {/* Completed Banner */}
          {isCompleted && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="pt-6 flex items-center gap-4">
                <CheckCircle className="h-10 w-10 text-emerald-600" />
                <div>
                  <p className="font-semibold text-lg">Rental Completed</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.actual_return_at 
                      ? `Returned on ${format(new Date(booking.actual_return_at), "MMMM d, yyyy 'at' h:mm a")}`
                      : "Vehicle has been returned"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Return Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {isCompleted ? "Return Details" : "Scheduled Return"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{format(new Date(booking.end_at), "EEEE, MMMM d, yyyy")}</p>
                  <p className="text-primary font-medium">{format(new Date(booking.end_at), "h:mm a")}</p>
                </div>
              </div>
              
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
            </CardContent>
          </Card>
          
          {/* Deposit Status */}
          <Card>
            <CardHeader>
              <CardTitle>Security Deposit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">${booking.deposit_amount?.toFixed(2) || "500.00"} CAD</p>
                  <p className="text-sm text-muted-foreground">
                    {depositStatus === "Returned" 
                      ? "Refunded to your payment method"
                      : depositStatus === "Held"
                        ? "Will be returned after vehicle inspection"
                        : "Pending collection"}
                  </p>
                </div>
                <Badge 
                  variant={depositStatus === "Returned" ? "default" : "secondary"}
                  className={depositStatus === "Returned" ? "bg-emerald-600" : ""}
                >
                  {depositStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          {/* Return Instructions (for active rentals) */}
          {isActive && (
            <Card>
              <CardHeader>
                <CardTitle>Return Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Fuel className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Fuel Level</p>
                    <p className="text-muted-foreground">Return with the same fuel level as pickup</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">On-Time Return</p>
                    <p className="text-muted-foreground">Late returns may incur additional charges</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Report Any Issues</p>
                    <p className="text-muted-foreground">Let us know about any damage or problems</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Report Issue Button (for active rentals) */}
          {isActive && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowIssueDialog(true)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Report an Issue
            </Button>
          )}
          
          {/* Issue Dialog */}
          <ReportIssueDialog
            open={showIssueDialog}
            onOpenChange={setShowIssueDialog}
            bookingId={bookingId!}
            bookingCode={booking.booking_code}
          />
        </div>
      </PageContainer>
    </CustomerLayout>
  );
}
