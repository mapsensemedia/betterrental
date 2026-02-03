/**
 * Memoized VehicleCard Component
 * 
 * PR7: Performance optimization - memoized to prevent unnecessary re-renders
 */
import { memo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Fuel, Users, Gauge, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, displayFuelType, displayTransmission } from "@/lib/utils";
import { PriceWithDisclaimer } from "@/components/shared/PriceWithDisclaimer";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { VehicleDetailsModal } from "./VehicleDetailsModal";
import { getBaggageCapacity } from "@/lib/pricing";

interface VehicleCardProps {
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
  isFeatured?: boolean;
  className?: string;
  variant?: "default" | "compact" | "dark";
}

export const VehicleCard = memo(function VehicleCard({
  id,
  make,
  model,
  year,
  category,
  dailyRate,
  imageUrl,
  seats = 5,
  fuelType,
  transmission,
  isFeatured = false,
  className,
  variant = "default",
}: VehicleCardProps) {
  const isDark = variant === "dark";
  const navigate = useNavigate();
  const { searchData, setSelectedVehicle, isSearchValid } = useRentalBooking();
  const [showModal, setShowModal] = useState(false);

  const handleRentNow = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If search is not valid, open the details modal
    if (!isSearchValid) {
      setShowModal(true);
      return;
    }

    // Set selected vehicle in context
    setSelectedVehicle(id);

    // Navigate to protection selection page
    // Build URL params from context
    const params = new URLSearchParams();
    params.set("vehicleId", id);
    if (searchData.pickupDate) params.set("startAt", searchData.pickupDate.toISOString());
    if (searchData.returnDate) params.set("endAt", searchData.returnDate.toISOString());
    if (searchData.pickupLocationId) params.set("locationId", searchData.pickupLocationId);

    navigate(`/protection?${params.toString()}`);
  }, [id, isSearchValid, navigate, searchData, setSelectedVehicle]);

  const handleModalChange = useCallback((open: boolean) => {
    setShowModal(open);
  }, []);

  const vehicleData = {
    id,
    make,
    model,
    year,
    category,
    dailyRate,
    imageUrl,
    seats,
    fuelType,
    transmission,
  };

  return (
    <>
      <div
        className={cn(
          "group rounded-xl md:rounded-2xl overflow-hidden transition-all duration-200 flex flex-col h-full",
          isDark
            ? "bg-foreground text-background"
            : "bg-card border border-border hover:shadow-lg hover:-translate-y-0.5",
          className
        )}
      >
        {/* Image Container */}
        <div className={cn(
          "relative aspect-[16/10] overflow-hidden shrink-0",
          isDark ? "bg-foreground" : "bg-muted"
        )}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${year} ${make} ${model}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Gauge className={cn("w-8 h-8 md:w-10 md:h-10 mx-auto mb-2", isDark ? "text-background/20" : "text-muted-foreground/30")} />
                <p className={cn("text-xs md:text-sm", isDark ? "text-background/40" : "text-muted-foreground")}>
                  {make} {model}
                </p>
              </div>
            </div>
          )}

          {/* Badges Container - Top Left */}
          <div className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-wrap gap-1.5 md:gap-2">
            {isFeatured && (
              <Badge variant="featured" className="text-[10px] md:text-xs px-1.5 py-0.5 md:px-2 md:py-1">Featured</Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] md:text-xs px-1.5 py-0.5 md:px-2 md:py-1",
                isDark 
                  ? "bg-background/10 text-background border-background/20" 
                  : "bg-card/90 backdrop-blur-sm"
              )}
            >
              {category}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 md:p-4 lg:p-5 flex flex-col flex-1">
          {/* Title & Year */}
          <div className="mb-2 md:mb-3">
            <h3 className={cn(
              "text-sm md:text-base lg:text-lg font-semibold leading-tight line-clamp-2",
              isDark ? "text-background" : "text-foreground"
            )}>
              {make} {model}
            </h3>
            <p className={cn(
              "text-xs md:text-sm mt-0.5",
              isDark ? "text-background/50" : "text-muted-foreground"
            )}>
              {year}
            </p>
          </div>

          {/* Specs - Responsive Grid */}
          <div className={cn(
            "grid grid-cols-4 gap-1.5 md:gap-2 lg:gap-3 mb-3 md:mb-4 pb-3 md:pb-4 border-b",
            isDark ? "border-background/10" : "border-border"
          )}>
            <div className={cn(
              "flex flex-col items-center text-center p-1.5 md:p-2 rounded-lg",
              isDark ? "bg-background/5" : "bg-muted/50"
            )}>
              <Users className={cn(
                "w-3 h-3 md:w-4 md:h-4 mb-0.5 md:mb-1",
                isDark ? "text-background/50" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-[10px] md:text-xs lg:text-sm font-medium",
                isDark ? "text-background/80" : "text-foreground"
              )}>
                {seats}
              </span>
              <span className={cn(
                "text-[9px] md:text-[10px] lg:text-xs",
                isDark ? "text-background/40" : "text-muted-foreground"
              )}>
                Seats
              </span>
            </div>
            <div className={cn(
              "flex flex-col items-center text-center p-1.5 md:p-2 rounded-lg",
              isDark ? "bg-background/5" : "bg-muted/50"
            )}>
              <Briefcase className={cn(
                "w-3 h-3 md:w-4 md:h-4 mb-0.5 md:mb-1",
                isDark ? "text-background/50" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-[10px] md:text-xs lg:text-sm font-medium",
                isDark ? "text-background/80" : "text-foreground"
              )}>
                {getBaggageCapacity(category)}
              </span>
              <span className={cn(
                "text-[9px] md:text-[10px] lg:text-xs",
                isDark ? "text-background/40" : "text-muted-foreground"
              )}>
                Bags
              </span>
            </div>
            <div className={cn(
              "flex flex-col items-center text-center p-1.5 md:p-2 rounded-lg",
              isDark ? "bg-background/5" : "bg-muted/50"
            )}>
              <Fuel className={cn(
                "w-3 h-3 md:w-4 md:h-4 mb-0.5 md:mb-1",
                isDark ? "text-background/50" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-[10px] md:text-xs lg:text-sm font-medium truncate w-full",
                isDark ? "text-background/80" : "text-foreground"
              )}>
                {displayFuelType(fuelType)}
              </span>
              <span className={cn(
                "text-[9px] md:text-[10px] lg:text-xs",
                isDark ? "text-background/40" : "text-muted-foreground"
              )}>
                Fuel
              </span>
            </div>
            <div className={cn(
              "flex flex-col items-center text-center p-1.5 md:p-2 rounded-lg",
              isDark ? "bg-background/5" : "bg-muted/50"
            )}>
              <Gauge className={cn(
                "w-3 h-3 md:w-4 md:h-4 mb-0.5 md:mb-1",
                isDark ? "text-background/50" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-[10px] md:text-xs lg:text-sm font-medium truncate w-full",
                isDark ? "text-background/80" : "text-foreground"
              )}>
                {displayTransmission(transmission) === "Automatic" ? "Auto" : displayTransmission(transmission)}
              </span>
              <span className={cn(
                "text-[9px] md:text-[10px] lg:text-xs",
                isDark ? "text-background/40" : "text-muted-foreground"
              )}>
                Trans.
              </span>
            </div>
          </div>

          {/* Price & CTA - Stacked on smaller screens */}
          <div className="mt-auto flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 md:gap-3">
            <PriceWithDisclaimer
              amount={dailyRate}
              suffix="/day"
              variant="card"
              showDisclaimer
              isDark={isDark}
            />
            <Button
              variant={isDark ? "secondary" : "default"}
              size="sm"
              className="w-full sm:w-auto shrink-0 text-xs md:text-sm h-8 md:h-9"
              onClick={handleRentNow}
            >
              Rent Now
            </Button>
          </div>
        </div>
      </div>

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal
        open={showModal}
        onOpenChange={handleModalChange}
        vehicle={vehicleData}
      />
    </>
  );
});
