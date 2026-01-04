import { Link } from "react-router-dom";
import { Fuel, Users, Gauge, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PriceWithDisclaimer } from "@/components/shared/PriceWithDisclaimer";

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
  isCompareSelected?: boolean;
  onCompareToggle?: (id: string) => void;
  showCompare?: boolean;
}

export function VehicleCard({
  id,
  make,
  model,
  year,
  category,
  dailyRate,
  imageUrl,
  seats = 5,
  fuelType = "Petrol",
  transmission = "Automatic",
  isFeatured = false,
  className,
  variant = "default",
  isCompareSelected = false,
  onCompareToggle,
  showCompare = false,
}: VehicleCardProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "group rounded-2xl overflow-hidden transition-all duration-200 flex flex-col",
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
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Gauge className={cn("w-10 h-10 mx-auto mb-2", isDark ? "text-background/20" : "text-muted-foreground/30")} />
              <p className={cn("text-sm", isDark ? "text-background/40" : "text-muted-foreground")}>
                {make} {model}
              </p>
            </div>
          </div>
        )}

        {/* Badges Container - Top Left */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {isFeatured && (
            <Badge variant="featured">Featured</Badge>
          )}
          <Badge
            variant="outline"
            className={cn(
              isDark 
                ? "bg-background/10 text-background border-background/20" 
                : "bg-card/90 backdrop-blur-sm"
            )}
          >
            {category}
          </Badge>
        </div>

        {/* Compare Button - Top Right (always visible when showCompare is true) */}
        {showCompare && onCompareToggle && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCompareToggle(id);
            }}
            className={cn(
              "absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all",
              isCompareSelected
                ? "bg-primary text-primary-foreground"
                : "bg-card/90 backdrop-blur-sm text-foreground border border-border/50 hover:bg-card"
            )}
            title={isCompareSelected ? "Remove from compare" : "Add to compare"}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isCompareSelected ? "Selected" : "Compare"}
            </span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        {/* Title & Year */}
        <div className="mb-3">
          <h3 className={cn(
            "text-base sm:text-lg font-semibold leading-tight",
            isDark ? "text-background" : "text-foreground"
          )}>
            {make} {model}
          </h3>
          <p className={cn(
            "text-sm mt-0.5",
            isDark ? "text-background/50" : "text-muted-foreground"
          )}>
            {year}
          </p>
        </div>

        {/* Specs - Responsive Grid */}
        <div className={cn(
          "grid grid-cols-3 gap-2 sm:gap-3 mb-4 pb-4 border-b",
          isDark ? "border-background/10" : "border-border"
        )}>
          <div className={cn(
            "flex flex-col items-center text-center p-2 rounded-lg",
            isDark ? "bg-background/5" : "bg-muted/50"
          )}>
            <Users className={cn(
              "w-4 h-4 mb-1",
              isDark ? "text-background/50" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-xs sm:text-sm font-medium",
              isDark ? "text-background/80" : "text-foreground"
            )}>
              {seats}
            </span>
            <span className={cn(
              "text-[10px] sm:text-xs",
              isDark ? "text-background/40" : "text-muted-foreground"
            )}>
              Seats
            </span>
          </div>
          <div className={cn(
            "flex flex-col items-center text-center p-2 rounded-lg",
            isDark ? "bg-background/5" : "bg-muted/50"
          )}>
            <Fuel className={cn(
              "w-4 h-4 mb-1",
              isDark ? "text-background/50" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-xs sm:text-sm font-medium truncate w-full",
              isDark ? "text-background/80" : "text-foreground"
            )}>
              {fuelType}
            </span>
            <span className={cn(
              "text-[10px] sm:text-xs",
              isDark ? "text-background/40" : "text-muted-foreground"
            )}>
              Fuel
            </span>
          </div>
          <div className={cn(
            "flex flex-col items-center text-center p-2 rounded-lg",
            isDark ? "bg-background/5" : "bg-muted/50"
          )}>
            <Gauge className={cn(
              "w-4 h-4 mb-1",
              isDark ? "text-background/50" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-xs sm:text-sm font-medium truncate w-full",
              isDark ? "text-background/80" : "text-foreground"
            )}>
              {transmission === "Automatic" ? "Auto" : transmission}
            </span>
            <span className={cn(
              "text-[10px] sm:text-xs",
              isDark ? "text-background/40" : "text-muted-foreground"
            )}>
              Trans.
            </span>
          </div>
        </div>

        {/* Price & CTA - Stacked on smaller screens */}
        <div className="mt-auto flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
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
            className="w-full sm:w-auto shrink-0"
            asChild
          >
            <Link to={`/vehicle/${id}`}>View Details</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
