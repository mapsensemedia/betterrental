import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Clock, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocations } from "@/hooks/use-locations";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PICKUP_TIME_SLOTS, DEFAULT_PICKUP_TIME } from "@/lib/rental-rules";
import { todayLocalISO, clampToTodayISO, isPastLocalDate, addLocalDays } from "@/lib/date-utils";

interface GlassSearchBarProps {
  className?: string;
}

export function GlassSearchBar({ className }: GlassSearchBarProps) {
  const navigate = useNavigate();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { setAgeConfirmed, setPickupDateTime, setReturnDateTime } = useRentalBooking();

  const [locationId, setLocationId] = useState<string>("");
  const [sameDropoff, setSameDropoff] = useState(true);
  const [dropoffLocationId, setDropoffLocationId] = useState<string>("");
  const [pickupDate, setPickupDate] = useState<string>("");
  const [pickupTime, setPickupTime] = useState<string>(DEFAULT_PICKUP_TIME);
  const [returnDate, setReturnDate] = useState<string>("");
  const [returnTime, setReturnTime] = useState<string>(DEFAULT_PICKUP_TIME);
  const [ageRange, setAgeRange] = useState<"20-24" | "25-70" | "">("");
  const [showAgeError, setShowAgeError] = useState(false);
  const [showLocationError, setShowLocationError] = useState(false);
  const [showPickupDateError, setShowPickupDateError] = useState(false);
  const [showReturnDateError, setShowReturnDateError] = useState(false);

  // Get minimum date (today)
  const today = todayLocalISO();

  const handleAgeChange = (value: string) => {
    setAgeRange(value as "20-24" | "25-70");
    setShowAgeError(false);
    setAgeConfirmed(true, value as "20-24" | "25-70");
  };

  const handleSearch = () => {
    // Validate all required fields
    let hasErrors = false;

    if (!locationId) {
      setShowLocationError(true);
      hasErrors = true;
    }
    if (!pickupDate) {
      setShowPickupDateError(true);
      hasErrors = true;
    }
    if (!returnDate) {
      setShowReturnDateError(true);
      hasErrors = true;
    }
    if (!ageRange) {
      setShowAgeError(true);
      hasErrors = true;
    }

    if (hasErrors) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (isPastLocalDate(pickupDate) || isPastLocalDate(returnDate)) {
      const fixedPickup = clampToTodayISO(pickupDate);
      setPickupDate(fixedPickup);
      setReturnDate(
        isPastLocalDate(returnDate) || returnDate < fixedPickup
          ? addLocalDays(fixedPickup, 1)
          : returnDate
      );
      toast({
        title: "Pickup date cannot be in the past",
        description: "We moved your dates to the earliest available day.",
        variant: "destructive",
      });
      return;
    }

    // Persist dates and location to booking context immediately
    const startAt = new Date(`${pickupDate}T${pickupTime}`);
    const endAt = new Date(`${returnDate}T${returnTime}`);
    setPickupDateTime(startAt, pickupTime);
    setReturnDateTime(endAt, returnTime);

    // Build URL params
    const params = new URLSearchParams();
    
    if (locationId) params.set("locationId", locationId);
    if (!sameDropoff && dropoffLocationId) params.set("dropoffLocationId", dropoffLocationId);
    
    params.set("startAt", startAt.toISOString());
    params.set("endAt", endAt.toISOString());

    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className={cn("glass rounded-2xl p-6 shadow-xl", className)}>
      {/* Search Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 items-end">
        {/* Pickup Location */}
        <div className="space-y-2 lg:col-span-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pickup Location
          </label>
          <Select value={locationId} onValueChange={(v) => { setLocationId(v); setShowLocationError(false); }}>
            <SelectTrigger className={cn(
              "h-12 rounded-xl border-border bg-background",
              showLocationError && "border-destructive ring-1 ring-destructive"
            )}>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Select pickup location" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {locationsLoading ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : locations.length === 0 ? (
                <SelectItem value="none" disabled>No locations available</SelectItem>
              ) : (
                locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} - {loc.city}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {showLocationError && (
            <p className="text-xs text-destructive">Please select a location</p>
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
                const newDate = clampToTodayISO(e.target.value);
                setPickupDate(newDate);
                setShowPickupDateError(false);
                // Auto-set return date if empty or before pickup
                if (newDate && (!returnDate || newDate > returnDate)) {
                  setReturnDate(addLocalDays(newDate, 1));
                  setShowReturnDateError(false);
                }
              }}
              className={cn(
                "w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                showPickupDateError && "border-destructive ring-1 ring-destructive"
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pickup Time
          </label>
          <Select value={pickupTime} onValueChange={setPickupTime}>
            <SelectTrigger className="h-12 rounded-xl border-border bg-background">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Select time" />
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
              onChange={(e) => {
                const raw = clampToTodayISO(e.target.value);
                setReturnDate(pickupDate && raw && raw < pickupDate ? pickupDate : raw);
                setShowReturnDateError(false);
              }}
              className={cn(
                "w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                showReturnDateError && "border-destructive ring-1 ring-destructive"
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Return Time
          </label>
          <Select value={returnTime} onValueChange={setReturnTime}>
            <SelectTrigger className="h-12 rounded-xl border-border bg-background">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Select time" />
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

        {/* Driver Age */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Driver's Age <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleAgeChange("25-70")}
              className={cn(
                "h-12 rounded-xl border-2 transition-all text-sm font-medium flex items-center justify-center gap-1.5",
                ageRange === "25-70"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50",
                showAgeError && !ageRange && "border-destructive ring-1 ring-destructive"
              )}
            >
              25–70 yrs
            </button>
            <button
              type="button"
              onClick={() => handleAgeChange("20-24")}
              className={cn(
                "h-12 rounded-xl border-2 transition-all text-sm font-medium flex flex-col items-center justify-center",
                ageRange === "20-24"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50",
                showAgeError && !ageRange && "border-destructive ring-1 ring-destructive"
              )}
            >
              <span>21–24 yrs</span>
              <span className="text-[10px] text-amber-600 leading-tight">Young driver fee</span>
            </button>
          </div>
          {showAgeError && (
            <p className="text-xs text-destructive">Please select your age range</p>
          )}
        </div>
      </div>

      {/* Dropoff Option & Search Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Checkbox
            id="sameDropoff"
            checked={sameDropoff}
            onCheckedChange={(checked) => setSameDropoff(checked as boolean)}
          />
          <label htmlFor="sameDropoff" className="text-sm text-muted-foreground cursor-pointer">
            Return to same location
          </label>
        </div>

        {!sameDropoff && (
          <div className="flex-1 max-w-xs">
            <Select value={dropoffLocationId} onValueChange={setDropoffLocationId}>
              <SelectTrigger className="h-10 rounded-xl border-border bg-background">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="Dropoff location" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} - {loc.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button onClick={handleSearch} className="h-12 px-8" variant="default">
          <Search className="w-4 h-4 mr-2" />
          Search Vehicles
        </Button>
      </div>
    </div>
  );
}
