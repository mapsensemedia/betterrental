import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Clock, ArrowLeft, Navigation } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "@/hooks/use-locations";
import { LocationsMap } from "@/components/shared/LocationsMap";

// Specific Google Maps links for each location
const LOCATION_MAPS_LINKS: Record<string, string> = {
  "Abbotsford Centre": "https://maps.app.goo.gl/LC1Ua6q2XxcMw2TA9",
  "Langley Centre": "https://maps.app.goo.gl/ToULonCLvQ8Me9Yi7",
  "Surrey Centre": "https://maps.app.goo.gl/LhWcpkRffqz335hH8",
};

export default function LocationDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: location, isLoading: locationLoading } = useLocation(id || null);
  

  useEffect(() => {
    if (location) {
      document.title = `Car Rental in ${location.city} | C2C Rental`;
    }
  }, [location]);

  if (locationLoading) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 pb-16">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid lg:grid-cols-2 gap-8">
            <Skeleton className="h-80 rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }

  if (!location) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 pb-16">
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Location Not Found</h2>
            <p className="text-muted-foreground mb-6">The location you're looking for doesn't exist.</p>
            <Button asChild>
              <Link to="/locations">View All Locations</Link>
            </Button>
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }

  const getDirectionsUrl = () => {
    // Use specific Google Maps link if available
    const specificLink = LOCATION_MAPS_LINKS[location.name];
    if (specificLink) return specificLink;
    
    if (location.lat && location.lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${location.address}, ${location.city}`
    )}`;
  };

  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-16">
        {/* Back Button */}
        <Link
          to="/locations"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Locations
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Map Section */}
          {location.lat && location.lng ? (
            <LocationsMap 
              locations={[{
                id: location.id,
                name: location.name,
                address: location.address,
                lat: location.lat,
                lng: location.lng,
              }]}
              className="h-80 lg:h-auto min-h-[320px]"
            />
          ) : (
            <div className="relative h-80 lg:h-auto min-h-[320px] rounded-2xl overflow-hidden bg-muted flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Map unavailable</p>
              </div>
            </div>
          )}

          {/* Location Details */}
          <div className="space-y-6">
            <div>
              <h1 className="heading-2 mb-2">{location.name}</h1>
              <p className="text-muted-foreground">{location.city}</p>
            </div>

            <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">{location.address}</p>
                </div>
              </div>

              {location.hoursJson && Object.keys(location.hoursJson).length > 0 && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium mb-2">Hours</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {Object.entries(location.hoursJson).map(([day, hours]) => (
                        <div key={day} className="flex justify-between gap-4">
                          <span className="capitalize">{day}</span>
                          <span>{hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button 
              className="w-full" 
              size="lg" 
              onClick={() => {
                const url = getDirectionsUrl();
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Get Directions
            </Button>
          </div>
        </div>

      </PageContainer>
    </CustomerLayout>
  );
}
