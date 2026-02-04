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
  Lock,
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
import { useVehicles, useCategory } from "@/hooks/use-vehicles";
import { useAddOns, calculateAddOnsCost } from "@/hooks/use-add-ons";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { BookingStepper } from "@/components/shared/BookingStepper";
import { useSaveAbandonedCart, useMarkCartConverted, getCartSessionId } from "@/hooks/use-abandoned-carts";
import { SaveTimeAtCounter } from "@/components/checkout/SaveTimeAtCounter";
import { PointsRedemption } from "@/components/checkout/PointsRedemption";
import { CreditCardInput, CreditCardDisplay } from "@/components/checkout/CreditCardInput";
import { validateCard, detectCardType, maskCardNumber, CardType, validateDriverCardholderMatch, isCardTypeAllowed } from "@/lib/card-validation";
import { CREDIT_CARD_AUTHORIZATION_POLICY, CANCELLATION_POLICY } from "@/lib/checkout-policies";
import { calculateAdditionalDriversCost } from "@/components/rental/AdditionalDriversCard";

import { 
  calculateBookingPricing, 
  ageRangeToAgeBand, 
  YOUNG_DRIVER_FEE, 
  PROTECTION_RATES,
  BOOKING_INCLUDED_FEATURES,
  DEFAULT_DEPOSIT_AMOUNT,
  DriverAgeBand 
} from "@/lib/pricing";
import { formatTimeDisplay } from "@/lib/rental-rules";

