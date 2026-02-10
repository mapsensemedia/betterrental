import { useEffect } from "react";
import { MapPin, ChevronRight, Navigation } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { useLocations } from "@/hooks/use-locations";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LocationsMap } from "@/components/shared/LocationsMap";

// Specific Google Maps links for each location
const LOCATION_MAPS_LINKS: Record<string, string> = {
  "Abbotsford Centre": "https://maps.app.goo.gl/LC1Ua6q2XxcMw2TA9",
  "Langley Centre": "https://maps.app.goo.gl/ToULonCLvQ8Me9Yi7",
  "Surrey Newton": "https://maps.app.goo.gl/LhWcpkRffqz335hH8",
};

export default function Locations() {
  const { data: locations = [], isLoading, error } = useLocations();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Our Locations | C2C Rental – Surrey, Langley & Abbotsford";
  }, []);

  const handleGetDirections = (locationName: string, lat: number | null, lng: number | null, address: string, city: string) => {
    // Use specific Google Maps link if available, otherwise fallback to generated URL
    const specificLink = LOCATION_MAPS_LINKS[locationName];
    const url = specificLink || (
      lat && lng
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${address}, ${city}`)}`
    );
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleLocationClick = (locationId: string) => {
    navigate(`/location/${locationId}`);
  };

  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-16">
        <SectionHeader 
          title="Our Locations" 
          className="mb-8"
        />
        
        {isLoading ? (
          <>
            <Skeleton className="h-[400px] rounded-xl mb-8" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 bg-card rounded-2xl border border-border">
                  <Skeleton className="w-12 h-12 rounded-xl mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Unable to load locations. Please try again later.</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No locations available at the moment.</p>
          </div>
        ) : (
          <>
            {/* Interactive Map */}
            <LocationsMap 
              locations={locations.map(loc => ({
                id: loc.id,
                name: loc.name,
                address: loc.address,
                lat: loc.lat,
                lng: loc.lng,
              }))}
              onLocationClick={handleLocationClick}
              className="mb-8"
            />

            {/* Location Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="group p-6 bg-card rounded-2xl border border-border hover:border-primary hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <Link to={`/location/${loc.id}`}>
                      <ChevronRight className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                    </Link>
                  </div>
                  
                  <Link to={`/location/${loc.id}`}>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {loc.name}
                    </h3>
                  </Link>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    {loc.address}, {loc.city}
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleGetDirections(loc.name, loc.lat, loc.lng, loc.address, loc.city)}
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Get Directions
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </PageContainer>
    </CustomerLayout>
  );
}
