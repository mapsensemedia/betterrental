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
  Fuel,
  Globe2,
} from "lucide-react";
import { RentalSearchCard } from "@/components/rental/RentalSearchCard";
import { PageHero } from "@/components/shared/PageHero";
import { TrustMarquee } from "@/components/landing/TrustMarquee";
import { CityVisualBand } from "@/components/shared/CityVisualBand";
import {
  CitySection,
  CityClaimGrid,
  CityTileGrid,
  CityRoutesAndLocation,
  CityStepsWithImage,
  CityFaq,
} from "@/components/shared/CitySections";
import surreyHero from "@/assets/city-surrey.jpg";
import keysHandover from "@/assets/abbotsford-keys-handover.jpg";
import fleetLineup from "@/assets/fleet-lineup.jpg";
import { GBP_LINKS } from "@/constants/gbpLinks";

const SURREY_LOCATION_ID = "a1b2c3d4-1111-4000-8000-000000000001";

const vehicleCards = [
  {
    icon: Car,
    category: "Economy & Compact Cars",
    example: "Toyota Corolla or Honda Civic",
    rate: "$74.99+/day",
    useCase: "Daily commutes, errands, SFU Surrey runs, YVR trips",
  },
  {
    icon: Users,
    category: "Midsize & Full-Size Sedans",
    example: "Toyota Camry or Honda Accord",
    rate: "$65–$85/day",
    useCase: "Families, business travel, longer Fraser Valley drives",
  },
  {
    icon: Mountain,
    category: "SUVs & Crossovers",
    example: "Toyota RAV4 or Ford Escape",
    rate: "$75–$110/day",
    useCase: "Whistler, Cultus Lake, winter roads, moving loads",
  },
  {
    icon: Baby,
    category: "Minivans & 7-Seat Vehicles",
    example: "Toyota Sienna or Chrysler Pacifica",
    rate: "$85–$120/day",
    useCase: "Group travel, family road trips, airport runs",
  },
];

const whyChooseItems = [
  "Transparent pricing — the rate you see online is what you pay at pickup",
  "Daily, weekly and monthly terms with no long-term commitment",
  "Digital agreements, walk-around photos, extensions by phone or online",
  "ICBC-compliant coverage included; optional damage waiver at checkout",
];

const renterPersonas = [
  {
    title: "Insurance Replacement Drivers",
    description: "Your car is in the shop and ICBC is covering a replacement. We work with body shops across Newton and Whalley.",
  },
  {
    title: "Newcomers & Immigrants",
    description: "Short and extended rentals for new BC licence holders with clean records.",
  },
  {
    title: "Students (SFU Surrey / KPU)",
    description: "Weekend rentals and short-term plans starting at $74.99/day.",
  },
  {
    title: "Commuters Without a Car",
    description: "Cover the gap for a week while yours is serviced — no lease required.",
  },
  {
    title: "Visitors & Families",
    description: "Skip the airport counters — pick up locally with no airport surcharges.",
  },
];

const surreyRoutes = [
  "Newton to YVR Airport — 20–25 min via Hwy 99",
  "Surrey Central to Downtown Vancouver — 35–45 min",
  "King George Blvd to the US border (Peace Arch) — 15–20 min",
  "Fraser Valley day trips: Chilliwack, Harrison, Cultus Lake — 45–75 min",
];

const bookingSteps = [
  { icon: CalendarRange, title: "Pick dates & location", detail: "Surrey Newton is preselected in the form above." },
  { icon: UserCheck, title: "Choose your vehicle", detail: "Review the daily rate, included km and add-ons." },
  { icon: ClipboardList, title: "Enter driver details", detail: "Licence, date of birth and any additional drivers." },
  { icon: CreditCard, title: "Checkout", detail: "The $350 deposit is held, not charged, until return." },
  { icon: FileCheck2, title: "Sign your agreement", detail: "Digital agreement by email before pickup day." },
  { icon: KeyRound, title: "Pick up at 6768 King George Blvd", detail: "Walk-around with photos, then drive away." },
];

const requirementTiles = [
  { icon: IdCard, title: "Valid driver's licence", detail: "BC Class 5/7 or accepted international, held 2+ years." },
  { icon: CalendarCheck, title: "Age 21 and up", detail: "25+ required for premium vehicles." },
  { icon: CreditCard, title: "$350 credit card hold", detail: "Held at pickup, released 3–5 business days after return." },
  { icon: ShieldCheck, title: "ICBC coverage included", detail: "Optional damage waiver available at checkout." },
  { icon: Fuel, title: "Same fuel level on return", detail: "Otherwise a refuelling fee applies." },
  { icon: Globe2, title: "US trips need approval", detail: "We provide cross-border insurance documentation." },
];

