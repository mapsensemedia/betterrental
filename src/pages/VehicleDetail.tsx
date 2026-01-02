import { useState, useMemo, useEffect } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { format, addDays, addMonths } from "date-fns";
import {
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Fuel,
  Gauge,
  Check,
  ChevronLeft,
  ChevronRight,
  Shield,
  Star,
  Navigation,
  Clock,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useVehicle } from "@/hooks/use-vehicles";
import { useLocation } from "@/hooks/use-locations";
import { useVehicleAvailability } from "@/hooks/use-availability";
import { useCreateHold } from "@/hooks/use-hold";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useBookingContext } from "@/contexts/BookingContext";
import { useBlockedDates } from "@/hooks/use-blocked-dates";
import { LocationSelector } from "@/components/shared/LocationSelector";
import { AvailabilityCalendar } from "@/components/shared/AvailabilityCalendar";
import { toast } from "@/hooks/use-toast";

// Fallback images
import bmwImage from "@/assets/cars/bmw-i4.jpg";
import audiImage from "@/assets/cars/audi-a7.jpg";

const TAX_RATE = 0.1;
const DEFAULT_DEPOSIT = 500;

const defaultFeatures = [
  "Air Conditioning",
  "Bluetooth",
  "Navigation",
  "Backup Camera",
  "Keyless Entry",
  "USB Charging",
];

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const { user, requireAuth } = useRequireAuth();
  const createHold = useCreateHold();
  const { locationId, setLocationId, locationName } = useBookingContext();

  // Fetch vehicle data
  const { data: vehicle, isLoading: vehicleLoading } = useVehicle(id || null);
  const { data: vehicleLocation } = useLocation(vehicle?.locationId || null);
  const { data: selectedLocation } = useLocation(locationId);

  // Use location from context or vehicle's default location
  const effectiveLocationId = locationId || vehicle?.locationId || null;
  const effectiveLocationName = locationName || vehicleLocation?.name || null;

  // Parse date context from URL or use state
  const startAtParam = searchParams.get("startAt");
  const endAtParam = searchParams.get("endAt");

  const [pickupDate, setPickupDate] = useState<Date | undefined>(
    startAtParam ? new Date(startAtParam) : undefined
  );
  const [returnDate, setReturnDate] = useState<Date | undefined>(
    endAtParam ? new Date(endAtParam) : undefined
  );

  // Use state values for availability and pricing
  const startAt = pickupDate || null;
  const endAt = returnDate || null;

  // Fetch blocked dates for calendar
  const fromDate = new Date();
  const toDate = addMonths(fromDate, 3);
  const { data: blockedDatesData } = useBlockedDates(id || null, fromDate, toDate);

  // Show location modal if no location is selected
  useEffect(() => {
    if (!vehicleLoading && vehicle && !effectiveLocationId) {
      setShowLocationModal(true);
    }
  }, [vehicleLoading, vehicle, effectiveLocationId]);

  // Update URL params when dates change
  const handlePickupDateChange = (date: Date | undefined) => {
    setPickupDate(date);
    if (date) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("startAt", date.toISOString());
      // If return date is before pickup, reset it
      if (returnDate && returnDate <= date) {
        const newReturnDate = addDays(date, 1);
        setReturnDate(newReturnDate);
        newParams.set("endAt", newReturnDate.toISOString());
      }
      setSearchParams(newParams, { replace: true });
    }
  };

  const handleReturnDateChange = (date: Date | undefined) => {
    setReturnDate(date);
    if (date) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("endAt", date.toISOString());
      setSearchParams(newParams, { replace: true });
    }
  };

  const handleLocationSelect = (locId: string) => {
    setLocationId(locId);
    setShowLocationModal(false);
  };

  // Check availability
  const { data: isAvailable, isLoading: availabilityLoading } =
    useVehicleAvailability(id || null, startAt, endAt);

  // Calculate rental days and pricing
  const { rentalDays, subtotal, taxAmount, total } = useMemo(() => {
    if (!vehicle) {
      return { rentalDays: 1, subtotal: 0, taxAmount: 0, total: 0 };
    }

    let days = 1;
    if (startAt && endAt) {
      const diffTime = Math.abs(endAt.getTime() - startAt.getTime());
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }

    const sub = vehicle.dailyRate * days;
    const tax = sub * TAX_RATE;
    const tot = sub + tax;

    return { rentalDays: days, subtotal: sub, taxAmount: tax, total: tot };
  }, [vehicle, startAt, endAt]);

  // Get images (use fallback if none)
  const images = useMemo(() => {
    if (vehicle?.imageUrl) {
      return [vehicle.imageUrl];
    }
    if (vehicle?.imagesJson && Array.isArray(vehicle.imagesJson)) {
      return vehicle.imagesJson as string[];
    }
    return [bmwImage, audiImage];
  }, [vehicle]);

  // Get features
  const features = useMemo(() => {
    if (vehicle?.featuresJson && Array.isArray(vehicle.featuresJson)) {
      return vehicle.featuresJson as string[];
    }
    return defaultFeatures;
  }, [vehicle]);

  // Handle reserve action - defined before getCtaState to avoid temporal dead zone
  const handleReserve = () => {
    // Must have location
    if (!effectiveLocationId) {
      setShowLocationModal(true);
      return;
    }

    // Must have dates selected
    if (!startAt || !endAt) {
      toast({
        title: "Select dates",
        description: "Please select pickup and return dates first",
        variant: "destructive",
      });
      return;
    }

    // Must be logged in
    if (!requireAuth()) {
      return;
    }

    // Create hold
    createHold.mutate({
      vehicleId: id!,
      startAt,
      endAt,
    });
  };

  // Determine CTA state
  const getCtaState = () => {
    if (!effectiveLocationId) return { text: "Select Location", disabled: true, action: () => setShowLocationModal(true) };
    if (!startAt || !endAt) return { text: "Select Dates", disabled: true, action: () => {} };
    if (!user) return { text: "Sign in to Reserve", disabled: false, action: () => requireAuth() };
    if (availabilityLoading) return { text: "Checking...", disabled: true, action: () => {} };
    if (!isAvailable) return { text: "Not Available", disabled: true, action: () => {} };
    return { text: "Reserve Now", disabled: false, action: handleReserve };
  };

  const ctaState = getCtaState();

  if (vehicleLoading) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 pb-32">
          <Skeleton className="h-6 w-48 mb-6" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Skeleton className="aspect-[16/10] rounded-3xl" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <div>
              <Skeleton className="h-96 rounded-3xl" />
            </div>
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }

  if (!vehicle) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 pb-32">
          <div className="text-center py-16">
            <Gauge className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Vehicle Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The vehicle you're looking for doesn't exist or is no longer available.
            </p>
            <Button asChild>
              <Link to="/search">Browse Vehicles</Link>
            </Button>
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }

  const depositAmount = DEFAULT_DEPOSIT;
  const canReserve = effectiveLocationId && startAt && endAt && isAvailable && !createHold.isPending;

  return (
    <CustomerLayout>
      {/* Location Selection Modal */}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Select Pickup Location
            </DialogTitle>
            <DialogDescription>
              Choose where you'd like to pick up this vehicle
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <LocationSelector
              value={effectiveLocationId}
              onChange={handleLocationSelect}
              className="w-full"
            />
          </div>
        </DialogContent>
      </Dialog>

      <PageContainer className="pt-28 pb-32">
        {/* Back Button */}
        <Link
          to="/search"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </Link>

        {/* Location Banner */}
        {effectiveLocationName && (
          <div className="mb-6 p-3 bg-primary/10 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm">
                Available from <span className="font-semibold">{effectiveLocationName}</span>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLocationModal(true)}
              className="text-primary hover:text-primary"
            >
              Change
            </Button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Images & Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div className="relative rounded-3xl overflow-hidden bg-muted aspect-[16/10]">
              <img
                src={images[currentImageIndex]}
                alt={`${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover"
              />

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCurrentImageIndex((i) =>
                        i === 0 ? images.length - 1 : i - 1
                      )
                    }
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentImageIndex((i) =>
                        i === images.length - 1 ? 0 : i + 1
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {vehicle.isFeatured && <Badge variant="featured">Featured</Badge>}
                <Badge variant="secondary">{vehicle.category}</Badge>
              </div>

              {/* Image Dots */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentImageIndex ? "bg-card" : "bg-card/50"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Title & Quick Specs */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="heading-2 mb-2">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-warning fill-warning" />
                      <span>4.9</span>
                      <span className="text-sm">(128 reviews)</span>
                    </div>
                    {effectiveLocationName && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{effectiveLocationName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Specs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-muted text-center">
                  <Users className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-semibold">{vehicle.seats || 5} Seats</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted text-center">
                  <Fuel className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-semibold">{vehicle.fuelType || "Petrol"}</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted text-center">
                  <Gauge className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-semibold">{vehicle.transmission || "Automatic"}</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h2 className="heading-4 mb-4">Features</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 p-3 rounded-xl bg-muted"
                  >
                    <Check className="w-4 h-4 text-success shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pickup Location */}
            {(selectedLocation || vehicleLocation) && (
              <div>
                <h2 className="heading-4 mb-4">Pickup Location</h2>
                <div className="rounded-2xl overflow-hidden border border-border">
                  <div className="h-48 bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <p className="text-sm text-muted-foreground mb-3">
                        {(selectedLocation || vehicleLocation)?.address}, {(selectedLocation || vehicleLocation)?.city}
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${(selectedLocation || vehicleLocation)?.address}, ${(selectedLocation || vehicleLocation)?.city}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Get Directions
                        </a>
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold">{(selectedLocation || vehicleLocation)?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedLocation || vehicleLocation)?.address}, {(selectedLocation || vehicleLocation)?.city}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Policies */}
            <div>
              <h2 className="heading-4 mb-4">Rental Policies</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-5 h-5 text-success" />
                    <span className="font-medium">Insurance Included</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive coverage included with every rental
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className="font-medium">Free Cancellation</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cancel up to 72 hours before pickup for full refund
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 p-6 bg-card rounded-3xl border border-border shadow-soft">
              {/* Price */}
              <div className="text-center mb-6">
                <div className="text-3xl font-bold">
                  ${vehicle.dailyRate}
                  <span className="text-lg font-normal text-muted-foreground">
                    /day
                  </span>
                </div>
              </div>

              <Separator className="mb-6" />

              {/* Location Selector */}
              {!effectiveLocationId && (
                <div className="mb-4 p-3 bg-warning/10 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">Select pickup location</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose a location to check availability
                    </p>
                  </div>
                </div>
              )}

              {effectiveLocationId && (
                <div className="mb-4 p-3 bg-muted rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{effectiveLocationName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLocationModal(true)}
                    className="h-7 px-2 text-xs"
                  >
                    Change
                  </Button>
                </div>
              )}

              {/* Date Pickers with Availability Calendar */}
              <div className="mb-6 space-y-3">
                {/* Pickup Date Picker */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Pick-up Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !pickupDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {pickupDate ? format(pickupDate, "PPP") : <span>Select pickup date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <AvailabilityCalendar
                        mode="single"
                        selected={pickupDate}
                        onSelect={handlePickupDateChange}
                        blockedDates={blockedDatesData?.blockedDates || []}
                        disabled={(date) => date < new Date()}
                        fromDate={new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Return Date Picker */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Return Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !returnDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {returnDate ? format(returnDate, "PPP") : <span>Select return date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <AvailabilityCalendar
                        mode="single"
                        selected={returnDate}
                        onSelect={handleReturnDateChange}
                        blockedDates={blockedDatesData?.blockedDates || []}
                        disabled={(date) => date <= (pickupDate || new Date())}
                        fromDate={pickupDate ? addDays(pickupDate, 1) : new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Calendar Legend */}
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-success/20 border border-success/30" />
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/30" />
                    <span>Booked</span>
                  </div>
                </div>
              </div>

              {/* Availability Status */}
              {startAt && endAt && effectiveLocationId && (
                <div className={`mb-6 p-3 rounded-xl text-center text-sm font-medium ${
                  availabilityLoading
                    ? "bg-muted text-muted-foreground"
                    : isAvailable
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {availabilityLoading
                    ? "Checking availability..."
                    : isAvailable
                    ? "✓ Available for selected dates"
                    : "✗ Not available for selected dates"}
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    ${vehicle.dailyRate} × {rentalDays} day{rentalDays > 1 ? "s" : ""}
                  </span>
                  <span>${subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxes & fees (10%)</span>
                  <span>${taxAmount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Security deposit</span>
                  <span className="text-muted-foreground">
                    ${depositAmount} (refundable)
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${total.toFixed(0)}</span>
                </div>
              </div>

              {/* CTA */}
              <Button
                variant="default"
                size="lg"
                className="w-full"
                onClick={ctaState.action}
                disabled={ctaState.disabled || createHold.isPending}
              >
                {createHold.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reserving...
                  </>
                ) : (
                  ctaState.text
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-4">
                Free cancellation up to 72 hours before pickup
              </p>

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    <span>Insured</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Mobile Sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-lg border-t border-border z-40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-bold">${total.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">
              {rentalDays} day{rentalDays > 1 ? "s" : ""} total
            </div>
          </div>
          <Button
            variant="default"
            size="lg"
            onClick={ctaState.action}
            disabled={ctaState.disabled || createHold.isPending}
            className="flex-1"
          >
            {createHold.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reserving...
              </>
            ) : (
              ctaState.text
            )}
          </Button>
        </div>
      </div>
    </CustomerLayout>
  );
}
