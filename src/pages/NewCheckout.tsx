/**
 * NewCheckout - Full checkout page with driver info, payment, and booking summary
 */
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, Link, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { formatLocalDate, localDateTimeToISO } from "@/lib/date-utils";
import {
  ArrowLeft,
  Check,
  Shield,
  MapPin,
  CreditCard,
  ChevronDown,
  Loader2,
  Lock,
} from "lucide-react";
import { PriceTooltip, PRICE_TOOLTIPS } from "@/components/shared/PriceTooltip";
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
import { CANCELLATION_POLICY, DAMAGE_LIABILITY_POLICY } from "@/lib/checkout-policies";
import { calculateAdditionalDriversCost } from "@/components/rental/AdditionalDriversCard";
import { useDriverFeeSettings } from "@/hooks/use-driver-fee-settings";

import { 
  calculateBookingPricing, 
  ageRangeToAgeBand, 
  YOUNG_DRIVER_FEE, 
  BOOKING_INCLUDED_FEATURES,
  DEFAULT_DEPOSIT_AMOUNT,
  DriverAgeBand,
  computeDropoffFeeFromGroups,
} from "@/lib/pricing";
import { useLocations } from "@/hooks/use-locations";
import { useProtectionPackages } from "@/hooks/use-protection-settings";
import { formatTimeDisplay } from "@/lib/rental-rules";

const FEATURE_TOOLTIPS: Record<string, string> = {
  "Third party insurance": "Mandatory third-party liability insurance is included with every rental at no extra cost.",
  "24/7 Roadside Assistance Hotline": "Access our 24/7 emergency roadside assistance hotline for breakdowns, flat tires, or lockouts.",
  "Unlimited kilometres": "Drive without worrying about mileage limits — all rentals include unlimited kilometres.",
  "Extended Roadside Protection": "Enhanced roadside coverage included with your booking for added peace of mind.",
};

function getFeatureTooltip(feature: string): string {
  return FEATURE_TOOLTIPS[feature] ?? feature;
}

