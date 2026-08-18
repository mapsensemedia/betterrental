/**
 * Browse Categories Page
 * Shows available categories (only those with available VINs at selected location)
 * Customer never sees VIN or plate numbers
 */
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Grid, List, ArrowUpDown, Car, Users, Fuel, Settings2 } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAvailableCategories, useFleetCategories, type FleetCategory } from "@/hooks/use-fleet-categories";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AVAILABILITY_MESSAGES } from "@/lib/availability-check";
import { SEO } from "@/components/shared/SEO";
import { SearchModifyBar } from "@/components/search/SearchModifyBar";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { TripContextPrompt } from "@/components/shared/TripContextPrompt";
import { BookingStepper } from "@/components/shared/BookingStepper";
import { trackPageView, funnelEvents } from "@/lib/analytics";
import {
  BrowseFilterSidebar,
  BrowseFilterMobile,
  applyFilters,
  getDefaultFilters,
  type BrowseFilterState,
} from "@/components/search/BrowseFilters";

type SortOption = "recommended" | "price-low" | "price-high";

export default function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    searchData, 
    isSearchValid,
    canProceedToSelectCar,
    clearSearch,
    setSelectedVehicle,
    setSelectedAddOns,
    setAdditionalDrivers,
    setPickupDateTime,
    setReturnDateTime,
    setPickupLocation,
    rentalDays,
  } = useRentalBooking();
  
  // SEO tags (title, description, canonical, noindex) live in the <SEO>
  // component below. The /search page is a dynamic result view — noindex
  // prevents it from competing with the city landing pages.


  // When arriving from homepage fleet section, clear previous search state
  // so Browse Cars loads with no prefilled location/dates (Sixt-like behavior)
  useEffect(() => {
    if (searchParams.get("from") === "fleet") {
      clearSearch();
      // Remove the param from URL to avoid re-clearing on subsequent renders
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("from");
      setSearchParams(newParams, { replace: true });
      return; // Skip hydration below since we just cleared
    }

    // Hydrate context from URL params if context is empty (safety net for landing page → search)
    const urlLocationId = searchParams.get("locationId");
    const urlStartAt = searchParams.get("startAt");
    const urlEndAt = searchParams.get("endAt");

    if (urlLocationId && !searchData.pickupLocationId) {
      setPickupLocation(urlLocationId);
    }
    if (urlStartAt && !searchData.pickupDate) {
      const startDate = new Date(urlStartAt);
      if (!isNaN(startDate.getTime())) {
        const time = `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`;
        setPickupDateTime(startDate, time);
      }
    }
    if (urlEndAt && !searchData.returnDate) {
      const endDate = new Date(urlEndAt);
      if (!isNaN(endDate.getTime())) {
        const time = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
        setReturnDateTime(endDate, time);
      }
    }
    
    // Clear stale add-ons/drivers on page mount
    setSelectedAddOns([]);
    setAdditionalDrivers([]);
  }, []); // Run once on mount
  
  const contextLocationId = searchData.pickupLocationId;
  const startDate = searchData.pickupDate;
  const endDate = searchData.returnDate;
  const ageConfirmed = searchData.ageConfirmed;

  // Backend is the single source of truth for availability (location + exact window)
  const hasWindow = !!contextLocationId && !!startDate && !!endDate;
  const { data: locationCategories = [], isLoading: loadingLocation } = useAvailableCategories(
    contextLocationId,
    startDate,
    endDate,
  );
  const { data: allCategories = [], isLoading: loadingAll } = useFleetCategories();

  // Overbooking is allowed: show every class offered at the location. The
  // backend counts are informational only (shown as "available" badges).
  const categories = hasWindow
    ? locationCategories
    : allCategories.filter(c => c.is_active);
  const isLoading = hasWindow ? loadingLocation : loadingAll;
  const hasValidContext = hasWindow;

  const queryClient = useQueryClient();
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [showContextPrompt, setShowContextPrompt] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filters - reset when categories change
  const [filters, setFilters] = useState<BrowseFilterState>(() => getDefaultFilters(categories));
  
  // Reset filters when categories data changes (e.g. location switch)
  useEffect(() => {
    if (!isLoading && categories.length > 0) {
      setFilters(getDefaultFilters(categories));
    }
  }, [isLoading, categories.length]);

  // Track page view
  useEffect(() => {
    trackPageView("Browse Vehicles");
    funnelEvents.searchPerformed({
      location_id: contextLocationId || undefined,
      has_dates: !!startDate && !!endDate,
    });
  }, []);

  // rentalDays comes from context (already accounts for pickup/return time)

  // Apply filters then sort
  const filteredAndSorted = useMemo(() => {
    const filtered = applyFilters(categories, filters);
    let result = [...filtered];
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.daily_rate - b.daily_rate);
        break;
      case "price-high":
        result.sort((a, b) => b.daily_rate - a.daily_rate);
        break;
      default:
        result.sort((a, b) => {
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.daily_rate - b.daily_rate;
        });
    }
    return result;
  }, [categories, filters, sortBy]);

  const handleCategorySelect = async (category: FleetCategory) => {
    // If age not confirmed, prompt for it
    if (!ageConfirmed) {
      setShowContextPrompt(true);
      return;
    }

    if (!contextLocationId || !startDate || !endDate) {
      toast.error(AVAILABILITY_MESSAGES.NO_LOCATION);
      setShowContextPrompt(true);
      return;
    }

    // Category-level bookings are never blocked (overbooking is allowed).


    // Track vehicle viewed event
    funnelEvents.vehicleViewed(category.id, category.name, category.name);

    // Store category ID and clear stale add-ons/drivers from any previous session
    setSelectedVehicle(category.id);
    setSelectedAddOns([]);
    setAdditionalDrivers([]);

    // Build URL params for protection step
    const params = new URLSearchParams();
    params.set("categoryId", category.id);
    params.set("startAt", startDate.toISOString());
    params.set("endAt", endDate.toISOString());
    params.set("locationId", contextLocationId);

    navigate(`/protection?${params.toString()}`);
  };

  return (
    <CustomerLayout>
      <SEO
        title="Browse Cars | C2C Rental BC"
        description="Browse available rental cars from C2C Rental in Surrey, Langley, and Abbotsford BC. Compare economy cars, SUVs, and minivans by date."
        path="/search"
        noindex
      />
      {/* Step Progress */}
      <div className="bg-background border-b border-border py-4">
        <div className="container mx-auto px-4">
          <BookingStepper currentStep={2} />
        </div>
      </div>

      {/* Search Modify Bar */}
      {isSearchValid && <SearchModifyBar />}

      <TripContextPrompt open={showContextPrompt} onOpenChange={setShowContextPrompt} />

      {/* Page header — compact full-bleed band */}
      <section className="page-band">
        <div className="container-corp">
          <span className="eyebrow">Vehicle Classes</span>
          <h1 className="heading-2 text-foreground">
            {hasValidContext ? "Available Categories" : "Browse Vehicles"}
          </h1>
          <p className="mt-3 text-[16px] text-muted-foreground max-w-[65ch]">
            {isLoading
              ? "Loading..."
              : `${filteredAndSorted.length} categories available`}
            {startDate && endDate && (
              <span className="ml-2">
                • {rentalDays} day{rentalDays > 1 ? "s" : ""} rental
              </span>
            )}
          </p>
        </div>
      </section>

      {/* Slim sticky control bar */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container-corp py-3 flex items-center justify-end gap-2 sm:gap-3 flex-wrap">
          {/* Mobile Filters */}
          <div className="lg:hidden">
            <BrowseFilterMobile
              categories={categories}
              filters={filters}
              onChange={setFilters}
              resultCount={filteredAndSorted.length}
            />
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[150px] sm:w-[190px] h-10 rounded-none border-border">
              <ArrowUpDown className="w-4 h-4 mr-1 sm:mr-2" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="hidden md:flex border border-border">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 border-l border-border transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="container-corp pt-10 pb-16 lg:pb-24">
        {/* Main content: sidebar + grid */}
        <div className="flex gap-8">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block w-[260px] shrink-0">
            <div className="sticky top-32">
              <BrowseFilterSidebar
                categories={categories}
                filters={filters}
                onChange={setFilters}
                resultCount={filteredAndSorted.length}
              />
            </div>
          </div>

          {/* Categories Grid */}
          <div className="flex-1 min-w-0">
            {/* Loading */}
            {isLoading ? (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="border border-border overflow-hidden">
                    <Skeleton className="h-48 rounded-none" />
                    <div className="p-5 space-y-3">
                      <Skeleton className="h-5 w-3/4 rounded-none" />
                      <Skeleton className="h-4 w-1/2 rounded-none" />
                      <Skeleton className="h-8 w-1/3 rounded-none" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAndSorted.length > 0 ? (
              <div className={`grid gap-6 items-stretch ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                {filteredAndSorted.map((category) => (
                  <div
                    key={category.id}
                    className="card-corp overflow-hidden cursor-pointer group flex flex-col h-full"
                    onClick={() => (hasValidContext && ageConfirmed) ? handleCategorySelect(category) : setShowContextPrompt(true)}
                  >
                    {/* Image — uniform aspect ratio across all cards */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Car className="w-12 h-12" />
                        </div>
                      )}
                      {hasValidContext && ageConfirmed && category.available_count && category.available_count > 0 && (
                        <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-[11px] font-semibold uppercase tracking-[0.12em] px-3 py-1.5">
                          {category.available_count} available
                        </span>
                      )}
                      {!hasValidContext && (
                        <span className="absolute top-0 right-0 bg-card text-foreground border-l border-b border-border text-[11px] font-semibold uppercase tracking-[0.12em] px-3 py-1.5">
                          Select Location
                        </span>
                      )}
                      {hasValidContext && !ageConfirmed && (
                        <span className="absolute top-0 right-0 bg-card text-foreground border-l border-b border-border text-[11px] font-semibold uppercase tracking-[0.12em] px-3 py-1.5">
                          Confirm Age
                        </span>
                      )}
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      {/* Category eyebrow + model name */}
                      <span className="eyebrow !mb-1.5">Category</span>
                      <h3 className="font-display font-semibold text-[17px] sm:text-xl leading-tight line-clamp-1">
                        {category.name}
                      </h3>

                      {/* Specs — icon chip row */}
                      <div className="flex flex-wrap items-center gap-2 mt-4">
                        <span className="chip-corp !py-1 !px-2.5 !text-[12px]">
                          <Users className="w-3.5 h-3.5" />
                          {category.seats || 5}
                        </span>
                        <span className="chip-corp !py-1 !px-2.5 !text-[12px]">
                          <Fuel className="w-3.5 h-3.5" />
                          {category.fuel_type || 'Gas'}
                        </span>
                        <span className="chip-corp !py-1 !px-2.5 !text-[12px]">
                          <Settings2 className="w-3.5 h-3.5" />
                          {category.transmission === 'Automatic' ? 'Auto' : category.transmission}
                        </span>
                      </div>

                      {/* Price */}
                      <div className="mt-5 pt-4 border-t border-border">
                        {rentalDays > 1 ? (
                          <>
                            <span className="font-display text-2xl font-semibold text-foreground">
                              ${(category.daily_rate * rentalDays).toFixed(2)}
                            </span>
                            <span className="text-sm text-muted-foreground ml-1.5">CAD total</span>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              ${category.daily_rate}/day
                            </p>
                          </>
                        ) : (
                          <>
                            <span className="font-display text-2xl font-semibold text-foreground">${category.daily_rate}</span>
                            <span className="text-sm text-muted-foreground">/day</span>
                          </>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">*Excludes taxes &amp; fees</p>
                      </div>

                      {/* CTA */}
                      <button type="button" className="btn-corp w-full mt-4 !py-3">
                        {(hasValidContext && ageConfirmed) ? 'Rent Now' : 'Select'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 px-6 bg-card border border-border">
                <Car className="w-10 h-10 text-muted-foreground mb-4" />
                <p className="font-display text-xl font-semibold mb-2">No vehicles match your filters</p>
                <p className="text-muted-foreground mb-6 max-w-[65ch]">
                  {hasActiveFiltersCheck(filters, getDefaultFilters(categories))
                    ? "Try adjusting your filters to see more results."
                    : hasValidContext 
                      ? "No vehicles are currently available at this location for the selected dates."
                      : "Select a pickup location and dates to view available vehicles."}
                </p>
                <button type="button" className="btn-corp" onClick={() => {
                  if (hasActiveFiltersCheck(filters, getDefaultFilters(categories))) {
                    setFilters(getDefaultFilters(categories));
                  } else {
                    setShowContextPrompt(true);
                  }
                }}>
                  {hasActiveFiltersCheck(filters, getDefaultFilters(categories)) ? 'Clear Filters' : hasValidContext ? 'Try Different Dates' : 'Select Location & Dates'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </CustomerLayout>
  );
}

/** Check if any filters are active */
function hasActiveFiltersCheck(filters: BrowseFilterState, defaults: BrowseFilterState): boolean {
  return (
    filters.vehicleTypes.length > 0 ||
    filters.passengers.length > 0 ||
    filters.automaticOnly ||
    filters.budgetRange[0] !== defaults.budgetRange[0] ||
    filters.budgetRange[1] !== defaults.budgetRange[1]
  );
}
