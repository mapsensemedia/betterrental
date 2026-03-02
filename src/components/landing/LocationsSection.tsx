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

// Static map thumbnail using coordinates
function getMapThumbnailUrl(location: Location): string {
  if (location.lat && location.lng) {
    return `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+197149(${location.lng},${location.lat})/${location.lng},${location.lat},14,0/400x200@2x?access_token=pk.eyJ1IjoibG92YWJsZS1tYXBzIiwiYSI6ImNtNnF6dzVjMjAwMnYya3B2OGVtcDludXIifQ.placeholder&logo=false`;
  }
  return "";
}

function formatHoursDetailed(hoursJson: Record<string, string> | null): { weekday: string; saturday: string; sunday: string } {
  if (!hoursJson) return { weekday: "Hours not available", saturday: "", sunday: "" };

  const weekdayHours = hoursJson.mon || hoursJson.tue || hoursJson.wed;
  const satHours = hoursJson.sat;
  const sunHours = hoursJson.sun;

  return {
    weekday: weekdayHours ? `Mon – Sat: ${weekdayHours}` : "Hours not available",
    saturday: "",
    sunday: sunHours ? `Sun: ${sunHours}` : "",
  };
}

function LocationCard({ location }: { location: Location }) {
  const handleGetDirections = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const specificLink = LOCATION_MAPS_LINKS[location.name];
    const url = specificLink || (
      location.lat && location.lng
        ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`
    );

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const hours = formatHoursDetailed(location.hoursJson);

  return (
    <Card className="overflow-hidden border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group flex flex-col">
      {/* Map visual header */}
      <div className="relative h-40 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: '20px 20px',
        }} />
        <div className="relative flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <MapPin className="w-7 h-7 text-primary" />
          </div>
          <span className="text-xs font-medium text-primary/60 tracking-wide uppercase">Visit Us</span>
        </div>
      </div>

      <CardContent className="p-6 flex flex-col flex-1 gap-5">
        {/* Name */}
        <h3 className="text-xl font-bold text-foreground tracking-tight leading-tight">{location.name}</h3>

        {/* Address */}
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">{location.address}</p>
        </div>

        {/* Hours */}
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground leading-relaxed space-y-0.5">
            <p>{hours.weekday}</p>
            {hours.sunday && <p>{hours.sunday}</p>}
          </div>
        </div>

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* Get Directions button */}
        <button
          type="button"
          onClick={handleGetDirections}
          onTouchEnd={handleGetDirections}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[14px] text-sm font-semibold border-2 border-primary text-primary bg-transparent transition-all duration-200 hover:bg-primary hover:text-primary-foreground min-h-[44px]"
        >
          <Navigation className="w-4 h-4" />
          Get Directions
        </button>
      </CardContent>
    </Card>
  );
}

export function LocationsSection({ className }: LocationsSectionProps) {
  const { data: locations, isLoading } = useLocations();
  const isSingleLocation = locations && locations.length === 1;

  return (
    <section className={cn("section-spacing bg-secondary/40", className)}>
      <div className="container-page">
        {/* Header - centered */}
        <div className="mb-10 md:mb-14 text-center">
          <h2 className="heading-2 text-foreground mb-3">Our Locations</h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            Convenient locations across the Lower Mainland
          </p>
        </div>

        {/* Location Cards Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border border-border w-full max-w-[400px]">
                <div className="h-40 bg-muted animate-pulse" />
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-11 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : locations && locations.length > 0 ? (
          <div className={cn(
            "grid gap-6",
            isSingleLocation
              ? "justify-items-center"
              : "md:grid-cols-2 lg:grid-cols-3 justify-items-center"
          )}>
            {locations.map((location) => (
              <div
                key={location.id}
                className={cn(
                  "w-full",
                  isSingleLocation ? "max-w-[400px]" : "max-w-[400px] md:max-w-none"
                )}
              >
                <LocationCard location={location} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>No locations available at the moment.</p>
          </div>
        )}

        {/* View All CTA - centered */}
        {locations && locations.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              to="/locations"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[14px] text-sm font-semibold transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              View All Locations
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
