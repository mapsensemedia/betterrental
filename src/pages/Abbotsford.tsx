import { SEO } from "@/components/shared/SEO";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ArrowRight,
  Users,
  Fuel,
  Settings2,
  Car,
  CheckCircle2,
  MapPin,
  ClipboardList,
  Shield,
  HelpCircle,
  CalendarRange,
  UserCheck,
  FileCheck2,
  KeyRound,
  IdCard,
  CalendarCheck,
  CreditCard,
  ShieldCheck,
  Snowflake,
  Globe2,
  MessageCircle,
} from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { GBP_LINKS } from "@/constants/gbpLinks";
import { RentalSearchCard } from "@/components/rental/RentalSearchCard";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { PageHero } from "@/components/shared/PageHero";
import abbotsfordHero from "@/assets/city-abbotsford.jpg";
import { CleaningBanner } from "@/components/landing/CleaningBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useFleetCategories, type FleetCategory } from "@/hooks/use-fleet-categories";
import keysHandoverImg from "@/assets/abbotsford-keys-handover.jpg";
import counterHandshakeImg from "@/assets/abbotsford-counter-handshake.jpg";

// Canonical Abbotsford Centre location id (see src/constants/rentalLocations.ts)
const ABBOTSFORD_LOCATION_ID = "a1b2c3d4-3333-4000-8000-000000000003";

