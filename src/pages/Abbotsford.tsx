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

const bookingSteps = [
  "Choose your dates and vehicle type online or by phone",
  "Share your driver details (licence, age, additional drivers)",
  "Review your quote — insurance options, deposit, mileage limits",
  "Confirm your booking and receive digital agreement",
  "Pick up your vehicle in Abbotsford, complete walk-around inspection, and drive away",
];

const AbbotsfordPage = () => {
  useEffect(() => {
    document.title = "Car Rental in Abbotsford, BC | Near YXX Airport – C2C Rental";

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", "Affordable car rental in Abbotsford, BC near Abbotsford Airport. Economy sedans, SUVs, and minivans available. Cross-border documentation support. Book with C2C Rental today.");

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://c2crental.com/abbotsford");

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "C2C Rental – Abbotsford",
      description: "Affordable car rental in Abbotsford, BC near YXX Airport. Economy cars, SUVs, and minivans from $45/day.",
      url: "https://c2crental.com/abbotsford",
      telephone: "+16043300205",
      address: { "@type": "PostalAddress", addressLocality: "Abbotsford", addressRegion: "BC", addressCountry: "CA" },
      priceRange: "$45–$120/day",
    };
    let script = document.getElementById("abbotsford-jsonld");
    if (!script) {
      script = document.createElement("script");
      script.id = "abbotsford-jsonld";
      script.setAttribute("type", "application/ld+json");
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    return () => {
      script?.remove();
      canonical?.remove();
    };
  }, []);

  return (
    <CustomerLayout>
      <PageContainer className="max-w-4xl mx-auto space-y-16">
        {/* H1 + Intro */}
        <section className="space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            Car Rental in Abbotsford, BC – Affordable, Local &amp; Hassle-Free
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Abbotsford sits at the crossroads of the Fraser Valley — close to Abbotsford International Airport (YXX), minutes from the Sumas US border crossing, and connected by Highway 1 to the rest of Metro Vancouver. Whether you're arriving at YXX, heading to Bellingham for shopping, driving the Kelowna corridor, or simply need reliable wheels while your own car is being repaired, C2C Rental has you covered. We offer affordable daily, weekly, and monthly car rentals in Abbotsford for commuters, UFV students, agricultural workers, and visitors. No hidden fees, no confusing add-ons at the counter — just straightforward pricing, flexible insurance options, and a local team that understands Abbotsford roads. Book online in minutes and pick up your vehicle locally in Abbotsford.
          </p>
        </section>

        {/* Why Choose C2C */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-accent" />
            Why Choose C2C Rental in Abbotsford?
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            {[
              "Close to Abbotsford Airport (YXX) — 10 minutes away",
              "Cross-border documentation support for US travel",
              "Knowledge of Hwy 1, Hwy 11, and Sumas border route",
              "Flexible daily, weekly, and long-term terms",
              "Options for farm workers, students at UFV, and international visitors",
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
          <h2 className="text-2xl font-bold text-foreground">Our Vehicles Available in Abbotsford</h2>
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
          <h2 className="text-2xl font-bold text-foreground">Popular Abbotsford Trips &amp; Use Cases</h2>
          <ul className="space-y-3 text-muted-foreground">
            {[
              "Abbotsford Airport (YXX) pickup — 10 min away",
              "Cross-border trips to Bellingham and Washington State via Sumas crossing",
              "Kelowna corridor drive (2.5 hrs)",
              "Whistler from Abbotsford (3 hrs)",
              "Agricultural and industrial worker transport",
              "UFV student commutes and moves",
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
            Abbotsford Pickup, Delivery &amp; Service Area
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            C2C Rental serves drivers across Abbotsford, including West Abbotsford, East Abbotsford, Clearbrook, and areas near Abbotsford International Airport (YXX). Depending on your booking and vehicle availability, we can arrange convenient pickup from our local service point or limited delivery within the Abbotsford area (subject to availability and fee). We also coordinate with local body shops for insurance replacement rentals, helping Abbotsford drivers stay on the road while their vehicle is being repaired.
          </p>
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
            Insurance, Deposits &amp; Requirements in Abbotsford
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
              "Cross-border travel to the US requires advance approval and additional insurance documentation",
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
            Frequently Asked Questions – Car Rental in Abbotsford, BC
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
          <Link to="/langley" className="text-accent underline underline-offset-2 hover:text-accent/80">Langley</Link>
        </section>

        {/* CTA Banner */}
        <section className="rounded-xl bg-primary text-primary-foreground p-8 md:p-12 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to book your Abbotsford car rental?</h2>
          <p className="text-primary-foreground/80 max-w-lg mx-auto">
            Browse available vehicles now — no hidden fees, local support, and flexible terms.
          </p>
          <Button asChild variant="hero" size="xl">
            <Link to="/search">View Available Cars in Abbotsford <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </section>
      </PageContainer>
    </CustomerLayout>
  );
};

export default AbbotsfordPage;
