/**
 * Browse Categories Page
 * Shows available categories (only those with available VINs at selected location)
 * Customer never sees VIN or plate numbers
 */
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Grid, List, ArrowUpDown, Car, MapPin, Users, Fuel, Settings2 } from "lucide-react";
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
import { SearchModifyBar } from "@/components/search/SearchModifyBar";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { TripContextPrompt } from "@/components/shared/TripContextPrompt";
import { BookingStepper } from "@/components/shared/BookingStepper";
import { trackPageView, funnelEvents } from "@/lib/analytics";

type SortOption = "recommended" | "price-low" | "price-high";

export default function Search() {
  const navigate = useNavigate();
  const { 
    searchData, 
    isSearchValid,
    setSelectedVehicle,
  } = useRentalBooking();
  
  const contextLocationId = searchData.pickupLocationId;
  const startDate = searchData.pickupDate;
  const endDate = searchData.returnDate;

  // Use category-based system - show all categories if no location, or available at location
  const { data: locationCategories = [], isLoading: loadingLocation } = useAvailableCategories(contextLocationId);
  const { data: allCategories = [], isLoading: loadingAll } = useFleetCategories();
  
  // Show location-specific categories if location selected, otherwise show all active categories
  const categories = contextLocationId ? locationCategories : allCategories.filter(c => c.is_active);
  const isLoading = contextLocationId ? loadingLocation : loadingAll;
  const hasValidContext = !!contextLocationId;

  const [showContextPrompt, setShowContextPrompt] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Track page view
  useEffect(() => {
    trackPageView("Browse Vehicles");
    funnelEvents.searchPerformed({
      location_id: contextLocationId || undefined,
      has_dates: !!startDate && !!endDate,
    });
  }, []);

  // Calculate rental days
  const rentalDays = useMemo(() => {
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }
    return 1;
  }, [startDate, endDate]);

  // Sort categories
  const sortedCategories = useMemo(() => {
    let result = [...categories];
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.daily_rate - b.daily_rate);
        break;
      case "price-high":
        result.sort((a, b) => b.daily_rate - a.daily_rate);
        break;
      default:
        // Recommended: by sort_order then price
        result.sort((a, b) => {
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.daily_rate - b.daily_rate;
        });
    }
    return result;
  }, [categories, sortBy]);

  const handleCategorySelect = (category: FleetCategory) => {
    // Store category ID and navigate to protection step
    setSelectedVehicle(category.id);
    
    // Build URL params for protection step
    const params = new URLSearchParams();
    params.set("categoryId", category.id);
    if (startDate) params.set("startAt", startDate.toISOString());
    if (endDate) params.set("endAt", endDate.toISOString());
    if (contextLocationId) params.set("locationId", contextLocationId);
    
    navigate(`/protection?${params.toString()}`);
  };

  return (
    <CustomerLayout>
      {/* Step Progress */}
      <div className="bg-background border-b border-border py-4">
        <div className="container mx-auto px-4">
          <BookingStepper currentStep={2} />
        </div>
      </div>

      {/* Search Modify Bar */}
      {isSearchValid && <SearchModifyBar />}

      <PageContainer className="pt-8 pb-16">
        <TripContextPrompt open={showContextPrompt} onOpenChange={setShowContextPrompt} />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="heading-2 mb-2">
              {hasValidContext ? "Available Categories" : "Browse Vehicles"}
            </h1>
            <p className="text-muted-foreground">
              {isLoading
                ? "Loading..."
                : `${sortedCategories.length} categories available`}
              {startDate && endDate && (
                <span className="ml-2">
                  • {rentalDays} day{rentalDays > 1 ? "s" : ""} rental
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[140px] sm:w-[180px]">
                <ArrowUpDown className="w-4 h-4 mr-1 sm:mr-2" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="hidden md:flex border border-border rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-primary text-primary-foreground" : ""}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl border border-border overflow-hidden">
                <Skeleton className="h-48" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedCategories.length > 0 ? (
          // Category-based display - always show categories with images
          <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
            {sortedCategories.map((category) => (
              <Card 
                key={category.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => hasValidContext ? handleCategorySelect(category) : setShowContextPrompt(true)}
              >
                {/* Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Car className="w-12 h-12" />
                    </div>
                  )}
                  {hasValidContext && category.available_count && category.available_count > 0 && (
                    <Badge variant="secondary" className="absolute top-3 right-3 bg-primary/90 text-primary-foreground">
                      {category.available_count} available
                    </Badge>
                  )}
                  {!hasValidContext && (
                    <Badge variant="outline" className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm">
                      Select Location
                    </Badge>
                  )}
                </div>

                <CardContent className="p-4 sm:p-5">
                  {/* Title */}
                  <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-1">{category.name}</h3>

                  {/* Specs - Customer sees these, never VIN/plate */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{category.seats || 5}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <Fuel className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{category.fuel_type || 'Gas'}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{category.transmission === 'Automatic' ? 'Auto' : category.transmission}</span>
                    </div>
                  </div>

                  {/* Price and CTA */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xl sm:text-2xl font-bold text-primary">${category.daily_rate}</span>
                      <span className="text-xs sm:text-sm text-muted-foreground">/day</span>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">*Excludes taxes & fees</p>
                    </div>
                    <Button size="sm" className="shrink-0">
                      {hasValidContext ? 'Rent Now' : 'Select'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No vehicles available</p>
            <p className="text-muted-foreground mb-6">
              {hasValidContext 
                ? "No vehicles are currently available at this location for the selected dates."
                : "Select a pickup location and dates to view available vehicles."}
            </p>
            <Button variant="outline" onClick={() => setShowContextPrompt(true)}>
              {hasValidContext ? 'Try Different Dates' : 'Select Location & Dates'}
            </Button>
          </div>
        )}
      </PageContainer>
    </CustomerLayout>
  );
}
