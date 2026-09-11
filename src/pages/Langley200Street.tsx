import { SEO } from "@/components/shared/SEO";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Car,
  Users,
  Mountain,
  Baby,
  ArrowRight,
  CalendarRange,
  UserCheck,
  ClipboardList,
  FileCheck2,
  KeyRound,
  IdCard,
  CalendarCheck,
  CreditCard,
  ShieldCheck,
  Snowflake,
  Globe2,
} from "lucide-react";
import { PageHero } from "@/components/shared/PageHero";
import { TrustMarquee } from "@/components/landing/TrustMarquee";
import { RentalSearchCard } from "@/components/rental/RentalSearchCard";
import { CityVisualBand } from "@/components/shared/CityVisualBand";
import {
  CitySection,
  CityClaimGrid,
  CityTileGrid,
  CityRoutesAndLocation,
  CityStepsWithImage,
  CityFaq,
} from "@/components/shared/CitySections";
import langleyHero from "@/assets/city-langley.jpg";
import counterHandshake from "@/assets/abbotsford-counter-handshake.jpg";
import valleyHighway from "@/assets/valley-highway.jpg";

const LANGLEY_200_LOCATION_ID = "a1b2c3d4-4444-4000-8000-000000000004";
const ADDRESS = "5933 200 St, Langley, BC V3A 1N2";
const MAP_URL = "https://www.google.com/maps/search/?api=1&query=49.11014733,-122.66884669";

const vehicleCards = [
  {
    icon: Car,
    category: "Economy & Compact Cars",
    example: "Toyota Corolla",
    rate: "$74.99+/day",
    useCase: "200 St commuting, errands, solo drivers, YVR airport runs",
  },
  {
    icon: Users,
    category: "Midsize & Full-Size Sedans",
    example: "Honda Accord",
    rate: "$65–$85/day",
    useCase: "Longer drives, small families, business travel",
  },
  {
    icon: Mountain,
    category: "SUVs & Crossovers",
    example: "Toyota RAV4",
    rate: "$75–$110/day",
    useCase: "Road trips, Whistler, winter conditions, moving loads",
  },
  {
    icon: Baby,
    category: "Minivans & 7-Seat Vehicles",
    example: "Toyota Sienna",
    rate: "$85–$120/day",
    useCase: "Family trips, group travel, airport runs, events",
  },
];

const whyChooseItems = [
  "Right on the 200th Street corridor — quick on and off Highway 1 at 200 St",
  "Handy for Brookswood, Murrayville, Willowbrook and Downtown Langley",
  "Competitive rates with no hidden add-ons",
  "Flexible daily, weekly and long-term terms",
  "Simple digital contracts and fast check-in",
  "Car seats, extra storage and winter tires available on request",
];

const routes = [
  "Highway 1 at 200 St — straight into Surrey, Abbotsford or Metro Vancouver",
  "Brookswood, Murrayville and South Langley neighbourhoods",
  "YVR airport run (40 min) or Abbotsford Airport (30 min)",
  "Aldergrove and Pacific Highway border crossings for US trips",
  "Fort Langley and Campbell Valley day trips",
  "Weekend drives to Cultus Lake, Harrison Hot Springs or Manning Park",
];

const bookingSteps = [
  { icon: CalendarRange, title: "Choose dates & vehicle", detail: "Online or by phone in minutes." },
  { icon: UserCheck, title: "Share driver details", detail: "Licence, age and additional drivers." },
  { icon: ClipboardList, title: "Review your quote", detail: "Coverage options, deposit and included km." },
  { icon: FileCheck2, title: "Confirm & sign", detail: "Digital agreement straight to your inbox." },
  { icon: KeyRound, title: "Pick up on 200 St", detail: "Quick walk-around, then drive away." },
];

const requirementTiles = [
  { icon: IdCard, title: "Valid driver's licence", detail: "BC or accepted international, held 2+ years." },
  { icon: CalendarCheck, title: "Age 21 and up", detail: "25+ required for premium vehicles." },
  { icon: CreditCard, title: "Credit card deposit", detail: "Held at pickup, released after return." },
  { icon: ShieldCheck, title: "ICBC coverage included", detail: "Optional damage waiver at checkout." },
  { icon: Snowflake, title: "Winter tires Nov–Mar", detail: "Standard on AWD and 4WD vehicles." },
  { icon: Globe2, title: "US trips need approval", detail: "We supply cross-border insurance documentation." },
];

