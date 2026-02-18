import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight, Users, Fuel, Settings2, Car } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { RentalSearchCard } from "@/components/rental/RentalSearchCard";
import { CategoryCard } from "@/components/landing/CategoryCard";

import { SectionHeader } from "@/components/landing/SectionHeader";
import { WhyChooseSection } from "@/components/landing/WhyChooseSection";
import { CleaningBanner } from "@/components/landing/CleaningBanner";
import { DeliveryBanner } from "@/components/landing/DeliveryBanner";
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
      <section className="bg-[#FBFAF8] pt-10 md:pt-16 pb-6 md:pb-10">
        <div className="container-page">
          {/* On mobile: single column (text then image). On lg+: two-column side-by-side. */}
          <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-10 lg:items-center">
            {/* Hero Content */}
            <div className="relative z-10 max-w-xl animate-slide-up">
              {/* Eyebrow */}
              <p className="text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-4">
                Premium Rentals · Lower Mainland
              </p>
              <h1 className="text-[44px] md:text-[64px] font-semibold tracking-[-0.03em] leading-[1.05] text-zinc-950 mb-2">
                C2C Rental
              </h1>
              {/* Accent underline */}
              <div className="w-14 h-[3px] mt-4 mb-6 rounded-full" style={{ backgroundColor: '#197149' }} />
              <p className="text-[22px] md:text-[28px] font-medium text-zinc-800 mt-8">
                Pickup or delivery
              </p>
              <p className="text-[16px] md:text-[18px] text-zinc-600 leading-relaxed max-w-[46ch] mt-4">
                Flexible pickup options and 24/7 support across Surrey, Langley &amp; Abbotsford.
              </p>
              {/* Scroll cue — not clickable */}
              <p className="text-[13px] md:text-[14px] text-zinc-500 flex items-center gap-2 mt-6 mb-6 leading-tight select-none">
                Search availability below
                <ChevronDown className="w-4 h-4 opacity-70" />
              </p>
            </div>

            {/* Hero Image — sits below cue on mobile, beside text on desktop */}
            <div className="relative z-0 block w-full animate-fade-in animation-delay-200">
              <img
                src={heroImage}
                alt="Premium car rental service"
                className="block w-full max-h-[260px] lg:max-h-none object-contain"
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

      {/* ── D2) CLEANING BANNER ─────────────────────────────── */}
      <CleaningBanner />

      {/* ── D3) DELIVERY BANNER ─────────────────────────────── */}
      <DeliveryBanner />

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
