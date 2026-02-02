import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocations } from "@/hooks/use-locations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PICKUP_TIME_SLOTS, DEFAULT_PICKUP_TIME } from "@/lib/rental-rules";

interface GlassSearchBarProps {
  className?: string;
}

export function GlassSearchBar({ className }: GlassSearchBarProps) {
  const navigate = useNavigate();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();

  const [locationId, setLocationId] = useState<string>("");
  const [sameDropoff, setSameDropoff] = useState(true);
  const [dropoffLocationId, setDropoffLocationId] = useState<string>("");
  const [pickupDate, setPickupDate] = useState<string>("");
  const [pickupTime, setPickupTime] = useState<string>(DEFAULT_PICKUP_TIME);
  const [returnDate, setReturnDate] = useState<string>("");
  const [returnTime, setReturnTime] = useState<string>(DEFAULT_PICKUP_TIME);

  // Get minimum date (today)
  const today = new Date().toISOString().split("T")[0];

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    if (locationId) params.set("locationId", locationId);
    if (!sameDropoff && dropoffLocationId) params.set("dropoffLocationId", dropoffLocationId);
    
    if (pickupDate && pickupTime) {
      const startAt = new Date(`${pickupDate}T${pickupTime}`);
      params.set("startAt", startAt.toISOString());
    }
    
    if (returnDate && returnTime) {
      const endAt = new Date(`${returnDate}T${returnTime}`);
      params.set("endAt", endAt.toISOString());
    }

    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className={cn("glass rounded-2xl p-6 shadow-xl", className)}>
      {/* Search Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end">
        {/* Pickup Location */}
        <div className="space-y-2 lg:col-span-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pickup Location
          </label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="h-12 rounded-xl border-border bg-background">
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
                // Auto-set return date if empty or before pickup
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
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
