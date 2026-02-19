import { Link } from "react-router-dom";
import { MapPin, Clock, Navigation, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocations, type Location } from "@/hooks/use-locations";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";


interface LocationsSectionProps {
  className?: string;
}

// Specific Google Maps links for each location
const LOCATION_MAPS_LINKS: Record<string, string> = {
  "Abbotsford Centre": "https://maps.app.goo.gl/LC1Ua6q2XxcMw2TA9",
  "Langley Centre": "https://maps.app.goo.gl/ToULonCLvQ8Me9Yi7",
  "Surrey Newton": "https://maps.app.goo.gl/LhWcpkRffqz335hH8"
};

function formatHours(hoursJson: Record<string, string> | null): string {
  if (!hoursJson) return "Hours not available";

  const weekdayHours = hoursJson.mon || hoursJson.tue || hoursJson.wed;
  const weekendHours = hoursJson.sat || hoursJson.sun;

  if (weekdayHours && weekendHours) {
    return `Mon-Fri: ${weekdayHours}, Sat-Sun: ${weekendHours}`;
  }
  return weekdayHours || weekendHours || "Hours not available";
}

function LocationCard({ location }: {location: Location;}) {
  const handleGetDirections = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Use specific Google Maps link if available, otherwise fallback to generated URL
    const specificLink = LOCATION_MAPS_LINKS[location.name];
    const url = specificLink || (
    location.lat && location.lng ?
    `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}` :
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`);


    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="overflow-hidden border border-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-fade-in">
      <CardContent className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-5 h-5 text-primary" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1 leading-snug">{location.name}</h3>
            <p className="text-sm text-muted-foreground mb-2 leading-snug">{location.address}</p>
            <div className="flex items-start gap-1.5 mb-4">
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-xs text-muted-foreground leading-snug">
                {formatHours(location.hoursJson)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleGetDirections}
              onTouchEnd={handleGetDirections}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[14px] text-xs font-semibold border border-border bg-card text-foreground transition-all duration-200 hover:bg-secondary min-h-[36px]">

              <Navigation className="w-3.5 h-3.5" />
              Get Directions
            </button>
          </div>
        </div>
      </CardContent>
    </Card>);

}

export function LocationsSection({ className }: LocationsSectionProps) {
  const { data: locations, isLoading } = useLocations();

  return (
    <section className={cn("section-spacing bg-background", className)}>
      <div className="container-page">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h2 className="heading-2 text-foreground mb-2">Our Locations</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Convenient locations across the Lower Mainland
          </p>
        </div>

        {/* Location Cards Grid */}
        {isLoading ?
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) =>
          <Card key={i} className="border border-border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-9 w-32 mt-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
          )}
          </div> :
        locations && locations.length > 0 ?
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {locations.map((location) =>
          <LocationCard key={location.id} location={location} />
          )}
          </div> :

        <div className="text-center py-12 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>No locations available at the moment.</p>
          </div>
        }

        {/* View All CTA */}
        {locations && locations.length > 0 &&
        <div className="mt-8">
            <Link
            to="/locations"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[14px] text-sm font-semibold border border-border transition-all duration-200 bg-accent text-primary-foreground">

              View All Locations
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        }
      </div>
    </section>);

}