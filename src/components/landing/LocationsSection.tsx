import { Link } from "react-router-dom";
import { MapPin, Phone, Clock, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocations, type Location } from "@/hooks/use-locations";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LocationsSectionProps {
  className?: string;
}

function formatHours(hoursJson: Record<string, string> | null): string {
  if (!hoursJson) return "Hours not available";
  
  const weekdayHours = hoursJson.mon || hoursJson.tue || hoursJson.wed;
  const weekendHours = hoursJson.sat || hoursJson.sun;
  
  if (weekdayHours && weekendHours) {
    return `Mon-Fri: ${weekdayHours}, Sat-Sun: ${weekendHours}`;
  }
  return weekdayHours || weekendHours || "Hours not available";
}

function LocationCard({ location, isReversed }: { location: Location; isReversed?: boolean }) {
  const handleGetDirections = () => {
    if (location.lat && location.lng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`,
        "_blank"
      );
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`,
        "_blank"
      );
    }
  };

  const mapContent = (
    <div className="aspect-[4/3] lg:aspect-auto lg:h-full rounded-xl overflow-hidden bg-muted relative">
      {location.lat && location.lng ? (
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.01}%2C${location.lat - 0.008}%2C${location.lng + 0.01}%2C${location.lat + 0.008}&layer=mapnik&marker=${location.lat}%2C${location.lng}`}
          className="w-full h-full border-0"
          loading="lazy"
          title={`Map of ${location.name}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <MapPin className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
    </div>
  );

  const infoContent = (
    <div className="p-6 flex flex-col justify-center">
      <h3 className="text-xl font-semibold text-foreground mb-4">{location.name}</h3>
      
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span className="text-primary">{location.address}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
          <a href={`tel:${location.phone}`} className="text-muted-foreground hover:text-foreground">
            {location.phone}
          </a>
        </div>
        
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <span className="text-muted-foreground">
            {formatHours(location.hoursJson)}
          </span>
        </div>
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        className="mt-6 w-fit"
        onClick={handleGetDirections}
      >
        <Navigation className="w-4 h-4 mr-2" />
        Get Directions
      </Button>
    </div>
  );

  return (
    <Card className="overflow-hidden animate-fade-in">
      <CardContent className="p-0">
        <div className={cn(
          "grid lg:grid-cols-2 gap-0",
          isReversed && "lg:grid-flow-dense"
        )}>
          <div className={isReversed ? "lg:col-start-2" : ""}>
            {mapContent}
          </div>
          <div className={isReversed ? "lg:col-start-1" : ""}>
            {infoContent}
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
            Visit any of our convenient locations across the Lower Mainland
          </p>
        </div>

        {/* Location Cards */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-0">
                  <div className="grid lg:grid-cols-2 gap-0">
                    <Skeleton className="aspect-[4/3] lg:aspect-auto lg:h-[250px]" />
                    <div className="p-6 space-y-4">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-9 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : locations && locations.length > 0 ? (
          <div className="space-y-6">
            {locations.map((location, index) => (
              <LocationCard 
                key={location.id} 
                location={location} 
                isReversed={index % 2 === 1}
              />
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
            <Button asChild variant="outline">
              <Link to="/locations">View All Locations</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