// Fleet category card — mirrors the homepage layout, links into search
function CategoryDisplayCard({ category }: { category: FleetCategory }) {
  return (
    <Link to="/search?from=fleet" className="block group">
      <div className="card-premium overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 h-full flex flex-col">
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
          <h3 className="font-semibold text-base mb-2 line-clamp-1 text-foreground">{category.name}</h3>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{category.seats || 5}</span>
            <span className="flex items-center gap-1"><Fuel className="w-3.5 h-3.5" />{category.fuel_type || "Gas"}</span>
            <span className="flex items-center gap-1"><Settings2 className="w-3.5 h-3.5" />{category.transmission === "Automatic" ? "Auto" : "Manual"}</span>
          </div>

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

const whyChooseItems = [
  "Close to Abbotsford Airport (YXX) — 10 minutes away",
  "Cross-border documentation support for US travel via Sumas",
  "Local knowledge of Hwy 1, Hwy 11, and Sumas border route",
  "Flexible daily, weekly, and long-term terms",
  "Options for farm workers, UFV students, and international visitors",
  "Transparent pricing — no hidden counter fees",
];

const popularTrips = [
  "Abbotsford Airport (YXX) pickup — 10 min away",
  "Cross-border trips to Bellingham and Washington State via Sumas",
  "Kelowna corridor drive (2.5 hrs)",
  "Whistler from Abbotsford (3 hrs)",
  "Agricultural and industrial worker transport",
  "UFV student commutes and moves",
];

const bookingSteps = [
  { icon: CalendarRange, title: "Pick dates & vehicle", detail: "Online or by phone in minutes." },
  { icon: UserCheck, title: "Share driver details", detail: "Licence, age, additional drivers." },
  { icon: ClipboardList, title: "Review your quote", detail: "Insurance, deposit, mileage limits." },
  { icon: FileCheck2, title: "Confirm & sign", detail: "Digital agreement to your inbox." },
  { icon: KeyRound, title: "Pick up in Abbotsford", detail: "Quick walk-around, then drive away." },
];

const requirementTiles = [
  { icon: IdCard, title: "Valid driver's licence", detail: "BC or accepted international, held 2+ years." },
  { icon: CalendarCheck, title: "Age 21 and up", detail: "25+ required for premium vehicles." },
  { icon: CreditCard, title: "Credit card deposit", detail: "Held at pickup, released on return." },
  { icon: ShieldCheck, title: "ICBC coverage included", detail: "Optional damage waiver at checkout." },
  { icon: Snowflake, title: "Winter tires Nov–Mar", detail: "Standard on AWD and 4WD vehicles." },
  { icon: Globe2, title: "Cross-border ready", detail: "US trips need advance approval & extra docs." },
];

const faqItems = [
  {
    q: "Is C2C Rental available near Abbotsford Airport (YXX)?",
    a: "Yes. C2C Rental serves drivers near Abbotsford International Airport (YXX), located just 10 minutes from our Abbotsford service area. Book online and arrange pickup or delivery so your vehicle is ready when you land. Contact our team for airport coordination details.",
  },
  {
    q: "Can I rent a car in Abbotsford for a cross-border trip to Washington State?",
    a: "Cross-border travel to the United States is possible with advance approval from C2C Rental. You must inform us at the time of booking so we can arrange the required cross-border insurance documentation. The Sumas border crossing is just minutes from Abbotsford, making it convenient for trips to Bellingham and beyond.",
  },
  {
    q: "What is the minimum age to rent a car in Abbotsford, BC?",
    a: "The minimum age to rent with C2C Rental in Abbotsford is 21 years old. Drivers under 25 may be subject to additional deposits or insurance requirements. Premium vehicles require a minimum age of 25. Contact us with your details and we'll confirm your eligibility.",
  },
  {
    q: "Are winter tires included in Abbotsford rentals during winter?",
    a: "During the winter season, C2C Rental equips AWD and 4WD vehicles with winter tires as standard for Abbotsford rentals. If you're planning a trip to the Coquihalla, Kelowna corridor, or any mountain pass, let us know your destination so we can ensure your vehicle is properly equipped.",
  },
  {
    q: "How far in advance should I book a car rental in Abbotsford?",
    a: "We recommend booking at least 48 hours in advance for the best vehicle selection in Abbotsford, especially during peak travel seasons and long weekends. Same-day bookings may be available depending on fleet availability — contact our team to check.",
  },
];

const ABBOTSFORD_TITLE = "Car Rental Abbotsford BC | Near YXX Airport — C2C Rental";
const ABBOTSFORD_DESC = "Affordable car rental in Abbotsford, BC near YXX Airport. Economy cars, SUVs, and minivans with cross-border docs. Book online with C2C Rental.";

const abbotsfordLocalBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "CarRental"],
  "@id": "https://c2crental.ca/abbotsford#localbusiness",
  name: "C2C Rental — Abbotsford",
  url: "https://c2crental.ca/abbotsford",
  description: "C2C Rental in Abbotsford, BC — affordable daily, weekly, and monthly car rentals near Abbotsford International Airport (YXX) and the Sumas US border crossing.",
  telephone: "+1-604-763-4242",
  address: {
    "@type": "PostalAddress",
    streetAddress: "32835 South Fraser Way",
    addressLocality: "Abbotsford",
    addressRegion: "BC",
    addressCountry: "CA",
  },
  geo: { "@type": "GeoCoordinates", latitude: 49.0504, longitude: -122.3045 },
  areaServed: [
    { "@type": "City", name: "Abbotsford" },
    { "@type": "City", name: "Mission" },
    { "@type": "City", name: "Chilliwack" },
  ],
  priceRange: "$$",
  sameAs: [GBP_LINKS.abbotsford],
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], opens: "08:00", closes: "18:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "11:00", closes: "17:00" },
  ],
};

