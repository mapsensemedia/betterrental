import { Link } from "react-router-dom";
import { ArrowRight, Users, Fuel, Settings2, Car, ShieldCheck, Handshake, Truck } from "lucide-react";
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
      {/* Hero Section - Rolzo-inspired layout */}
      <section className="hero-premium-bg relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Faint city skyline decorative element */}
        <div className="absolute inset-0 pointer-events-none hero-skyline-overlay" />
        
        <div className="container-page relative z-10 py-12 lg:py-20">
          <div className="grid lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-8 lg:gap-12 items-start">
            
            {/* Left: Visual storytelling */}
            <div className="flex flex-col justify-center">
              {/* Headline */}
              <div className="animate-slide-up mb-8 lg:mb-10">
                <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] xl:text-6xl font-extrabold tracking-tight leading-[1.1] text-foreground mb-3">
                  Car Rental,
                  <br />
                  <span className="relative inline-block">
                    Made Simple.
                    <span className="absolute -bottom-2 left-0 w-20 h-1 rounded-full" style={{ backgroundColor: '#197149' }} />
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground/70 mt-6 max-w-md" style={{ lineHeight: '1.75' }}>
                  Premium vehicles. Seamless booking.
                  <br className="hidden sm:block" />
                  Delivered to your door.
                </p>
              </div>

              {/* Hero vehicle image */}
              <div className="relative animate-fade-in animation-delay-200 mb-8 lg:mb-10">
                <img
                  src={heroImage}
                  alt="Premium car rental service"
                  className="w-full max-w-2xl h-auto object-contain"
                  style={{ filter: 'drop-shadow(0 30px 50px rgb(0 0 0 / 0.10))' }}
                />
              </div>

              {/* Micro-feature bullets */}
              <div className="flex flex-wrap gap-6 md:gap-10 animate-fade-in animation-delay-300">
                {[
                  { icon: ShieldCheck, label: "Quality Cars" },
                  { icon: Handshake, label: "Trusted Deals" },
                  { icon: Truck, label: "Smooth Delivery" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'hsl(152 58% 19% / 0.08)' }}>
                      <Icon className="w-4.5 h-4.5" style={{ color: '#197149' }} />
                    </div>
                    <span className="text-sm font-medium text-foreground/80">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Booking card - floating */}
            <div className="animate-scale-in animation-delay-300 lg:sticky lg:top-24">
              <RentalSearchCard className="search-card-premium" />
            </div>

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