const faqItems = [
  {
    q: "What documents do I need to rent a car in Surrey with C2C Rental?",
    a: "You'll need a valid driver's licence (BC or accepted international), a credit card in your name for the deposit hold, and sometimes a second piece of ID. International drivers from select countries also need an International Driving Permit alongside their home-country licence.",
  },
  {
    q: "Is there a minimum age to rent a car in Surrey?",
    a: "Yes — drivers must be at least 21. Drivers under 25 may be subject to a young driver surcharge. Premium and larger vehicles require drivers to be 25 or older. Contact us before booking if you're under 25 and we'll confirm what's available.",
  },
  {
    q: "Do you offer long-term rentals in Surrey — weekly or monthly?",
    a: "Yes. Weekly and monthly rentals are available and are popular with newcomers, workers between vehicles, and anyone waiting on a vehicle purchase. Ask about long-term options when booking.",
  },
  {
    q: "Can I use a C2C rental for rideshare (Uber/Lyft) or delivery (DoorDash/Skip)?",
    a: "Commercial use must be disclosed at booking. Whether it's permitted depends on the vehicle and applicable insurance. Do not use a C2C vehicle for rideshare or delivery without prior written approval — it could void your coverage.",
  },
  {
    q: "What is the security deposit and when do I get it back?",
    a: "A $350 hold is placed on your credit card at pickup. It is released within 3–5 business days of return, provided the vehicle comes back in the same condition with no outstanding charges. It's a hold, not a charge — it never leaves your account unless a claim is made.",
  },
  {
    q: "Can I drive a C2C rental to the US from Surrey?",
    a: "Cross-border travel is allowed for most standard vehicles but must be approved in advance. We provide the necessary insurance documentation. Let us know your destination at booking — don't cross without confirming first.",
  },
  {
    q: "What happens if I return the car late?",
    a: "There's a 30-minute grace period after your scheduled return. After that, we charge 25% of your daily rate per hour for up to 2 hours. Beyond 2 hours, it becomes a full additional day at your regular daily rate — and each further calendar day past that is charged the same way. If you know you'll be late, contact us as early as possible so we can extend your booking.",
  },
  {
    q: "How many kilometres are included in my rental?",
    a: "Rentals of 1–7 days include unlimited kilometres. For longer rentals, the first 7 days are still unlimited and 160 km is included for each additional day (for example, a 10-day rental includes 480 km). Any distance over that allowance is charged at $0.25/km, measured from the odometer at pickup vs. return.",
  },
  {
    q: "Do you offer airport pickup or drop-off at YVR?",
    a: "We don't operate from YVR directly, but our Newton location is 20–25 minutes from the airport. Many customers prefer picking up with us over airport counters — no airport surcharges, more competitive rates, and faster check-in.",
  },
];

const SURREY_TITLE = "Car Rental Surrey BC | Affordable & Local — C2C Rental";
const SURREY_DESC = "Affordable car rentals in Surrey, BC from $74.99/day. Economy cars, SUVs, and minivans across Newton, Guildford, Whalley & Cloverdale. Book online with C2C Rental.";

const surreyLocalBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "CarRental"],
  "@id": "https://c2crental.ca/surrey#localbusiness",
  name: "C2C Rental — Surrey",
  url: "https://c2crental.ca/surrey",
  description: "C2C Rental is a local car rental service based in Surrey, BC. Affordable daily, weekly, and monthly vehicle rentals with no hidden fees.",
  telephone: "+1-604-763-4242",
  address: {
    "@type": "PostalAddress",
    streetAddress: "6768 King George Blvd",
    addressLocality: "Surrey",
    addressRegion: "BC",
    postalCode: "V3W 4Z9",
    addressCountry: "CA",
  },
  geo: { "@type": "GeoCoordinates", latitude: 49.1565, longitude: -122.8487 },
  areaServed: [
    { "@type": "City", name: "Surrey" },
    { "@type": "City", name: "Langley" },
    { "@type": "City", name: "Abbotsford" },
    { "@type": "AdministrativeArea", name: "Metro Vancouver" },
  ],
  priceRange: "$$",
  sameAs: [GBP_LINKS.surrey],
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], opens: "08:00", closes: "18:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "11:00", closes: "17:00" },
  ],
};

