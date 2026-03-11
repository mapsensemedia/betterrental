import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight, Users, Fuel, Settings2, Car } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { RentalSearchCard } from "@/components/rental/RentalSearchCard";
import { CategoryCard } from "@/components/landing/CategoryCard";

import { SectionHeader } from "@/components/landing/SectionHeader";
import { WhyChooseSection } from "@/components/landing/WhyChooseSection";
import { CleaningBanner } from "@/components/landing/CleaningBanner";
import { DeliveryBanner } from "@/components/landing/DeliveryBanner";
import { LocationsSection } from "@/components/landing/LocationsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFleetCategories, type FleetCategory } from "@/hooks/use-fleet-categories";

// Images
import heroImage from "@/assets/hero-c2c.jpg";

// Category display card for homepage
function CategoryDisplayCard({ category }: {category: FleetCategory;}) {
  return (
    <Link to="/search?from=fleet" className="block group">
      <div className="card-premium overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {category.image_url ?
          <img
            src={category.image_url}
            alt={category.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => e.currentTarget.src = "/placeholder.svg"} /> :


          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Car className="w-12 h-12" />
            </div>
          }
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
    </Link>);

}

const Index = () => {
  const { data: categories = [], isLoading } = useFleetCategories();

  // Get top 4 categories to display
  const displayCategories = categories.filter((c) => c.is_active).slice(0, 4);

  // Inject meta tags, OG tags, canonical, and JSON-LD structured data
  useEffect(() => {
    // Title
    document.title = "C2C Rental | Local Car Rental in Surrey, Langley & Abbotsford BC";

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", "Rent a car in Surrey, Langley, or Abbotsford with C2C Rental. Affordable daily and weekly rates, fully insured, no hidden fees. Book online in minutes.");

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://c2crental.com/");

    // Open Graph tags
    const ogTags = [
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "C2C Rental" },
      { property: "og:title", content: "C2C Rental | Local Car Rental in Surrey, Langley & Abbotsford BC" },
      { property: "og:description", content: "Rent a car in Surrey, Langley, or Abbotsford with C2C Rental. Affordable daily and weekly rates, fully insured, no hidden fees." },
      { property: "og:url", content: "https://c2crental.com" },
      { property: "og:image", content: "https://c2crental.com/og-home.jpg" },
    ];

    ogTags.forEach(({ property, content }) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    });

    // JSON-LD schemas
    const localBusinessSchema = {
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "CarRental"],
      "@id": "https://c2crental.com/#organization",
      "name": "C2C Rental",
      "url": "https://c2crental.com",
      "logo": "https://c2crental.com/logo.png",
      "image": "https://c2crental.com/og-image.jpg",
      "description": "C2C Rental is a local peer-to-peer car rental platform serving Surrey, Langley, and Abbotsford, BC. Affordable daily, weekly, and monthly vehicle rentals with no hidden fees.",
      "telephone": "+1-604-763-4242",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "6786 King George Blvd",
        "addressLocality": "Surrey",
        "addressRegion": "BC",
        "postalCode": "V3W 4Z1",
        "addressCountry": "CA"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 49.1565,
        "longitude": -122.8487
      },
      "areaServed": [
        { "@type": "City", "name": "Surrey" },
        { "@type": "City", "name": "Langley" },
        { "@type": "City", "name": "Abbotsford" }
      ],
      "serviceArea": {
        "@type": "AdministrativeArea",
        "name": "Fraser Valley, British Columbia"
      },
      "priceRange": "$$",
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          "opens": "08:00",
          "closes": "18:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "Sunday",
          "opens": "11:00",
          "closes": "17:00"
        }
      ],
      "sameAs": [
        "https://www.instagram.com/c2crental",
        "https://www.facebook.com/c2crental"
      ]
    };

    const economyProductSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Economy Car Rental – Surrey, BC",
      "description": "Rent an economy sedan in Surrey, BC through C2C Rental. Daily rates from $45–$65. Ideal for commutes, airport runs, and day trips across the Fraser Valley.",
      "brand": { "@type": "Brand", "name": "C2C Rental" },
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "CAD",
        "lowPrice": "45",
        "highPrice": "65",
        "offerCount": "3"
      }
    };

    const suvProductSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "SUV Rental – Surrey, Langley & Abbotsford, BC",
      "description": "Rent an SUV or crossover through C2C Rental in Surrey, Langley, or Abbotsford. Daily rates from $75–$110. Ideal for Whistler trips, winter driving, and family travel.",
      "brand": { "@type": "Brand", "name": "C2C Rental" },
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "CAD",
        "lowPrice": "75",
        "highPrice": "110",
        "offerCount": "4"
      }
    };

    const minivanProductSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Minivan Rental – Surrey, Langley & Abbotsford, BC",
      "description": "Rent a 7-seat minivan through C2C Rental for group travel, family airport runs, and events in Surrey, Langley, or Abbotsford. Daily rates from $85–$120.",
      "brand": { "@type": "Brand", "name": "C2C Rental" },
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "CAD",
        "lowPrice": "85",
        "highPrice": "120",
        "offerCount": "2"
      }
    };

    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "https://c2crental.ca/#website",
      "url": "https://c2crental.ca",
      "name": "C2C Rental — Car Rental Surrey, Langley, Abbotsford BC",
      "description": "Local car rental in Surrey, Langley, Abbotsford and the Lower Mainland BC. Affordable daily and weekly rates, fully insured vehicles, transparent pricing, flexible pickup, and 24/7 support.",
      "publisher": { "@id": "https://c2crental.ca/#localbusiness" },
      "inLanguage": "en-CA"
    };

    const schemas = [
      { id: "home-localbusiness-jsonld", data: localBusinessSchema },
      { id: "home-economy-product-jsonld", data: economyProductSchema },
      { id: "home-suv-product-jsonld", data: suvProductSchema },
      { id: "home-minivan-product-jsonld", data: minivanProductSchema },
      { id: "home-website-jsonld", data: websiteSchema },
    ];

    schemas.forEach(({ id, data }) => {
      let script = document.getElementById(id);
      if (!script) {
        script = document.createElement("script");
        script.id = id;
        script.setAttribute("type", "application/ld+json");
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(data);
    });

    return () => {
      schemas.forEach(({ id }) => {
        document.getElementById(id)?.remove();
      });
      canonical?.remove();
    };
  }, []);

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
              <p className="text-zinc-800 mt-8 md:text-xl font-semibold text-lg">24/7 Support, Pickup or delivery & Transparent pricing. 

              </p>
              <p className="text-[16px] md:text-[18px] text-zinc-600 leading-relaxed max-w-[46ch] mt-4">After helping hundreds of renters, we built C2C to remove the friction from car rental.

              </p>
              {/* Scroll cue — not clickable */}
              <p className="text-[13px] md:text-[14px] text-muted-foreground flex items-center gap-2 mt-6 mb-4 leading-tight select-none">
                Search availability below
                <ChevronDown className="w-4 h-4 opacity-70" />
              </p>

              {/* City Shortcut Buttons */}
              <div className="flex flex-wrap gap-2 mt-2">
                <Link
                  to="/surrey"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-full border border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
                >
                  Rent in Surrey
                </Link>
                <Link
                  to="/langley"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-full border border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
                >
                  Rent in Langley
                </Link>
                <Link
                  to="/abbotsford"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-full border border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
                >
                  Rent in Abbotsford
                </Link>
              </div>
            </div>

            {/* Hero Image — sits below cue on mobile, beside text on desktop */}
            <div className="relative z-0 block w-full animate-fade-in animation-delay-200">
              <img

                alt="Premium car rental service"
                className="block w-full max-h-[260px] lg:max-h-none object-cover rounded-lg" src="/lovable-uploads/ae30751c-fe6d-4959-839f-3ebc3decea01.png" />

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

      {/* ── E) BROWSE FLEET ────────────────────────────────────── */}
      <section className="py-10 md:py-20 bg-background">
        <div className="container-page">
          <SectionHeader
            title="Browse Our Fleet"
            action={
            <Link
              to="/search?from=fleet"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-sm font-semibold border border-border transition-all duration-200 bg-accent text-primary-foreground">

                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            } />


          {isLoading ?
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((i) =>
            <div key={i} className="card-premium overflow-hidden">
                  <Skeleton className="h-40 w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                  </div>
                </div>
            )}
            </div> :
          displayCategories.length > 0 ?
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {displayCategories.map((category) =>
            <CategoryDisplayCard key={category.id} category={category} />
            )}
            </div> :

          <div className="text-center py-12 text-muted-foreground">
              <p>No vehicles available at the moment.</p>
            </div>
          }
        </div>
      </section>

      {/* ── F) DELIVERY PROMO ──────────────────────────────────── */}
      <DeliveryBanner />

      {/* ── G) LOCATIONS ───────────────────────────────────────── */}
      <LocationsSection />

    </CustomerLayout>);

};

export default Index;