const faqItems = [
  {
    q: "Where exactly is C2C Rental Langley 200th Street?",
    a: "We're at 5933 200 St, Langley, BC V3A 1N2 — on the 200th Street corridor between 56 Ave and 60 Ave, minutes from Brookswood, Murrayville and the Highway 1 interchange at 200 St. Call +1 (604) 763-4242 if you need help finding us.",
  },
  {
    q: "Can I pick up on 200th Street and return at another C2C branch?",
    a: "Yes. Returns between our two Langley branches are free. Dropping off at Surrey Newton is $50 and Abbotsford Centre is $75, shown in your quote before you pay.",
  },
  {
    q: "What are the opening hours on 200th Street?",
    a: "Monday to Saturday 9:00 AM to 6:00 PM and Sunday 11:00 AM to 6:00 PM. Pickups and returns outside those hours can be arranged in advance with our team.",
  },
  {
    q: "Do you deliver a car to me from the 200th Street branch?",
    a: "Yes — delivery within our service area is a flat $50, subject to availability, covering Brookswood, Murrayville, Willowbrook, Walnut Grove, Aldergrove and Downtown Langley. Choose \"Deliver to me\" when you book.",
  },
  {
    q: "What documents do I need to rent a car in Langley, BC?",
    a: "A valid driver's licence (BC or accepted international), a credit card in your name, and in some cases additional ID. International visitors may also need a passport and an International Driving Permit depending on their home country.",
  },
  {
    q: "What does a car rental on 200th Street cost per day?",
    a: "Daily rates start at $74.99 for economy and compact cars, with sedans, SUVs and minivans priced above that. Kilometres are unlimited on rentals of 1 to 7 days. Use the booking form above for a live quote.",
  },
];

const TITLE = "Car Rental Langley 200th Street | C2C Rental Langley BC";
const DESC =
  "Rent a car on 200th Street in Langley, BC. C2C Rental at 5933 200 St — daily and weekly rates, free returns between Langley branches, delivery available.";

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "CarRental"],
  "@id": "https://c2crental.ca/langley-200-street#localbusiness",
  name: "C2C Rental Langley 200th Street",
  url: "https://c2crental.ca/langley-200-street",
  description:
    "C2C Rental Langley 200th Street — daily, weekly and monthly car rentals with pickup and delivery on the 200th Street corridor in Langley, BC.",
  telephone: "+1-604-763-4242",
  email: "langley@c2crental.ca",
  address: {
    "@type": "PostalAddress",
    streetAddress: "5933 200 St",
    addressLocality: "Langley",
    addressRegion: "BC",
    postalCode: "V3A 1N2",
    addressCountry: "CA",
  },
  geo: { "@type": "GeoCoordinates", latitude: 49.11014733, longitude: -122.66884669 },
  hasMap: MAP_URL,
  parentOrganization: { "@type": "Organization", name: "C2C Rental", url: "https://c2crental.ca" },
  areaServed: [
    { "@type": "City", name: "Langley" },
    { "@type": "City", name: "Surrey" },
    { "@type": "City", name: "Abbotsford" },
  ],
  priceRange: "$$",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "18:00",
    },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "11:00", closes: "18:00" },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://c2crental.ca/" },
    { "@type": "ListItem", position: 2, name: "Locations", item: "https://c2crental.ca/locations" },
    {
      "@type": "ListItem",
      position: 3,
      name: "Langley 200th Street",
      item: "https://c2crental.ca/langley-200-street",
    },
  ],
};

