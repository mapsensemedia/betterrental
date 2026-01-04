import { MapPin, Calendar, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useBookingContext } from "@/contexts/BookingContext";
import { LocationSelector } from "./LocationSelector";

interface TripContextBarProps {
  className?: string;
  showClear?: boolean;
  onClear?: () => void;
  compact?: boolean;
}

export function TripContextBar({ 
  className, 
  showClear = false, 
  onClear,
  compact = false 
}: TripContextBarProps) {
  const { 
    locationId, 
    setLocationId, 
    locationName, 
    startDate, 
    setStartDate, 
    endDate, 
    setEndDate,
    clearBookingContext 
  } = useBookingContext();

  const hasContext = locationId || startDate || endDate;
  
  if (!hasContext && !showClear) {
    return null;
  }

  const handleClear = () => {
    clearBookingContext();
    onClear?.();
  };

  const formatDateRange = () => {
    if (startDate && endDate) {
      return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`;
    }
    if (startDate) {
      return format(startDate, "MMM d");
    }
    return null;
  };

  const dateRange = formatDateRange();

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        {locationName && (
          <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
            <MapPin className="w-3 h-3" />
            {locationName}
          </Badge>
        )}
        {dateRange && (
          <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
            <Calendar className="w-3 h-3" />
            {dateRange}
          </Badge>
        )}
        {showClear && hasContext && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 px-2">
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-4 flex-wrap",
      className
    )}>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Location Chip */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
              "bg-muted hover:bg-muted/80",
              !locationName && "text-muted-foreground"
            )}>
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                {locationName || "Select location"}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-2">
              <p className="text-sm font-medium">Pickup Location</p>
              <LocationSelector 
                value={locationId} 
                onChange={setLocationId} 
                className="w-full"
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* Date Range Chip */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
              "bg-muted hover:bg-muted/80",
              !dateRange && "text-muted-foreground"
            )}>
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                {dateRange || "Select dates"}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Pickup</p>
                  <p className="text-sm font-medium">
                    {startDate ? format(startDate, "MMM d, yyyy") : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Return</p>
                  <p className="text-sm font-medium">
                    {endDate ? format(endDate, "MMM d, yyyy") : "Not set"}
                  </p>
                </div>
              </div>
              <CalendarComponent
                mode="range"
                selected={{
                  from: startDate || undefined,
                  to: endDate || undefined,
                }}
                onSelect={(range) => {
                  setStartDate(range?.from || null);
                  setEndDate(range?.to || null);
                }}
                numberOfMonths={2}
                disabled={(date) => date < new Date()}
                className="pointer-events-auto"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {showClear && hasContext && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
