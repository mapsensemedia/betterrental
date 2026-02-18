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
    <Link to="/search" className="block group">
      <div className="card-premium overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {category.image_url ? (
            <img
              src={category.image_url}
              alt={category.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Car className="w-12 h-12" />
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col flex-1">
          {/* Title */}
          <h3 className="font-semibold text-base mb-2 line-clamp-1 text-foreground">{category.name}</h3>

          {/* Specs */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{category.seats || 5}</span>
            <span className="flex items-center gap-1"><Fuel className="w-3.5 h-3.5" />{category.fuel_type || "Gas"}</span>
            <span className="flex items-center gap-1"><Settings2 className="w-3.5 h-3.5" />{category.transmission === "Automatic" ? "Auto" : "Manual"}</span>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between mt-auto">
            <div>
              <span className="text-xl font-bold text-foreground">${category.daily_rate}</span>
              <span className="text-xs text-muted-foreground">/day</span>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-[10px] border border-border bg-secondary text-foreground">View</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

const Index = () => {
  const { data: categories = [], isLoading } = useFleetCategories();

  // Get top 4 categories to display
  const displayCategories = categories.filter((c) => c.is_active).slice(0, 4);

  return (
    <CustomerLayout>
      {/* ── A) HERO SECTION ─────────────────────────────────────── */}
      <section className="bg-background pt-10 pb-12 md:pt-16 md:pb-20">
        <div className="container-page">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Hero Content */}
            <div className="max-w-xl animate-slide-up">
              {/* Eyebrow */}
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Premium Rentals · Lower Mainland
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] text-foreground mb-2">
                C2C Rental
              </h1>
              {/* Accent underline — brand green, flush to type */}
              <div className="w-12 h-[3px] mb-6" style={{ backgroundColor: '#197149' }} />
              <p className="text-lg md:text-xl font-semibold text-foreground/80 mb-3">
                Pickup or delivery
              </p>
              <p className="text-base text-muted-foreground leading-relaxed mb-8">
                Flexible pickup options and 24/7 support across Surrey, Langley & Abbotsford.
              </p>
              {/* Hero CTAs */}
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/search"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-[14px] text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
                  style={{ backgroundColor: '#197149' }}
                >
                  Browse Vehicles
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/locations"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-[14px] text-sm font-semibold bg-card border border-border text-foreground transition-all duration-200 hover:bg-secondary"
                >
                  Our Locations
                </Link>
              </div>
            </div>

            {/* Hero Image — immersive, no clipping */}
            <div className="relative animate-fade-in animation-delay-200 -my-10 md:-my-16">
              <img
                src={heroImage}
                alt="Premium car rental service"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

          {/* ── C) BOOKING / SEARCH MODULE ──────────────────────── */}
          <div className="mt-10 animate-scale-in animation-delay-300">
            <RentalSearchCard className="search-card-premium" />
          </div>
        </div>
      </section>

      {/* ── D) WHY CHOOSE SECTION ──────────────────────────────── */}
      <WhyChooseSection />

      {/* ── E) BROWSE FLEET ────────────────────────────────────── */}
      <section className="py-10 md:py-20 bg-background">
        <div className="container-page">
          <SectionHeader
            title="Browse Our Fleet"
            action={
              <Link
                to="/search"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-sm font-semibold border border-border bg-card text-foreground transition-all duration-200 hover:bg-secondary"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            }
          />

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card-premium overflow-hidden">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

      {/* ── F) DELIVERY PROMO (CTABanner) ──────────────────────── */}
      <CTABanner />

      {/* ── G) LOCATIONS ───────────────────────────────────────── */}
      <LocationsSection />

    </CustomerLayout>
  );
};

export default Index;
