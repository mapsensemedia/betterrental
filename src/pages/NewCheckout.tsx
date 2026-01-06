/**
 * NewCheckout - Full checkout page with driver info, payment, and booking summary
 */
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Check,
  Shield,
  Info,
  MapPin,
  CreditCard,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { useVehicles } from "@/hooks/use-vehicles";
import { useAddOns, calculateAddOnsCost } from "@/hooks/use-add-ons";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { BookingStepper } from "@/components/shared/BookingStepper";

const TAX_RATE = 0.13; // 13% tax

const includedFeatures = [
  "Third party insurance",
  "24/7 Roadside Assistance Hotline",
  "Unlimited kilometers",
  "Booking option: Best price - Pay now, cancel and rebook for a fee",
];

const protectionRates: Record<string, { name: string; rate: number }> = {
  none: { name: "No Extra Protection", rate: 0 },
  basic: { name: "Basic Protection", rate: 33.99 },
  smart: { name: "Smart Protection", rate: 39.25 },
  premium: { name: "All Inclusive Protection", rate: 49.77 },
};

export default function NewCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { searchData, rentalDays } = useRentalBooking();
  const { data: vehicles } = useVehicles();
  const { data: addOns = [] } = useAddOns();

  // URL params
  const vehicleId = searchParams.get("vehicleId") || searchData.selectedVehicleId;
  const protection = searchParams.get("protection") || "none";
  const addOnIds = searchParams.get("addOns")?.split(",").filter(Boolean) || searchData.selectedAddOnIds;

  // Form state
  const [formData, setFormData] = useState({
    company: "",
    firstName: "",
    lastName: "",
    email: user?.email || "",
    countryCode: "+1",
    phone: "",
    ageConfirmed: searchData.ageConfirmed,
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
    country: "Canada",
    streetAddress: "",
    city: "",
    postalCode: "",
    termsAccepted: false,
  });

  const [paymentMethod, setPaymentMethod] = useState<"pay-now" | "pay-later">("pay-now");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceDetailsOpen, setPriceDetailsOpen] = useState(false);

  const vehicle = vehicles?.find((v) => v.id === vehicleId);

  // Calculate pricing
  const pricing = useMemo(() => {
    const vehicleTotal = (vehicle?.dailyRate || 0) * rentalDays;
    const protectionInfo = protectionRates[protection] || protectionRates.none;
    const protectionTotal = protectionInfo.rate * rentalDays;

    const { total: addOnsTotal, itemized } = calculateAddOnsCost(addOns, addOnIds, rentalDays);
    
    const deliveryFee = searchData.deliveryMode === "delivery" ? searchData.deliveryFee : 0;
    
    const subtotal = vehicleTotal + protectionTotal + addOnsTotal + deliveryFee;
    const taxAmount = subtotal * TAX_RATE;
    const total = subtotal + taxAmount;

    return {
      vehicleTotal,
      protectionTotal,
      protectionName: protectionInfo.name,
      addOnsTotal,
      itemized,
      deliveryFee,
      subtotal,
      taxAmount,
      total,
    };
  }, [vehicle, rentalDays, protection, addOns, addOnIds, searchData]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBack = () => {
    const params = new URLSearchParams();
    if (vehicleId) params.set("vehicleId", vehicleId);
    if (searchData.pickupDate) params.set("startAt", searchData.pickupDate.toISOString());
    if (searchData.returnDate) params.set("endAt", searchData.returnDate.toISOString());
    if (searchData.pickupLocationId) params.set("locationId", searchData.pickupLocationId);
    params.set("protection", protection);
    navigate(`/add-ons?${params.toString()}`);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (!formData.ageConfirmed) {
      toast({ title: "Please confirm you are 25 years of age or older", variant: "destructive" });
      return;
    }

    if (!formData.termsAccepted) {
      toast({ title: "Please accept the terms and conditions", variant: "destructive" });
      return;
    }

    if (!vehicleId || !vehicle || !searchData.pickupDate || !searchData.returnDate) {
      toast({ title: "Missing booking information", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get location ID - use the first available location UUID as fallback
      let locationId = searchData.deliveryMode === "delivery"
        ? searchData.closestPickupCenterId
        : searchData.pickupLocationId;
      
      // Fallback to first database location if location ID is not a valid UUID
      if (!locationId || !/^[0-9a-f-]{36}$/i.test(locationId)) {
        locationId = "a1b2c3d4-1111-4000-8000-000000000001"; // Downtown Hub
      }

      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({ title: "Please sign in to complete booking", variant: "destructive" });
        navigate("/auth");
        return;
      }

      // Create booking first
      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          user_id: session.user.id,
          vehicle_id: vehicleId,
          location_id: locationId,
          start_at: searchData.pickupDate.toISOString(),
          end_at: searchData.returnDate.toISOString(),
          daily_rate: vehicle.dailyRate,
          total_days: rentalDays,
          subtotal: pricing.subtotal,
          tax_amount: pricing.taxAmount,
          total_amount: pricing.total,
          deposit_amount: 500,
          booking_code: `C2C${Date.now().toString(36).toUpperCase()}`,
          status: paymentMethod === "pay-now" ? "pending" : "pending",
          notes: paymentMethod === "pay-later" ? "Customer chose to pay at pickup" : null,
          pickup_address: searchData.deliveryMode === "delivery" ? searchData.deliveryAddress : null,
          pickup_lat: searchData.deliveryLat,
          pickup_lng: searchData.deliveryLng,
        })
        .select()
        .single();

      if (error) throw error;

      // Add selected add-ons to booking
      if (addOnIds.length > 0) {
        const addOnInserts = addOnIds.map((id) => {
          const addon = addOns.find((a) => a.id === id);
          return {
            booking_id: booking.id,
            add_on_id: id,
            price: addon ? addon.dailyRate * rentalDays + (addon.oneTimeFee || 0) : 0,
            quantity: 1,
          };
        });

        await supabase.from("booking_add_ons").insert(addOnInserts);
      }

      if (paymentMethod === "pay-now") {
        // Create Stripe payment intent
        try {
          const response = await supabase.functions.invoke("create-payment-intent", {
            body: {
              bookingId: booking.id,
              amount: pricing.total,
              currency: "cad",
            },
          });

          if (response.error) {
            throw new Error(response.error.message || "Failed to create payment");
          }

          const { clientSecret } = response.data;

          if (clientSecret) {
            // For now, we'll simulate the payment flow
            // In production, you'd integrate Stripe Elements here
            toast({
              title: "Payment processing...",
              description: "Redirecting to secure payment page",
            });

            // Update booking to confirmed after successful payment simulation
            await supabase
              .from("bookings")
              .update({ status: "confirmed" })
              .eq("id", booking.id);

            // Record payment
            await supabase.from("payments").insert({
              booking_id: booking.id,
              user_id: session.user.id,
              amount: pricing.total,
              payment_type: "rental",
              payment_method: "card",
              status: "completed",
              transaction_id: `sim_${Date.now()}`,
            });

            // Send confirmation email and SMS
            await supabase.functions.invoke("send-booking-email", {
              body: { bookingId: booking.id, templateType: "confirmation", forceResend: true },
            });

            await supabase.functions.invoke("send-booking-sms", {
              body: { bookingId: booking.id, templateType: "confirmation" },
            });

            toast({
              title: "Booking confirmed!",
              description: `Your confirmation code is ${booking.booking_code}. Check your email for details.`,
            });

            navigate(`/booking/${booking.id}`);
          }
        } catch (paymentError: any) {
          console.error("Payment error:", paymentError);
          
          // Update booking to indicate payment issue
          await supabase
            .from("bookings")
            .update({ 
              notes: "Online payment failed - customer needs to pay at pickup",
            })
            .eq("id", booking.id);

          toast({
            title: "Payment could not be processed",
            description: "Your booking is saved. Please pay at pickup location.",
            variant: "destructive",
          });

          // Still send confirmation but indicate payment needed
          await supabase.functions.invoke("send-booking-email", {
            body: { bookingId: booking.id, templateType: "confirmation", forceResend: true },
          });

          navigate(`/booking/${booking.id}`);
        }
      } else {
        // Pay at pickup flow
        toast({
          title: "Booking reserved!",
          description: `Your reservation code is ${booking.booking_code}. Please pay at pickup.`,
        });

        // Send confirmation email and SMS
        await supabase.functions.invoke("send-booking-email", {
          body: { bookingId: booking.id, templateType: "confirmation", forceResend: true },
        });

        await supabase.functions.invoke("send-booking-sms", {
          body: { bookingId: booking.id, templateType: "confirmation" },
        });

        navigate(`/booking/${booking.id}`);
      }
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect if no vehicle selected
  if (!vehicleId) {
    return (
      <CustomerLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No vehicle selected</p>
            <Button onClick={() => navigate("/search")}>Browse Vehicles</Button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  const locationDisplay = searchData.deliveryMode === "delivery"
    ? searchData.closestPickupCenterName
    : searchData.pickupLocationName;

  return (
    <CustomerLayout>
      {/* Step Progress Indicator */}
      <div className="bg-background border-b border-border py-4">
        <div className="container mx-auto px-4">
          <BookingStepper currentStep={4} />
        </div>
      </div>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold uppercase tracking-wide">
                Review Your Booking
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total:</p>
                <p className="text-2xl font-bold">
                  CA${pricing.total.toFixed(2)}
                </p>
                <button
                  onClick={() => setPriceDetailsOpen(!priceDetailsOpen)}
                  className="text-xs text-primary underline"
                >
                  Price details
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Forms */}
            <div className="lg:col-span-2 space-y-8">
              {/* Driver Information */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6">Who will drive?</h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="company">Company (optional)</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => handleInputChange("company", e.target.value)}
                      placeholder="Company name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="countryCode">Country</Label>
                      <Select
                        value={formData.countryCode}
                        onValueChange={(v) => handleInputChange("countryCode", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+1">🇨🇦 +1</SelectItem>
                          <SelectItem value="+1-us">🇺🇸 +1</SelectItem>
                          <SelectItem value="+44">🇬🇧 +44</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="phone">Phone number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      id="ageConfirmed"
                      checked={formData.ageConfirmed}
                      onCheckedChange={(checked) => handleInputChange("ageConfirmed", checked as boolean)}
                    />
                    <Label htmlFor="ageConfirmed" className="text-sm cursor-pointer">
                      I am 25 years of age or older
                    </Label>
                  </div>
                </div>
              </Card>

              {/* Payment Method */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6">How would you like to pay?</h2>

                {/* Payment Method Toggle */}
                <div className="flex gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("pay-now")}
                    className={cn(
                      "flex-1 p-4 rounded-xl border-2 transition-all text-left",
                      paymentMethod === "pay-now"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Pay Now</p>
                        <p className="text-sm text-muted-foreground">
                          Secure online payment
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("pay-later")}
                    className={cn(
                      "flex-1 p-4 rounded-xl border-2 transition-all text-left",
                      paymentMethod === "pay-later"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Pay at Pickup</p>
                        <p className="text-sm text-muted-foreground">
                          Pay when you collect car
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Pay Now Form */}
                {paymentMethod === "pay-now" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Card number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 1234 1234 1234"
                        value={formData.cardNumber}
                        onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="cardName">Cardholder name</Label>
                      <Input
                        id="cardName"
                        value={formData.cardName}
                        onChange={(e) => handleInputChange("cardName", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate">Expiration date</Label>
                        <Input
                          id="expiryDate"
                          placeholder="MM/YY"
                          value={formData.expiryDate}
                          onChange={(e) => handleInputChange("expiryDate", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          value={formData.cvv}
                          onChange={(e) => handleInputChange("cvv", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 py-2">
                      <div className="w-10 h-6 bg-muted rounded flex items-center justify-center text-xs">AMEX</div>
                      <div className="w-10 h-6 bg-muted rounded flex items-center justify-center text-xs">MC</div>
                      <div className="w-10 h-6 bg-muted rounded flex items-center justify-center text-xs">DISC</div>
                      <div className="w-10 h-6 bg-muted rounded flex items-center justify-center text-xs">JCB</div>
                      <div className="w-10 h-6 bg-muted rounded flex items-center justify-center text-xs">VISA</div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      The payment method must be under the renter's name and physically presented at pickup.
                    </p>
                  </div>
                )}

                {/* Pay Later Notice */}
                {paymentMethod === "pay-later" && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      No payment required now
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You'll pay the full amount of CA${pricing.total.toFixed(2)} when you pick up the vehicle.
                      Please bring a valid credit card in the driver's name.
                    </p>
                  </div>
                )}
              </Card>

              {/* Invoice Address (for pay now) */}
              {paymentMethod === "pay-now" && (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-6">What's your invoice address?</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={formData.country}
                        onValueChange={(v) => handleInputChange("country", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Canada">🇨🇦 Canada</SelectItem>
                          <SelectItem value="United States">🇺🇸 United States</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="streetAddress">Street address</Label>
                      <Input
                        id="streetAddress"
                        value={formData.streetAddress}
                        onChange={(e) => handleInputChange("streetAddress", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => handleInputChange("city", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="postalCode">Postal code</Label>
                        <Input
                          id="postalCode"
                          value={formData.postalCode}
                          onChange={(e) => handleInputChange("postalCode", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Total & Terms */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Total</h2>
                  <p className="text-2xl font-bold">CA${pricing.total.toFixed(2)}</p>
                </div>

                <Collapsible open={priceDetailsOpen} onOpenChange={setPriceDetailsOpen}>
                  <CollapsibleTrigger className="text-sm text-primary underline mb-4">
                    Price details
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 text-sm mb-4 p-4 bg-muted rounded-lg">
                    <div className="flex justify-between">
                      <span>Vehicle ({rentalDays} days)</span>
                      <span>CA${pricing.vehicleTotal.toFixed(2)}</span>
                    </div>
                    {pricing.protectionTotal > 0 && (
                      <div className="flex justify-between">
                        <span>{pricing.protectionName}</span>
                        <span>CA${pricing.protectionTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {pricing.addOnsTotal > 0 && (
                      <div className="flex justify-between">
                        <span>Add-ons</span>
                        <span>CA${pricing.addOnsTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {pricing.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span>Delivery fee</span>
                        <span>CA${pricing.deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>CA${pricing.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes (13%)</span>
                      <span>CA${pricing.taxAmount.toFixed(2)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>CA${pricing.total.toFixed(2)}</span>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="text-sm text-muted-foreground space-y-2 mb-6">
                  <p className="font-medium text-foreground">
                    IMPORTANT INFORMATION about your {paymentMethod === "pay-now" ? "PREPAID" : "PAY LATER"} reservation:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>$150.00 for cancellations within 24 hours prior to pickup time</li>
                    <li>$65.00 for cancellations up to 24 hours prior to pickup time</li>
                    <li>Cancellations or changes made within 24 hours of booking are free</li>
                    <li>No show: No refund will be issued for no show</li>
                  </ul>
                </div>

                <div className="flex items-start gap-2 mb-6">
                  <Checkbox
                    id="termsAccepted"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => handleInputChange("termsAccepted", checked as boolean)}
                  />
                  <Label htmlFor="termsAccepted" className="text-sm cursor-pointer">
                    I have read and accept the{" "}
                    <Link to="/terms" className="text-primary underline">Rental Information</Link>, the{" "}
                    <Link to="/terms" className="text-primary underline">Terms and Conditions</Link>, and the{" "}
                    <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>{" "}
                    and I acknowledge that I am booking a prepaid rate.
                  </Label>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full h-14 text-lg bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Pay and Book"
                  )}
                </Button>
              </Card>
            </div>

            {/* Right: Booking Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                {/* Vehicle */}
                {vehicle && (
                  <div className="flex gap-3 mb-4">
                    {vehicle.imageUrl && (
                      <img
                        src={vehicle.imageUrl}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="w-24 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <p className="font-semibold">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        or similar | {vehicle.category}
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {rentalDays} rental day{rentalDays > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                {/* Pickup / Return */}
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Pickup</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">{locationDisplay || "Location"}</p>
                        <p className="text-muted-foreground">
                          {searchData.pickupDate && format(searchData.pickupDate, "EEE, dd MMM, yyyy")} | {searchData.pickupTime}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Return</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">{locationDisplay || "Location"}</p>
                        <p className="text-muted-foreground">
                          {searchData.returnDate && format(searchData.returnDate, "EEE, dd MMM, yyyy")} | {searchData.returnTime}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Booking Overview */}
                <h3 className="font-semibold mb-3">Your booking overview:</h3>
                <div className="space-y-2">
                  {includedFeatures.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                      <Info className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
