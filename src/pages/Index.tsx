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

// Images
import heroImage from "@/assets/hero-car.jpg";
import promoImage from "@/assets/promo-tesla.jpg";
import bmwImage from "@/assets/cars/bmw-i4.jpg";
import audiImage from "@/assets/cars/audi-a7.jpg";
import porscheImage from "@/assets/cars/porsche-911.jpg";
import gleImage from "@/assets/cars/mercedes-gle.jpg";
import mercedesCat from "@/assets/categories/mercedes.jpg";
import audiCat from "@/assets/categories/audi.jpg";
import bmwCat from "@/assets/categories/bmw.jpg";
import porscheCat from "@/assets/categories/porsche.jpg";

const trendingVehicles = [
  {
    id: "1",
    make: "BMW",
    model: "i4 M50",
    year: 2024,
    category: "Electric",
    dailyRate: 280,
    imageUrl: bmwImage,
    seats: 5,
    fuelType: "Electric",
    transmission: "Automatic",
    isFeatured: true,
  },
  {
    id: "2",
    make: "Audi",
    model: "A7",
    year: 2024,
    category: "Luxury",
    dailyRate: 320,
    imageUrl: audiImage,
    seats: 5,
    fuelType: "Hybrid",
    transmission: "Automatic",
  },
  {
    id: "3",
    make: "Mercedes-Benz",
    model: "GLE 450",
    year: 2024,
    category: "SUV",
    dailyRate: 380,
    imageUrl: gleImage,
    seats: 7,
    fuelType: "Hybrid",
    transmission: "Automatic",
  },
  {
    id: "4",
    make: "Porsche",
    model: "911 Carrera",
    year: 2024,
    category: "Sports",
    dailyRate: 550,
    imageUrl: porscheImage,
    seats: 2,
    fuelType: "Petrol",
    transmission: "Automatic",
    isFeatured: true,
  },
];

const categories = [
  { name: "Mercedes-Benz", slug: "mercedes", imageUrl: mercedesCat },
  { name: "Audi", slug: "audi", imageUrl: audiCat },
  { name: "BMW", slug: "bmw", imageUrl: bmwCat },
  { name: "Porsche", slug: "porsche", imageUrl: porscheCat },
];

const Index = () => {
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
          <SectionHeader title="Car Category" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
            title="Trend vehicles"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingVehicles.map((vehicle, index) => (
              <VehicleCard
                key={vehicle.id}
                {...vehicle}
                variant={index === 0 ? "dark" : "default"}
                className="animate-fade-in"
              />
            ))}
          </div>
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