export default function NewCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { searchData, rentalDays } = useRentalBooking();
  const { data: addOns = [] } = useAddOns();
  const { data: driverFeeSettings } = useDriverFeeSettings();
  const additionalDriverRate = driverFeeSettings?.additionalDriverDailyRate ?? 15.99;
  const youngAdditionalDriverRate = driverFeeSettings?.youngAdditionalDriverDailyRate ?? 15.00;
  const saveAbandonedCart = useSaveAbandonedCart();
  const markCartConverted = useMarkCartConverted();
  const hasCompletedBooking = useRef(false);

  // URL params - support both categoryId (new flow) and vehicleId (legacy)
  const categoryId = searchParams.get("categoryId") || searchData.selectedVehicleId;
  const legacyVehicleId = searchParams.get("vehicleId");
  const vehicleId = categoryId || legacyVehicleId; // Use categoryId as the primary ID
  const protection = searchParams.get("protection") || "none";
  const addOnIdsRaw = searchParams.get("addOns")?.split(",").filter(Boolean) || searchData.selectedAddOnIds;
  // Filter out "Additional Driver" add-on to prevent double-counting (handled separately)
  const addOnIds = addOnIdsRaw.filter((id) => {
    const addon = addOns.find((a) => a.id === id);
    return !addon || !(addon.name.toLowerCase().includes("additional") && addon.name.toLowerCase().includes("driver"));
  });

  // Fetch category data (which is what we're actually booking)
  const { data: category, isLoading: categoryLoading } = useCategory(categoryId);

  // Group-aware protection pricing based on vehicle category
  const vehicleCategoryName = category?.category || (category as any)?.categoryName || "";
  const { rates: PROTECTION_RATES } = useProtectionPackages(vehicleCategoryName);

  // Form state - ageConfirmed is derived from context, not form input
  const [formData, setFormData] = useState({
    company: "",
    firstName: "",
    lastName: "",
    email: user?.email || "",
    countryCode: "+1",
    phone: "",
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
  
  // Force pay-now for delivery bookings
  useEffect(() => {
    if (searchData.deliveryMode === "delivery" && paymentMethod === "pay-later") {
      setPaymentMethod("pay-now");
    }
  }, [searchData.deliveryMode, paymentMethod]);
  
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

  // Load locations for fee_group-based drop-off fee preview
  const { data: allLocations = [] } = useLocations();
  
  const pricing = useMemo(() => {
    const protectionInfo = PROTECTION_RATES[protection] || PROTECTION_RATES.none;
    const { total: addOnsTotal, itemized } = calculateAddOnsCost(addOns, addOnIds, rentalDays, vehicleCategory, undefined, searchData.addOnQuantities);
    const deliveryFee = searchData.deliveryMode === "delivery" ? searchData.deliveryFee : 0;
    const isDifferentDropoff = !searchData.returnSameAsPickup && !!searchData.returnLocationId && searchData.returnLocationId !== searchData.pickupLocationId;
    const pickupLoc = allLocations.find(l => l.id === searchData.pickupLocationId);
    const returnLoc = allLocations.find(l => l.id === searchData.returnLocationId);
    const differentDropoffFee = isDifferentDropoff
      ? computeDropoffFeeFromGroups(pickupLoc?.feeGroup, returnLoc?.feeGroup)
      : 0;
    
    // Calculate additional drivers cost
    const additionalDriversCost = calculateAdditionalDriversCost(searchData.additionalDrivers || [], rentalDays, additionalDriverRate, youngAdditionalDriverRate);
    
    const breakdown = calculateBookingPricing({
      vehicleDailyRate: vehicle?.dailyRate || 0,
      rentalDays,
      protectionDailyRate: protectionInfo.rate,
      addOnsTotal: addOnsTotal + additionalDriversCost.total,
      deliveryFee,
      differentDropoffFee,
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
      isDifferentDropoff,
      differentDropoffFee,
    };
  }, [vehicle, vehicleCategory, rentalDays, protection, addOns, addOnIds, searchData, driverAgeBand, allLocations]);

  // Final total after points discount
  const finalTotal = Math.max(0, pricing.total - pointsDiscount);

  // Handler for points redemption
  const handleApplyPointsDiscount = (discount: number, points: number) => {
    setPointsDiscount(discount);
    setPointsUsed(points);
  };

  // Payment success is now handled by the Stripe webhook (checkout.session.completed)
  // which promotes the booking from "draft" to "pending"

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
      pickupDate: searchData.pickupDate ? formatLocalDate(searchData.pickupDate) : undefined,
      returnDate: searchData.returnDate ? formatLocalDate(searchData.returnDate) : undefined,
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
    if (searchData.pickupDate) params.set("startAt", localDateTimeToISO(formatLocalDate(searchData.pickupDate), searchData.pickupTime));
    if (searchData.returnDate) params.set("endAt", localDateTimeToISO(formatLocalDate(searchData.returnDate), searchData.returnTime));
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

    // Card validation removed — Stripe hosted checkout handles card collection

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

      let booking: { id: string; booking_code: string; user_id?: string } | null = null;

      // Card info will be collected by Stripe checkout — store nulls for now

      if (session) {
        // Logged-in user flow — call create-booking edge function for server-side pricing
        let authResponse;
        try {
          authResponse = await supabase.functions.invoke("create-booking", {
            body: {
              vehicleId: categoryId,
              locationId,
              startAt: localDateTimeToISO(formatLocalDate(searchData.pickupDate), searchData.pickupTime),
              endAt: localDateTimeToISO(formatLocalDate(searchData.returnDate), searchData.returnTime),
              pickupDate: formatLocalDate(searchData.pickupDate),
              dropoffDate: formatLocalDate(searchData.returnDate),
              driverAgeBand,
              protectionPlan: protection,
              addOns: addOnIds.map((id) => ({
                addOnId: id,
                quantity: searchData.addOnQuantities?.[id] || 1,
              })),
              additionalDrivers: (searchData.additionalDrivers || []).map((driver) => ({
                driverName: driver.name || null,
                driverAgeBand: driver.ageBand,
              })),
              notes: bookingNotes,
              deliveryFee: searchData.deliveryFee || 0,
              returnLocationId: pricing.isDifferentDropoff ? searchData.returnLocationId : undefined,
              totalAmount: pricing.total,
              paymentMethod,
              pickupAddress: searchData.deliveryMode === "delivery" ? searchData.deliveryAddress : undefined,
              pickupLat: searchData.deliveryLat,
              pickupLng: searchData.deliveryLng,
              saveTimeAtCounter,
              pickupContactName: saveTimeAtCounter ? (pickupContactName || `${formData.firstName} ${formData.lastName}`) : undefined,
              pickupContactPhone: saveTimeAtCounter && pickupContactPhone ? pickupContactPhone : undefined,
              specialInstructions: saveTimeAtCounter && specialInstructions ? specialInstructions : undefined,
            },
          });
        } catch (networkError: any) {
          console.error("Network error during booking creation:", networkError);
          throw new Error("Unable to connect to booking service. Please check your internet connection and try again.");
        }

        // Handle errors from edge function
        if (authResponse.data?.error) {
          const errorCode = authResponse.data.error;
          const errorMessages: Record<string, string> = {
            "age_validation_failed": "Please confirm your age on the search page before booking.",
            "PRICE_MISMATCH": `Price has changed. Server total: $${authResponse.data.serverTotal?.toFixed(2) || "N/A"}. Please refresh and try again.`,
            "vehicle_unavailable": "This vehicle is no longer available for the selected dates.",
            "reservation_expired": "Your reservation has expired. Please start over.",
          };
          throw new Error(errorMessages[errorCode] || authResponse.data.message || "Failed to create booking.");
        }
        if (authResponse.error) {
          throw new Error(authResponse.error.message || "Failed to create booking.");
        }

        if (!authResponse.data?.booking) {
          throw new Error("Failed to create booking. Please try again.");
        }

        const bookingResponse = authResponse.data.booking;
        booking = {
          id: bookingResponse.id,
          booking_code: bookingResponse.bookingCode || bookingResponse.booking_code || "",
        };
      } else {
        // Guest checkout flow - use edge function
        const addOnData = addOnIds.map((id) => {
          const addon = addOns.find((a) => a.id === id);
          const qty = searchData.addOnQuantities?.[id] || 1;
          return {
            addOnId: id,
            price: addon ? (addon.dailyRate * rentalDays + (addon.oneTimeFee || 0)) * qty : 0,
            quantity: qty,
          };
        });
        
        // Prepare additional drivers data for guest booking
        const additionalDriversData = (searchData.additionalDrivers || []).map((driver) => ({
          driverName: driver.name || null,
          driverAgeBand: driver.ageBand,
          youngDriverFee: 0,
        }));

        let guestResponse;
        try {
          guestResponse = await supabase.functions.invoke("create-guest-booking", {
            body: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phone: `${formData.countryCode}${formData.phone}`,
              vehicleId: categoryId, // This is the category ID
              locationId,
              startAt: localDateTimeToISO(formatLocalDate(searchData.pickupDate), searchData.pickupTime),
              endAt: localDateTimeToISO(formatLocalDate(searchData.returnDate), searchData.returnTime),
              pickupDate: formatLocalDate(searchData.pickupDate),
              dropoffDate: formatLocalDate(searchData.returnDate),
              dailyRate: vehicle.dailyRate,
              totalDays: rentalDays,
              subtotal: pricing.subtotal,
              taxAmount: pricing.taxAmount,
              depositAmount: DEFAULT_DEPOSIT_AMOUNT,
              totalAmount: pricing.total,
              driverAgeBand,
              youngDriverFee: pricing.youngDriverFee,
              protectionPlan: protection || "none",
              deliveryFee: searchData.deliveryMode === "delivery" ? searchData.deliveryFee : 0,
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
              cardLastFour: null,
              cardType: null,
              cardHolderName: null,
              paymentMethod: paymentMethod,
              returnLocationId: pricing.isDifferentDropoff ? searchData.returnLocationId : undefined,
            },
          });
        } catch (networkError: any) {
          console.error("Network error during guest booking:", networkError);
          throw new Error("Unable to connect to booking service. Please check your internet connection and try again.");
        }

        // Map error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
          "age_validation_failed": "Please confirm your age on the search page before booking.",
          "validation_failed": "Please check your information and try again.",
          "vehicle_unavailable": "This vehicle is no longer available for the selected dates. Please choose another.",
          "server_error": "An unexpected error occurred. Please try again.",
        };

        // Handle validation errors in response data (Supabase SDK puts 4xx JSON body in data)
        // Check this FIRST because even with non-2xx errors, the data contains the actual error details
        if (guestResponse.data?.error) {
          const errorCode = guestResponse.data.error;
          const errorMessage = guestResponse.data.message || "Validation error";
          console.error("Guest booking validation error:", guestResponse.data);
          throw new Error(errorMessages[errorCode] || errorMessage);
        }

        // Handle edge function errors (network issues, 5xx errors)
        if (guestResponse.error) {
          const errorMessage = guestResponse.error.message || "Failed to create booking";
          console.error("Guest booking edge function error:", guestResponse.error);
          
          // Only show generic message for true network/server failures
          if (errorMessage.includes("non-2xx") || errorMessage.includes("Failed to fetch")) {
            throw new Error("Booking service temporarily unavailable. Please try again in a moment.");
          }
          throw new Error(errorMessage);
        }

        if (!guestResponse.data?.booking) {
          console.error("No booking in response:", guestResponse.data);
          throw new Error("Failed to create booking. Please try again.");
        }

        // Map camelCase response from Edge Function to snake_case expected by UI
        const bookingResponse = guestResponse.data.booking;
        booking = {
          id: bookingResponse.id,
          booking_code: bookingResponse.bookingCode || bookingResponse.booking_code || "",
          user_id: guestResponse.data.userId, // For guest checkout - pass to checkout session
        };
      }

      if (!booking) {
        throw new Error("Failed to create booking");
      }

      // Mark abandoned cart as converted
      hasCompletedBooking.current = true;
      markCartConverted.mutate(booking.id);

      if (paymentMethod === "pay-now") {
        // Create Stripe Checkout Session and redirect to hosted payment page
        try {
          const successUrl = !user
            ? `${window.location.origin}/complete-signup?bookingCode=${encodeURIComponent(booking.booking_code)}&bookingId=${encodeURIComponent(booking.id)}&email=${encodeURIComponent(formData.email)}&payment=success`
            : `${window.location.origin}/booking/${booking.id}?payment=success`;
          const cancelUrl = window.location.href;
          
          let paymentResponse;
          try {
            paymentResponse = await supabase.functions.invoke("create-checkout-session", {
              body: {
                bookingId: booking.id,
                amount: pricing.total,
                currency: "cad",
                successUrl,
                cancelUrl,
                userId: booking.user_id, // For guest checkout
              },
            });
          } catch (networkError: any) {
            console.error("Network error during payment creation:", networkError);
            throw new Error("Unable to connect to payment service. Please try again.");
          }

          if (paymentResponse.error) {
            const errorMessage = paymentResponse.error.message || "Failed to create payment";
            if (errorMessage.includes("non-2xx")) {
              throw new Error("Payment service temporarily unavailable. Please try again in a moment.");
            }
            throw new Error(errorMessage);
          }
          
          if (paymentResponse.data?.error) {
            throw new Error(paymentResponse.data.error);
          }

          const { url: stripeUrl } = paymentResponse.data || {};

          if (stripeUrl) {
            // Redirect to Stripe hosted checkout page
            window.location.href = stripeUrl;
            return;
          } else {
            throw new Error("Unable to initialize payment. Please try again.");
          }
        } catch (paymentError: any) {
          console.error("Payment error:", paymentError);
          
          // Delete the booking since payment failed
          try {
            await supabase.from("booking_add_ons").delete().eq("booking_id", booking.id);
            await supabase.from("bookings").delete().eq("id", booking.id);
            console.log("Deleted unpaid booking:", booking.id);
          } catch (deleteError) {
            console.error("Failed to cleanup booking:", deleteError);
          }
          
          toast({
            title: "Payment initialization failed",
            description: paymentError.message || "Your booking was not created. Please try again.",
            variant: "destructive",
          });

          setIsSubmitting(false);
          return;
        }
      } else {
        // Pay at pickup flow
        toast({
          title: "Booking reserved!",
          description: `Your reservation code is ${booking.booking_code}. Please pay at pickup.`,
        });

        // Guest users → redirect to signup page; authenticated users → booking detail
        if (!user) {
          navigate(`/complete-signup?bookingCode=${encodeURIComponent(booking.booking_code)}&bookingId=${encodeURIComponent(booking.id)}&email=${encodeURIComponent(formData.email)}`);
        } else {
          navigate(`/booking/${booking.id}`);
        }
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

              {/* Payment Method Selection */}
              <Card className="p-6">
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-sm font-medium mb-3">When would you like to pay?</p>
                  {/* Hide Pay at Pickup for delivery bookings */}
                  {searchData.deliveryMode === "delivery" ? (
                    <>
                      <div className="p-3 rounded-lg border-2 border-primary bg-primary/5">
                        <p className="font-medium text-sm">Pay Now</p>
                        <p className="text-xs text-muted-foreground">Instant confirmation</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Payment is required before delivery. Pay at pickup is not available for deliveries.
                      </p>
                    </>
                  ) : (
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
                  )}
                  
                  {/* No-show fee warning for Pay at Pickup */}
                  {paymentMethod === "pay-later" && searchData.deliveryMode !== "delivery" && (
                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        <strong>Note:</strong> A valid credit card is required. A $19.99 CAD fee applies for no-shows or late cancellations.
                      </p>
                    </div>
                  )}
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
                    {/* Vehicle base rental */}
                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        Vehicle ({rentalDays} days × ${vehicle?.dailyRate} CAD/day)
                        <PriceTooltip content={PRICE_TOOLTIPS.vehicleRental} />
                      </span>
                      <span>${pricing.vehicleBaseTotal.toFixed(2)} CAD</span>
                    </div>
                    {pricing.weekendSurcharge > 0 && (
                      <div className="flex justify-between items-center text-amber-600">
                        <span className="flex items-center">
                          Weekend surcharge (15%)
                          <PriceTooltip content={PRICE_TOOLTIPS.weekendSurcharge} />
                        </span>
                        <span>+${pricing.weekendSurcharge.toFixed(2)} CAD</span>
                      </div>
                    )}
                    {pricing.durationDiscount > 0 && (
                      <div className="flex justify-between items-center text-emerald-600">
                        <span className="flex items-center">
                          {pricing.discountType === "monthly" ? "Monthly" : "Weekly"} discount
                          <PriceTooltip content={pricing.discountType === "monthly" ? PRICE_TOOLTIPS.monthlyDiscount : PRICE_TOOLTIPS.weeklyDiscount} />
                        </span>
                        <span>-${pricing.durationDiscount.toFixed(2)} CAD</span>
                      </div>
                    )}

                    {/* Protection plan — always show */}
                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        {pricing.protectionName || "No Extra Protection"}
                        <PriceTooltip content={pricing.protectionTotal > 0 ? PRICE_TOOLTIPS.protection(pricing.protectionName) : PRICE_TOOLTIPS.protectionNone} />
                      </span>
                      <span>${pricing.protectionTotal.toFixed(2)} CAD</span>
                    </div>

                    {/* Add-ons — itemized list, always show section */}
                    <div className="pt-1">
                      <div className="flex justify-between items-center font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        <span className="flex items-center">
                          Add-ons & Extras
                          <PriceTooltip content={PRICE_TOOLTIPS.addOns} />
                        </span>
                      </div>
                      {pricing.itemized && pricing.itemized.length > 0 ? (
                        pricing.itemized.map((item, idx) => (
                          <div key={idx} className="flex justify-between pl-3 text-sm">
                            <span className="text-muted-foreground">{item.name}</span>
                            <span>${item.total.toFixed(2)} CAD</span>
                          </div>
                        ))
                      ) : (
                        <div className="pl-3 text-sm text-muted-foreground italic">No add-ons selected</div>
                      )}
                      {/* Additional drivers */}
                      {pricing.additionalDriversCost.total > 0 && (
                        <div className="flex justify-between pl-3 text-sm items-center">
                          <span className="flex items-center text-muted-foreground">
                            Additional drivers ({(searchData.additionalDrivers || []).length})
                            <PriceTooltip content={PRICE_TOOLTIPS.additionalDrivers} />
                          </span>
                          <span>${pricing.additionalDriversCost.total.toFixed(2)} CAD</span>
                        </div>
                      )}
                    </div>

                    {pricing.deliveryFee > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="flex items-center">
                          Delivery fee
                          <PriceTooltip content={PRICE_TOOLTIPS.deliveryFee} />
                        </span>
                        <span>${pricing.deliveryFee.toFixed(2)} CAD</span>
                      </div>
                    )}
                    {pricing.youngDriverFee > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="flex items-center">
                          Young driver fee
                          <PriceTooltip content={PRICE_TOOLTIPS.youngDriverFee} />
                        </span>
                        <span>${pricing.youngDriverFee.toFixed(2)} CAD</span>
                      </div>
                    )}

                    {/* Different drop-off fee */}
                    {pricing.differentDropoffFee > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Different drop-off location</span>
                        <span>${pricing.differentDropoffFee.toFixed(2)} CAD</span>
                      </div>
                    )}

                    {/* Regulatory fees — itemized */}
                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        PVRT ($1.50/day × {rentalDays})
                        <PriceTooltip content={PRICE_TOOLTIPS.pvrt} />
                      </span>
                      <span>${(1.50 * rentalDays).toFixed(2)} CAD</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        ACSRCH ($1.00/day × {rentalDays})
                        <PriceTooltip content={PRICE_TOOLTIPS.acsrch} />
                      </span>
                      <span>${(1.00 * rentalDays).toFixed(2)} CAD</span>
                    </div>

                    <Separator className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        Subtotal
                        <PriceTooltip content={PRICE_TOOLTIPS.subtotal} />
                      </span>
                      <span>${pricing.subtotal.toFixed(2)} CAD</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        Taxes (12%)
                        <PriceTooltip content={PRICE_TOOLTIPS.totalTax} />
                      </span>
                      <span>${pricing.taxAmount.toFixed(2)} CAD</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground pl-4 items-center">
                      <span className="flex items-center">
                        PST (7%)
                        <PriceTooltip content={PRICE_TOOLTIPS.pst} />
                      </span>
                      <span>${pricing.pstAmount.toFixed(2)} CAD</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground pl-4 items-center">
                      <span className="flex items-center">
                        GST (5%)
                        <PriceTooltip content={PRICE_TOOLTIPS.gst} />
                      </span>
                      <span>${pricing.gstAmount.toFixed(2)} CAD</span>
                    </div>
                    <Separator className="my-2" />
                    {pointsDiscount > 0 && (
                      <div className="flex justify-between text-primary font-medium items-center">
                        <span className="flex items-center">
                          Points Discount ({pointsUsed.toLocaleString()} pts)
                          <PriceTooltip content={PRICE_TOOLTIPS.pointsDiscount} />
                        </span>
                        <span>-${pointsDiscount.toFixed(2)} CAD</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${finalTotal.toFixed(2)} CAD</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground pt-1 items-center">
                      <span className="flex items-center">
                        Security Deposit (refundable)
                        <PriceTooltip content={PRICE_TOOLTIPS.deposit} />
                      </span>
                      <span>${DEFAULT_DEPOSIT_AMOUNT.toFixed(2)} CAD</span>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="text-sm text-muted-foreground space-y-2 mb-6">
                  <p className="font-medium text-foreground">
                    IMPORTANT INFORMATION about your {paymentMethod === "pay-now" ? "PREPAID" : "PAY LATER"} reservation:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Free cancellation anytime prior to the scheduled pickup time</li>
                    <li>No-show fee: ${CANCELLATION_POLICY.cancellationFee.toFixed(2)} CAD if cancelled after pickup time</li>
                    <li>A valid credit card (not debit) must be presented at pickup</li>
                    <li>You are legally responsible for any damages caused during the rental period</li>
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
                    <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.
                    I acknowledge my liability for any damages caused during the rental period.
                  </Label>
                </div>

                {/* Submit button */}
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
                    ) : paymentMethod === "pay-later" ? (
                      "Confirm Booking"
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
                      <span className="ml-auto shrink-0">
                        <PriceTooltip content={getFeatureTooltip(feature)} />
                      </span>
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
