/**
 * NewCheckout - Full checkout page with driver info, payment, and booking summary
 */
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, Link, useLocation } from "react-router-dom";
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
import { useSaveAbandonedCart, useMarkCartConverted, getCartSessionId } from "@/hooks/use-abandoned-carts";
import { SaveTimeAtCounter } from "@/components/checkout/SaveTimeAtCounter";

import { 
  calculateBookingPricing, 
  ageRangeToAgeBand, 
  YOUNG_DRIVER_FEE, 
  PROTECTION_RATES,
  BOOKING_INCLUDED_FEATURES,
  DEFAULT_DEPOSIT_AMOUNT,
  DriverAgeBand 
} from "@/lib/pricing";

export default function NewCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { searchData, rentalDays } = useRentalBooking();
  const { data: vehicles } = useVehicles();
  const { data: addOns = [] } = useAddOns();
  const saveAbandonedCart = useSaveAbandonedCart();
  const markCartConverted = useMarkCartConverted();
  const hasCompletedBooking = useRef(false);

  // URL params
  const vehicleId = searchParams.get("vehicleId") || searchData.selectedVehicleId;
  const protection = searchParams.get("protection") || "none";
  const addOnIds = searchParams.get("addOns")?.split(",").filter(Boolean) || searchData.selectedAddOnIds;

  // Form state - ageConfirmed is derived from context, not form input
  const [formData, setFormData] = useState({
    company: "",
    firstName: "",
    lastName: "",
    email: user?.email || "",
    countryCode: "+1",
    phone: "",
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

  // Redirect to search if age not confirmed
  useEffect(() => {
    if (!searchData.ageConfirmed || !searchData.ageRange) {
      toast({ 
        title: "Age confirmation required", 
        description: "Please confirm your age to proceed with booking",
        variant: "destructive" 
      });
      navigate("/search");
    }
  }, [searchData.ageConfirmed, searchData.ageRange, navigate]);

  const [paymentMethod, setPaymentMethod] = useState<"pay-now" | "pay-later">("pay-now");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceDetailsOpen, setPriceDetailsOpen] = useState(false);
  
  // Save Time at Counter state
  const [saveTimeAtCounter, setSaveTimeAtCounter] = useState(false);
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupContactPhone, setPickupContactPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  const vehicle = vehicles?.find((v) => v.id === vehicleId);

  // Update email when user loads
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: user.email || "" }));
    }
  }, [user?.email]);

  // Calculate pricing using central utility
  const driverAgeBand = ageRangeToAgeBand(searchData.ageRange);
  
  const pricing = useMemo(() => {
    const protectionInfo = PROTECTION_RATES[protection] || PROTECTION_RATES.none;
    const { total: addOnsTotal, itemized } = calculateAddOnsCost(addOns, addOnIds, rentalDays);
    const deliveryFee = searchData.deliveryMode === "delivery" ? searchData.deliveryFee : 0;
    
    const breakdown = calculateBookingPricing({
      vehicleDailyRate: vehicle?.dailyRate || 0,
      rentalDays,
      protectionDailyRate: protectionInfo.rate,
      addOnsTotal,
      deliveryFee,
      driverAgeBand,
    });

    return {
      ...breakdown,
      vehicleTotal: breakdown.vehicleTotal,
      protectionTotal: breakdown.protectionTotal,
      protectionName: protectionInfo.name,
      itemized,
    };
  }, [vehicle, rentalDays, protection, addOns, addOnIds, searchData, driverAgeBand]);

  // Save abandoned cart when user leaves with info filled in
  const saveCartData = useCallback(() => {
    if (hasCompletedBooking.current) return; // Don't save if booking completed
    
    // Only save if user has entered some data
    const hasContactInfo = formData.email || formData.phone || formData.firstName || formData.lastName;
    const hasVehicle = vehicleId;
    
    if (!hasContactInfo && !hasVehicle) return;
    
    const locationId = searchData.deliveryMode === "delivery"
      ? searchData.closestPickupCenterId
      : searchData.pickupLocationId;
    
    saveAbandonedCart.mutate({
      email: formData.email || undefined,
      phone: formData.phone ? `${formData.countryCode}${formData.phone}` : undefined,
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      vehicleId: vehicleId || undefined,
      pickupDate: searchData.pickupDate?.toISOString(),
      returnDate: searchData.returnDate?.toISOString(),
      locationId: locationId && /^[0-9a-f-]{36}$/i.test(locationId) ? locationId : undefined,
      deliveryMode: searchData.deliveryMode || undefined,
      deliveryAddress: searchData.deliveryAddress || undefined,
      protection,
      addOnIds: addOnIds.length > 0 ? addOnIds : undefined,
      totalAmount: pricing.total,
      fullCartData: {
        formData: { ...formData, cardNumber: undefined, cvv: undefined }, // Exclude sensitive data
        searchData,
        protection,
        addOnIds,
        rentalDays,
      },
    });
  }, [formData, vehicleId, searchData, protection, addOnIds, pricing.total, rentalDays, saveAbandonedCart]);

  // Save cart on page unload or visibility change
  useEffect(() => {
    const handleBeforeUnload = () => saveCartData();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveCartData();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveCartData]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBack = () => {
    // Save cart when navigating away
    saveCartData();
    
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

    if (!searchData.ageConfirmed || !searchData.ageRange) {
      toast({ title: "Please confirm your age on the search page", variant: "destructive" });
      navigate("/search");
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
        // Save cart before redirecting to auth
        saveCartData();
        
        // Construct return URL with all current state
        const currentUrl = `${location.pathname}${location.search}`;
        toast({ title: "Please sign in to complete booking", variant: "destructive" });
        navigate(`/auth?returnUrl=${encodeURIComponent(currentUrl)}`);
        return;
      }

      // Build notes with save time info
      let bookingNotes = paymentMethod === "pay-later" ? "Customer chose to pay at pickup" : null;
      if (saveTimeAtCounter && specialInstructions) {
        bookingNotes = bookingNotes 
          ? `${bookingNotes}\n\nSpecial instructions: ${specialInstructions}` 
          : `Special instructions: ${specialInstructions}`;
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
          deposit_amount: DEFAULT_DEPOSIT_AMOUNT,
          booking_code: `C2C${Date.now().toString(36).toUpperCase()}`,
          status: paymentMethod === "pay-now" ? "pending" : "pending",
          notes: bookingNotes,
          pickup_address: searchData.deliveryMode === "delivery" ? searchData.deliveryAddress : null,
          pickup_lat: searchData.deliveryLat,
          pickup_lng: searchData.deliveryLng,
          driver_age_band: driverAgeBand,
          young_driver_fee: pricing.youngDriverFee,
          save_time_at_counter: saveTimeAtCounter,
          pickup_contact_name: saveTimeAtCounter ? (pickupContactName || `${formData.firstName} ${formData.lastName}`) : null,
          pickup_contact_phone: saveTimeAtCounter && pickupContactPhone ? pickupContactPhone : null,
          special_instructions: saveTimeAtCounter && specialInstructions ? specialInstructions : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Mark abandoned cart as converted
      hasCompletedBooking.current = true;
      markCartConverted.mutate(booking.id);

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
        // Create Stripe Checkout Session and redirect
        try {
          const baseUrl = window.location.origin;
          const response = await supabase.functions.invoke("create-checkout-session", {
            body: {
              bookingId: booking.id,
              amount: pricing.total,
              currency: "cad",
              successUrl: `${baseUrl}/booking/${booking.id}?payment=success`,
              cancelUrl: `${baseUrl}/checkout?vehicleId=${vehicleId}&protection=${protection}&payment=cancelled`,
            },
          });

          if (response.error) {
            throw new Error(response.error.message || "Failed to create checkout session");
          }

          const { url } = response.data;

          if (url) {
            // Redirect to Stripe Checkout
            window.location.href = url;
            return; // Stop execution - we're redirecting
          } else {
            throw new Error("No checkout URL returned");
          }
        } catch (paymentError: any) {
          console.error("Payment error:", paymentError);
          
          // Update booking to indicate payment issue
          await supabase
            .from("bookings")
            .update({ 
              notes: "Online payment setup failed - customer needs to pay at pickup",
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
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="shrink-0 h-8 w-8"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="text-xs sm:text-lg font-semibold uppercase tracking-wide line-clamp-1">
                  Review Booking
                </h1>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Total:</p>
                  <p className="text-base sm:text-2xl font-bold whitespace-nowrap">
                    CA${pricing.total.toFixed(2)}
                  </p>
                </div>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                  {/* Age confirmation indicator - read from context */}
                  {searchData.ageRange && (
                    <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>
                        {searchData.ageRange === "21-25" 
                          ? "Driver age: 21-25 years (young driver fee applies)" 
                          : "Driver age: 25+ years"}
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Payment Method */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6">Payment Method</h2>

                {/* Payment Method Radio Cards */}
                <div className="space-y-3">
                  {/* Pay Now Option */}
                  <label
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      paymentMethod === "pay-now"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "pay-now"}
                      onChange={() => setPaymentMethod("pay-now")}
                      className="mt-1 w-4 h-4 text-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        <span className="font-medium">Pay Now</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Secure payment via Stripe. Instant confirmation.
                      </p>
                    </div>
                  </label>

                  {/* Pay at Pickup Option */}
                  <label
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      paymentMethod === "pay-later"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "pay-later"}
                      onChange={() => setPaymentMethod("pay-later")}
                      className="mt-1 w-4 h-4 text-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        <span className="font-medium">Pay at Pickup</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pay when you pick up the vehicle.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Pay Now Info */}
                {paymentMethod === "pay-now" && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Secure payment via Stripe. You'll be redirected to complete your payment.
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

              {/* Save Time at Counter */}
              <SaveTimeAtCounter
                saveTime={saveTimeAtCounter}
                onSaveTimeChange={setSaveTimeAtCounter}
                pickupContactName={pickupContactName}
                onPickupContactNameChange={setPickupContactName}
                pickupContactPhone={pickupContactPhone}
                onPickupContactPhoneChange={setPickupContactPhone}
                specialInstructions={specialInstructions}
                onSpecialInstructionsChange={setSpecialInstructions}
                defaultName={formData.firstName && formData.lastName ? `${formData.firstName} ${formData.lastName}` : undefined}
              />

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
                    {pricing.youngDriverFee > 0 && (
                      <div className="flex justify-between">
                        <span>Young driver fee</span>
                        <span>CA${pricing.youngDriverFee.toFixed(2)}</span>
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
                  {BOOKING_INCLUDED_FEATURES.slice(0, 4).map((feature) => (
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
