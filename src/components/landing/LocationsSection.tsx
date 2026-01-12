import { Link } from "react-router-dom";
import { MapPin, Clock, Navigation, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  "Surrey Centre": "https://maps.app.goo.gl/LhWcpkRffqz335hH8",
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

function LocationCard({ location }: { location: Location }) {
  const handleGetDirections = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Use specific Google Maps link if available, otherwise fallback to generated URL
    const specificLink = LOCATION_MAPS_LINKS[location.name];
    const url = specificLink || (
      location.lat && location.lng
        ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`
    );
    
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow animate-fade-in">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Map Pin Icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          
          {/* Location Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground mb-2">{location.name}</h3>
            
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">{location.address}</p>
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-xs">
                  {formatHours(location.hoursJson)}
                </span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              type="button"
              className="mt-4"
              onClick={handleGetDirections}
              onTouchEnd={handleGetDirections}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Get Directions
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LocationsSection({ className }: LocationsSectionProps) {
  const { data: locations, isLoading } = useLocations();

  return (
    <section className={cn("section-spacing bg-muted/50", className)}>
      <div className="container-page">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="heading-2 text-foreground mb-3">Our Locations</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Visit any of our convenient locations across the Lower Mainland, or let us bring the car to you
          </p>
        </div>

        {/* Location Cards Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-9 w-32 mt-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : locations && locations.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location) => (
              <LocationCard key={location.id} location={location} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No locations available at the moment.</p>
          </div>
        )}

        {/* View All Link */}
        {locations && locations.length > 0 && (
          <div className="text-center mt-8">
            <Button asChild>
              <Link to="/locations">
                View All Locations
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
