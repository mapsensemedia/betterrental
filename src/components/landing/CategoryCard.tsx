import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  name: string;
  slug: string;
  imageUrl?: string;
  vehicleCount?: number;
  className?: string;
}

export function CategoryCard({
  name,
  slug,
  imageUrl,
  vehicleCount,
  className,
}: CategoryCardProps) {
  return (
    <Link
      to={`/search?category=${slug}`}
      className={cn(
        "group relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted",
        className
      )}
    >
      {/* Background Image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 p-5 flex flex-col justify-between">
        {/* Title */}
        <h3 className="text-xl font-semibold text-card">
          {name}
        </h3>

        {/* Arrow Button */}
        <div className="flex justify-end">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
            <ArrowUpRight className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>
      </div>

      {/* Vehicle Count */}
      {vehicleCount !== undefined && (
        <div className="absolute bottom-5 left-5 text-sm text-card/80">
          {vehicleCount} vehicles
        </div>
      )}
    </Link>
  );
}
