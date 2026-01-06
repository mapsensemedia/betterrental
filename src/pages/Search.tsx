import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Filter, Grid, List, ArrowUpDown, Car, X } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { VehicleCard } from "@/components/landing/VehicleCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useVehicles, type Vehicle } from "@/hooks/use-vehicles";
import { useBookingContext } from "@/contexts/BookingContext";
import { SearchModifyBar } from "@/components/search/SearchModifyBar";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { TripContextPrompt } from "@/components/shared/TripContextPrompt";
import { BookingStepper } from "@/components/shared/BookingStepper";

const categories = ["All", "Sports", "Luxury", "SUV", "Electric", "Sedan"];
const transmissions = ["All", "Automatic", "Manual"];
const fuelTypes = ["All", "Petrol", "Electric", "Hybrid", "Diesel"];
const seatsOptions = [2, 4, 5, 7];

type SortOption = "recommended" | "price-low" | "price-high" | "newest";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: allVehicles = [], isLoading } = useVehicles();
  const { 
    locationId: contextLocationId, 
    setLocationId,
    startDate, 
    endDate,
    setStartDate,
    setEndDate 
  } = useBookingContext();
  const { searchData, isSearchValid } = useRentalBooking();

  // Show prompt if no trip context
  const [showContextPrompt, setShowContextPrompt] = useState(false);

  // Filter state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "All"
  );
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [selectedTransmission, setSelectedTransmission] = useState("All");
  const [selectedFuelType, setSelectedFuelType] = useState("All");
  const [minSeats, setMinSeats] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [compareList, setCompareList] = useState<string[]>([]);

  // Sync URL params with context on mount
  useEffect(() => {
    const startAtParam = searchParams.get("startAt");
    const endAtParam = searchParams.get("endAt");
    const locationIdParam = searchParams.get("locationId");

    if (startAtParam && !startDate) {
      setStartDate(new Date(startAtParam));
    }
    if (endAtParam && !endDate) {
      setEndDate(new Date(endAtParam));
    }
    if (locationIdParam && !contextLocationId) {
      setLocationId(locationIdParam);
    }
  }, []);

  // Use context values, fallback to URL params
  const locationId = contextLocationId || searchParams.get("locationId");

  // Calculate rental days from context
  const rentalDays = useMemo(() => {
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays || 1;
    }
    return 1;
  }, [startDate, endDate]);

  // Toggle compare
  const toggleCompare = useCallback((id: string) => {
    setCompareList((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
        ? [...prev, id]
        : prev
    );
  }, []);

  // Filter and sort vehicles
  const filteredVehicles = useMemo(() => {
    let result = allVehicles.filter((v) => {
      // Category filter
      if (selectedCategory !== "All" && v.category !== selectedCategory) {
        return false;
      }
      // Price filter
      if (v.dailyRate < priceRange[0] || v.dailyRate > priceRange[1]) {
        return false;
      }
      // Transmission filter
      if (
        selectedTransmission !== "All" &&
        v.transmission !== selectedTransmission
      ) {
        return false;
      }
      // Fuel type filter
      if (selectedFuelType !== "All" && v.fuelType !== selectedFuelType) {
        return false;
      }
      // Seats filter
      if (minSeats && (v.seats || 5) < minSeats) {
        return false;
      }
      // Location filter (if provided) - show vehicles with matching location OR no location assigned
      if (locationId && v.locationId && v.locationId !== locationId) {
        return false;
      }
      return true;
    });

    // Sort
    switch (sortBy) {
      case "price-low":
        result = [...result].sort((a, b) => a.dailyRate - b.dailyRate);
        break;
      case "price-high":
        result = [...result].sort((a, b) => b.dailyRate - a.dailyRate);
        break;
      case "newest":
        result = [...result].sort((a, b) => b.year - a.year);
        break;
      default:
        // Recommended: featured first, then by price
        result = [...result].sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return a.dailyRate - b.dailyRate;
        });
    }

    return result;
  }, [
    allVehicles,
    selectedCategory,
    priceRange,
    selectedTransmission,
    selectedFuelType,
    minSeats,
    locationId,
    sortBy,
  ]);

  const resetFilters = () => {
    setSelectedCategory("All");
    setPriceRange([0, 2000]);
    setSelectedTransmission("All");
    setSelectedFuelType("All");
    setMinSeats(null);
  };

  const activeFiltersCount = [
    selectedCategory !== "All",
    priceRange[0] > 0 || priceRange[1] < 2000,
    selectedTransmission !== "All",
    selectedFuelType !== "All",
    minSeats !== null,
  ].filter(Boolean).length;

  const hasContext = contextLocationId || startDate || endDate;

  return (
    <CustomerLayout>
      {/* Step Progress Indicator */}
      <div className="bg-background border-b border-border py-4">
        <div className="container mx-auto px-4">
          <BookingStepper currentStep={2} />
        </div>
      </div>

      {/* Search Modify Bar at top */}
      {isSearchValid && <SearchModifyBar />}

      <PageContainer className="pt-8 pb-16">
        {/* Trip Context Prompt */}
        <TripContextPrompt 
          open={showContextPrompt} 
          onOpenChange={setShowContextPrompt}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="heading-2 mb-2">Browse Vehicles</h1>
            <p className="text-muted-foreground">
              {isLoading
                ? "Loading..."
                : `${filteredVehicles.length} vehicles available`}
              {startDate && endDate && (
                <span className="ml-2">
                  • {rentalDays} day{rentalDays > 1 ? "s" : ""} rental
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Compare Button */}
            {compareList.length > 1 && (
              <Button variant="default" asChild>
                <Link to={`/compare?ids=${compareList.join(",")}`}>
                  Compare ({compareList.length})
                </Link>
              </Button>
            )}

            {/* Sort */}
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
            >
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="hidden md:flex border border-border rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground"
                    : ""
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : ""
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Filter */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden relative">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    selectedTransmission={selectedTransmission}
                    setSelectedTransmission={setSelectedTransmission}
                    selectedFuelType={selectedFuelType}
                    setSelectedFuelType={setSelectedFuelType}
                    minSeats={minSeats}
                    setMinSeats={setMinSeats}
                    onReset={resetFilters}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden md:block w-72 shrink-0">
            <div className="sticky top-28 space-y-6">
              <FilterContent
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                selectedTransmission={selectedTransmission}
                setSelectedTransmission={setSelectedTransmission}
                selectedFuelType={selectedFuelType}
                setSelectedFuelType={setSelectedFuelType}
                minSeats={minSeats}
                setMinSeats={setMinSeats}
                onReset={resetFilters}
              />
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            {/* Category Pills */}
            <div className="flex gap-2 flex-wrap mb-6">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Compare Selection Bar */}
            {compareList.length > 0 && (
              <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {compareList.length} vehicle{compareList.length > 1 ? "s" : ""} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCompareList([])}
                    className="h-8"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                </div>
                {compareList.length >= 2 && (
                  <Button size="sm" asChild>
                    <Link to={`/compare?ids=${compareList.join(",")}`}>
                      Compare Now
                    </Link>
                  </Button>
                )}
              </div>
            )}

            {/* Loading State */}
            {isLoading ? (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border overflow-hidden"
                  >
                    <Skeleton className="h-48" />
                    <div className="p-5 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-8 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredVehicles.length > 0 ? (
              <div
                className={`grid gap-6 ${
                  viewMode === "grid"
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1"
                }`}
              >
                {filteredVehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    id={vehicle.id}
                    make={vehicle.make}
                    model={vehicle.model}
                    year={vehicle.year}
                    category={vehicle.category}
                    dailyRate={vehicle.dailyRate}
                    imageUrl={vehicle.imageUrl || ""}
                    seats={vehicle.seats || 5}
                    fuelType={vehicle.fuelType || "Petrol"}
                    transmission={vehicle.transmission || "Automatic"}
                    isFeatured={vehicle.isFeatured || false}
                    showCompare
                    isCompareSelected={compareList.includes(vehicle.id)}
                    onCompareToggle={toggleCompare}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-card rounded-2xl border border-border">
                <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No vehicles found</p>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your filters to see more results
                </p>
                <Button variant="outline" onClick={resetFilters}>
                  Reset Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </CustomerLayout>
  );
}

interface FilterContentProps {
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  priceRange: number[];
  setPriceRange: (value: number[]) => void;
  selectedTransmission: string;
  setSelectedTransmission: (value: string) => void;
  selectedFuelType: string;
  setSelectedFuelType: (value: string) => void;
  minSeats: number | null;
  setMinSeats: (value: number | null) => void;
  onReset: () => void;
}

function FilterContent({
  selectedCategory,
  setSelectedCategory,
  priceRange,
  setPriceRange,
  selectedTransmission,
  setSelectedTransmission,
  selectedFuelType,
  setSelectedFuelType,
  minSeats,
  setMinSeats,
  onReset,
}: FilterContentProps) {
  return (
    <div className="space-y-6">
      {/* Price Range */}
      <div className="p-4 bg-card rounded-2xl border border-border">
        <h3 className="font-semibold mb-4">Price Range</h3>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={2000}
          min={0}
          step={50}
          className="mb-4"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>${priceRange[0]}/day</span>
          <span>${priceRange[1]}/day</span>
        </div>
      </div>

      {/* Transmission */}
      <div className="p-4 bg-card rounded-2xl border border-border">
        <h3 className="font-semibold mb-4">Transmission</h3>
        <div className="space-y-2">
          {transmissions.map((trans) => (
            <label
              key={trans}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={selectedTransmission === trans}
                onCheckedChange={() => setSelectedTransmission(trans)}
              />
              <span className="text-sm">{trans}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Fuel Type */}
      <div className="p-4 bg-card rounded-2xl border border-border">
        <h3 className="font-semibold mb-4">Fuel Type</h3>
        <div className="space-y-2">
          {fuelTypes.map((fuel) => (
            <label key={fuel} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedFuelType === fuel}
                onCheckedChange={() => setSelectedFuelType(fuel)}
              />
              <span className="text-sm">{fuel}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Seats */}
      <div className="p-4 bg-card rounded-2xl border border-border">
        <h3 className="font-semibold mb-4">Minimum Seats</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMinSeats(null)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              minSeats === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Any
          </button>
          {seatsOptions.map((seats) => (
            <button
              key={seats}
              onClick={() => setMinSeats(seats)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                minSeats === seats
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {seats}+
            </button>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <Button variant="outline" className="w-full" onClick={onReset}>
        Reset Filters
      </Button>
    </div>
  );
}
