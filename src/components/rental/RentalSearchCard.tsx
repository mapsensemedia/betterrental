/**
 * RentalSearchCard - Main search card with pickup/delivery toggle
 * Includes Mapbox-powered address autocomplete and route map
 */
import { useState, useEffect, useCallback } from "react";
import { formatLocalDate, parseLocalDate, addLocalDays, diffLocalDays } from "@/lib/date-utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Calendar,
  Clock,
  Search,
  Truck,
  Building2,
  AlertCircle,
  Check,
  MapPin,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { findClosestLocation, calculateDeliveryFee, getLocationById } from "@/constants/rentalLocations";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { DeliveryAddressAutocomplete } from "./DeliveryAddressAutocomplete";
import { DeliveryMap } from "./DeliveryMap";
import { DeliveryPricingDisplay } from "./DeliveryPricingDisplay";
import { PICKUP_TIME_SLOTS, MAX_RENTAL_DAYS } from "@/lib/rental-rules";
import { computeDropoffFeeFromGroups } from "@/lib/pricing";

interface RentalSearchCardProps {
  className?: string;
  onSearchComplete?: () => void;
}

export function RentalSearchCard({ className, onSearchComplete }: RentalSearchCardProps) {
  const navigate = useNavigate();
  const {
    searchData,
    setPickupLocation,
    setReturnLocation,
    setReturnSameAsPickup,
    setPickupDateTime,
    setReturnDateTime,
    setDeliveryMode,
    setDeliveryAddress,
    setDeliveryDetails,
    setClosestCenter,
    setAgeConfirmed,
    pickupLocations,
  } = useRentalBooking();

  // Local form state
  const [locationId, setLocationId] = useState(searchData.pickupLocationId || "");
  const [pickupDate, setPickupDate] = useState(
    searchData.pickupDate
      ? formatLocalDate(searchData.pickupDate)
      : ""
  );
  const [pickupTime, setPickupTime] = useState(searchData.pickupTime);
  const [returnDate, setReturnDate] = useState(
    searchData.returnDate
      ? formatLocalDate(searchData.returnDate)
      : ""
  );
  const [returnTime, setReturnTime] = useState(searchData.returnTime);
  const [urlSearchParams] = useSearchParams();
  const initialMode = urlSearchParams.get("mode") === "delivery" ? "delivery" : searchData.deliveryMode;
  const [deliveryMode, setLocalDeliveryMode] = useState(initialMode);
  const [deliveryAddress, setLocalDeliveryAddress] = useState(
    searchData.deliveryAddress || ""
  );
  const [ageRange, setLocalAgeRange] = useState<"20-24" | "25-70" | null>(searchData.ageRange);
  const [returnSameAsPickup, setLocalReturnSameAsPickup] = useState(searchData.returnSameAsPickup);
  const [returnLocationId, setLocalReturnLocationId] = useState(searchData.returnLocationId || "");

  // Form validation state
  const [showAgeError, setShowAgeError] = useState(false);
  
  // Delivery state
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [deliveryCoords, setDeliveryCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(searchData.deliveryLat && searchData.deliveryLng ? {
    lat: searchData.deliveryLat,
    lng: searchData.deliveryLng,
  } : null);
  const [closestDealership, setClosestDealership] = useState<{
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  } | null>(null);

  // Get minimum date (today)
  const today = formatLocalDate(new Date());

  // Auto-select delivery mode from URL param
  useEffect(() => {
    if (urlSearchParams.get("mode") === "delivery") {
      setLocalDeliveryMode("delivery");
      setDeliveryMode("delivery");
    }
  }, [urlSearchParams]);

  // Sync from context on mount
  useEffect(() => {
    if (searchData.pickupLocationId) {
      setLocationId(searchData.pickupLocationId);
    }
    if (searchData.pickupDate) {
      setPickupDate(formatLocalDate(searchData.pickupDate));
    }
    if (searchData.returnDate) {
      setReturnDate(formatLocalDate(searchData.returnDate));
    }
    setPickupTime(searchData.pickupTime);
    setReturnTime(searchData.returnTime);
    if (urlSearchParams.get("mode") !== "delivery") {
      setLocalDeliveryMode(searchData.deliveryMode);
    }
    setLocalDeliveryAddress(searchData.deliveryAddress || "");
    setLocalAgeRange(searchData.ageRange);

    // Restore delivery coords if available
    if (searchData.deliveryLat && searchData.deliveryLng && searchData.closestPickupCenterId) {
      setDeliveryCoords({
        lat: searchData.deliveryLat,
        lng: searchData.deliveryLng,
      });
      const loc = getLocationById(searchData.closestPickupCenterId);
      if (loc) {
        setClosestDealership({
          id: loc.id,
          name: loc.name,
          address: loc.address,
          lat: loc.lat,
          lng: loc.lng,
        });
        setShowMap(true);
      }
    }
  }, [searchData]);

  // Handle location change
  const handleLocationChange = (id: string) => {
    setLocationId(id);
    setPickupLocation(id);
  };

  // Handle delivery mode toggle
  const handleDeliveryModeChange = (mode: "pickup" | "delivery") => {
    setLocalDeliveryMode(mode);
    setDeliveryMode(mode);
    if (mode === "pickup") {
      setDeliveryError(null);
      setShowMap(false);
      setDeliveryCoords(null);
      setClosestDealership(null);
    }
  };

  // Handle age range selection
  const handleAgeRangeChange = (range: "20-24" | "25-70") => {
    setLocalAgeRange(range);
    setAgeConfirmed(true, range);
    setShowAgeError(false);
  };

  // Handle address selection from autocomplete
  const handleAddressSelect = useCallback(
    (address: string, lat: number, lng: number, placeName: string) => {
      setLocalDeliveryAddress(address);
      setDeliveryCoords({ lat, lng });

      // Find closest center
      const { location: closest, distanceKm } = findClosestLocation(lat, lng);

      // Calculate fee
      const feeResult = calculateDeliveryFee(distanceKm);

      if (feeResult.exceeds50km) {
        setDeliveryError(
          "Delivery address is outside our 50km service area. Please choose a closer address or select pickup."
        );
        setShowMap(false);
        setDeliveryDetails(0, distanceKm, null);
        return;
      }

      // Update context
      setDeliveryError(null);
      setDeliveryAddress(address, lat, lng, placeName);
      setDeliveryDetails(feeResult.fee, distanceKm, `~${Math.round(distanceKm * 2)} mins`);
      setClosestCenter(closest.id, closest.name, closest.address);

      // Set dealership for map
      setClosestDealership({
        id: closest.id,
        name: closest.name,
        address: closest.address,
        lat: closest.lat,
        lng: closest.lng,
      });
      setShowMap(true);

      toast({
        title: "Delivery available",
        description: `${distanceKm.toFixed(1)}km from ${closest.name}. Delivery fee: $${feeResult.fee}`,
      });
    },
    [setDeliveryAddress, setDeliveryDetails, setClosestCenter]
  );

  // Handle manual address entry (when user types without selecting from suggestions)
  const handleManualAddressBlur = useCallback(() => {
    if (deliveryAddress && deliveryAddress.length >= 10 && !deliveryCoords) {
      setDeliveryAddress(deliveryAddress, null, null, deliveryAddress);
      const defaultCenter = pickupLocations[0];
      if (defaultCenter) {
        setClosestCenter(defaultCenter.id, defaultCenter.name, defaultCenter.address);
        setDeliveryDetails(49, null, "TBD at pickup");
      }
      toast({
        title: "Address saved",
        description: "For accurate delivery pricing, please select from suggestions. Delivery fee will be confirmed at pickup.",
      });
    }
  }, [deliveryAddress, deliveryCoords, pickupLocations, setDeliveryAddress, setClosestCenter, setDeliveryDetails]);

  // Handle route calculation from map
  const handleRouteCalculated = useCallback(
    (distanceKm: number, durationMins: number) => {
      const feeResult = calculateDeliveryFee(distanceKm);
      setDeliveryDetails(feeResult.fee, distanceKm, `~${durationMins} mins`);
    },
    [setDeliveryDetails]
  );

  // Handle search
  const handleSearch = () => {
    if (deliveryMode === "pickup" && !locationId) {
      toast({
        title: "Select a pickup location",
        variant: "destructive",
      });
      return;
    }

    if (deliveryMode === "delivery" && !deliveryAddress.trim()) {
      toast({
        title: "Enter a delivery address",
        variant: "destructive",
      });
      return;
    }

    if (!pickupDate || !returnDate) {
      toast({
        title: "Select pickup and return dates",
        variant: "destructive",
      });
      return;
    }

    if (!ageRange) {
      setShowAgeError(true);
      return;
    }

    if (deliveryMode === "delivery" && searchData.deliveryDistanceKm && searchData.deliveryDistanceKm > 50) {
      toast({
        title: "Delivery unavailable",
        description: "Address is outside our 50km service area",
        variant: "destructive",
      });
      return;
    }

    // Update context with final values
    setPickupDateTime(parseLocalDate(pickupDate), pickupTime);
    setReturnDateTime(parseLocalDate(returnDate), returnTime);

    onSearchComplete?.();
    navigate("/search");
  };

  return (
    <div className={cn("glass rounded-2xl p-4 sm:p-6 shadow-xl overflow-x-hidden", className)}>
      {/* Delivery Mode Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => handleDeliveryModeChange("pickup")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 rounded-full text-xs sm:text-sm font-medium transition-colors border min-w-0",
            deliveryMode === "pickup"
              ? "bg-foreground text-background border-foreground"
              : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
          )}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="truncate">Pick up at location</span>
        </button>
        <button
          onClick={() => handleDeliveryModeChange("delivery")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 rounded-full text-xs sm:text-sm font-medium transition-colors border relative min-w-0",
            deliveryMode === "delivery"
              ? "bg-foreground text-background border-foreground"
              : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
          )}
        >
          <Truck className="w-4 h-4 shrink-0" />
          <span className="truncate">Bring car to me</span>
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-1 text-[10px] px-1 py-0.5"
          >
            NEW
          </Badge>
        </button>
      </div>

      {/* Map Preview Banner */}
      {deliveryMode === "delivery" && showMap && deliveryCoords && closestDealership && (
        <div className="mb-6 rounded-xl overflow-hidden border border-border bg-muted/30">
          <div className="p-3 bg-success/10 border-b border-success/20 flex items-center gap-3">
            <Check className="w-5 h-5 text-success shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                Delivery from {searchData.closestPickupCenterName}
              </p>
              <p className="text-xs text-muted-foreground">
                {searchData.deliveryDistanceKm?.toFixed(1)}km •{" "}
                {searchData.deliveryEta} •{" "}
                {searchData.deliveryFee === 0
                  ? "Free delivery"
                  : `$${searchData.deliveryFee} delivery fee`}
              </p>
            </div>
          </div>
          <DeliveryMap
            customerLat={deliveryCoords.lat}
            customerLng={deliveryCoords.lng}
            dealershipLat={closestDealership.lat}
            dealershipLng={closestDealership.lng}
            dealershipName={closestDealership.name}
            onRouteCalculated={handleRouteCalculated}
            className="h-[200px] sm:h-[250px]"
          />
        </div>
      )}

      {/* Search Fields - Different layout for delivery mode */}
      {deliveryMode === "delivery" ? (
        <div className="space-y-4">
          {/* Delivery Address */}
          <div className="space-y-2 relative z-20">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Delivery Address
            </label>
            <DeliveryAddressAutocomplete
              value={deliveryAddress}
              onChange={setLocalDeliveryAddress}
              onSelect={handleAddressSelect}
              onBlur={handleManualAddressBlur}
              placeholder="Enter your full delivery address"
            />
            {deliveryCoords && deliveryAddress && searchData.deliveryDistanceKm != null && (
              <p className="text-xs text-muted-foreground mt-1 pl-10">
                {searchData.deliveryDistanceKm.toFixed(1)}km from {searchData.closestPickupCenterName}
              </p>
            )}
          </div>

          {/* Date/Time Fields Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Delivery Date */}
            <div className="space-y-2 min-w-0">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Delivery Date
              </label>
              <div 
                className="relative cursor-pointer"
                onClick={(e) => {
                  const input = e.currentTarget.querySelector('input');
                  if (input) {
                    input.showPicker?.();
                    input.focus();
                  }
                }}
              >
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <input
                  type="date"
                  min={today}
                  value={pickupDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setPickupDate(newDate);
                    // Persist to context immediately
                    if (newDate) {
                      setPickupDateTime(parseLocalDate(newDate), pickupTime);
                    }
                    if (!returnDate || newDate > returnDate) {
                      const nextDayStr = addLocalDays(newDate, 1);
                      setReturnDate(nextDayStr);
                      // Also persist return date
                      setReturnDateTime(parseLocalDate(nextDayStr), returnTime);
                    }
                  }}
                  className="w-full h-12 pl-10 pr-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm cursor-pointer"
                />
              </div>
            </div>

            {/* Delivery Time */}
            <div className="space-y-2 min-w-0">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Delivery Time
              </label>
              <Select value={pickupTime} onValueChange={(time) => {
                setPickupTime(time);
                if (pickupDate) {
                  setPickupDateTime(new Date(`${pickupDate}T${time}`), time);
                }
              }}>
                <SelectTrigger className="h-12 rounded-xl border-border bg-background w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      <SelectValue placeholder="Select window" />
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {PICKUP_TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Return Date */}
            <div className="space-y-2 min-w-0">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Return Date
              </label>
              <div 
                className="relative cursor-pointer"
                onClick={(e) => {
                  const input = e.currentTarget.querySelector('input');
                  if (input) {
                    input.showPicker?.();
                    input.focus();
                  }
                }}
              >
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <input
                  type="date"
                  min={pickupDate || today}
                  max={pickupDate ? (() => {
                    const maxDate = parseLocalDate(pickupDate);
                    maxDate.setDate(maxDate.getDate() + MAX_RENTAL_DAYS);
                    return formatLocalDate(maxDate);
                  })() : undefined}
                  value={returnDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setReturnDate(newDate);
                    if (newDate) {
                      setReturnDateTime(new Date(`${newDate}T${returnTime}`), returnTime);
                    }
                  }}
                  className="w-full h-12 pl-10 pr-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm cursor-pointer"
                />
              </div>
              {pickupDate && returnDate && (
                (() => {
                  const days = diffLocalDays(pickupDate, returnDate);
                  if (days > MAX_RENTAL_DAYS) {
                    return (
                      <p className="text-xs text-destructive">
                        Maximum rental is {MAX_RENTAL_DAYS} days
                      </p>
                    );
                  }
                  return null;
                })()
              )}
            </div>

            {/* Return Time */}
            <div className="space-y-2 min-w-0">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Return Time
              </label>
              <Select value={returnTime} onValueChange={(time) => {
                setReturnTime(time);
                if (returnDate) {
                  setReturnDateTime(new Date(`${returnDate}T${time}`), time);
                }
              }}>
                <SelectTrigger className="h-12 rounded-xl border-border bg-background w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      <SelectValue placeholder="Select time" />
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {PICKUP_TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : (
        // Pickup mode - grid layout
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Pickup Location */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pickup Location
            </label>
            <Select value={locationId} onValueChange={handleLocationChange}>
              <SelectTrigger className="h-12 rounded-xl border-border bg-background w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    <SelectValue placeholder="Select pickup location" />
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {pickupLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{loc.name}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {loc.address}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pickup Date */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pickup Date
            </label>
            <div 
              className="relative cursor-pointer"
              onClick={(e) => {
                const input = e.currentTarget.querySelector('input');
                if (input) {
                  input.showPicker?.();
                  input.focus();
                }
              }}
            >
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
              <input
                type="date"
                min={today}
                value={pickupDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setPickupDate(newDate);
                  // Persist to context immediately
                  if (newDate) {
                    setPickupDateTime(new Date(`${newDate}T${pickupTime}`), pickupTime);
                  }
                  if (!returnDate || newDate > returnDate) {
                    const nextDayStr = addLocalDays(newDate, 1);
                    setReturnDate(nextDayStr);
                    // Also persist return date
                    setReturnDateTime(new Date(`${nextDayStr}T${returnTime}`), returnTime);
                  }
                }}
                className="w-full h-12 pl-10 pr-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm cursor-pointer"
              />
            </div>
          </div>

          {/* Pickup Time */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pickup Time
            </label>
            <Select value={pickupTime} onValueChange={(time) => {
              setPickupTime(time);
              if (pickupDate) {
                setPickupDateTime(new Date(`${pickupDate}T${time}`), time);
              }
            }}>
              <SelectTrigger className="h-12 rounded-xl border-border bg-background w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    <SelectValue placeholder="Select time" />
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {PICKUP_TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Return Date */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Return Date
            </label>
            <div 
              className="relative cursor-pointer"
              onClick={(e) => {
                const input = e.currentTarget.querySelector('input');
                if (input) {
                  input.showPicker?.();
                  input.focus();
                }
              }}
            >
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
              <input
                type="date"
                min={pickupDate || today}
                max={pickupDate ? (() => {
                  const maxDate = parseLocalDate(pickupDate);
                  maxDate.setDate(maxDate.getDate() + MAX_RENTAL_DAYS);
                  return formatLocalDate(maxDate);
                })() : undefined}
                value={returnDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setReturnDate(newDate);
                  if (newDate) {
                    setReturnDateTime(new Date(`${newDate}T${returnTime}`), returnTime);
                  }
                }}
                className="w-full h-12 pl-10 pr-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm cursor-pointer"
              />
            </div>
            {pickupDate && returnDate && (
              (() => {
                const days = diffLocalDays(pickupDate, returnDate);
                if (days > MAX_RENTAL_DAYS) {
                  return (
                    <p className="text-xs text-destructive">
                      Maximum rental is {MAX_RENTAL_DAYS} days
                    </p>
                  );
                }
                return null;
              })()
            )}
          </div>

          {/* Return Time */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Return Time
            </label>
            <Select value={returnTime} onValueChange={(time) => {
              setReturnTime(time);
              if (returnDate) {
                setReturnDateTime(new Date(`${returnDate}T${time}`), time);
              }
            }}>
              <SelectTrigger className="h-12 rounded-xl border-border bg-background w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    <SelectValue placeholder="Select time" />
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {PICKUP_TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Drop-off Location (pickup mode only) */}
      {deliveryMode === "pickup" && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="return-same-location"
              checked={returnSameAsPickup}
              onCheckedChange={(checked) => {
                const same = checked === true;
                setLocalReturnSameAsPickup(same);
                setReturnSameAsPickup(same);
                if (same) {
                  setLocalReturnLocationId("");
                  setReturnLocation(null);
                }
              }}
            />
            <label htmlFor="return-same-location" className="text-sm text-muted-foreground cursor-pointer">
              Return to same location
            </label>
          </div>
          
          {!returnSameAsPickup && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Drop-off Location
              </label>
              <Select 
                value={returnLocationId} 
                onValueChange={(id) => {
                  setLocalReturnLocationId(id);
                  setReturnLocation(id);
                }}
              >
                <SelectTrigger className="h-12 rounded-xl border-border bg-background w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      <SelectValue placeholder="Select drop-off location" />
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {pickupLocations
                    .filter((loc) => loc.id !== locationId)
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{loc.name}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {loc.address}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {returnLocationId && (() => {
                const pickupLoc = pickupLocations.find(l => l.id === locationId);
                const returnLoc = pickupLocations.find(l => l.id === returnLocationId);
                const fee = pickupLoc && returnLoc
                  ? computeDropoffFeeFromGroups(pickupLoc.city.toLowerCase(), returnLoc.city.toLowerCase())
                  : 0;
                return fee > 0 ? (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    ${fee.toFixed(2)} CAD + tax different location fee applies
                  </p>
                ) : null;
              })()}
            </div>
          )}
        </div>
      )}

      {deliveryMode === "delivery" && showMap && deliveryCoords && closestDealership && (
        <div className="mt-4">
          <DeliveryPricingDisplay
            fee={searchData.deliveryFee}
            distanceKm={searchData.deliveryDistanceKm}
            eta={searchData.deliveryEta}
          />
        </div>
      )}

      {/* Delivery Error */}
      {deliveryError && (
        <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm text-destructive">{deliveryError}</p>
        </div>
      )}

      {/* Age Confirmation & Search Button */}
      <div className="flex flex-col gap-4 mt-6 pt-4 border-t border-border/50">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className={cn(
              "text-sm font-medium",
              showAgeError ? "text-destructive" : "text-foreground"
            )}>
              Driver's Age <span className="text-destructive">*</span>
            </Label>
          </div>
          <RadioGroup
            value={ageRange || ""}
            onValueChange={(value) => handleAgeRangeChange(value as "20-24" | "25-70")}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="25-70" id="age-25-70" />
              <Label htmlFor="age-25-70" className="text-sm text-muted-foreground cursor-pointer">
                25-70 years old
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="20-24" id="age-20-24" />
              <Label htmlFor="age-20-24" className="text-sm text-muted-foreground cursor-pointer">
                20-24 years old <span className="text-xs text-warning">(Young driver fee applies)</span>
              </Label>
            </div>
          </RadioGroup>
          {showAgeError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Please select your age range to continue
            </p>
          )}
        </div>

        <Button
          onClick={handleSearch}
          className="h-12 px-8 w-full btn-luxury text-base font-semibold"
          variant="default"
        >
          <Search className="w-4 h-4 mr-2" />
          Search Available Vehicles
        </Button>
      </div>
    </div>
  );
}
