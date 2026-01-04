import { Link } from "react-router-dom";
import { Fuel, Users, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
}: VehicleCardProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "group rounded-xl overflow-hidden transition-all duration-200",
        isDark
          ? "bg-foreground text-background"
          : "bg-card border border-border hover:shadow-card-hover hover:-translate-y-0.5",
        className
      )}
    >
      {/* Image Container */}
      <div className={cn(
        "relative aspect-[4/3] overflow-hidden",
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

        {/* Featured Badge */}
        {isFeatured && (
          <Badge variant="featured" className="absolute top-3 left-3">
            Featured
          </Badge>
        )}

        {/* Category Badge */}
        <Badge
          variant="outline"
          className={cn(
            "absolute top-3 right-3",
            isDark ? "bg-background/10 text-background border-background/20" : "bg-card/90 backdrop-blur-sm"
          )}
        >
          {category}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className={cn(
          "text-base font-semibold mb-0.5",
          isDark ? "text-background" : "text-foreground"
        )}>
          {make} {model}
        </h3>
        <p className={cn(
          "text-sm mb-3",
          isDark ? "text-background/50" : "text-muted-foreground"
        )}>
          {year}
        </p>

        {/* Specs */}
        <div className="flex gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Users className={cn("w-3.5 h-3.5", isDark ? "text-background/50" : "text-muted-foreground")} />
            <span className={cn(isDark ? "text-background/70" : "text-foreground")}>
              {seats}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Fuel className={cn("w-3.5 h-3.5", isDark ? "text-background/50" : "text-muted-foreground")} />
            <span className={cn(isDark ? "text-background/70" : "text-foreground")}>
              {fuelType}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge className={cn("w-3.5 h-3.5", isDark ? "text-background/50" : "text-muted-foreground")} />
            <span className={cn(isDark ? "text-background/70" : "text-foreground")}>
              {transmission}
            </span>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between">
          <div>
            <span className={cn(
              "text-xl font-bold",
              isDark ? "text-background" : "text-foreground"
            )}>
              ${dailyRate}
            </span>
            <span className={cn(
              "text-sm",
              isDark ? "text-background/50" : "text-muted-foreground"
            )}>
              /day
            </span>
          </div>
          <Button
            variant={isDark ? "secondary" : "default"}
            size="sm"
            asChild
          >
            <Link to={`/vehicle/${id}`}>View</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
