/**
 * BookingPass - QR code and key details for pickup
 */
import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, MapPin, Calendar, Clock, CreditCard, Car, Copy, Check, Loader2, AlertCircle } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { CancelBookingDialog } from "@/components/booking/CancelBookingDialog";

export default function BookingPass() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [copied, setCopied] = useState(false);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: `/booking/${bookingId}/pass` } });
    }
  }, [user, authLoading, navigate, bookingId]);
  
  // Fetch booking with payments
  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking-pass", bookingId],
    queryFn: async () => {
      if (!bookingId || !user) return null;
      
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          vehicle_id,
          locations!location_id (id, name, address, city)
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
  
  // Fetch payment status
  const { data: payments = [] } = useQuery({
    queryKey: ["booking-pass-payments", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_id", bookingId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!bookingId,
  });
  
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
  
  const completedPayments = payments.filter(p => p.status === "completed");
  const rentalPayment = completedPayments.find(p => p.payment_type === "rental");
  const depositPayment = completedPayments.find(p => p.payment_type === "deposit");
  
  const paymentStatus = rentalPayment ? "Paid" : "Pending";
  const depositStatus = depositPayment ? "Held" : "Pending";
  
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
  
  const checkInUrl = `${window.location.origin}/check-in?code=${booking.booking_code}`;
  
  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-16">
        <div className="max-w-md mx-auto space-y-6">
          {/* Back button */}
          <Button variant="ghost" asChild className="-ml-2">
            <Link to={`/booking/${bookingId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Booking
            </Link>
          </Button>
          
          {/* Pass Card */}
          <Card className="overflow-hidden">
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-6 text-center">
              <h1 className="text-xl font-bold mb-1">Booking Pass</h1>
              <p className="text-primary-foreground/80 text-sm">Show this at pickup</p>
            </div>
            
            {/* QR Code */}
            <CardContent className="pt-6 flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <QRCodeSVG 
                  value={checkInUrl} 
                  size={180}
                  level="H"
                />
              </div>
              
              {/* Booking Code */}
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">Booking Code</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xl px-4 py-2 font-mono">
                    {booking.booking_code}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleCopyCode}
                    className="h-10 w-10"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              {/* Key Details */}
              <div className="w-full space-y-4">
                {/* Vehicle */}
                {booking.vehicles && (
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {booking.vehicles.year} {booking.vehicles.make} {booking.vehicles.model}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Pickup */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{format(new Date(booking.start_at), "EEE, MMM d, yyyy")}</p>
                    <p className="text-sm text-primary">{format(new Date(booking.start_at), "h:mm a")}</p>
                  </div>
                </div>
                
                {/* Location */}
                {booking.locations && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{booking.locations.name}</p>
                      <p className="text-sm text-muted-foreground">{booking.locations.address}</p>
                    </div>
                  </div>
                )}
                
                <Separator />
                
                {/* Payment Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <span>Payment</span>
                  </div>
                  <Badge variant={paymentStatus === "Paid" ? "default" : "secondary"}>
                    {paymentStatus}
                  </Badge>
                </div>
                
                {/* Deposit Status */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground ml-7">Deposit</span>
                  <Badge variant={depositStatus === "Held" ? "default" : "secondary"}>
                    {depositStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Cancel Option */}
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
        </div>
      </PageContainer>
    </CustomerLayout>
  );
}
