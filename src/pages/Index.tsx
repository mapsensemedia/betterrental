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
import { IncludedStrip } from "@/components/landing/IncludedStrip";

// Images
import heroPhoto from "@/assets/hero-suv-mountains.jpg";


const Index = () => {


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
      {/* ── A) HERO — full-bleed photo, left-anchored, soft side scrim ── */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroPhoto}
          alt="C2C Rental SUV parked with Fraser Valley mountains at sunset"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, hsl(0 0% 0% / 0.78) 0%, hsl(0 0% 0% / 0.55) 42%, hsl(0 0% 0% / 0.18) 72%, hsl(0 0% 0% / 0.32) 100%)",
          }}
        />
        <div className="relative container-corp pt-24 pb-36 md:pt-28 md:pb-44">
          <div className="corp-reveal max-w-xl">
            <span className="eyebrow text-white/75">Surrey · Langley · Abbotsford</span>
            <h1 className="text-white font-display font-semibold leading-[1.08] tracking-tight text-[2.1rem] sm:text-[2.6rem] md:text-[3rem]">
              Car Rental in Surrey, Langley &amp; Abbotsford BC
            </h1>
            <p className="mt-5 text-[15px] md:text-[16px] text-white/80 leading-relaxed max-w-[42ch]">
              No frills. No surprises. Just dependable cars when you need them.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/search" className="btn-corp">
                Book now
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/search"
                className="btn-corp-outline !text-white !border-white/40 hover:!border-white hover:!text-white"
              >
                View fleet
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── B) BOOKING MODULE — sits on top of the hero base ───────── */}
      <section className="relative bg-background">
        <div className="container-corp">
          <div className="relative -mt-24 md:-mt-28 z-20 corp-reveal bg-card border border-border shadow-corp-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 md:px-7 pt-5 pb-4 border-b border-border">
              <span className="eyebrow !mb-0">Reserve a vehicle</span>
              <span className="text-[13px] text-muted-foreground">
                Free cancellation · No card required to search
              </span>
            </div>
            <RentalSearchCard className="bg-transparent border-0 shadow-none rounded-none" />
          </div>
        </div>
      </section>


      {/* ── C) TRUST BAND ────────────────────────────────────────── */}
      <TrustMarquee className="mt-16 md:mt-24" region="British Columbia" />


      {/* ── D) FLEET ROW — horizontal scroll ─────────────────────── */}
      <FleetRow />

      {/* ── E) HOW IT WORKS — compact grid ───────────────────────── */}
      <HowItWorks />

      {/* ── F) WHY CHOOSE US — full-bleed brand band ─────────────── */}
      <WhyChooseSection />

      {/* ── G) DELIVERY → INCLUDED STRIP → CLEANING ──────────────── */}
      <DeliveryBanner />
      <IncludedStrip />
      <CleaningBanner />


      {/* ── H) TESTIMONIALS ──────────────────────────────────────── */}
      <Testimonials />

      {/* ── I) LOCATIONS — compact chips ─────────────────────────── */}
      <LocationChips />

      {/* ── J) QUICK LINKS — internal linking for SEO ────────────── */}
      <section aria-labelledby="explore-heading" className="bg-background py-16 lg:py-24 border-t border-border">
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