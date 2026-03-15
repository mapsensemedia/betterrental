import { useEffect } from "react";
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
import { RentalSearchCard } from "@/components/rental/RentalSearchCard";

const SURREY_LOCATION_ID = "a1b2c3d4-1111-4000-8000-000000000001";

const vehicleCards = [
  {
    icon: Car,
    category: "Economy & Compact Cars",
    example: "Toyota Corolla or Honda Civic",
    rate: "$45–$65/day",
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

const renterPersonas = [
  {
    title: "Insurance Replacement Drivers",
    description: "Your car is in the shop and ICBC is covering a replacement. We work with body shops across Newton and Whalley to make the handoff seamless.",
  },
  {
    title: "Newcomers & Immigrants",
    description: "New to Surrey and waiting on your own vehicle? We offer short and extended rentals for new BC licence holders with clean records.",
  },
  {
    title: "International Students (SFU Surrey / Kwantlen)",
    description: "Studying at SFU Surrey Campus or KPU? Weekend rentals and short-term plans starting at $45/day.",
  },
  {
    title: "Commuters Without a Car",
    description: "Need a car for a week while yours is serviced or you're between vehicles? We cover the gap without a long-term lease.",
  },
  {
    title: "Visitors & Families",
    description: "Flying into YVR and heading to Surrey to visit family? Skip the airport counters — pick up locally with no airport surcharges.",
  },
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
    a: "Yes. Weekly and monthly rentals are available and typically come with reduced daily rates. These are popular with newcomers, workers between vehicles, and anyone waiting on a vehicle purchase. Ask about long-term options when booking.",
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
    a: "Late returns are charged at your daily rate pro-rated by the hour (minimum 1 hour). If you know you'll be late, contact us as early as possible — we can often extend your booking if the vehicle isn't needed.",
  },
  {
    q: "Do you offer airport pickup or drop-off at YVR?",
    a: "We don't operate from YVR directly, but our Newton location is 20–25 minutes from the airport. Many customers prefer picking up with us over airport counters — no airport surcharges, more competitive rates, and faster check-in.",
  },
];

const bookingSteps = [
  "Select your dates and Surrey Newton as your pickup location in the search card above",
  "Choose your vehicle category and review the daily rate, included km, and add-ons",
  "Enter your driver details — licence number, date of birth, any additional drivers",
  "Complete checkout — the $350 deposit is held, not charged, until return",
  "Sign your digital rental agreement by email before pickup day",
  "Arrive at 6786 King George Blvd — we complete a walk-around with photos together",
  "Drive away — keys in hand, vehicle inspected, agreement signed",
];

const SurreyPage = () => {
  useEffect(() => {
    document.title = "Car Rental in Surrey, BC | Affordable & Local – C2C Rental";

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", "C2C Rental offers affordable car rentals in Surrey, BC from $30/day. Economy cars, SUVs, and minivans. Serving Newton, Guildford, Whalley, Cloverdale, South Surrey. Book online today.");

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://c2crental.com/surrey");

    const ogTags = [
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "C2C Rental" },
      { property: "og:title", content: "Car Rental in Surrey, BC | Affordable & Local – C2C Rental" },
      { property: "og:description", content: "Economy cars, SUVs, and minivans from $45/day in Surrey, BC. No hidden fees. Local pickup in Newton. Book with C2C Rental." },
      { property: "og:url", content: "https://c2crental.com/surrey" },
      { property: "og:image", content: "https://c2crental.com/og-surrey.jpg" },
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

    const localBusinessSchema = {
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "CarRental"],
      "@id": "https://c2crental.com/#organization",
      "name": "C2C Rental",
      "url": "https://c2crental.com",
      "logo": "https://c2crental.com/logo.png",
      "description": "C2C Rental is a local car rental service based in Surrey, BC. Affordable daily, weekly, and monthly vehicle rentals with no hidden fees.",
      "telephone": "+1-604-763-4242",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "6786 King George Blvd",
        "addressLocality": "Surrey",
        "addressRegion": "BC",
        "postalCode": "V3W 4Z5",
        "addressCountry": "CA"
      },
      "geo": { "@type": "GeoCoordinates", "latitude": 49.1565, "longitude": -122.8487 },
      "areaServed": [
        { "@type": "City", "name": "Surrey" },
        { "@type": "City", "name": "Langley" },
        { "@type": "City", "name": "Abbotsford" },
        { "@type": "AdministrativeArea", "name": "Metro Vancouver" }
      ],
      "priceRange": "$$",
      "openingHoursSpecification": [
        { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], "opens": "08:00", "closes": "18:00" },
        { "@type": "OpeningHoursSpecification", "dayOfWeek": "Sunday", "opens": "11:00", "closes": "17:00" }
      ],
      "sameAs": ["https://www.instagram.com/c2crental", "https://www.facebook.com/c2crental"]
    };

    const faqPageSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqItems.map((faq) => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.a
        }
      }))
    };

    const schemas = [
      { id: "surrey-localbusiness-jsonld", data: localBusinessSchema },
      { id: "surrey-faqpage-jsonld", data: faqPageSchema },
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
      <PageContainer className="max-w-6xl mx-auto space-y-16">
        {/* Hero with embedded booking card */}
        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 lg:gap-14 items-start">
            <div className="space-y-5">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                Car Rental in Surrey, BC – Affordable, Local &amp; Hassle-Free
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                C2C Rental is a locally operated car rental service based right here in Surrey, BC. We offer transparent, no-surprise-fee pricing on daily, weekly, and monthly rentals — pick up from our Newton location on King George Blvd and drive away with confidence. Whether you're a commuter, a family needing a second car, a student at SFU Surrey, or a newcomer getting settled, we have you covered. We proudly serve Newton, Guildford, Fleetwood, Cloverdale, Whalley/Surrey Central, and South Surrey. Our renters regularly drive to YVR Airport (20 min), Downtown Vancouver (30 min), Whistler (2.5 hrs), and the US border via Peace Arch.
              </p>
            </div>
            <div className="space-y-2 lg:sticky lg:top-24">
              <RentalSearchCard
                defaultLocationId={SURREY_LOCATION_ID}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground text-center">
                📍 Pickup at 6786 King George Blvd, Surrey — Newton location
              </p>
            </div>
          </div>
        </section>

        {/* Why Choose C2C */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-accent" />
            Why Choose C2C Rental in Surrey?
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            {[
              "Local Surrey team familiar with King George corridor, 104 Ave, and Scott Rd traffic",
              "Transparent pricing — the rate you see online is what you pay at pickup",
              "Daily, weekly, and monthly terms with no long-term commitment required",
              "Fast digital contracts, walk-around photos, easy extensions by phone or online",
              "ICBC-compliant insurance coverage included, optional damage waiver at checkout",
              "Serving newcomers, international students, and SFU Surrey campus visitors",
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
          <h2 className="text-2xl font-bold text-foreground">Our Vehicles Available in Surrey</h2>
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
            All vehicles are cleaned before each rental, regularly serviced, and available with winter tires November–March on request.
          </p>
        </section>

        {/* Who We Serve */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Who We Serve in Surrey</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {renterPersonas.map((persona) => (
              <Card key={persona.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-2">
                  <h3 className="font-semibold text-foreground text-base">{persona.title}</h3>
                  <p className="text-sm text-muted-foreground">{persona.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Popular Routes */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground">Popular Surrey Routes &amp; Trips</h2>
          <ul className="space-y-3 text-muted-foreground">
            {[
              "Newton to YVR Airport: 20–25 min via Hwy 99 — perfect for early flights without parking fees",
              "Surrey Central to Downtown Vancouver: 35–45 min — SkyTrain doesn't cut it when you're hauling gear",
              "King George Blvd to US Border (Peace Arch / Pacific Highway): 15–20 min — confirm cross-border docs at booking",
              "Surrey to Whistler via Sea-to-Sky: 2.5 hrs — our AWD SUVs are built for this drive",
              "Fraser Valley day trips: Chilliwack, Harrison Hot Springs, Cultus Lake — 45–75 min east",
              "Cloverdale / Langley: 15–20 min — great for events at Langley Events Centre or Cloverdale Fairgrounds",
              "Body shop pickup/drop: We coordinate with repair shops in Newton, Whalley, and Guildford for seamless insurance replacements",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Pickup Location */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-6 w-6 text-accent" />
            Surrey Pickup Location &amp; Delivery Area
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            C2C Rental is based at 6786 King George Blvd, Surrey, BC V3W 4Z5 — in the heart of Newton, minutes from Scott Rd Station. Free on-site parking at pickup.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Limited vehicle delivery available to: Newton, Guildford, Surrey Central / Whalley, Fleetwood, and South Surrey / White Rock. Subject to availability and delivery fee. Contact us to confirm before booking.
          </p>
        </section>

        {/* How to Book */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-accent" />
            How to Book a Car Rental in Surrey
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
        </section>

        {/* Insurance & Requirements */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-accent" />
            Insurance, Deposits &amp; Requirements
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            {[
              "Valid full driver's licence required — BC Class 5/7, or accepted international licence",
              "Minimum age: 21 (25 for premium vehicles)",
              "Licence held for at least 2 years",
              "Credit card required for the $350 security deposit hold",
              "All C2C vehicles covered under ICBC owner's certificate — no gap in basic coverage",
              "Optional Damage Waiver available at checkout",
              "Winter tires on all AWD vehicles November–March at no extra charge",
              "US border crossings: notify C2C at booking — cross-border documents arranged in advance",
              "Return vehicle at the same fuel level or pay a refuelling fee",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground italic">
            Requirements may vary by vehicle class. Our team confirms exact conditions before you pay anything.
          </p>
        </section>

        {/* FAQ */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-accent" />
            Frequently Asked Questions – Car Rental in Surrey, BC
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
          <Link to="/langley" className="text-accent underline underline-offset-2 hover:text-accent/80">Langley</Link>
          {" "}and{" "}
          <Link to="/abbotsford" className="text-accent underline underline-offset-2 hover:text-accent/80">Abbotsford</Link>
        </section>

        {/* CTA Banner */}
        <section className="rounded-xl bg-primary text-primary-foreground p-8 md:p-12 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to book your Surrey car rental?</h2>
          <p className="text-primary-foreground/80 max-w-lg mx-auto">
            Browse available vehicles now — no hidden fees, local support, and flexible terms.
          </p>
          <Button asChild variant="hero" size="xl">
            <Link to="/search">View Available Cars in Surrey <ArrowRight className="ml-2 h-5 w-5" /></Link>
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
