import { Link } from "react-router-dom";
import { ArrowRight, Users, Fuel, Settings2, Car } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { RentalSearchCard } from "@/components/rental/RentalSearchCard";
import { CategoryCard } from "@/components/landing/CategoryCard";

import { SectionHeader } from "@/components/landing/SectionHeader";
import { WhyChooseSection } from "@/components/landing/WhyChooseSection";
import { CTABanner } from "@/components/landing/CTABanner";
import { LocationsSection } from "@/components/landing/LocationsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFleetCategories, type FleetCategory } from "@/hooks/use-fleet-categories";

// Images
import heroImage from "@/assets/hero-c2c.jpg";

// Category display card for homepage
function CategoryDisplayCard({ category }: { category: FleetCategory }) {
  return (
    <Link to="/search" className="block">
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group h-full">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {category.image_url ? (
            <img
              src={category.image_url}
              alt={category.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => e.currentTarget.src = '/placeholder.svg'}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Car className="w-12 h-12" />
            </div>
          )}
        </div>

        <CardContent className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-base mb-2 line-clamp-1">{category.name}</h3>

          {/* Specs */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{category.seats || 5}</span>
            </div>
            <div className="flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5" />
              <span>{category.fuel_type || 'Gas'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Settings2 className="w-3.5 h-3.5" />
              <span>{category.transmission === 'Automatic' ? 'Auto' : 'Manual'}</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-bold text-primary">${category.daily_rate}</span>
              <span className="text-xs text-muted-foreground">/day</span>
            </div>
            <Button size="sm" variant="outline">View</Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const Index = () => {
  const { data: categories = [], isLoading } = useFleetCategories();
  
  // Get top 4 categories to display
  const displayCategories = categories.filter(c => c.is_active).slice(0, 4);

  return (
    <CustomerLayout>
      {/* Hero Section */}
      <section className="bg-background pt-8 pb-16 relative overflow-hidden">
        <div className="container-page relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="max-w-xl animate-slide-up">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-tight text-foreground mb-3">
                C2C Rental
              </h1>
              <div className="w-16 h-1 mb-6" style={{ backgroundColor: '#197149' }} />
              <p className="text-xl md:text-2xl font-semibold text-foreground/80 mb-4">
                Car Rental Made Simple
              </p>
              <p className="text-base text-muted-foreground/80 mb-8 leading-relaxed">
                Skip the hassle. Rent quality vehicles with transparent pricing,
                flexible pickup options, and 24/7 support. Your next adventure
                starts here.
              </p>
            </div>

            {/* Hero Image */}
            <div className="relative animate-fade-in animation-delay-200 -my-8">
              <img
                src={heroImage}
                alt="Premium car rental service"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

          {/* Search Card */}
          <div className="mt-12 animate-scale-in animation-delay-300">
            <RentalSearchCard className="search-card-premium" />
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <WhyChooseSection />

      {/* Browse Categories Section */}
      <section className="py-20 bg-muted">
        <div className="container-page">
          <SectionHeader
            title="Browse Our Fleet"
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
          ) : displayCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayCategories.map((category) => (
                <CategoryDisplayCard key={category.id} category={category} />
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