export default function NewCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { searchData, rentalDays } = useRentalBooking();
  const { data: addOns = [] } = useAddOns();
  const saveAbandonedCart = useSaveAbandonedCart();
  const markCartConverted = useMarkCartConverted();
  const hasCompletedBooking = useRef(false);

  // URL params - support both categoryId (new flow) and vehicleId (legacy)
  const categoryId = searchParams.get("categoryId") || searchData.selectedVehicleId;
  const legacyVehicleId = searchParams.get("vehicleId");
  const vehicleId = categoryId || legacyVehicleId; // Use categoryId as the primary ID
  const protection = searchParams.get("protection") || "none";
  const addOnIds = searchParams.get("addOns")?.split(",").filter(Boolean) || searchData.selectedAddOnIds;

  // Fetch category data (which is what we're actually booking)
  const { data: category, isLoading: categoryLoading } = useCategory(categoryId);

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
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceDetailsOpen, setPriceDetailsOpen] = useState(false);
  
  // Save Time at Counter state
  const [saveTimeAtCounter, setSaveTimeAtCounter] = useState(false);
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupContactPhone, setPickupContactPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  
  // Points redemption state
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [pointsUsed, setPointsUsed] = useState(0);
  
  // Use category as the vehicle data source
  const vehicle = category;

  // Update email when user loads
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: user.email || "" }));
    }
  }, [user?.email]);

  // Calculate pricing using central utility
  const driverAgeBand = ageRangeToAgeBand(searchData.ageRange);
  
  // Get vehicle category for fuel add-on calculation
  const vehicleCategory = vehicle?.category || (vehicle as any)?.categoryName || "default";
  
  const pricing = useMemo(() => {
    const protectionInfo = PROTECTION_RATES[protection] || PROTECTION_RATES.none;
    const { total: addOnsTotal, itemized } = calculateAddOnsCost(addOns, addOnIds, rentalDays, vehicleCategory);
    const deliveryFee = searchData.deliveryMode === "delivery" ? searchData.deliveryFee : 0;
    
    // Calculate additional drivers cost
    const additionalDriversCost = calculateAdditionalDriversCost(searchData.additionalDrivers || [], rentalDays);
    
    const breakdown = calculateBookingPricing({
      vehicleDailyRate: vehicle?.dailyRate || 0,
      rentalDays,
      protectionDailyRate: protectionInfo.rate,
      addOnsTotal: addOnsTotal + additionalDriversCost.total,
      deliveryFee,
      driverAgeBand,
      pickupDate: searchData.pickupDate,
    });

    return {
      ...breakdown,
      vehicleTotal: breakdown.vehicleTotal,
      protectionTotal: breakdown.protectionTotal,
      protectionName: protectionInfo.name,
      itemized,
      additionalDriversCost,
      addOnsRawTotal: addOnsTotal,
    };
  }, [vehicle, vehicleCategory, rentalDays, protection, addOns, addOnIds, searchData, driverAgeBand]);

  // Final total after points discount
  const finalTotal = Math.max(0, pricing.total - pointsDiscount);

  // Handler for points redemption
  const handleApplyPointsDiscount = (discount: number, points: number) => {
    setPointsDiscount(discount);
    setPointsUsed(points);
  };

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

    if (!searchData.ageConfirmed || !searchData.ageRange || !driverAgeBand) {
      toast({ title: "Please confirm your age on the search page", variant: "destructive" });
      navigate("/search");
      return;
    }

    // Validate credit card
    const cardValidation = validateCard({
      number: formData.cardNumber,
      expiry: formData.expiryDate,
      name: formData.cardName,
    });

    if (!cardValidation.valid) {
      setCardErrors(cardValidation.errors);
      toast({ title: "Please check your card details", variant: "destructive" });
      return;
    }
    
    // Validate driver name matches cardholder name
    const nameMatch = validateDriverCardholderMatch(
      formData.firstName,
      formData.lastName,
      formData.cardName
    );
    
    if (!nameMatch.matches) {
      setCardErrors({ name: nameMatch.error || "Primary driver name must match the cardholder name." });
      toast({ title: nameMatch.error || "Primary driver name must match the cardholder name.", variant: "destructive" });
      return;
    }
    
    // Check for debit/prepaid card (messaging-based validation)
    const cardTypeCheck = isCardTypeAllowed(formData.cardNumber);
    if (!cardTypeCheck.allowed) {
      setCardErrors({ number: cardTypeCheck.reason || "This card type is not accepted." });
      toast({ title: cardTypeCheck.reason || "This card type is not accepted.", variant: "destructive" });
      return;
    }
    
    setCardErrors({});

    if (!formData.termsAccepted) {
      toast({ title: "Please accept the terms and conditions", variant: "destructive" });
      return;
    }

    if (!categoryId || !vehicle || !searchData.pickupDate || !searchData.returnDate) {
      toast({ title: "Missing booking information", description: "Please select a vehicle and dates", variant: "destructive" });
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

      // Get session (optional - we support guest checkout)
      const { data: { session } } = await supabase.auth.getSession();

      // Build notes with save time info
      let bookingNotes = paymentMethod === "pay-later" ? "Customer chose to pay at pickup" : null;
      if (saveTimeAtCounter && specialInstructions) {
        bookingNotes = bookingNotes 
          ? `${bookingNotes}\n\nSpecial instructions: ${specialInstructions}` 
          : `Special instructions: ${specialInstructions}`;
      }

      let booking: { id: string; booking_code: string } | null = null;

      // Extract card info for storage (last 4 digits only - never store full card)
      const cardLast4 = formData.cardNumber.replace(/\s+/g, "").slice(-4);
      const cardTypeValue = detectCardType(formData.cardNumber);

      if (session) {
        // Logged-in user flow - create booking directly
        // Note: vehicle_id stores the category ID for category-based bookings
        const { data: bookingData, error } = await supabase
          .from("bookings")
          .insert({
            user_id: session.user.id,
            vehicle_id: categoryId, // This is the category ID
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
            status: "pending",
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
            card_last_four: cardLast4,
            card_type: cardTypeValue,
            card_holder_name: formData.cardName,
          })
          .select()
          .single();

        if (error) throw error;
        booking = bookingData;

        // Add selected add-ons to booking
        if (addOnIds.length > 0) {
          const addOnInserts = addOnIds.map((id) => {
            const addon = addOns.find((a) => a.id === id);
            return {
              booking_id: booking!.id,
              add_on_id: id,
              price: addon ? addon.dailyRate * rentalDays + (addon.oneTimeFee || 0) : 0,
              quantity: 1,
            };
          });

          await supabase.from("booking_add_ons").insert(addOnInserts);
        }
        
        // Add additional drivers to booking
        if (searchData.additionalDrivers && searchData.additionalDrivers.length > 0) {
          const driverInserts = searchData.additionalDrivers.map((driver) => ({
            booking_id: booking!.id,
            driver_name: driver.name || null,
            driver_age_band: driver.ageBand,
            young_driver_fee: driver.ageBand === "20_24" ? YOUNG_DRIVER_FEE : 0,
          }));

          await supabase.from("booking_additional_drivers").insert(driverInserts);
        }
      } else {
        // Guest checkout flow - use edge function
        const addOnData = addOnIds.map((id) => {
          const addon = addOns.find((a) => a.id === id);
          return {
            addOnId: id,
            price: addon ? addon.dailyRate * rentalDays + (addon.oneTimeFee || 0) : 0,
            quantity: 1,
          };
        });
        
        // Prepare additional drivers data for guest booking
        const additionalDriversData = (searchData.additionalDrivers || []).map((driver) => ({
          driverName: driver.name || null,
          driverAgeBand: driver.ageBand,
          youngDriverFee: driver.ageBand === "20_24" ? YOUNG_DRIVER_FEE : 0,
        }));

        const response = await supabase.functions.invoke("create-guest-booking", {
          body: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: `${formData.countryCode}${formData.phone}`,
            vehicleId: categoryId, // This is the category ID
            locationId,
            startAt: searchData.pickupDate.toISOString(),
            endAt: searchData.returnDate.toISOString(),
            dailyRate: vehicle.dailyRate,
            totalDays: rentalDays,
            subtotal: pricing.subtotal,
            taxAmount: pricing.taxAmount,
            depositAmount: DEFAULT_DEPOSIT_AMOUNT,
            totalAmount: pricing.total,
            driverAgeBand,
            youngDriverFee: pricing.youngDriverFee,
            addOns: addOnData.length > 0 ? addOnData : undefined,
            additionalDrivers: additionalDriversData.length > 0 ? additionalDriversData : undefined,
            notes: bookingNotes,
            pickupAddress: searchData.deliveryMode === "delivery" ? searchData.deliveryAddress : undefined,
            pickupLat: searchData.deliveryLat,
            pickupLng: searchData.deliveryLng,
            saveTimeAtCounter,
            pickupContactName: saveTimeAtCounter ? (pickupContactName || `${formData.firstName} ${formData.lastName}`) : undefined,
            pickupContactPhone: saveTimeAtCounter && pickupContactPhone ? pickupContactPhone : undefined,
            specialInstructions: saveTimeAtCounter && specialInstructions ? specialInstructions : undefined,
            cardLastFour: cardLast4,
            cardType: cardTypeValue,
            cardHolderName: formData.cardName,
          },
        });

        // Handle edge function errors - could be in response.error or response.data
        if (response.error) {
          const errorMessage = response.error.message || "Failed to create booking";
          console.error("Guest booking error:", response.error);
          throw new Error(errorMessage);
        }

        // Also check for error in data (when edge function returns 4xx with JSON body)
        if (response.data?.error) {
          const errorMessage = response.data.message || response.data.error || "Failed to create booking";
          console.error("Guest booking validation error:", response.data);
          throw new Error(errorMessage);
        }

        if (!response.data?.booking) {
          throw new Error("No booking returned from server");
        }

        // Map camelCase response from Edge Function to snake_case expected by UI
        const bookingResponse = response.data.booking;
        booking = {
          id: bookingResponse.id,
          booking_code: bookingResponse.bookingCode || bookingResponse.booking_code || "",
        };
      }

      if (!booking) {
        throw new Error("Failed to create booking");
      }

      // Mark abandoned cart as converted
      hasCompletedBooking.current = true;
      markCartConverted.mutate(booking.id);

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
              cancelUrl: `${baseUrl}/booking/${booking.id}?payment=cancelled`,
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
          
          // Delete the booking since payment failed - don't allow unpaid bookings
          try {
            await supabase.from("booking_add_ons").delete().eq("booking_id", booking.id);
            await supabase.from("bookings").delete().eq("id", booking.id);
            console.log("Deleted unpaid booking:", booking.id);
          } catch (deleteError) {
            console.error("Failed to cleanup booking:", deleteError);
          }
          
          toast({
            title: "Payment failed",
            description: "Your booking was not created. Please try again.",
            variant: "destructive",
          });

          // Stay on checkout page to retry
          setIsSubmitting(false);
          return;
        }
      } else {
        // Pay at pickup flow
        toast({
          title: "Booking reserved!",
          description: `Your reservation code is ${booking.booking_code}. Please pay at pickup.`,
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

  // Redirect if no vehicle/category selected or still loading
  if (!categoryId) {
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

  // Show loading while category data is being fetched
  if (categoryLoading) {
    return (
      <CustomerLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading vehicle details...</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  // Location display - for delivery, show the delivery address, not the dispatch hub
  const isDeliveryMode = searchData.deliveryMode === "delivery";
  const primaryLocationDisplay = isDeliveryMode
    ? searchData.deliveryAddress || searchData.deliveryPlaceName || "Delivery address"
    : searchData.pickupLocationName;
  
  const dispatchHubDisplay = isDeliveryMode && searchData.closestPickupCenterName
    ? `Dispatched from: ${searchData.closestPickupCenterName}`
    : null;

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
                    ${pricing.total.toFixed(2)} CAD
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
                <h2 className="text-xl font-semibold mb-6">Primary Driver Information</h2>
                
                <div className="space-y-4">

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
                        {searchData.ageRange === "20-24" 
                          ? "Driver age: 20-24 years (young driver fee applies)" 
                          : "Driver age: 25-70 years (Standard Driver)"}
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Payment - Credit Card Form */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Payment Details</h2>
                  <Lock className="w-4 h-4 text-muted-foreground ml-auto" />
                  <span className="text-xs text-muted-foreground">Secure</span>
                </div>

                {/* Credit Card Input Form */}
                <CreditCardInput
                  cardNumber={formData.cardNumber}
                  cardName={formData.cardName}
                  expiryDate={formData.expiryDate}
                  onCardNumberChange={(v) => handleInputChange("cardNumber", v)}
                  onCardNameChange={(v) => handleInputChange("cardName", v)}
                  onExpiryDateChange={(v) => handleInputChange("expiryDate", v)}
                  errors={cardErrors}
                  showValidation={true}
                />

                {/* Policy text under the form */}
                <div className="mt-6 pt-4 border-t border-border space-y-3">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      ⚠️ Debit and prepaid cards are not accepted.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {CREDIT_CARD_AUTHORIZATION_POLICY.shortVersion}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {CANCELLATION_POLICY.content}
                  </p>
                </div>

                {/* Payment Method Selection */}
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-sm font-medium mb-3">When would you like to pay?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("pay-now")}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-all",
                        paymentMethod === "pay-now"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <p className="font-medium text-sm">Pay Now</p>
                      <p className="text-xs text-muted-foreground">Instant confirmation</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("pay-later")}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-all",
                        paymentMethod === "pay-later"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <p className="font-medium text-sm">Pay at Pickup</p>
                      <p className="text-xs text-muted-foreground">Card required on file</p>
                    </button>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  {paymentMethod === "pay-now" ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Amount to pay now</p>
                        <p className="text-xs text-muted-foreground">Secure payment via Stripe</p>
                      </div>
                      <p className="text-lg font-bold">${finalTotal.toFixed(2)} CAD</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Pay at pickup</p>
                        <p className="text-xs text-muted-foreground">Card verified for booking</p>
                      </div>
                      <p className="text-lg font-bold">${finalTotal.toFixed(2)} CAD</p>
                    </div>
                  )}
                </div>
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
                  <h2 className="text-xl font-semibold mb-6">What's your billing address?</h2>
                  
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

              {/* Points Redemption */}
              <PointsRedemption
                bookingTotal={pricing.total}
                onApplyDiscount={handleApplyPointsDiscount}
                appliedDiscount={pointsDiscount}
                appliedPoints={pointsUsed}
              />

              {/* Total & Terms */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Total</h2>
                  <div className="text-right">
                    {pointsDiscount > 0 && (
                      <p className="text-sm text-muted-foreground line-through">
                        ${pricing.total.toFixed(2)} CAD
                      </p>
                    )}
                    <p className="text-2xl font-bold">${finalTotal.toFixed(2)} CAD</p>
                  </div>
                </div>

                <Collapsible open={priceDetailsOpen} onOpenChange={setPriceDetailsOpen}>
                  <CollapsibleTrigger className="text-sm text-primary underline mb-4">
                    Price details
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 text-sm mb-4 p-4 bg-muted rounded-lg">
                    <div className="flex justify-between">
                      <span>Vehicle ({rentalDays} days × ${vehicle?.dailyRate} CAD/day)</span>
                      <span>${pricing.vehicleBaseTotal.toFixed(2)} CAD</span>
                    </div>
                    {pricing.weekendSurcharge > 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span>Weekend surcharge (15%)</span>
                        <span>+${pricing.weekendSurcharge.toFixed(2)} CAD</span>
                      </div>
                    )}
                    {pricing.durationDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>{pricing.discountType === "monthly" ? "Monthly" : "Weekly"} discount</span>
                        <span>-${pricing.durationDiscount.toFixed(2)} CAD</span>
                      </div>
                    )}
                    {pricing.protectionTotal > 0 && (
                      <div className="flex justify-between">
                        <span>{pricing.protectionName}</span>
                        <span>${pricing.protectionTotal.toFixed(2)} CAD</span>
                      </div>
                    )}
                    {pricing.addOnsTotal > 0 && (
                      <div className="flex justify-between">
                        <span>Add-ons</span>
                        <span>${pricing.addOnsTotal.toFixed(2)} CAD</span>
                      </div>
                    )}
                    {pricing.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span>Delivery fee</span>
                        <span>${pricing.deliveryFee.toFixed(2)} CAD</span>
                      </div>
                    )}
                    {pricing.youngDriverFee > 0 && (
                      <div className="flex justify-between">
                        <span>Young driver fee</span>
                        <span>${pricing.youngDriverFee.toFixed(2)} CAD</span>
                      </div>
                    )}
                    {pricing.dailyFeesTotal > 0 && (
                      <div className="flex justify-between">
                        <span>Daily fees (PVRT + ACSRCH)</span>
                        <span>${pricing.dailyFeesTotal.toFixed(2)} CAD</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${pricing.subtotal.toFixed(2)} CAD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes (12%)</span>
                      <span>${pricing.taxAmount.toFixed(2)} CAD</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground pl-4">
                      <span>PST (7%)</span>
                      <span>${pricing.pstAmount.toFixed(2)} CAD</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground pl-4">
                      <span>GST (5%)</span>
                      <span>${pricing.gstAmount.toFixed(2)} CAD</span>
                    </div>
                    <Separator className="my-2" />
                    {pointsDiscount > 0 && (
                      <div className="flex justify-between text-primary font-medium">
                        <span>Points Discount ({pointsUsed.toLocaleString()} pts)</span>
                        <span>-${pointsDiscount.toFixed(2)} CAD</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${finalTotal.toFixed(2)} CAD</span>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="text-sm text-muted-foreground space-y-2 mb-6">
                  <p className="font-medium text-foreground">
                    IMPORTANT INFORMATION about your {paymentMethod === "pay-now" ? "PREPAID" : "PAY LATER"} reservation:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>$150.00 CAD for cancellations within 24 hours prior to pickup time</li>
                    <li>$65.00 CAD for cancellations up to 24 hours prior to pickup time</li>
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
                    <p className="text-xs text-muted-foreground">
                      {isDeliveryMode ? "Delivery To" : "Pickup"}
                    </p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p 
                          className="font-medium break-words"
                          title={primaryLocationDisplay || undefined}
                        >
                          {primaryLocationDisplay || "Location"}
                        </p>
                        {dispatchHubDisplay && (
                          <p className="text-xs text-muted-foreground/70 italic">
                            {dispatchHubDisplay}
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          {searchData.pickupDate && format(searchData.pickupDate, "EEE, dd MMM, yyyy")} | {formatTimeDisplay(searchData.pickupTime)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isDeliveryMode ? "Return Pickup From" : "Return"}
                    </p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p 
                          className="font-medium break-words"
                          title={primaryLocationDisplay || undefined}
                        >
                          {primaryLocationDisplay || "Location"}
                        </p>
                        <p className="text-muted-foreground">
                          {searchData.returnDate && format(searchData.returnDate, "EEE, dd MMM, yyyy")} | {formatTimeDisplay(searchData.returnTime)}
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
