import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { RentalSearchCard } from "@/components/rental/RentalSearchCard";
import { VehicleCard } from "@/components/landing/VehicleCard";

import { SectionHeader } from "@/components/landing/SectionHeader";
import { WhyChooseSection } from "@/components/landing/WhyChooseSection";
import { CTABanner } from "@/components/landing/CTABanner";
import { LocationsSection } from "@/components/landing/LocationsSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useVehicles } from "@/hooks/use-vehicles";

// Images
import heroImage from "@/assets/hero-c2c.jpg";

const Index = () => {
  const { data: vehicles = [], isLoading } = useVehicles();
  
  // Get trending vehicles (featured first, then by price)
  const trendingVehicles = vehicles.slice(0, 4);

  return (
    <CustomerLayout>
      {/* Hero Section */}
      <section className="bg-background pt-16 pb-16">
        <div className="container-page">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="max-w-xl animate-slide-up">
              <h1 className="heading-1 text-foreground mb-6">
                C2C Rental
                <br />
                <span className="text-muted-foreground">Car Rental Made Simple</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Skip the hassle. Rent quality vehicles with transparent pricing,
                flexible pickup options, and 24/7 support. Your next adventure
                starts here.
              </p>
            </div>

            {/* Hero Image */}
            <div className="relative animate-fade-in animation-delay-200">
              <img
                src={heroImage}
                alt="Premium luxury car"
                className="w-full h-auto rounded-2xl shadow-card object-cover"
              />
            </div>
          </div>

          {/* Search Card */}
          <div className="mt-12 animate-scale-in animation-delay-300">
            <RentalSearchCard />
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <WhyChooseSection />

      {/* Trending Vehicles Section */}
      <section className="py-20 bg-muted">
        <div className="container-page">
          <SectionHeader
            title="Trending Vehicles"
            action={
              <Button variant="default" asChild>
                <Link to="/search">
                  View all
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            }
          />
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-card">
                  <Skeleton className="h-40 w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : trendingVehicles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {trendingVehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  id={vehicle.id}
                  make={vehicle.make}
                  model={vehicle.model}
                  year={vehicle.year}
                  category={vehicle.category}
                  dailyRate={vehicle.dailyRate}
                  imageUrl={vehicle.imageUrl || ""}
                  seats={vehicle.seats || 5}
                  fuelType={vehicle.fuelType}
                  transmission={vehicle.transmission}
                  isFeatured={vehicle.isFeatured || false}
                  className="animate-fade-in"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No vehicles available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <CTABanner />

      {/* Our Locations Section */}
      <LocationsSection />

    </CustomerLayout>
  );
};

export default Index;