const AbbotsfordPage = () => {
  const { data: categories = [], isLoading } = useFleetCategories();
  const displayCategories = categories.filter((c) => c.is_active).slice(0, 4);

  const abbotsfordFaqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };


  return (
    <CustomerLayout>
      <SEO
        title={ABBOTSFORD_TITLE}
        description={ABBOTSFORD_DESC}
        path="/abbotsford"
        jsonLd={[abbotsfordLocalBusinessSchema, abbotsfordFaqSchema]}
      />
      {/* ── HERO ───────────────────────────────────────────────── */}
      <PageHero
        image={abbotsfordHero}
        imageAlt="Rental crossover on a rural Abbotsford highway with Mount Baker in the distance"
        eyebrow="C2C Rental · Abbotsford, BC"
        priority
        overlap
        title="Car Rental in Abbotsford, BC"
        subtitle="Near YXX Airport. Cross-border ready. Affordable daily, weekly and monthly rentals from our Abbotsford Centre location — minutes from the Sumas border."
        actions={
          <>
            <a href="#book" className="btn-corp">
              Check availability <ChevronDown className="w-4 h-4" />
            </a>
            <Link
              to="/surrey"
              className="btn-corp-outline !text-white !border-white/40 hover:!border-white hover:!text-white"
            >
              Surrey
            </Link>
            <Link
              to="/langley"
              className="btn-corp-outline !text-white !border-white/40 hover:!border-white hover:!text-white"
            >
              Langley
            </Link>
          </>
        }
      />

      {/* ── BOOKING / SEARCH MODULE — overlaps the hero ─────────── */}
      <section className="relative bg-background">
        <div className="container-corp">
          <div
            id="book"
            className="relative -mt-24 md:-mt-28 z-20 scroll-mt-24 bg-card border border-border shadow-corp-lg"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 md:px-7 pt-5 pb-4 border-b border-border">
              <span className="eyebrow !mb-0">Reserve in Abbotsford</span>
              <span className="text-[13px] text-muted-foreground">
                Pickup at 32835 South Fraser Way — Abbotsford Centre
              </span>
            </div>
            <RentalSearchCard
              className="!bg-transparent !shadow-none !rounded-none !backdrop-blur-none !border-0"
              lockLocationId={ABBOTSFORD_LOCATION_ID}
            />
          </div>
        </div>
      </section>


      {/* ── WHY CHOOSE C2C IN ABBOTSFORD ───────────────────────── */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container-page">
          <SectionHeader title="Why Choose C2C Rental in Abbotsford?" />
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-6 text-muted-foreground">
            {whyChooseItems.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CLEANING BANNER ────────────────────────────────────── */}
      <CleaningBanner />

      {/* ── BROWSE FLEET ───────────────────────────────────────── */}
      <section className="py-10 md:py-20 bg-background">
        <div className="container-page">
          <SectionHeader
            title="Vehicles Available in Abbotsford"
            action={
              <Link
                to="/search?from=fleet"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-sm font-semibold border border-border transition-all duration-200 bg-accent text-primary-foreground"
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

      <CityVisualBand
        city="Abbotsford"
        title="Minutes from YXX and the Sumas border"
        blurb="Clean, inspected vehicles handed over at Abbotsford Centre — walk-around photos, a digital agreement, and keys in minutes."
      />



      {/* ── POPULAR TRIPS + PICKUP/SERVICE AREA ─────────────────── */}
      <section className="py-12 md:py-16 bg-[#FBFAF8] border-y border-border/40">
        <div className="container-page grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-5">Popular Abbotsford Trips &amp; Use Cases</h2>
            <ul className="space-y-3 text-muted-foreground">
              {popularTrips.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-5">
              <MapPin className="h-6 w-6 text-accent" />
              Pickup, Delivery &amp; Service Area
            </h2>
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="font-semibold text-foreground">Abbotsford Centre</p>
                <p className="text-sm text-muted-foreground">32835 South Fraser Way, Abbotsford, BC</p>
                <p className="text-sm text-muted-foreground">+1 (604) 763-4242</p>
                <p className="text-sm text-muted-foreground leading-relaxed pt-2">
                  Serving West Abbotsford, East Abbotsford, Clearbrook, and YXX Airport. Pickup from our local service point or limited delivery within the Abbotsford area (subject to availability and fee). We also coordinate insurance replacement rentals with local body shops.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <a href={GBP_LINKS.abbotsford} target="_blank" rel="noopener noreferrer">
                    <MapPin className="mr-2 h-4 w-4" /> View on Google &amp; Get Directions
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── SIMPLE BOOKING PROCESS ─────────────────────────────── */}
      <section className="py-12 md:py-20 bg-background">
        <div className="container-page">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Image */}
            <div className="relative order-2 lg:order-1">
              <div className="absolute -inset-4 rounded-3xl bg-accent/10 -z-10" aria-hidden="true" />
              <img
                src={keysHandoverImg}
                alt="C2C Rental agent handing car keys to a customer at the Abbotsford counter"
                width={1024}
                height={1024}
                loading="lazy"
                className="w-full h-full max-h-[520px] object-cover rounded-2xl shadow-lg"
              />
            </div>

            {/* Steps */}
            <div className="order-1 lg:order-2">
              <p className="text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.18em] text-accent mb-3">
                How it works
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-foreground mb-3">
                A simple booking process
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md">
                Five quick steps from search to driving away in Abbotsford — no counter surprises.
              </p>

              <ol className="relative space-y-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                {bookingSteps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <li
                      key={i}
                      className="relative flex items-start gap-4 p-4 rounded-xl bg-card border border-border/60 hover:border-accent/50 transition-colors"
                    >
                      <span className="relative z-10 flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0 ring-4 ring-background">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-accent shrink-0" />
                          <h3 className="font-semibold text-foreground text-base">{step.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{step.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <p className="text-sm text-muted-foreground italic mt-5">
                Extensions, changes, and early returns are usually simple — just reach out as early as you can.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── INSURANCE / REQUIREMENTS ───────────────────────────── */}
      <section className="py-12 md:py-20 bg-[#FBFAF8] border-y border-border/40">
        <div className="container-page">
          <div className="max-w-2xl mb-10">
            <p className="text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.18em] text-accent mb-3">
              What you'll need
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-foreground mb-3">
              Insurance, deposits &amp; requirements
            </h2>
            <p className="text-muted-foreground">
              Everything you need to know before you pick up your Abbotsford rental — clear, upfront, no fine-print games.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {requirementTiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <div
                  key={tile.title}
                  className="group p-6 rounded-2xl bg-card border border-border/60 hover:border-accent/50 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="h-11 w-11 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/15 transition-colors">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-semibold text-foreground text-base mb-1.5">{tile.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tile.detail}</p>
                </div>
              );
            })}
          </div>

          {/* Reassurance banner */}
          <div className="relative mt-8 overflow-hidden rounded-2xl">
            <img
              src={counterHandshakeImg}
              alt="C2C Rental staff member handing a rental agreement to a customer"
              width={1920}
              height={640}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/65 to-foreground/20" aria-hidden="true" />
            <div className="relative p-6 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 text-background/80 text-xs font-semibold uppercase tracking-[0.18em] mb-2">
                  <Shield className="h-4 w-4" />
                  No surprises
                </div>
                <p className="text-background text-lg md:text-xl font-medium leading-snug">
                  Our team walks you through exact requirements before you confirm. Questions? We're here.
                </p>
              </div>
              <Button asChild variant="hero" size="lg" className="shrink-0">
                <Link to="/contact">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Talk to our team
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container-page max-w-3xl">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-6">
            <HelpCircle className="h-6 w-6 text-accent" />
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-foreground font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container-page">
          <div className="rounded-xl bg-primary text-primary-foreground p-8 md:p-12 text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">Ready to book your Abbotsford rental?</h2>
            <p className="text-primary-foreground/80 max-w-lg mx-auto">
              Pickup is pre-selected to Abbotsford Centre. Pick your dates and confirm in minutes.
            </p>
            <Button asChild variant="hero" size="xl">
              <a href="#book">
                Book in Abbotsford <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <p className="text-sm text-primary-foreground/60 pt-2">
              Also serving{" "}
              <Link to="/surrey" className="underline underline-offset-2 hover:text-primary-foreground/90">Surrey</Link>
              {" "}and{" "}
              <Link to="/langley" className="underline underline-offset-2 hover:text-primary-foreground/90">Langley</Link>
              .
            </p>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
};

export default AbbotsfordPage;
