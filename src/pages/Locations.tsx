import { MapPin, Phone, Mail, Clock, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { useLocations } from "@/hooks/use-locations";
import { Skeleton } from "@/components/ui/skeleton";

export default function Locations() {
  const { data: locations = [], isLoading, error } = useLocations();

  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-16">
        <SectionHeader 
          title="Our Locations" 
          className="mb-8"
        />
        
        {isLoading ? (
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((loc) => (
              <Link
                key={loc.id}
                to={`/location/${loc.id}`}
                className="group p-6 bg-card rounded-2xl border border-border hover:border-primary hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                
                <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                  {loc.name}
                </h3>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {loc.address}, {loc.city}
                </p>

                <div className="space-y-2 text-sm text-muted-foreground">
                  {loc.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{loc.phone}</span>
                    </div>
                  )}
                  {loc.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{loc.email}</span>
                    </div>
                  )}
                </div>

                {/* Mini map preview placeholder */}
                <div className="mt-4 h-24 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden">
                  {loc.lat && loc.lng ? (
                    <img
                      src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${loc.lng},${loc.lat},13,0/300x150?access_token=pk.eyJ1IjoibG92YWJsZS1kZW1vIiwiYSI6ImNtNWlxcTFuZjAwZGIyanB0OGVlcGhsMWMifQ.fake`}
                      alt="Map preview"
                      className="w-full h-full object-cover opacity-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className="absolute flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs">View on map</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>
    </CustomerLayout>
  );
}
