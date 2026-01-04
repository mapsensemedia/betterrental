import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Clock,
  Shield,
  CreditCard,
  ChevronRight,
  Check,
  MapPin,
  Calendar,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useHold, useExpireHold } from "@/hooks/use-hold";
import { useVehicle } from "@/hooks/use-vehicles";
import { useLocations } from "@/hooks/use-locations";
import { useAddOns, calculateAddOnsCost } from "@/hooks/use-add-ons";
import { useAuth } from "@/hooks/use-auth";
import { useBookingContext } from "@/contexts/BookingContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { OtpVerification } from "@/components/checkout/OtpVerification";
import { TripContextBar } from "@/components/shared/TripContextBar";
import { PriceDisclaimer } from "@/components/shared/PriceWithDisclaimer";

import bmwImage from "@/assets/cars/bmw-i4.jpg";

const TAX_RATE = 0.1;
const DEFAULT_DEPOSIT = 500;

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const holdId = searchParams.get("holdId");
  const vehicleId = searchParams.get("vehicleId");
  const startAtParam = searchParams.get("startAt");
  const endAtParam = searchParams.get("endAt");

  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<{ bookingId: string; bookingCode: string } | null>(null);
  const [pendingBooking, setPendingBooking] = useState<{ bookingId: string; bookingCode: string } | null>(null);
  const [userPhone, setUserPhone] = useState("");

  // Fetch user profile phone for OTP
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .single();
      
      if (profile?.phone) {
        setUserPhone(profile.phone);
      }
    };
    
    fetchProfile();
  }, [user]);

  // Restore success state if user refreshes after booking
  useEffect(() => {
    if (bookingSuccess || !holdId) return;

    const raw = sessionStorage.getItem(`bookingByHold:${holdId}`);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.bookingId && parsed?.bookingCode) {
        setBookingSuccess(parsed);
      }
    } catch {
      // ignore
    }
  }, [holdId, bookingSuccess]);

  // Fetch data
  const { data: hold, isLoading: holdLoading } = useHold(holdId);
  const { data: vehicle, isLoading: vehicleLoading } = useVehicle(vehicleId);
  const { data: locations = [] } = useLocations();
  const { data: addOns = [], isLoading: addOnsLoading } = useAddOns();
  
  // Use vehicle's location or fallback to first available location
  const location = useMemo(() => {
    if (vehicle?.locationId) {
      return locations.find(loc => loc.id === vehicle.locationId) || locations[0] || null;
    }
    return locations[0] || null;
  }, [vehicle?.locationId, locations]);
  const expireHold = useExpireHold();

  // Parse dates
  const startAt = startAtParam ? new Date(startAtParam) : hold?.startAt || null;
  const endAt = endAtParam ? new Date(endAtParam) : hold?.endAt || null;

  // Calculate rental days
  const rentalDays = useMemo(() => {
    if (!startAt || !endAt) return 1;
    const diffTime = Math.abs(endAt.getTime() - startAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  }, [startAt, endAt]);

  // Calculate pricing
  const pricing = useMemo(() => {
    if (!vehicle) return { basePrice: 0, addOnsTotal: 0, subtotal: 0, taxAmount: 0, total: 0 };
    
    const basePrice = vehicle.dailyRate * rentalDays;
    const { total: addOnsTotal, itemized } = calculateAddOnsCost(addOns, selectedAddOns, rentalDays);
    const subtotal = basePrice + addOnsTotal;
    const taxAmount = subtotal * TAX_RATE;
    const total = subtotal + taxAmount;

    return { basePrice, addOnsTotal, subtotal, taxAmount, total, itemized };
  }, [vehicle, rentalDays, addOns, selectedAddOns]);

  // Timer countdown effect
  useEffect(() => {
    if (!hold || hold.status !== "active") return;

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(hold.expiresAt);
      const diff = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000));
      
      setRemainingSeconds(diff);
      
      if (diff <= 0) {
        setIsExpired(true);
        expireHold.mutate(hold.id);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [hold]);

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirmBooking = async () => {
    if (!holdId || !vehicleId || !vehicle || !startAt || !endAt || !location) {
      toast({ title: "Missing information", variant: "destructive" });
      return;
    }

    if (!termsAccepted) {
      toast({ title: "Please accept the terms", variant: "destructive" });
      return;
    }

    if (!userPhone) {
      toast({ title: "Phone number required", description: "Please enter your phone number in the details step", variant: "destructive" });
      setStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({ title: "Session expired", description: "Please sign in again", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const response = await supabase.functions.invoke("create-booking", {
        body: {
          holdId,
          vehicleId,
          locationId: location.id,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          dailyRate: vehicle.dailyRate,
          totalDays: rentalDays,
          subtotal: pricing.subtotal,
          taxAmount: pricing.taxAmount,
          depositAmount: DEFAULT_DEPOSIT,
          totalAmount: pricing.total,
          userPhone,
          addOns: selectedAddOns.map((id) => {
            const addon = addOns.find((a) => a.id === id);
            return {
              addOnId: id,
              price: addon ? addon.dailyRate * rentalDays + (addon.oneTimeFee || 0) : 0,
              quantity: 1,
            };
          }),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Booking failed");
      }

      const result = response.data;

      if (result.error) {
        if (result.error === "reservation_expired") {
          setIsExpired(true);
          toast({ title: "Reservation expired", description: result.message, variant: "destructive" });
        } else {
          toast({ title: "Booking failed", description: result.message, variant: "destructive" });
        }
        return;
      }

      // Booking created - now go to OTP verification step
      const booking = { bookingId: result.booking.id, bookingCode: result.booking.bookingCode };
      setPendingBooking(booking);
      setStep(4); // OTP verification step
      
      toast({ 
        title: "Booking created", 
        description: "Please verify your booking with the code we'll send you" 
      });
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpVerified = () => {
    if (!pendingBooking) return;
    
    // Mark as success
    setBookingSuccess(pendingBooking);
    
    try {
      sessionStorage.setItem(`bookingByHold:${holdId}`, JSON.stringify(pendingBooking));
    } catch {
      // ignore storage errors
    }

    queryClient.invalidateQueries({ queryKey: ["my-bookings", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["vehicle-availability"] });
    queryClient.invalidateQueries({ queryKey: ["hold", holdId] });

    toast({ title: "Booking confirmed!", description: `Confirmation: ${pendingBooking.bookingCode}` });
  };

  const handleReturnToSearch = () => {
    const params = new URLSearchParams();
    if (startAt) params.set("startAt", startAt.toISOString());
    if (endAt) params.set("endAt", endAt.toISOString());
    navigate(`/search?${params.toString()}`);
  };

  // Loading state
  if (holdLoading || vehicleLoading) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 pb-12">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
            <Skeleton className="h-96 rounded-3xl" />
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }

  // Booking success (or restored from sessionStorage)
  if (bookingSuccess) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 pb-12">
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-success" />
            </div>
            <h1 className="heading-2 mb-2">Booking Confirmed!</h1>
            <p className="text-xl text-muted-foreground mb-4">Your confirmation code</p>
            <div className="bg-muted rounded-2xl p-6 mb-6">
              <p className="text-3xl font-bold font-mono tracking-wider">
                {bookingSuccess.bookingCode}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 text-left mb-8">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Confirmation message</p>
                  <p className="text-muted-foreground">
                    Your booking is confirmed in-app using the code above. Email/SMS delivery depends on notification service setup and may not arrive while email is in test mode.
                  </p>
                </div>
              </div>
            </div>

            {vehicle && (
              <div className="bg-card rounded-2xl border border-border p-6 mb-8 text-left">
                <div className="flex gap-4 mb-4">
                  <img
                    src={vehicle.imageUrl || bmwImage}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-24 h-16 object-cover rounded-xl"
                  />
                  <div>
                    <p className="font-semibold">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                    <p className="text-sm text-muted-foreground">{vehicle.category}</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pick-up</span>
                    <span>{startAt && formatDate(startAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Return</span>
                    <span>{endAt && formatDate(endAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span>{location?.name}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total Due at Pickup</span>
                    <span>${pricing.total.toFixed(0)}<span className="text-destructive">*</span></span>
                  </div>
                  <PriceDisclaimer variant="summary" className="text-right pt-1" />
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button variant="outline" asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild>
                <Link to={`/booking/${bookingSuccess.bookingId}`}>View Booking</Link>
              </Button>
            </div>
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }

  // No hold or expired (but do NOT treat "converted" as expired)
  if (!holdId || isExpired || (hold && hold.status === "expired")) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 pb-12">
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="heading-2 mb-4">Reservation Expired</h1>
            <p className="text-muted-foreground mb-8">
              Your 15-minute reservation window has ended. The vehicle may no longer be available.
              Please return to search and try again.
            </p>
            <Button variant="default" size="lg" onClick={handleReturnToSearch}>
              Return to Search
            </Button>
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }

  // Hold already converted (booking was created) but user refreshed/returned
  // IMPORTANT: Don't show this if we have a pending booking (user is in OTP verification flow)
  if (hold && hold.status === "converted" && !pendingBooking) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 pb-12">
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h1 className="heading-2 mb-4">Booking Already Confirmed</h1>
            <p className="text-muted-foreground mb-8">
              This reservation has already been converted to a booking. You can view it in your dashboard.
            </p>
            <Button variant="default" size="lg" asChild>
              <Link to="/dashboard">View My Bookings</Link>
            </Button>
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }

  // Main checkout
  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-12">
        {/* Trip Context Bar */}
        <div className="mb-4">
          <TripContextBar compact />
        </div>

        {/* Hold Timer Banner */}
        <div className={`rounded-2xl p-4 mb-8 flex items-center justify-between ${
          remainingSeconds && remainingSeconds < 120 
            ? "bg-destructive/10 border border-destructive/20" 
            : "bg-primary/10 border border-primary/20"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              remainingSeconds && remainingSeconds < 120 ? "bg-destructive/20" : "bg-primary/20"
            }`}>
              <Clock className={`w-5 h-5 ${
                remainingSeconds && remainingSeconds < 120 ? "text-destructive" : "text-primary"
              }`} />
            </div>
            <div>
              <p className="font-medium">Vehicle reserved for you</p>
              <p className="text-sm text-muted-foreground">
                Complete checkout before the timer expires
              </p>
            </div>
          </div>
          <div className={`text-2xl font-bold ${
            remainingSeconds && remainingSeconds < 120 ? "text-destructive" : "text-primary"
          }`}>
            {remainingSeconds !== null ? formatTime(remainingSeconds) : "--:--"}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Progress Steps */}
            <div className="flex items-center gap-4 flex-wrap">
              {["Add-ons", "Details", "Confirm", "Verify"].map((label, idx) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step > idx + 1
                        ? "bg-success text-success-foreground"
                        : step === idx + 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step > idx + 1 ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={
                      step >= idx + 1 ? "font-medium" : "text-muted-foreground"
                    }
                  >
                    {label}
                  </span>
                  {idx < 3 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Add-ons */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="heading-3 mb-2">Enhance your rental</h2>
                  <p className="text-muted-foreground">
                    Add extras to make your trip more comfortable
                  </p>
                </div>

                {addOnsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 rounded-2xl" />
                    ))}
                  </div>
                ) : addOns.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-muted text-center">
                    <p className="text-muted-foreground">No add-ons available</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {addOns.map((addOn) => (
                      <div
                        key={addOn.id}
                        onClick={() => toggleAddOn(addOn.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          selectedAddOns.includes(addOn.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Checkbox
                              checked={selectedAddOns.includes(addOn.id)}
                              onCheckedChange={() => toggleAddOn(addOn.id)}
                            />
                            <div>
                              <p className="font-medium">{addOn.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {addOn.description}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {addOn.dailyRate > 0 && (
                              <p className="font-medium">${addOn.dailyRate}/day</p>
                            )}
                            {(addOn.oneTimeFee || 0) > 0 && (
                              <p className="font-medium">${addOn.oneTimeFee} one-time</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="default"
                  size="lg"
                  className="w-full"
                  onClick={() => setStep(2)}
                >
                  Continue to Details
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Details */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="heading-3 mb-2">Your details</h2>
                  <p className="text-muted-foreground">
                    Confirm your information for this booking
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email" 
                      value={user?.email || ""} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number <span className="text-destructive">*</span></Label>
                    <Input 
                      type="tel" 
                      placeholder="+1 (555) 123-4567" 
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      required
                      className={!userPhone.trim() ? "border-destructive" : ""}
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll send a verification code to this number
                    </p>
                    {!userPhone.trim() && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Phone number is required to continue
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    variant="default"
                    size="lg"
                    className="flex-1"
                    onClick={() => setStep(3)}
                    disabled={!userPhone.trim()}
                  >
                    Continue to Payment
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Confirm & Reserve */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="heading-3 mb-2">Confirm Reservation</h2>
                  <p className="text-muted-foreground">
                    Reserve now and pay at pickup
                  </p>
                </div>

                {/* Pay at Pickup Info */}
                <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Pay at Pickup</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        No payment required now. Pay the full amount when you pick up your vehicle at the location.
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-success" />
                        <span>Cash, card, or e-transfer accepted</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Deposit Notice */}
                <div className="p-4 rounded-xl bg-muted/50 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Security Deposit Required</p>
                    <p className="text-muted-foreground">
                      A ${DEFAULT_DEPOSIT} refundable security deposit will be collected at pickup and returned within 7-10 business days after the vehicle is returned.
                    </p>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="terms" 
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    I agree to the rental terms, cancellation policy, and confirm
                    that I have a valid driver's license.
                  </label>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" size="lg" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button 
                    variant="default" 
                    size="lg" 
                    className="flex-1"
                    onClick={handleConfirmBooking}
                    disabled={isSubmitting || !termsAccepted}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Reserving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Reserve Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: OTP Verification */}
            {step === 4 && pendingBooking && (
              <OtpVerification
                bookingId={pendingBooking.bookingId}
                bookingCode={pendingBooking.bookingCode}
                userPhone={userPhone}
                onVerified={handleOtpVerified}
                onBack={() => setStep(3)}
              />
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 p-6 bg-card rounded-3xl border border-border shadow-soft">
              <h3 className="font-semibold mb-4">Order Summary</h3>

              {/* Vehicle */}
              {vehicle && (
                <div className="flex gap-4 mb-6">
                  <img
                    src={vehicle.imageUrl || bmwImage}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-24 h-16 object-cover rounded-xl"
                  />
                  <div>
                    <p className="font-medium">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-sm text-muted-foreground">{vehicle.year}</p>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="space-y-2 mb-6">
                {startAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {formatDate(startAt)} - {endAt && formatDate(endAt)} ({rentalDays} day{rentalDays > 1 ? "s" : ""})
                    </span>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{location.name}</span>
                  </div>
                )}
              </div>

              <Separator className="mb-6" />

              {/* Pricing */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    ${vehicle?.dailyRate || 0}* × {rentalDays} days
                  </span>
                  <span>${pricing.basePrice.toFixed(0)}</span>
                </div>
                {pricing.itemized && pricing.itemized.length > 0 && (
                  <>
                    {pricing.itemized.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span>${item.total.toFixed(0)}</span>
                      </div>
                    ))}
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxes & fees (10%)</span>
                  <span>${pricing.taxAmount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Security deposit</span>
                  <span className="text-muted-foreground">${DEFAULT_DEPOSIT} (refundable)</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>${pricing.total.toFixed(0)}</span>
                </div>
                <PriceDisclaimer variant="summary" className="text-center pt-1" />
              </div>

              {/* Notice */}
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  Free cancellation up to 72 hours before pickup. Deposit refunded within 7-10 business days after return.
                </p>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </CustomerLayout>
  );
}
