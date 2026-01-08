/**
 * RentalSearchCard - Main search card with pickup/delivery toggle
 * Includes Mapbox-powered address autocomplete and route map
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

interface RentalSearchCardProps {
  className?: string;
}

export function RentalSearchCard({ className }: RentalSearchCardProps) {
  const navigate = useNavigate();
  const {
    searchData,
    setPickupLocation,
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
      ? searchData.pickupDate.toISOString().split("T")[0]
      : ""
  );
  const [pickupTime, setPickupTime] = useState(searchData.pickupTime);
  const [returnDate, setReturnDate] = useState(
    searchData.returnDate
      ? searchData.returnDate.toISOString().split("T")[0]
      : ""
  );
  const [returnTime, setReturnTime] = useState(searchData.returnTime);
  const [deliveryMode, setLocalDeliveryMode] = useState(searchData.deliveryMode);
  const [deliveryAddress, setLocalDeliveryAddress] = useState(
    searchData.deliveryAddress || ""
  );
  const [ageConfirmed, setLocalAgeConfirmed] = useState(searchData.ageConfirmed);

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
  const today = new Date().toISOString().split("T")[0];

  // Sync from context on mount
  useEffect(() => {
    if (searchData.pickupLocationId) {
      setLocationId(searchData.pickupLocationId);
    }
    if (searchData.pickupDate) {
      setPickupDate(searchData.pickupDate.toISOString().split("T")[0]);
    }
    if (searchData.returnDate) {
      setReturnDate(searchData.returnDate.toISOString().split("T")[0]);
    }
    setPickupTime(searchData.pickupTime);
    setReturnTime(searchData.returnTime);
    setLocalDeliveryMode(searchData.deliveryMode);
    setLocalDeliveryAddress(searchData.deliveryAddress || "");
    setLocalAgeConfirmed(searchData.ageConfirmed);

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

  // Handle age confirmation
  const handleAgeConfirmedChange = (checked: boolean) => {
    setLocalAgeConfirmed(checked);
    setAgeConfirmed(checked);
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

  // Handle route calculation from map
  const handleRouteCalculated = useCallback(
    (distanceKm: number, durationMins: number) => {
      // Update with actual driving distance
      const feeResult = calculateDeliveryFee(distanceKm);
      setDeliveryDetails(feeResult.fee, distanceKm, `~${durationMins} mins`);
    },
    [setDeliveryDetails]
  );

  // Handle search
  const handleSearch = () => {
    // Validate
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

    if (!ageConfirmed) {
      toast({
        title: "Age confirmation required",
        description: "Please confirm you are between 25-70 years old",
        variant: "destructive",
      });
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
    setPickupDateTime(new Date(`${pickupDate}T${pickupTime}`), pickupTime);
    setReturnDateTime(new Date(`${returnDate}T${returnTime}`), returnTime);

    // Navigate to browse cars
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

      {/* Search Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 items-end overflow-hidden">
        {/* Location Field */}
        <div className="space-y-2 min-w-0">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {deliveryMode === "pickup" ? "Pickup Location" : "Delivery Address"}
          </label>
          {deliveryMode === "pickup" ? (
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
          ) : (
            <DeliveryAddressAutocomplete
              value={deliveryAddress}
              onChange={setLocalDeliveryAddress}
              onSelect={handleAddressSelect}
              placeholder="Enter your address"
            />
          )}
        </div>

        {/* Pickup Date */}
        <div className="space-y-2 min-w-0">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {deliveryMode === "delivery" ? "Delivery Date" : "Pickup Date"}
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
            <input
              type="date"
              min={today}
              value={pickupDate}
              onChange={(e) => {
                setPickupDate(e.target.value);
                if (!returnDate || e.target.value > returnDate) {
                  const nextDay = new Date(e.target.value);
                  nextDay.setDate(nextDay.getDate() + 1);
                  setReturnDate(nextDay.toISOString().split("T")[0]);
                }
              }}
              className="w-full h-12 pl-10 pr-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Pickup Time */}
        <div className="space-y-2 min-w-0">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {deliveryMode === "delivery" ? "Delivery Time" : "Pickup Time"}
          </label>
          <Select value={pickupTime} onValueChange={setPickupTime}>
            <SelectTrigger className="h-12 rounded-xl border-border bg-background w-full">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">
                  <SelectValue placeholder="Time" />
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, i) => {
                const hour = i.toString().padStart(2, '0');
                return (
                  <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                    {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Return Date */}
        <div className="space-y-2 min-w-0">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Return Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
            <input
              type="date"
              min={pickupDate || today}
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full h-12 pl-10 pr-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Return Time */}
        <div className="space-y-2 min-w-0">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Return Time
          </label>
          <Select value={returnTime} onValueChange={setReturnTime}>
            <SelectTrigger className="h-12 rounded-xl border-border bg-background w-full">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">
                  <SelectValue placeholder="Time" />
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, i) => {
                const hour = i.toString().padStart(2, '0');
                return (
                  <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                    {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Delivery Info Banner */}
      {deliveryMode === "delivery" && searchData.closestPickupCenterName && !deliveryError && (
        <div className="mt-4 p-3 rounded-xl bg-success/10 border border-success/20 flex items-center gap-3">
          <Check className="w-5 h-5 text-success" />
          <div className="flex-1">
            <p className="text-sm font-medium">
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
        <div className="flex items-center gap-2">
          <Checkbox
            id="ageConfirm"
            checked={ageConfirmed}
            onCheckedChange={(checked) => handleAgeConfirmedChange(checked as boolean)}
          />
          <Label
            htmlFor="ageConfirm"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            I confirm the driver is between 25-70 years old
          </Label>
        </div>

        <Button
          onClick={handleSearch}
          className="h-12 px-8 w-full sm:w-auto"
          variant="default"
        >
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Delivery Map */}
      {deliveryMode === "delivery" && showMap && deliveryCoords && closestDealership && (
        <div className="mt-6 space-y-4">
          <DeliveryMap
            customerLat={deliveryCoords.lat}
            customerLng={deliveryCoords.lng}
            dealershipLat={closestDealership.lat}
            dealershipLng={closestDealership.lng}
            dealershipName={closestDealership.name}
            onRouteCalculated={handleRouteCalculated}
          />
          
          {/* Delivery Pricing Display */}
          <DeliveryPricingDisplay
            fee={searchData.deliveryFee}
            distanceKm={searchData.deliveryDistanceKm}
            eta={searchData.deliveryEta}
          />
        </div>
      )}
    </div>
  );
}
