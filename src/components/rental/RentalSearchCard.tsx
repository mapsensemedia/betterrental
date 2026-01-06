/**
 * RentalSearchCard - Main search card with pickup/delivery toggle
 * Replaces GlassSearchBar with enhanced functionality
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Calendar,
  Clock,
  Search,
  Truck,
  Building2,
  AlertCircle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { RENTAL_LOCATIONS, findClosestLocation, calculateDeliveryFee } from "@/constants/rentalLocations";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

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
    canProceedToSelectCar,
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

  // Delivery calculation state
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

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
    }
  };

  // Handle age confirmation
  const handleAgeConfirmedChange = (checked: boolean) => {
    setLocalAgeConfirmed(checked);
    setAgeConfirmed(checked);
  };

  // Calculate delivery (simplified - no Mapbox yet, uses haversine)
  const handleDeliveryAddressBlur = async () => {
    if (deliveryMode !== "delivery" || !deliveryAddress.trim()) {
      return;
    }

    setIsCalculatingDelivery(true);
    setDeliveryError(null);

    try {
      // For now, we'll use a simple geocoding approach
      // In Phase 3, we'll add Mapbox integration
      // For demonstration, we'll use BC coordinates
      
      // Placeholder: Calculate based on address keywords
      // This will be replaced with actual Mapbox geocoding
      let estimatedLat = 49.1;
      let estimatedLng = -122.8;

      // Simple address-based estimation for BC
      const lowerAddress = deliveryAddress.toLowerCase();
      if (lowerAddress.includes("vancouver")) {
        estimatedLat = 49.2827;
        estimatedLng = -123.1207;
      } else if (lowerAddress.includes("surrey")) {
        estimatedLat = 49.1044;
        estimatedLng = -122.8011;
      } else if (lowerAddress.includes("langley")) {
        estimatedLat = 49.1044;
        estimatedLng = -122.6598;
      } else if (lowerAddress.includes("abbotsford")) {
        estimatedLat = 49.0504;
        estimatedLng = -122.3045;
      } else if (lowerAddress.includes("burnaby")) {
        estimatedLat = 49.2488;
        estimatedLng = -122.9805;
      } else if (lowerAddress.includes("coquitlam")) {
        estimatedLat = 49.2838;
        estimatedLng = -122.7932;
      } else if (lowerAddress.includes("richmond")) {
        estimatedLat = 49.1666;
        estimatedLng = -123.1336;
      } else if (lowerAddress.includes("new westminster")) {
        estimatedLat = 49.2057;
        estimatedLng = -122.9109;
      } else if (lowerAddress.includes("delta")) {
        estimatedLat = 49.0847;
        estimatedLng = -123.0586;
      } else if (lowerAddress.includes("chilliwack")) {
        estimatedLat = 49.1579;
        estimatedLng = -121.9514;
      }

      // Find closest center
      const { location: closest, distanceKm } = findClosestLocation(
        estimatedLat,
        estimatedLng
      );

      // Calculate fee
      const feeResult = calculateDeliveryFee(distanceKm);

      if (feeResult.exceeds50km) {
        setDeliveryError(
          "Delivery address is outside our 50km service area. Please choose a closer address or select pickup."
        );
        setDeliveryDetails(0, distanceKm, null);
        return;
      }

      // Update context
      setDeliveryAddress(deliveryAddress, estimatedLat, estimatedLng, deliveryAddress);
      setDeliveryDetails(feeResult.fee, distanceKm, `~${Math.round(distanceKm * 2)} mins`);
      setClosestCenter(closest.id, closest.name, closest.address);

      toast({
        title: "Delivery available",
        description: `${distanceKm.toFixed(1)}km from ${closest.name}. Delivery fee: $${feeResult.fee}`,
      });
    } catch (error) {
      console.error("Delivery calculation error:", error);
      setDeliveryError("Could not calculate delivery. Please try again.");
    } finally {
      setIsCalculatingDelivery(false);
    }
  };

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

    // Navigate to select car
    navigate("/search");
  };

  return (
    <div className={cn("glass rounded-2xl p-6 shadow-xl", className)}>
      {/* Delivery Mode Toggle */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => handleDeliveryModeChange("pickup")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            deliveryMode === "pickup"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <Building2 className="w-4 h-4" />
          Pick up at center
        </button>
        <button
          onClick={() => handleDeliveryModeChange("delivery")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            deliveryMode === "delivery"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <Truck className="w-4 h-4" />
          Bring car to me
        </button>
      </div>

      {/* Search Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end">
        {/* Location Field */}
        <div className="space-y-2 lg:col-span-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {deliveryMode === "pickup" ? "Pickup Location" : "Delivery Address"}
          </label>
          {deliveryMode === "pickup" ? (
            <Select value={locationId} onValueChange={handleLocationChange}>
              <SelectTrigger className="h-12 rounded-xl border-border bg-background">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="Select pickup location" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {pickupLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} - {loc.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Enter your address"
                value={deliveryAddress}
                onChange={(e) => setLocalDeliveryAddress(e.target.value)}
                onBlur={handleDeliveryAddressBlur}
                className="h-12 pl-10 rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Pickup Date & Time */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pickup Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
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
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pickup Time
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Return Date & Time */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Return Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              min={pickupDate || today}
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Return Time
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="time"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Delivery Info Banner */}
      {deliveryMode === "delivery" && searchData.closestPickupCenterName && (
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 pt-4 border-t border-border/50">
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
          className="h-12 px-8"
          variant="default"
          disabled={isCalculatingDelivery}
        >
          <Search className="w-4 h-4 mr-2" />
          {isCalculatingDelivery ? "Calculating..." : "Search Vehicles"}
        </Button>
      </div>
    </div>
  );
}
