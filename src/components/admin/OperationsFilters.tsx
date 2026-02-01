/**
 * Shared Operations Filters Component
 * Provides date range, location, vehicle, and processing status filters
 */
import { useState } from "react";
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Calendar, MapPin, Car, Filter, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface OperationsFiltersState {
  locationId: string;
  vehicleId: string;
  dateRange: { start: Date | null; end: Date | null };
  datePreset: string;
  needsProcessing: boolean;
}

interface Location {
  id: string;
  name: string;
  city: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
}

interface OperationsFiltersProps {
  filters: OperationsFiltersState;
  onFiltersChange: (filters: OperationsFiltersState) => void;
  locations: Location[];
  vehicles: Vehicle[];
  showNeedsProcessing?: boolean;
  className?: string;
}

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "this-week", label: "This Week" },
  { value: "next-7-days", label: "Next 7 Days" },
  { value: "this-month", label: "This Month" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

export function getDateRangeFromPreset(preset: string): { start: Date | null; end: Date | null } {
  const now = new Date();
  
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "tomorrow":
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { start: startOfDay(tomorrow), end: endOfDay(tomorrow) };
    case "this-week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "next-7-days":
      return { start: startOfDay(now), end: endOfDay(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) };
    case "this-month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "all":
      return { start: null, end: null };
    default:
      return { start: null, end: null };
  }
}

export function OperationsFilters({
  filters,
  onFiltersChange,
  locations,
  vehicles,
  showNeedsProcessing = false,
  className,
}: OperationsFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePresetChange = (preset: string) => {
    if (preset === "custom") {
      // Reset date range and open calendar
      onFiltersChange({ 
        ...filters, 
        datePreset: preset, 
        dateRange: { start: null, end: null } 
      });
      setCalendarOpen(true);
    } else {
      setCalendarOpen(false);
      const range = getDateRangeFromPreset(preset);
      onFiltersChange({ ...filters, datePreset: preset, dateRange: range });
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (!filters.dateRange.start || filters.dateRange.end) {
      // Start new selection
      onFiltersChange({
        ...filters,
        datePreset: "custom",
        dateRange: { start: startOfDay(date), end: null },
      });
    } else {
      // Complete selection
      if (date < filters.dateRange.start) {
        onFiltersChange({
          ...filters,
          datePreset: "custom",
          dateRange: { start: startOfDay(date), end: endOfDay(filters.dateRange.start) },
        });
      } else {
        onFiltersChange({
          ...filters,
          datePreset: "custom",
          dateRange: { start: filters.dateRange.start, end: endOfDay(date) },
        });
      }
      setCalendarOpen(false);
    }
  };

  const clearFilters = () => {
    onFiltersChange({
      locationId: "all",
      vehicleId: "all",
      dateRange: { start: null, end: null },
      datePreset: "all",
      needsProcessing: false,
    });
  };

  const hasActiveFilters = 
    filters.locationId !== "all" || 
    filters.vehicleId !== "all" || 
    filters.datePreset !== "all" ||
    filters.needsProcessing;

  const getDateLabel = () => {
    if (filters.datePreset === "custom" && filters.dateRange.start) {
      if (filters.dateRange.end) {
        return `${format(filters.dateRange.start, "MMM d")} - ${format(filters.dateRange.end, "MMM d")}`;
      }
      return `From ${format(filters.dateRange.start, "MMM d")}`;
    }
    return DATE_PRESETS.find(p => p.value === filters.datePreset)?.label || "All Time";
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 md:gap-2", className)}>
      <Filter className="h-4 w-4 text-muted-foreground hidden md:block" />
      
      {/* Location Filter */}
      <Select value={filters.locationId} onValueChange={(v) => onFiltersChange({ ...filters, locationId: v })}>
        <SelectTrigger className="w-[100px] md:w-[140px] lg:w-[160px] h-8 md:h-9 text-xs md:text-sm">
          <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Vehicle Filter - hidden on smallest screens */}
      <Select value={filters.vehicleId} onValueChange={(v) => onFiltersChange({ ...filters, vehicleId: v })}>
        <SelectTrigger className="w-[100px] md:w-[140px] lg:w-[160px] h-8 md:h-9 text-xs md:text-sm hidden xs:flex">
          <Car className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Vehicle" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Vehicles</SelectItem>
          {vehicles.map((veh) => (
            <SelectItem key={veh.id} value={veh.id}>
              {veh.year} {veh.make} {veh.model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <div className="flex items-center gap-1.5 md:gap-2">
        <Select value={filters.datePreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[90px] md:w-[120px] lg:w-[150px] h-8 md:h-9 text-xs md:text-sm">
            <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2 text-muted-foreground shrink-0" />
            <span className="truncate">
              {DATE_PRESETS.find(p => p.value === filters.datePreset)?.label || "All"}
            </span>
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Range Calendar Popover - separate from Select */}
        {filters.datePreset === "custom" && (
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 md:h-9 gap-1.5 px-2 md:px-3">
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {filters.dateRange.start ? (
                  filters.dateRange.end ? (
                    <span className="text-[10px] md:text-xs">
                      {format(filters.dateRange.start, "M/d")} - {format(filters.dateRange.end, "M/d")}
                    </span>
                  ) : (
                    <span className="text-[10px] md:text-xs">From {format(filters.dateRange.start, "M/d")}</span>
                  )
                ) : (
                  <span className="text-[10px] md:text-xs">Select</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.dateRange.start || undefined}
                onSelect={handleDateSelect}
                disabled={{ before: new Date(2020, 0, 1) }}
                initialFocus
                className="pointer-events-auto"
              />
              {filters.dateRange.start && !filters.dateRange.end && (
                <div className="p-2 text-xs text-muted-foreground text-center border-t">
                  Click another date to set end date
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Needs Processing Toggle */}
      {showNeedsProcessing && (
        <Button
          variant={filters.needsProcessing ? "default" : "outline"}
          size="sm"
          className="h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm"
          onClick={() => onFiltersChange({ ...filters, needsProcessing: !filters.needsProcessing })}
        >
          <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Needs Processing</span>
          <span className="sm:hidden">Review</span>
        </Button>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-8 md:h-9 px-2" onClick={clearFilters}>
          <X className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Clear</span>
        </Button>
      )}
    </div>
  );
}

export const defaultFilters: OperationsFiltersState = {
  locationId: "all",
  vehicleId: "all",
  dateRange: { start: null, end: null },
  datePreset: "all",
  needsProcessing: false,
};