const Langley200StreetPage = () => {
  return (
    <CustomerLayout>
      <SEO
        title={TITLE}
        description={DESC}
        path="/langley-200-street"
        jsonLd={[localBusinessSchema, faqSchema, breadcrumbSchema]}
      />
      <PageHero
        image={langleyHero}
        imageAlt="Rental sedan on the 200th Street corridor in Langley, BC"
        eyebrow="C2C Rental · Langley 200th Street"
        priority
        overlap
        title={<>Car Rental on 200th Street, Langley BC</>}
        subtitle={`Pick up at ${ADDRESS} — clear pricing, unlimited kilometres on short rentals, and a local team on the 200 St corridor.`}
      />

      {/* Booking module overlapping the hero */}
      <section className="relative bg-background">
        <div className="container-corp">
          <div className="relative -mt-24 md:-mt-28 z-20 bg-card border border-border shadow-corp-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 md:px-7 pt-5 pb-4 border-b border-border">
              <span className="eyebrow !mb-0">Reserve on 200th Street</span>
              <span className="text-[13px] text-muted-foreground">Pickup at 5933 200 St — Langley</span>
            </div>
            <RentalSearchCard
              defaultLocationId={LANGLEY_200_LOCATION_ID}
              className="!bg-transparent !shadow-none !rounded-none !backdrop-blur-none !border-0"
            />
          </div>
        </div>
      </section>

      <TrustMarquee className="mt-4" region="Langley, BC" />

      <CitySection
        eyebrow="Why this branch"
        title="Car rental on the 200th Street corridor"
        intro="Our second Langley branch sits on 200 St, so pickups from Brookswood, Murrayville and South Langley take minutes instead of a cross-town drive."
      >
        <CityClaimGrid items={whyChooseItems} columns={3} />
      </CitySection>

      <PageContainer className="max-w-6xl mx-auto">
        <section className="space-y-6">
          <h2 className="heading-2 text-foreground">Vehicles you can book on 200th Street</h2>
          <div className="h-px w-14 bg-accent" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {vehicleCards.map((v) => (
              <Card key={v.category} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-accent/10 flex items-center justify-center">
                      <v.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">{v.category}</h3>
                      <p className="text-sm text-muted-foreground">{v.example}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{v.useCase}</p>
                  <p className="text-lg font-bold text-foreground">{v.rate}</p>
                </CardContent>
                <div className="px-5 pb-5">
                  <Button asChild className="w-full" size="default">
                    <Link to="/search">
                      Book now <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </PageContainer>

      <CityVisualBand
        city="Langley"
        title="Minutes from Highway 1 at 200 St"
        blurb="Clean, well-maintained vehicles handed over on 200th Street — walk-around photos, a digital agreement, and keys in minutes."
      />

      <CitySection tinted eyebrow="Routes & pickup" title="Popular trips and where to collect your car">
        <CityRoutesAndLocation
          routesTitle="Popular trips from 200th Street"
          routes={routes}
          locationName="C2C Rental Langley 200th Street"
          address={ADDRESS}
          locationBlurb="Serving Brookswood, Murrayville, Willowbrook, Walnut Grove, Aldergrove and Downtown Langley."
          deliveryBlurb="Delivery available for a flat $50 fee, subject to availability."
          mapUrl={MAP_URL}
          image={valleyHighway}
          imageAlt="Rental SUV on a Fraser Valley highway near Langley, BC"
        />
      </CitySection>

      <CitySection
        eyebrow="How it works"
        title="Booking a car rental on 200th Street"
        intro="Five short steps from search to keys."
      >
        <CityStepsWithImage
          steps={bookingSteps}
          image={counterHandshake}
          imageAlt="C2C Rental agent completing a rental at the counter"
          note="Extensions, changes and early returns are usually simple — contact us as early as possible so we can adjust your booking."
        />
      </CitySection>

      <CitySection tinted eyebrow="Requirements" title="Insurance, deposits & what to bring">
        <CityTileGrid tiles={requirementTiles} />
      </CitySection>

      <CitySection eyebrow="FAQ" title="Car rental on 200th Street — questions we get most">
        <CityFaq items={faqItems} city="Langley" />
      </CitySection>

      <PageContainer className="max-w-6xl mx-auto space-y-10">
        <section className="text-sm text-muted-foreground">
          Other C2C Rental branches:{" "}
          <Link to="/langley" className="text-accent underline underline-offset-2 hover:text-accent/80">
            Langley Centre on 96 Ave
          </Link>
          ,{" "}
          <Link to="/surrey" className="text-accent underline underline-offset-2 hover:text-accent/80">
            Surrey Newton
          </Link>
          {" "}and{" "}
          <Link to="/abbotsford" className="text-accent underline underline-offset-2 hover:text-accent/80">
            Abbotsford
          </Link>
        </section>

        <section className="bg-primary text-primary-foreground p-8 md:p-12 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to book on 200th Street?</h2>
          <p className="text-primary-foreground/80 max-w-lg mx-auto">
            Browse available vehicles now — no hidden fees, local support, and flexible terms.
          </p>
          <Button asChild variant="hero" size="xl">
            <Link to="/search">
              View available cars <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="text-sm text-primary-foreground/60 pt-2">
            <Link to="/contact" className="underline underline-offset-2 hover:text-primary-foreground/90">
              Questions? Contact our team →
            </Link>
          </p>
        </section>
      </PageContainer>
    </CustomerLayout>
  );
};

export default Langley200StreetPage;
