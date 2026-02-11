/**
 * BrowseFilters - Filter sidebar for the browse/search page
 * Filters categories by vehicle type, passengers, transmission, and budget
 */
import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { FleetCategory } from "@/hooks/use-fleet-categories";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Derive vehicle type labels from category names */
const VEHICLE_TYPES = ["SUV", "Sedan", "Minivan", "Economy", "Compact"] as const;
const PASSENGER_OPTIONS = [2, 4, 5, 7] as const;

export interface BrowseFilterState {
  vehicleTypes: string[];
  passengers: number[];
  automaticOnly: boolean;
  budgetRange: [number, number];
}

interface BrowseFiltersProps {
  categories: FleetCategory[];
  filters: BrowseFilterState;
  onChange: (filters: BrowseFilterState) => void;
  className?: string;
}

export function getDefaultFilters(categories: FleetCategory[]): BrowseFilterState {
  const rates = categories.map((c) => c.daily_rate);
  const min = rates.length > 0 ? Math.floor(Math.min(...rates)) : 0;
  const max = rates.length > 0 ? Math.ceil(Math.max(...rates)) : 500;
  return {
    vehicleTypes: [],
    passengers: [],
    automaticOnly: false,
    budgetRange: [min, max],
  };
}

/** Determine which vehicle types are relevant to the current dataset */
function getAvailableVehicleTypes(categories: FleetCategory[]): string[] {
  return VEHICLE_TYPES.filter((type) =>
    categories.some((c) => c.name.toLowerCase().includes(type.toLowerCase()))
  );
}

/** Get unique seat counts from categories */
function getAvailableSeatCounts(categories: FleetCategory[]): number[] {
  const seats = new Set(categories.map((c) => c.seats || 5));
  return PASSENGER_OPTIONS.filter((p) => {
    if (p === 7) return Array.from(seats).some((s) => s >= 7);
    return seats.has(p);
  });
}

export function applyFilters(
  categories: FleetCategory[],
  filters: BrowseFilterState
): FleetCategory[] {
  return categories.filter((cat) => {
    // Vehicle type filter
    if (filters.vehicleTypes.length > 0) {
      const matchesType = filters.vehicleTypes.some((type) =>
        cat.name.toLowerCase().includes(type.toLowerCase())
      );
      if (!matchesType) return false;
    }

    // Passengers filter
    if (filters.passengers.length > 0) {
      const catSeats = cat.seats || 5;
      const matchesPassengers = filters.passengers.some((p) => {
        if (p === 7) return catSeats >= 7;
        return catSeats === p;
      });
      if (!matchesPassengers) return false;
    }

    // Automatic only
    if (filters.automaticOnly) {
      if (cat.transmission && cat.transmission.toLowerCase() !== "automatic") {
        return false;
      }
    }

    // Budget range
    if (
      cat.daily_rate < filters.budgetRange[0] ||
      cat.daily_rate > filters.budgetRange[1]
    ) {
      return false;
    }

    return true;
  });
}

function hasActiveFilters(filters: BrowseFilterState, defaults: BrowseFilterState): boolean {
  return (
    filters.vehicleTypes.length > 0 ||
    filters.passengers.length > 0 ||
    filters.automaticOnly ||
    filters.budgetRange[0] !== defaults.budgetRange[0] ||
    filters.budgetRange[1] !== defaults.budgetRange[1]
  );
}

function FilterContent({
  categories,
  filters,
  onChange,
  resultCount,
}: BrowseFiltersProps & { resultCount: number }) {
  const availableTypes = getAvailableVehicleTypes(categories);
  const availableSeats = getAvailableSeatCounts(categories);
  const rates = categories.map((c) => c.daily_rate);
  const minRate = rates.length > 0 ? Math.floor(Math.min(...rates)) : 0;
  const maxRate = rates.length > 0 ? Math.ceil(Math.max(...rates)) : 500;
  const defaults = getDefaultFilters(categories);

  const toggleVehicleType = (type: string) => {
    const next = filters.vehicleTypes.includes(type)
      ? filters.vehicleTypes.filter((t) => t !== type)
      : [...filters.vehicleTypes, type];
    onChange({ ...filters, vehicleTypes: next });
  };

  const togglePassengers = (count: number) => {
    const next = filters.passengers.includes(count)
      ? filters.passengers.filter((p) => p !== count)
      : [...filters.passengers, count];
    onChange({ ...filters, passengers: next });
  };

  return (
    <div className="space-y-6">
      {/* Result count */}
      <p className="text-sm font-semibold">
        Showing {resultCount} offer{resultCount !== 1 ? "s" : ""}
      </p>

      {/* Vehicle Type */}
      {availableTypes.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Vehicle Type</h4>
          <div className="space-y-2.5">
            {availableTypes.map((type) => (
              <label
                key={type}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Checkbox
                  checked={filters.vehicleTypes.includes(type)}
                  onCheckedChange={() => toggleVehicleType(type)}
                />
                <span className="text-sm">{type}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Automatic */}
      <div className="flex items-center justify-between">
        <Label htmlFor="automatic-toggle" className="font-semibold text-sm cursor-pointer">
          Automatic
        </Label>
        <Switch
          id="automatic-toggle"
          checked={filters.automaticOnly}
          onCheckedChange={(checked) =>
            onChange({ ...filters, automaticOnly: checked })
          }
        />
      </div>

      <Separator />

      {/* Budget */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">Budget</h4>
          <span className="text-sm text-muted-foreground">
            {filters.budgetRange[0]}–{filters.budgetRange[1]}
          </span>
        </div>
        <Slider
          min={minRate}
          max={maxRate}
          step={1}
          value={filters.budgetRange}
          onValueChange={(value) =>
            onChange({
              ...filters,
              budgetRange: [value[0], value[1]] as [number, number],
            })
          }
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>${filters.budgetRange[0]}</span>
          <span>${filters.budgetRange[1]}</span>
        </div>
      </div>

      <Separator />

      {/* Passengers */}
      {availableSeats.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Passengers</h4>
          <div className="flex flex-wrap gap-2">
            {availableSeats.map((count) => (
              <button
                key={count}
                onClick={() => togglePassengers(count)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
                  filters.passengers.includes(count)
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-border hover:border-foreground/40"
                )}
              >
                {count >= 7 ? "7+" : count}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      {hasActiveFilters(filters, defaults) && (
        <>
          <Separator />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onChange(defaults)}
          >
            <X className="w-4 h-4 mr-2" />
            Clear All Filters
          </Button>
        </>
      )}
    </div>
  );
}

/** Desktop sidebar filter panel */
export function BrowseFilterSidebar(props: BrowseFiltersProps & { resultCount: number }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", props.className)}>
      <FilterContent {...props} />
    </div>
  );
}

/** Mobile filter sheet (triggered by button) */
export function BrowseFilterMobile(props: BrowseFiltersProps & { resultCount: number }) {
  const [open, setOpen] = useState(false);
  const defaults = getDefaultFilters(props.categories);
  const active = hasActiveFilters(props.filters, defaults);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {active && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <FilterContent {...props} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
