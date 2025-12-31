import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { GlassSearchBar } from "@/components/landing/GlassSearchBar";
import { VehicleCard } from "@/components/landing/VehicleCard";
import { CategoryCard } from "@/components/landing/CategoryCard";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { PromoBanner } from "@/components/landing/PromoBanner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useVehicles } from "@/hooks/use-vehicles";

// Images
import heroImage from "@/assets/hero-car.jpg";
import promoImage from "@/assets/promo-tesla.jpg";
import mercedesCat from "@/assets/categories/mercedes.jpg";
import audiCat from "@/assets/categories/audi.jpg";
import bmwCat from "@/assets/categories/bmw.jpg";
import porscheCat from "@/assets/categories/porsche.jpg";

const categories = [
  { name: "Mercedes-Benz", slug: "mercedes", imageUrl: mercedesCat },
  { name: "Audi", slug: "audi", imageUrl: audiCat },
  { name: "BMW", slug: "bmw", imageUrl: bmwCat },
  { name: "Porsche", slug: "porsche", imageUrl: porscheCat },
];

const Index = () => {
  const { data: vehicles = [], isLoading } = useVehicles();
  
  // Get trending vehicles (featured first, then by price)
  const trendingVehicles = vehicles.slice(0, 4);

  return (
    <CustomerLayout transparentNav>
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Premium luxury car"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 hero-gradient" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center container-page pt-32 pb-40">
          <div className="max-w-2xl animate-slide-up">
            <h1 className="heading-1 text-card mb-6">
              Premium car
              <br />
              rental
            </h1>
            <p className="text-lg text-card/80 mb-8 max-w-md">
              We want you to have a stress-free rental experience, so we make it
              easy to hire a car – by providing simple search tools, customer
              reviews and plenty of pick-up locations across the city.
            </p>
          </div>
        </div>

        {/* Glass Search Bar - Positioned at bottom of hero */}
        <div className="relative z-20 container-page -mt-24 pb-12">
          <GlassSearchBar className="animate-scale-in animation-delay-300" />
        </div>
      </section>

      {/* Categories Section */}
      <section className="section-spacing bg-background">
        <div className="container-page">
          <SectionHeader title="Browse by Brand" />
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.map((category) => (
              <CategoryCard
                key={category.slug}
                {...category}
                className="animate-fade-in"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Trending Vehicles Section */}
      <section className="py-20 bg-foreground">
        <div className="container-page">
          <SectionHeader
            title="Trending Vehicles"
            action={
              <Button variant="hero" asChild>
                <Link to="/search">
                  View all
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            }
            className="[&_h2]:text-card"
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
              {trendingVehicles.map((vehicle, index) => (
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
                  fuelType={vehicle.fuelType || "Petrol"}
                  transmission={vehicle.transmission || "Automatic"}
                  isFeatured={vehicle.isFeatured || false}
                  variant={index === 0 ? "dark" : "default"}
                  className="animate-fade-in"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-card/70">
              <p>No vehicles available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* Trust Strip */}
      <TrustStrip />

      {/* Promo Banner */}
      <section className="section-spacing bg-background">
        <div className="container-page">
          <PromoBanner
            title="Book Tesla with a big discount"
            subtitle="Experience the future of driving with our electric fleet. Zero emissions, maximum performance."
            discount="50%"
            discountLabel="For everyone Tesla cars"
            ctaText="Book Now"
            ctaLink="/search?make=tesla"
            imageUrl={promoImage}
          />
        </div>
      </section>
    </CustomerLayout>
  );
};

export default Index;
