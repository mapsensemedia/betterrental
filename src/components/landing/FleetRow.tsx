import { Link } from "react-router-dom";
import { Car, Fuel, Settings2, Users, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFleetCategories, type FleetCategory } from "@/hooks/use-fleet-categories";

function FleetCard({ category }: { category: FleetCategory }) {
  return (
    <article className="card-corp w-[280px] sm:w-[320px] flex flex-col">
      <div className="relative aspect-[16/11] overflow-hidden bg-background flex items-center justify-center p-4">
        {category.image_url ? (
          <img
            src={category.image_url}
            alt={`${category.name} rental vehicle`}
            loading="lazy"
            className="w-full h-full object-contain"
            onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Car className="w-10 h-10" strokeWidth={1.25} />
          </div>
        )}
      </div>


      <div className="p-5 flex flex-col gap-4 flex-1">
        <h3 className="text-[17px] font-semibold text-foreground leading-snug line-clamp-1">
          {category.name}
        </h3>

        <div className="flex flex-wrap gap-2">
          <span className="chip-corp text-[12px]">
            <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
            {category.seats || 5}
          </span>
          <span className="chip-corp text-[12px]">
            <Settings2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            {category.transmission === "Manual" ? "Manual" : "Auto"}
          </span>
          <span className="chip-corp text-[12px]">
            <Fuel className="w-3.5 h-3.5" strokeWidth={1.5} />
            {category.fuel_type || "Gas"}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-2 hairline">
          <div className="pt-4">
            <span className="text-[22px] font-semibold text-foreground font-display">
              ${category.daily_rate}
            </span>
            <span className="text-[13px] text-muted-foreground"> /day</span>
          </div>
          <Link to="/search?from=fleet" className="btn-corp mt-4 px-5 py-3 text-[12px]">
            Book
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * Horizontal-scroll fleet row that bleeds past the right viewport edge.
 */
export function FleetRow() {
  const { data: categories = [], isLoading } = useFleetCategories();
  const display = categories.filter((c) => c.is_active).slice(0, 8);

  return (
    <section className="section-pad bg-background" aria-labelledby="fleet-heading">
      <div className="container-corp">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-14">
          <div>
            <span className="eyebrow">Our Fleet</span>
            <h2 id="fleet-heading" className="heading-2 text-foreground">
              Vehicles for Every Journey
            </h2>
          </div>
          <Link to="/search?from=fleet" className="btn-corp-outline self-start md:self-auto">
            View all vehicles
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Row bleeds past the right edge to signal horizontal scroll */}
      <div className="pl-5 lg:pl-10 xl:pl-[max(2.5rem,calc((100vw-1440px)/2+2.5rem))]">
        {isLoading ? (
          <div className="scroll-row">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card-corp w-[280px] sm:w-[320px]">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4 rounded-none" />
                  <Skeleton className="h-4 w-1/2 rounded-none" />
                  <Skeleton className="h-9 w-2/3 rounded-none" />
                </div>
              </div>
            ))}
          </div>
        ) : display.length > 0 ? (
          <div className="scroll-row pr-5">
            {display.map((category) => (
              <FleetCard key={category.id} category={category} />
            ))}
          </div>
        ) : (
          <div className="container-corp text-muted-foreground">
            <p>No vehicles available at the moment.</p>
          </div>
        )}
      </div>
    </section>
  );
}
