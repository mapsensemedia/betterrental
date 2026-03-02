import { Link } from "react-router-dom";
import { MapPin, Clock, Navigation, ArrowRight, Phone, Mail } from "lucide-react";
import { useLocations, type Location } from "@/hooks/use-locations";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LocationsSectionProps {
  className?: string;
}

const LOCATION_MAPS_LINKS: Record<string, string> = {
  "Abbotsford Centre": "https://maps.app.goo.gl/LC1Ua6q2XxcMw2TA9",
  "Langley Centre": "https://maps.app.goo.gl/ToULonCLvQ8Me9Yi7",
  "Surrey Newton": "https://maps.app.goo.gl/LhWcpkRffqz335hH8"
};

function getEmbedUrl(location: Location): string {
  if (location.lat && location.lng) {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.01},${location.lat - 0.008},${location.lng + 0.01},${location.lat + 0.008}&layer=mapnik&marker=${location.lat},${location.lng}`;
  }
  return "https://www.openstreetmap.org/export/embed.html?bbox=-122.85,49.12,-122.83,49.14&layer=mapnik&marker=49.130,-122.840";
}

function formatHoursLines(hoursJson: Record<string, string> | null): { line1: string; line2: string } {
  if (!hoursJson) return { line1: "Hours not available", line2: "" };
  const weekday = hoursJson.mon || hoursJson.tue || hoursJson.wed;
  const sun = hoursJson.sun;
  return {
    line1: weekday ? `Mon – Sat: ${weekday}` : "Hours not available",
    line2: sun ? `Sun: ${sun}` : "",
  };
}

function LocationCard({ location }: { location: Location }) {
  const handleGetDirections = () => {
    const specificLink = LOCATION_MAPS_LINKS[location.name];
    const url = specificLink || (
      location.lat && location.lng
        ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`
    );
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const hours = formatHoursLines(location.hoursJson);
  const embedUrl = getEmbedUrl(location);
  const contactInfo = location.phone || location.email;

  return (
    <div className="bg-card rounded-xl shadow-md border border-border/50 overflow-hidden">
      <div className="grid md:grid-cols-2 gap-0">
        {/* Left - Map */}
        <div className="h-64 md:h-auto md:min-h-[380px] relative">
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            loading="lazy"
            title={`Map of ${location.name}`}
            allowFullScreen
          />
        </div>

        {/* Right - Info */}
        <div className="p-6 md:p-8 flex flex-col gap-6">
          <div>
            <h3 className="text-2xl font-bold text-foreground tracking-tight mb-1">{location.name}</h3>
            <p className="text-sm text-muted-foreground">Feel free to visit us at our location</p>
          </div>

          {/* Contact */}
          {contactInfo && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                {location.phone ? <Phone className="w-4 h-4 text-primary" /> : <Mail className="w-4 h-4 text-primary" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Contact</p>
                <p className="text-sm text-muted-foreground">{contactInfo}</p>
              </div>
            </div>
          )}

          {/* Address */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Address</p>
              <p className="text-sm text-muted-foreground">{location.address}</p>
            </div>
          </div>

          {/* Hours */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Hours</p>
              <p className="text-sm text-muted-foreground">{hours.line1}</p>
              {hours.line2 && <p className="text-sm text-muted-foreground">{hours.line2}</p>}
            </div>
          </div>

          <div className="flex-1" />

          {/* Get Directions */}
          <button
            type="button"
            onClick={handleGetDirections}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[14px] text-sm font-semibold border-2 border-primary text-primary bg-transparent transition-all duration-200 hover:bg-primary hover:text-primary-foreground min-h-[44px]"
          >
            <Navigation className="w-4 h-4" />
            Get Directions
          </button>
        </div>
      </div>
    </div>
  );
}

export function LocationsSection({ className }: LocationsSectionProps) {
  const { data: locations, isLoading } = useLocations();

  return (
    <section className={cn("section-spacing bg-secondary/40", className)}>
      <div className="container-page">
        {/* Header */}
        <div className="mb-10 md:mb-14 text-center">
          <h2 className="heading-2 text-foreground mb-3">Our Locations</h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            Convenient locations across the Lower Mainland
          </p>
        </div>

        {isLoading ? (
          <div className="max-w-4xl mx-auto bg-card rounded-xl shadow-md border border-border/50 overflow-hidden">
            <div className="grid md:grid-cols-2">
              <Skeleton className="h-64 md:h-[380px] rounded-none" />
              <div className="p-8 space-y-6">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-11 w-full mt-4" />
              </div>
            </div>
          </div>
        ) : locations && locations.length > 0 ? (
          <div className="space-y-8 max-w-4xl mx-auto">
            {locations.map((location) => (
              <LocationCard key={location.id} location={location} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>No locations available at the moment.</p>
          </div>
        )}

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
