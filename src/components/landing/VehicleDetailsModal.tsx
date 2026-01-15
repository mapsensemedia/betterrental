/**
 * VehicleDetailsModal - Modal that opens when clicking a featured car
 * Shows vehicle info and trip context form (location, dates, driver age)
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Fuel,
  Gauge,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { cn, displayFuelType, displayTransmission } from "@/lib/utils";
import { PriceWithDisclaimer } from "@/components/shared/PriceWithDisclaimer";

interface VehicleDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    category: string;
    dailyRate: number;
    imageUrl?: string;
    seats?: number;
    fuelType?: string;
    transmission?: string;
  } | null;
}

export function VehicleDetailsModal({
  open,
  onOpenChange,
  vehicle,
}: VehicleDetailsModalProps) {
  const navigate = useNavigate();
  const {
    searchData,
    setPickupLocation,
    setPickupDateTime,
    setReturnDateTime,
    setAgeConfirmed,
    setSelectedVehicle,
    pickupLocations,
  } = useRentalBooking();

  // Local form state
  const [locationId, setLocationId] = useState(searchData.pickupLocationId || "");
  const [pickupDate, setPickupDate] = useState<Date | undefined>(searchData.pickupDate || undefined);
  const [pickupTime, setPickupTime] = useState(searchData.pickupTime || "10:00");
  const [returnDate, setReturnDate] = useState<Date | undefined>(searchData.returnDate || undefined);
  const [returnTime, setReturnTime] = useState(searchData.returnTime || "10:00");
  const [ageRange, setAgeRange] = useState<"21-25" | "25-70" | null>(searchData.ageRange || null);
  const [showErrors, setShowErrors] = useState(false);

  // Sync from context when modal opens
  useEffect(() => {
    if (open) {
      setLocationId(searchData.pickupLocationId || "");
      setPickupDate(searchData.pickupDate || undefined);
      setReturnDate(searchData.returnDate || undefined);
      setPickupTime(searchData.pickupTime || "10:00");
      setReturnTime(searchData.returnTime || "10:00");
      setAgeRange(searchData.ageRange || null);
      setShowErrors(false);
    }
  }, [open, searchData]);

  // Validation
  const isValid = locationId && pickupDate && returnDate && ageRange;

  const handleContinue = () => {
    if (!isValid) {
      setShowErrors(true);
      return;
    }

    if (!vehicle) return;

    // Update context
    setPickupLocation(locationId);
    setPickupDateTime(pickupDate!, pickupTime);
    setReturnDateTime(returnDate!, returnTime);
    setAgeConfirmed(true, ageRange!);
    setSelectedVehicle(vehicle.id);

    // Close modal and navigate
    onOpenChange(false);

    const params = new URLSearchParams();
    params.set("vehicleId", vehicle.id);
    params.set("startAt", pickupDate!.toISOString());
    params.set("endAt", returnDate!.toISOString());
    params.set("locationId", locationId);

    navigate(`/protection?${params.toString()}`);
  };

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Vehicle Header */}
        <div className="relative">
          {vehicle.imageUrl ? (
            <div className="aspect-[16/9] w-full">
              <img
                src={vehicle.imageUrl}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[16/9] w-full bg-muted flex items-center justify-center">
              <Gauge className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Vehicle Info */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogHeader className="text-left p-0">
                <DialogTitle className="text-xl font-semibold">
                  {vehicle.make} {vehicle.model}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{vehicle.year} • {vehicle.category}</p>
            </div>
            <PriceWithDisclaimer
              amount={vehicle.dailyRate}
              suffix="/day"
              variant="card"
            />
          </div>

          {/* Specs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/50">
              <Users className="w-4 h-4 mb-1 text-muted-foreground" />
              <span className="text-sm font-medium">{vehicle.seats || 5}</span>
              <span className="text-xs text-muted-foreground">Seats</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/50">
              <Fuel className="w-4 h-4 mb-1 text-muted-foreground" />
              <span className="text-sm font-medium">{displayFuelType(vehicle.fuelType)}</span>
              <span className="text-xs text-muted-foreground">Fuel</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/50">
              <Gauge className="w-4 h-4 mb-1 text-muted-foreground" />
              <span className="text-sm font-medium">
                {displayTransmission(vehicle.transmission) === "Automatic" ? "Auto" : displayTransmission(vehicle.transmission)}
              </span>
              <span className="text-xs text-muted-foreground">Trans.</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Trip Details Form */}
          <div className="space-y-4">
            <h3 className="font-medium">Trip Details</h3>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Pickup Location
              </label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className={cn(
                  "h-12 rounded-xl",
                  showErrors && !locationId && "border-destructive"
                )}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Select pickup location" />
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

            {/* Dates Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Pickup Date */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Pickup Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-12 w-full justify-start text-left font-normal rounded-xl",
                        !pickupDate && "text-muted-foreground",
                        showErrors && !pickupDate && "border-destructive"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {pickupDate ? format(pickupDate, "MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={pickupDate}
                      onSelect={(date) => {
                        setPickupDate(date);
                        if (date && (!returnDate || date > returnDate)) {
                          const nextDay = new Date(date);
                          nextDay.setDate(nextDay.getDate() + 1);
                          setReturnDate(nextDay);
                        }
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Pickup Time */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Pickup Time
                </label>
                <Select value={pickupTime} onValueChange={setPickupTime}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <SelectValue placeholder="Time" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, "0");
                      return (
                        <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                          {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Return Date */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Return Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-12 w-full justify-start text-left font-normal rounded-xl",
                        !returnDate && "text-muted-foreground",
                        showErrors && !returnDate && "border-destructive"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {returnDate ? format(returnDate, "MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={returnDate}
                      onSelect={setReturnDate}
                      disabled={(date) => date < (pickupDate || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Return Time */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Return Time
                </label>
                <Select value={returnTime} onValueChange={setReturnTime}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <SelectValue placeholder="Time" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, "0");
                      return (
                        <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                          {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Driver's Age */}
            <div className="space-y-3 pt-2">
              <Label className={cn(
                "text-xs font-medium uppercase tracking-wide",
                showErrors && !ageRange ? "text-destructive" : "text-muted-foreground"
              )}>
                Driver's Age <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={ageRange || ""}
                onValueChange={(value) => setAgeRange(value as "21-25" | "25-70")}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="25-70" id="modal-age-25-70" />
                  <Label htmlFor="modal-age-25-70" className="text-sm text-muted-foreground cursor-pointer">
                    25-70 years old
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="21-25" id="modal-age-21-25" />
                  <Label htmlFor="modal-age-21-25" className="text-sm text-muted-foreground cursor-pointer">
                    21-25 years old <span className="text-xs text-amber-600">(Young driver fee applies)</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            className="w-full h-12"
            size="lg"
          >
            Continue to Protection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
