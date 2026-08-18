import { SEO } from "@/components/shared/SEO";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { Car, Users, Mountain, Baby, CheckCircle2, MapPin, ClipboardList, Shield, HelpCircle, ArrowRight } from "lucide-react";
import { GBP_LINKS } from "@/constants/gbpLinks";
import { PageHero } from "@/components/shared/PageHero";
import { TrustMarquee } from "@/components/landing/TrustMarquee";
import { RentalSearchCard } from "@/components/rental/RentalSearchCard";
import { CityVisualBand } from "@/components/shared/CityVisualBand";
import langleyHero from "@/assets/city-langley.jpg";

const LANGLEY_LOCATION_ID = "a1b2c3d4-2222-4000-8000-000000000002";


const vehicleCards = [
  {
    icon: Car,
    category: "Economy & Compact Cars",
    example: "Toyota Corolla",
    rate: "$45–$65/day",
    useCase: "City driving, errands, solo commuters, YVR airport runs",
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

const faqItems = [
  {
    q: "Is there a car rental option in Langley without a major credit card?",
    a: "C2C Rental requires a valid credit card in the renter's name for the security deposit at pickup. We do not currently accept debit cards or cash deposits for Langley rentals. If you have questions about payment options, contact our Langley team before booking and we'll do our best to help.",
  },
  {
    q: "Can I rent an SUV in Langley for a Whistler trip?",
    a: "Absolutely. C2C Rental offers SUVs and crossovers from our Langley service area that are ideal for Highway 99 and Sea-to-Sky conditions. During winter months, our AWD vehicles come equipped with winter tires. Let us know your travel dates when booking so we can match you with the right vehicle.",
  },
  {
    q: "What documents do I need to rent a car in Langley, BC?",
    a: "You'll need a valid driver's licence (BC or accepted international licence), a credit card in your name, and in some cases proof of insurance or additional ID. International visitors renting in Langley may also need a passport and an International Driving Permit depending on their home country.",
  },
  {
    q: "Does C2C Rental deliver vehicles in Langley?",
    a: "We offer limited vehicle delivery within the Langley area, subject to availability and a delivery fee. Coverage includes Willowbrook, Walnut Grove, Murrayville, and Downtown Langley. Contact our team to confirm delivery availability for your booking dates and address.",
  },
  {
    q: "What is the daily rate for car rental in Langley, BC?",
    a: "Daily rates for C2C Rental in Langley start at $45/day for economy and compact cars. Midsize sedans range from $65–$85/day, SUVs from $75–$110/day, and minivans from $85–$120/day. Weekly and monthly bookings often qualify for discounted rates. Visit our booking page for a live quote.",
  },
];

const bookingSteps = [
  "Choose your dates and vehicle type online or by phone",
  "Share your driver details (licence, age, additional drivers)",
  "Review your quote — insurance options, deposit, mileage limits",
  "Confirm your booking and receive digital agreement",
  "Pick up your vehicle in Langley, complete walk-around inspection, and drive away",
];

const LANGLEY_TITLE = "Car Rental Langley BC | Daily & Weekly Rates — C2C Rental";
const LANGLEY_DESC = "Rent a car in Langley, BC from C2C Rental. Flexible daily rates, delivery available. Serving Township and City of Langley with no hidden fees.";

const langleyLocalBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "CarRental"],
  "@id": "https://c2crental.ca/langley#localbusiness",
  name: "C2C Rental — Langley",
  url: "https://c2crental.ca/langley",
  description: "C2C Rental — affordable daily, weekly, and monthly car rentals serving the Township and City of Langley, BC.",
  telephone: "+1-604-763-4242",
  address: {
    "@type": "PostalAddress",
    streetAddress: "20178 96 Ave",
    addressLocality: "Langley Twp",
    addressRegion: "BC",
    postalCode: "V1M 0B2",
    addressCountry: "CA",
  },
  geo: { "@type": "GeoCoordinates", latitude: 49.1556, longitude: -122.6784 },
  areaServed: [
    { "@type": "City", name: "Surrey" },
    { "@type": "City", name: "Langley" },
    { "@type": "City", name: "Abbotsford" },
  ],
  priceRange: "$$",
  sameAs: [GBP_LINKS.langley],
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], opens: "08:00", closes: "18:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "11:00", closes: "17:00" },
  ],
};

const langleyFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const LangleyPage = () => {


  return (
    <CustomerLayout>
      <SEO
        title={LANGLEY_TITLE}
        description={LANGLEY_DESC}
        path="/langley"
        jsonLd={[langleyLocalBusinessSchema, langleyFaqSchema]}
      />
      <PageHero
        image={langleyHero}
        imageAlt="Rental sedan parked on a quiet Langley, BC road at dusk"
        eyebrow="C2C Rental · Langley, BC"
        priority
        overlap
        title={<>Car Rental in Langley, BC — Affordable, Local &amp; Hassle-Free</>}
        subtitle="Pick up at Langley Centre on 96 Ave. Clear pricing, flexible coverage, and a local team that knows the Fraser Valley."
      />

      {/* Booking module overlapping the hero */}
      <section className="relative bg-background">
        <div className="container-corp">
          <div className="relative -mt-24 md:-mt-28 z-20 bg-card border border-border shadow-corp-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 md:px-7 pt-5 pb-4 border-b border-border">
              <span className="eyebrow !mb-0">Reserve in Langley</span>
              <span className="text-[13px] text-muted-foreground">
                Pickup at 20178 96 Ave — Langley Centre
              </span>
            </div>
            <RentalSearchCard
              defaultLocationId={LANGLEY_LOCATION_ID}
              className="!bg-transparent !shadow-none !rounded-none !backdrop-blur-none !border-0"
            />
          </div>
        </div>
      </section>

      <TrustMarquee className="mt-4" region="Langley, BC" />

      <PageContainer className="max-w-4xl mx-auto space-y-16">
        {/* Intro */}
        <section className="space-y-6">
          <h2 className="heading-2 text-foreground">Renting a car in Langley</h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Whether you live in the Township of Langley or the City of Langley, getting around the Fraser Valley shouldn't mean overpaying for a rental car. C2C Rental provides affordable, no-hassle car rentals for Langley residents, commuters, and visitors — from compact sedans for your daily Highway 1 commute to SUVs built for weekend getaways through Fort Langley and beyond. Langley is a hub for families, students, and workers who need reliable transport without long-term commitments. With Aldergrove and the US border just minutes away, and connections to Surrey, Abbotsford, and Metro Vancouver in every direction, having the right vehicle matters. Book online in minutes, pick up locally in Langley, and drive with confidence — clear pricing, flexible insurance, and real local support from a team that knows this community.
          </p>
        </section>



        {/* Why Choose C2C */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-accent" />
            Why Choose C2C Rental in Langley?
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            {[
              "Local knowledge of Langley routes, Hwy 1, 200th Street corridor, and Fraser Highway",
              "Competitive rates with no hidden add-ons",
              "Flexible daily, weekly, and long-term terms",
              "Simple digital contracts and fast check-in",
              "Options for new drivers, students, and farm/industrial workers",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Vehicle Cards */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Our Vehicles Available in Langley</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {vehicleCards.map((v) => (
              <Card key={v.category} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
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
                    <Link to="/search">Book Now <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            All vehicles are regularly maintained, cleaned before each rental, and equipped for Lower Mainland weather. Car seats, extra storage, and winter tires available on request.
          </p>
        </section>

        {/* Popular Trips */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground">Popular Langley Trips &amp; Use Cases</h2>
          <ul className="space-y-3 text-muted-foreground">
            {[
              "Commuting to Surrey, Abbotsford, or Metro Vancouver",
              "YVR airport run (35 min) or Abbotsford Airport (30 min)",
              "Aldergrove border crossing for US trips",
              "Fort Langley day trips and tourism",
              "Rural and farm route access in Township of Langley",
              "Weekend drives to Manning Park, Cultus Lake, or Harrison Hot Springs",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Pickup & Service Area */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-6 w-6 text-accent" />
            Langley Pickup, Delivery &amp; Service Area
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            C2C Rental serves drivers across the Township and City of Langley, including Willowbrook, Walnut Grove, Aldergrove, Murrayville, and Downtown Langley. Depending on your booking and vehicle availability, we can arrange convenient pickup from our local service point or limited delivery within the Langley area (subject to availability and fee). We also work with local body shops to coordinate insurance replacement rentals for Langley drivers whose vehicles are being repaired.
          </p>
          <Button asChild variant="outline" size="sm" className="w-fit">
            <a href={GBP_LINKS.langley} target="_blank" rel="noopener noreferrer">
              <MapPin className="mr-2 h-4 w-4" /> View on Google &amp; Get Directions
            </a>
          </Button>
        </section>

        {/* Simple Booking Process */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-accent" />
            Simple Booking Process
          </h2>
          <ol className="space-y-4">
            {bookingSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-muted-foreground pt-1">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground italic">
            Extensions, changes, and early returns are usually simple — contact us as early as possible so we can adjust your booking.
          </p>
        </section>

        {/* Insurance, Deposits & Requirements */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-accent" />
            Insurance, Deposits &amp; Requirements in Langley
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            {[
              "Valid full driver's licence required (BC or accepted international licence)",
              "Minimum age: 21 (25 for premium vehicles)",
              "Must hold a valid licence for minimum 2 years",
              "Security deposit taken on a valid credit card at pickup",
              "All C2C vehicles covered under ICBC owner's certificate",
              "Optional damage waiver available at checkout",
              "Winter tires installed November–March on all AWD/4WD vehicles",
              "US border crossings: contact C2C before booking for cross-border insurance documentation",
              "Clear policy on fuel, kilometres, tolls, tickets, and damage inspections",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground italic">
            Our team will walk you through exact requirements before you confirm — no surprises.
          </p>
        </section>

        {/* FAQ */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-accent" />
            Frequently Asked Questions – Car Rental in Langley, BC
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
        </section>

        {/* Cross-links */}
        <section className="text-sm text-muted-foreground">
          C2C Rental also serves:{" "}
          <Link to="/surrey" className="text-accent underline underline-offset-2 hover:text-accent/80">Surrey</Link>
          {" "}and{" "}
          <Link to="/abbotsford" className="text-accent underline underline-offset-2 hover:text-accent/80">Abbotsford</Link>
        </section>

        {/* CTA Banner */}
        <section className="rounded-xl bg-primary text-primary-foreground p-8 md:p-12 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to book your Langley car rental?</h2>
          <p className="text-primary-foreground/80 max-w-lg mx-auto">
            Browse available vehicles now — no hidden fees, local support, and flexible terms.
          </p>
          <Button asChild variant="hero" size="xl">
            <Link to="/search">View Available Cars in Langley <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
          <p className="text-sm text-primary-foreground/60 pt-2">
            <Link to="/contact" className="underline underline-offset-2 hover:text-primary-foreground/90">Questions? Contact our team →</Link>
          </p>
        </section>
      </PageContainer>
    </CustomerLayout>
  );
};

export default LangleyPage;
