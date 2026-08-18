import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { RentalSearchCard } from "@/components/rental/RentalSearchCard";
import { WhyChooseSection } from "@/components/landing/WhyChooseSection";
import { CleaningBanner } from "@/components/landing/CleaningBanner";
import { DeliveryBanner } from "@/components/landing/DeliveryBanner";
import { TrustMarquee } from "@/components/landing/TrustMarquee";
import { FleetRow } from "@/components/landing/FleetRow";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { LocationChips } from "@/components/landing/LocationChips";

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
    document.title = "Car Rental Surrey, Langley & Abbotsford BC | C2C Rental";

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", "Local car rental in Surrey, Langley & Abbotsford BC. Affordable daily and weekly rates, fully insured vehicles, transparent pricing, and 24/7 support.");

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://c2crental.ca/");

    // Robots
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "index, follow");

    // Geo tags
    const geoTags = [
      { name: "geo.region", content: "CA-BC" },
      { name: "geo.placename", content: "Surrey, British Columbia" },
    ];
    geoTags.forEach(({ name, content }) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    });

    // Open Graph tags
    const ogTags = [
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_CA" },
      { property: "og:title", content: "Car Rental Surrey, Langley & Abbotsford BC | C2C Rental" },
      { property: "og:description", content: "Local car rental in Surrey, Langley, Abbotsford and the Lower Mainland BC. Affordable rates, fully insured, no hidden fees, 24/7 support." },
      { property: "og:url", content: "https://c2crental.ca/" },
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
        "streetAddress": "6768 King George Blvd",
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
      {/* ── A) HERO — full-coverage photograph with bottom-up scrim ── */}
      <section className="relative w-full min-h-[520px] md:min-h-[640px] flex items-end">
        <img
          src={heroImage}
          alt="C2C Rental vehicle on a British Columbia road"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, hsl(0 0% 4% / 0.88) 0%, hsl(0 0% 4% / 0.55) 45%, hsl(0 0% 4% / 0.25) 100%)",
          }}
        />

        <div className="relative container-corp w-full pt-28 pb-16 md:pt-40 md:pb-24 text-center">
          <div className="max-w-3xl mx-auto corp-reveal">
            <span className="eyebrow text-white/70">C2C Rental · Lower Mainland</span>
            <h1 className="heading-1 text-white">
              Car Rental in Surrey, Langley &amp; Abbotsford BC
            </h1>
            <p className="mt-6 text-[16px] md:text-[17px] text-white/80 leading-relaxed max-w-[65ch] mx-auto">
              24/7 support, pickup or delivery, and transparent pricing across the Fraser Valley.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <Link to="/search" className="btn-corp">
                Reserve a vehicle
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── B) BOOKING BAR — overlaps the base of the hero ───────── */}
      <section className="relative bg-background">
        <div className="container-corp">
          <div className="relative -mt-10 md:-mt-16 z-10 corp-reveal">
            <RentalSearchCard className="bg-card border border-border shadow-[0_18px_40px_-28px_hsl(0_0%_0%/0.4)] rounded-none" />
          </div>
        </div>
      </section>

      {/* ── C) TRUST BAND ────────────────────────────────────────── */}
      <TrustMarquee className="mt-12 md:mt-20" region="British Columbia" />

      {/* ── D) FLEET ROW — horizontal scroll ─────────────────────── */}
      <FleetRow />

      {/* ── E) HOW IT WORKS — compact grid ───────────────────────── */}
      <HowItWorks />

      {/* ── F) WHY CHOOSE US — full-bleed brand band ─────────────── */}
      <WhyChooseSection />

      {/* ── G) DELIVERY + CLEANING ───────────────────────────────── */}
      <DeliveryBanner />
      <CleaningBanner />

      {/* ── H) TESTIMONIALS ──────────────────────────────────────── */}
      <Testimonials />

      {/* ── I) LOCATIONS — compact chips ─────────────────────────── */}
      <LocationChips />

      {/* ── J) QUICK LINKS — internal linking for SEO ────────────── */}
      <section aria-labelledby="explore-heading" className="tint-band py-16 lg:py-24">
        <div className="container-corp">
          <span className="eyebrow">Explore</span>
          <h2 id="explore-heading" className="heading-2 text-foreground mb-8">
            More from C2C Rental
          </h2>
          <nav aria-label="Popular pages" className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link to="/search" className="text-foreground hover:text-brand underline-offset-4 hover:underline">Browse all cars</Link>
            <Link to="/surrey" className="text-foreground hover:text-brand underline-offset-4 hover:underline">Car rental in Surrey</Link>
            <Link to="/langley" className="text-foreground hover:text-brand underline-offset-4 hover:underline">Car rental in Langley</Link>
            <Link to="/abbotsford" className="text-foreground hover:text-brand underline-offset-4 hover:underline">Car rental in Abbotsford</Link>
            <Link to="/locations" className="text-foreground hover:text-brand underline-offset-4 hover:underline">All locations</Link>
            <Link to="/protection" className="text-foreground hover:text-brand underline-offset-4 hover:underline">Insurance &amp; protection</Link>
            <Link to="/about" className="text-foreground hover:text-brand underline-offset-4 hover:underline">About C2C Rental</Link>
            <Link to="/contact" className="text-foreground hover:text-brand underline-offset-4 hover:underline">Contact us</Link>
            <Link to="/blog" className="text-foreground hover:text-brand underline-offset-4 hover:underline">Rental tips &amp; guides</Link>
            <Link to="/blog/daily-vs-weekly-car-rental-surrey-bc" className="text-foreground hover:text-brand underline-offset-4 hover:underline">Daily vs weekly rates</Link>
            <Link to="/blog/icbc-car-rental-insurance-bc" className="text-foreground hover:text-brand underline-offset-4 hover:underline">ICBC rental insurance guide</Link>
            <Link to="/blog/best-road-trips-from-surrey-bc" className="text-foreground hover:text-brand underline-offset-4 hover:underline">Best road trips from Surrey</Link>
          </nav>
        </div>
      </section>


    </CustomerLayout>);

};

export default Index;