const SurreyPage = () => {
  const surreyFaqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <CustomerLayout>
      <SEO
        title={SURREY_TITLE}
        description={SURREY_DESC}
        path="/surrey"
        jsonLd={[surreyLocalBusinessSchema, surreyFaqSchema]}
      />
      <PageHero
        image={surreyHero}
        imageAlt="Rental SUV parked on a Surrey, BC street at golden hour"
        eyebrow="C2C Rental · Surrey, BC"
        priority
        overlap
        title={<>Car Rental in Surrey, BC — Affordable, Local &amp; Hassle-Free</>}
        subtitle="Daily, weekly and monthly rentals from our Newton location on King George Blvd. Transparent pricing, no surprise fees, real local support."
      />

      {/* Booking module overlapping the hero */}
      <section className="relative bg-background">
        <div className="container-corp">
          <div className="relative -mt-24 md:-mt-28 z-20 bg-card border border-border shadow-corp-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 md:px-7 pt-5 pb-4 border-b border-border">
              <span className="eyebrow !mb-0">Reserve in Surrey</span>
              <span className="text-[13px] text-muted-foreground">
                Pickup at 6768 King George Blvd, Surrey — Newton
              </span>
            </div>
            <RentalSearchCard
              defaultLocationId={SURREY_LOCATION_ID}
              className="!bg-transparent !shadow-none !rounded-none !backdrop-blur-none !border-0"
            />
          </div>
        </div>
      </section>

      <TrustMarquee className="mt-4" region="Surrey, BC" />

      <CitySection
        eyebrow="Why C2C Rental"
        title="Local rentals, priced the way they're advertised"
        intro="Pick up at our Newton location on King George Blvd — 20 minutes from YVR, 30 from downtown Vancouver."
      >
        <CityClaimGrid items={whyChooseItems} />
      </CitySection>

      <PageContainer className="max-w-6xl mx-auto">
        <section className="space-y-6">
          <h2 className="heading-2 text-foreground">Vehicles available in Surrey</h2>
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
                    <Link to="/search">Book now <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </PageContainer>

      <CityVisualBand
        city="Surrey"
        title="Pick up in Newton, drive anywhere in the Lower Mainland"
        blurb="Fresh, inspected vehicles handed over at 6768 King George Blvd — walk-around photos, a digital agreement, and keys in minutes."
      />

      <CitySection eyebrow="Who we serve" title="Built for how Surrey actually drives">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
          {renterPersonas.map((p) => (
            <div key={p.title} className="bg-card p-5 space-y-2">
              <h3 className="font-semibold text-foreground text-sm">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </CitySection>

      <CitySection
        tinted
        eyebrow="Routes & pickup"
        title="Popular Surrey trips and where to collect your car"
      >
        <CityRoutesAndLocation
          routesTitle="Popular Surrey routes & trips"
          routes={surreyRoutes}
          locationName="Surrey — Newton"
          address="6768 King George Blvd, Surrey, BC V3W 4Z9"
          locationBlurb="In the heart of Newton, minutes from Scott Rd Station, with free on-site parking at pickup."
          deliveryBlurb="Delivery across Newton, Guildford, Whalley, Fleetwood and South Surrey / White Rock — flat $50 fee, subject to availability."
          mapUrl={GBP_LINKS.surrey}
          image={fleetLineup}
          imageAlt="C2C Rental vehicles ready for pickup in Surrey, BC"
        />
      </CitySection>

      <CitySection
        eyebrow="How it works"
        title="Booking a car rental in Surrey"
        intro="Six short steps from search to keys — most customers finish the online part in under five minutes."
      >
        <CityStepsWithImage
          steps={bookingSteps}
          image={keysHandover}
          imageAlt="C2C Rental staff handing keys to a customer in Surrey"
          note="Extensions, changes and early returns are simple — contact us as early as you can and we'll adjust the booking."
        />
      </CitySection>

      <CitySection
        tinted
        eyebrow="Requirements"
        title="Insurance, deposits & what to bring"
      >
        <CityTileGrid tiles={requirementTiles} />
      </CitySection>

      <CitySection eyebrow="FAQ" title="Car rental in Surrey, BC — questions we get most">
        <CityFaq items={faqItems} city="Surrey" />
      </CitySection>

      <PageContainer className="max-w-6xl mx-auto space-y-10">
        <section className="text-sm text-muted-foreground">
          C2C Rental also serves:{" "}
          <Link to="/langley" className="text-accent underline underline-offset-2 hover:text-accent/80">Langley</Link>
          {" "}and{" "}
          <Link to="/abbotsford" className="text-accent underline underline-offset-2 hover:text-accent/80">Abbotsford</Link>
        </section>

        <section className="bg-primary text-primary-foreground p-8 md:p-12 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to book your Surrey car rental?</h2>
          <p className="text-primary-foreground/80 max-w-lg mx-auto">
            Browse available vehicles now — no hidden fees, local support, and flexible terms.
          </p>
          <Button asChild variant="hero" size="xl">
            <Link to="/search">View available cars in Surrey <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
          <p className="text-sm text-primary-foreground/60 pt-2">
            <Link to="/contact" className="underline underline-offset-2 hover:text-primary-foreground/90">Questions? Contact our team →</Link>
          </p>
        </section>
      </PageContainer>
    </CustomerLayout>
  );
};

export default SurreyPage;
